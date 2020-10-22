---
title: Lua next 函数的一些有趣的问题
tag: lua
---
熟悉 Lua 的同学都知道, Lua 是允许在 `for ... pairs` 循环中修改和删除表中元素的. 下面这样的代码是没有任何问题的:

```lua
local t = {a = 1, b = 2, c = 3}
for k, v in pairs(t) do
    if v % 2 == 0 then
        t[k] = nil
    end
end
```

但是, 如果我们在遍历时既删除元素又新增元素, 就会有问题了:

```lua
local t = {a = 1, b = 2, c = 3}
for k, v in pairs(t) do
    if v == 1 then
        t[k] = nil
        t[k .. 1] = v + 1
    end
end
```

运行以上代码会得到这样的报错:

```
invalid key to 'next'
stack traceback:
        [C]: in function 'next'
        stdin:1: in main chunk
        [C]: in ?
```

熟悉 Lua 的同学对这个报错应该不会陌生. 解决方案就是避免在遍历时给 table 新增元素. [Lua 官方文档](https://www.lua.org/manual/5.3/manual.html#pdf-next)也说的很明白: 如果在遍历期间将任何值分配给表中的不存在字段，则 `next` 的行为是未定义的. 不过这个报错本身很有意思, 背后涉及 Lua 多方面的机制, 我认为这是个了解 Lua 内部实现的好契机.

### 令人费解的行为

为什么说它很有意思呢? 首先这个报错还不一定会出现 (文档也说了 "行为未定义"), 比如下面的代码就没这个问题:

```lua
local t = {a = 1, b = 2, c = 3, d = 4, e = 5, f = 6}
for k, v in pairs(t) do
    if v == 1 then
        t[k] = nil
        t[k .. 1] = v + 1
    end
end
```

另一方面, `next(t, k)` 函数的含义就是, 对于给定 table `t`, 返回与给定键 `k` 相邻的下一个键值对. 如果 `k` 是 `t` 的最后一个元素, 则返回 `nil`; 如果 `k` 为 `nil`, 则返回 `t` 的第一个元素. 那如果 `k` 不在 `t` 中呢? 自然该报错了:

```
> next({a = 1, b = 2}, 'c')
invalid key to 'next'
stack traceback:
        [C]: in function 'next'
        stdin:1: in main chunk
        [C]: in ?
```

熟悉的报错. 再来看 for 循环: 我们知道, `for ... pairs` 循环本质是每次循环调用 `next`, 传入 table 和上一次循环的键, 获取本次循环的键值对. 既然这样, 本文开头的代码应该报错才对, 因为当 `v` 等于 1 时, 相应的键就会被删掉, 导致下次调用 `next` 时尝试为不存在 table 中的键求下一个元素. 但不仅它能正常运行, 下面这段代码也能正常运行:

```lua
local t = {a = 1, b = 2}
print(next(t, 'a')) -- b    2
t.a = nil
print(next(t, 'a')) -- b    2
```

第二个 `next` 调用正常返回, 就好像 `a` 还在 `t` 中一样. 而当我们删除后再插入一个新元素时, 报错就出现了:

```lua
local t = {a = 1, b = 2}
print(next(t, 'a')) -- b    2
t.a = nil
t.a1 = 2
print(next(t, 'a')) -- error: invalid key to 'next'
```

当然还有更好玩的, 要得到这个报错, 不一定要插入新的元素, 有时 GC 下就出来了:

```lua
local k = 'a'..'b'
local t = {
    a = 1,
    [k] = 2,
}
t[k] = nil
k = nil
collectgarbage("collect")
next(t, 'a'..'b') -- error: invalid key to 'next'
```

写法比较奇怪, 这都是为了符合 Lua 某些机制. 上面的代码稍微改改, 比如说把最后的 `next(t, 'a'..'b')` 改成 `next(t, 'ab')`, 报错就不会出现了.

### next 函数的实现

### Lua GC 机制
