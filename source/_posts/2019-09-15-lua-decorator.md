---
key: 7
title: 在Lua中使用装饰器
tag: lua
---
## 引言
使用过 Python 的同学都会喜欢上 Python 的装饰器. 它提供一种语法, 对函数进行"声明":

```python
def decorator(f):
    def wrapper(x):
        print 'call %s' % f.__name__
        return "The 2nd power of {0} is {1}".format(x, f(x))
    return wrapper

@decorator
def foo(x):
    return x ** 2
```

装饰器本质上只是一种语法糖: 把目标函数作为参数传入装饰器. 巧妙地使用装饰器, 可以让程序变得简洁优雅. 比如说, 声明一个函数是事件, 声明一个函数是远程调用接口, 等等.

## 在 Lua 中实现 "装饰器"
笔者过去常常使用 Python, 后来使用了 Lua 后, 一直很怀念 Python 的装饰器. 于是就运用了一些奇技淫巧, 用曲线救国的方式在 Lua 中实现了类似装饰器的用法. 具体的做法是用元表监听每一次函数定义, 然后在每次函数定义的时候检测有没有调用过装饰器函数, 如果有, 就执行执行相关逻辑.

```lua
local decorated = false
local m = setmetatable({}, {__newindex = function(t, k, v)
    if 'function' == type(v) and decorated then
        local function wrapper(x)
            print(string.format('call %s', k))
            return string.format("The 2nd power of %s is %s", x, v(x))
        end
        decorated = false
        rawset(t, k, wrapper)
    else
        rawset(t, k, v)
    end
end})

local function decorator()
    decorated = true
end

decorator()
function m.foo(x)
    return x ^ 2
end
```

这种实现还是有点麻烦, 局限性也比较强. 笔者在项目中把它应用在了 远程调用接口 的声明上. 被声明过的函数可被客户端调用, 否则只是一个内部函数. 主要是为了让业务逻辑层用着爽, 底层麻烦点也就无所谓了.

***
**2019-11-14 更新:**

上面那种做法太过特殊处理了, 而且不支持多重装饰器. 后来我又想到一种改进方案:

```lua
local decorators = {}
local m = setmetatable({}, {__newindex = function(t, k, v)
    if 'function' == type(v) then
        for i = #decorators, 1, -1 do
            v = decorators[i](k, v)
            decorators[i] = nil
        end
    end
    rawset(t, k, v)
end})

local function AT(f)
    table.insert(decorators, f)
end

local function decorator()
    AT(function(fname, f)
        return function(x)
            print(string.format('call %s', fname))
            return string.format("The 2nd power of %s is %s", x, f(x))
        end
    end)
end

decorator()
function m.foo(x)
    return x ^ 2
end
```

这样灵活性和可维护性就强多了, 而且支持多重装饰器.
