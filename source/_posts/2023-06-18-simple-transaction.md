---
key: 74
title: 一种简单的事务实现
tag: [design, lua]
---
在服务器编程中，事务往往是非常重要的，它的一个很重要的作用就是保证一系列操作的完整性。例如服务器处理某个请求要先后执行 a, b 两个修改操作，它们都有可能失败；如果 a 成功了但 b 失败了，事务会负责回滚 a 的修改。试想如果 a 操作是扣除余额，b 操作是发货，如果发货失败，钱就得退回去。如果服务器使用了支持事务的数据库系统，如 MySQL，事情就很好办。否则的话，实现类似的逻辑会比较棘手，也很容易犯错。

我希望有一种简单的事务系统，实现这样的效果：例如在下面的代码中，`handler` 函数处理业务逻辑。只要 `handler` 函数的任意位置抛出异常，那么 `handler` 中所有修改，无论是 `_G.DB.last_update_time`、`data.order` 还是 `data.money`，都将回滚。

```lua
function handler(data)
    _G.DB.last_update_time = os.time()
    data.order_id = get_order_id()
    check_order(data)
    data.money = data.money - 10
    deliver(data)
end
```

因为我们的程序是单线程的，因此不用考虑事务隔离性之类的问题。所以这个所谓的“事务系统”只是一种自动回滚机制。

其实我在以前见过类似的事务实现。它的做法是将需要修改的数据（如上面的 `data`）存储两份，一份是正式数据，一份是暂存数据。业务代码修改暂存数据，如果没有抛出异常，则让暂存数据覆盖正式数据 (commit)；否则让正式数据覆盖暂存数据 (rollback)。暂存数据只是正式数据的浅拷贝，即使是这样，内存开销仍然非常大。而且由于是浅拷贝，这种机制对引用类型（如 table）的字段无效。我认为这种做法并不够好。

最近我受到 *SICP* 4.3 节 Nondeterministic Computing 的启发，想到其实回滚数据很简单——再改回去就好了。我们在修改数据的时候记录下数据在修改之前的值，如果捕获到异常，就把对应的数据改回修改之前的值。我们从 `pcall` 开始动手：

```lua
local original_pcall = pcall
function pcall(f, ...)
    begin()
    local ok, res = original_pcall(f, ...)
    if ok then
        commit()
    else
        rollback()
    end
    return ok, res
end
```

由于 `pcall` 可以嵌套，i.e. `pcall(function() pcall(function() end) end)`，我们使用栈保存事务的上下文，在 `begin` 中压栈，`commit` 和 `rollback` 时弹出栈。因此栈顶就是当前事务的上下文。调用 `set` 执行修改操作，它会将数据的原始值保存在上下文中。

```lua
local stack = {}

local function begin()
    table.insert(stack, {})
end

function set(tab, key, val)
    local top = stack[#stack]
    if top then
        table.insert(top, {tab, key, tab[key]})
    end
    tab[key] = val
end
```

Commit 时，当前事务的赋值操作全部生效，当前事务造成的副作用亦是上层事务的副作用，需要将当前事务记录的数据原始值移动到上层事务（如果有的话）的上下文中。回滚时，从后往前依次取出每次 `set` 操作的原始值，将数据设置成修改前的值，完成回滚操作。

```lua
local function commit()
    local top = table.remove(stack)
    local pi = stack[#stack]
    if pi then
        for _, assign in ipairs(top) do
            table.insert(pi, assign)
        end
    end
end

local function rollback()
    local top = table.remove(stack)
    for i = #top, 1, -1 do
        local tab, key, val = table.unpack(top[i], 1, 3)
        tab[key] = val
    end
end
```

使用的时候不能直接赋值，需要调用 `set`。当然也可以做成元表，不过我不是很喜欢这样。

```lua
val = {}
function test()
    local old = val
    set(_G, 'val', 42)
    set(old, 1, 1)
    error()
end

pcall(test) -- false nil
next(val) -- nil
```

整个实现可以说是非常简单且行之有效，开销也并不大。代码是我随手写的，它还有优化空间：`stack` 中的旧数据存储可以使用更紧凑的数据结构；代码可以用 C 实现提高性能等。