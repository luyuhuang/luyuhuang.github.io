---
key: 48
title: 自动生成 Lua 热更新代码
tag: lua
aside: false
---
游戏服务器使用 Lua 的一个重要原因是 Lua 便于热更. 即使服务器正在运行, 只需让它执行一段代码, 即可重写其中的某些函数, 达到热更新的目的. 例如模块 `app` 有一个函数 `foo`

```lua
local M = {}

function M.foo(a, b)
    return a + b
end

return M
```

如果我们要将 `foo` 热更成将 `a` 和 `b` 相乘, 只需要让服务器加载运行如下代码即可:

```lua
local M = require("app")
function M.foo(a, b)
    return a * b
end
```

不过很多时候, 函数并不是这么单纯. 函数常常会依赖许多上值 (upvalue), 举一个复杂点的例子:

```lua
local database = require('database')
local M = {}
M.n = 0

local function bar(n)
    return n * 2
end

function M.foo(a, b)
    M.n = M.n + 1
    return database.query(bar(a + b))
end

return M
```

这个例子中, 我们写热更代码时就得注意了, `foo` 有上值 `M`, `database` 和 `bar`. 有人说直接执行整个文件不就好了? 那可不行, Lua 很灵活, 执行整个文件很有可能出别的问题. 在这个例子中会导致 `M.n` 被重置 (虽然我个人不推荐在模块空间中存状态, 但是总是会有人这么做). 在一些复杂的情况下, 函数可能会有多重依赖, 比如 `foo` 的上值中有 `bar`, `bar` 还有它的上值等等. 这就会给热更代来很多困难.

### hotfix-gen

为了解决这个问题, 我写了一个工具 [hotfix-gen](https://github.com/luyuhuang/hotfix-gen), 它能够分析代码, 提取出函数的相关依赖, 生成热更代码. 我们使用 `luarocks` 就能安装它:

```bash
luarocks install hotfix-gen
```

我们要热更 `app` 模块的 `foo` 函数, 执行 `hotfix app foo` 即可:

```bash
$ hotfix app foo
local database = require('database')

local M = require("app")
local function bar(n)
    return n * 2
end

function M.foo(a, b)
    M.n = M.n + 1
    return database.query(bar(a + b))
end
```

这样它就能自动生成热更代码. 它会假设函数依赖的上值本身 (而非引用) 是不可变的, 例如如下的代码:

```lua
local n = 1

function M.foo()
    print(n)
end

n = 2
```

提取的时候就会有问题. 因此生成的代码还是需要 review 和测试的. 不过只要代码符合一定的规范, 生成的结果就没问题; 而且比起人工编写要快捷准确的多.

### 实现原理

hotfix-gen 的实现用的是笨办法, 也就是读取代码, 编译成语法树, 然后分析语法树. 虽然有 `debug.getupvalue` 可以用, 但是这必须将代码运行起来. 此外对于 `local a = b * 2` 这样的语句我们还需要知道 `a` 依赖于 `b`. 不过好消息是分析代码并没有那么复杂, 我们有现成的库可以用: [lua-parser](https://github.com/andremm/lua-parser). lua-parser 会利用 [lpeg](/2020/06/24/lpeg.html), 将 Lua 源码解析成语法树. 我们只需要分析语法树即可.

主要工作就是识别变量的定义和引用, 这需要考虑作用域. 例如下面代码中, `foo` 依赖于 `a` 但不依赖于 `b`. 但如果 `print(b)` 在 `for` 语句块外, `foo` 就又依赖于 `b` 了.

```lua
local a, b
local function foo()
    for b = a, 10 do
        local b = 1
        print(b)
    end
    -- print(b)
end
```

此外还必须考虑一些微妙的语法. 例如 `local function f()` 和 `local f = function()` 是不一样的. 下面的例子中, `foo` 依赖于定义在它之上的 `local foo = 1`, 但 `bar` 不会, 函数 `bar` 中的 `bar` 就是它自己.

```lua
local foo = 1
local foo = function()
    print(foo) -- foo is 1
end

local bar = 1
local function bar()
    bar() -- bar is itself
end
```

实现主要有以下几步:

- 扫描文件 block 作用域下的每个局部变量, 并且分析它们的依赖.
- 如果遇到目标函数, 也分析目标函数的依赖.
- 从目标函数开始遍历依赖关系网, 得到所有需要提取的语句. 语句的顺序保持不变.
- 生成目标代码.

最终的代码只有三百行左右, 并不很复杂. 经过测试, 能够准确处理各种情况.
