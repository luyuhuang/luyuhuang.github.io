---
key: 16
title: 使用协程处理耗时过程
tag: lua
---
游戏服务器常常有一些耗时的操作, 比如说给全服玩家发放奖励. 如果直接写一个循环, 遍历全服玩家, 给每个玩家发放奖励, 那么整个过程可能持续几分钟, 十几分钟甚至几十分钟, 整个进程都阻塞在这个过程中了. 解决这个问题的一种做法是使用定时器, 比如说每处理完 50 个玩家, 就停 1 秒, 1 秒后继续处理, 就像这样:

```lua
function deal(list)
    local p = 0
    local function foo()
        local from, to = p + 1, math.min(p + 50, #list)
        for i = from, to do
            local id = list[i]
            dosth(id)
        end
        p = to
        if p < #list then
            timer:start_once(1, foo)
        end
    end
    foo()
end
```

但是这种做法太过麻烦. 特别是, 有的时候这个耗时过程是二重循环或者别的什么奇怪的控制流, 那就无法使用这种方法了. 更好的做法是使用**协程(coroutine)**.

对于一个常规的过程, 一旦返回, 就丢失了全部栈里的信息, 下次调用时就得重新来过. 然而协程不同, 它允许过程在某些时刻切出, 进入挂起状态, 却又保存其全部的栈信息; 然后可以在将来的某些时刻将其唤醒. 唤醒之后的协程会在上次切出的地方继续执行, 就像它从来没有切出过一样. 除此之外, 还能在切入切出的时候传递参数. 举个简单的例子:

![result](/assets/images/use-coroutines-to-process-time-consuming-procedures_1.png)

我们可以用协程处理耗时过程. 具体的思路就是把耗时过程包在一个协程里, 每执行一定的量就调用 `coroutine.yield` 切出协程, 然后利用定时器延时一段时间再唤醒协程, 直到协程执行完毕. 我们可以简单封装一下, 让使用者不感知协程的存在. 以下是个简单示例:

```lua
counts = {}
max_counts = {}
function try_yield()
    local co = coroutine.running()
    assert(co ~= nil)
    counts[co] = counts[co] + 1
    if counts[co] >= max_counts[co] then
        counts[co] = 0
        coroutine.yield()
    end
end

function with_coroutine(f, n, t)
    return function(...)
        local co = coroutine.create(f)
        counts[co] = 0
        max_counts[co] = n

        local function foo(...)
            coroutine.resume(co, ...)
            if coroutine.status(co) == 'dead' then
                counts[co] = nil
                max_counts[co] = nil
                return
            end
            timer:start_once(t, foo)
        end
        foo(...)
    end
end
```

这样的话使用起来就很简单了, 现在你就可以真的 "直接写一个循环, 遍历全服玩家, 给每个玩家发放奖励" 了, 只要记得调用 `try_yield`:

```lua
deal = with_coroutine(function(list)
    for i, id in ipairs(list) do
        dosth(id)
        try_yield()
    end
end, 50, 1)
```

你还可以选择使用[这篇文章](/2019/09/15/lua-decorator.html)中介绍的装饰器, 让代码更加优雅.

处理耗时过程应该是协程的一个比较常规的操作. 其实对于处理耗时过程, 很多人第一想到的是开辟一条线程去处理. 然而线程会有并发的问题, 况且线程数太多会给CPU带来额外的负担. 这里我们可以利用 Lua 的优势, 使用协程解决这个问题.
