---
title: 为什么说 Lua 5.3 中没有全局变量了
tag: lua
---
过去笔者一直使用 Lua 5.1, 对 Lua 5.3 中的 `_ENV` 一知半解. 最近新项目中使用了 Lua 5.3, 于是特意研究了下. 这篇文章总结下 Lua 5.3 中的环境和全局变量, `_ENV` 的含义以及与之相关的用法.

### Lua 变量的类型

Lua 中的变量可分为局部变量, 上值(upvalue)和全局变量. 经常使用 Lua 的同学应该都很熟悉, 举个例子:

```lua
local up = "str"
local function foo(a)
    local b = a
    print(up, b)
end
```

对于 function `foo` 来说, `a` 和 `b` 是局部变量, `up` 是上值, `print` 则是全局变量.

### 局部变量和上值

一个变量是什么变量在编译时就能确定: 从当前函数依次向上寻找, 能在当前函数找到的变量为局部变量, 在上层函数找到的变量为上值, 都找不到的为全局变量.  下面是 Lua 寻找变量的代码:

{% highlight c linenos %}
/*
  Find variable with given name 'n'. If it is an upvalue, add this
  upvalue into all intermediate functions.
*/
static void singlevaraux (FuncState *fs, TString *n, expdesc *var, int base) {
  if (fs == NULL)  /* no more levels? */
    init_exp(var, VVOID, 0);  /* default is global */
  else {
    int v = searchvar(fs, n);  /* look up locals at current level */
    if (v >= 0) {  /* found? */
      init_exp(var, VLOCAL, v);  /* variable is local */
      if (!base)
        markupval(fs, v);  /* local will be used as an upval */
    }
    else {  /* not found as local at current level; try upvalues */
      int idx = searchupvalue(fs, n);  /* try existing upvalues */
      if (idx < 0) {  /* not found? */
        singlevaraux(fs->prev, n, var, 0);  /* try upper levels */
        if (var->k == VVOID)  /* not found? */
          return;  /* it is a global */
        /* else was LOCAL or UPVAL */
        idx  = newupvalue(fs, n, var);  /* will be a new upvalue */
      }
      init_exp(var, VUPVAL, idx);  /* new or old upvalue */
    }
  }
}
{% endhighlight %}

这段代码位于 `lparser.c`, 是 Lua 编译器的一部分. 自带的注释已经很详细了. 首先第 9 行会在当前函数的局部变量中寻找, 若找到则置为局部变量, 并存储它的索引(第几个局部变量), 否则尝试寻找上值. 在编译时每找到一个上值都会存起来, 包含每个上值的索引, 名字, 是否在栈中(即是否是上层函数的局部变量)等. 寻找上值时, 首先 16 行会在已有的上值中寻找, 若能找到, 24 行就将其置为上值并返回; 否则再在 18 行递归调用 `singlevaraux` 到上层函数中找. 若能找到, 则有两个结果: 一是找到它是上层函数的局部变量, 这能知道它是上层函数的第几个局部变量(局部变量索引); 二是找到它是上层函数的上值, 这能知道它是上层函数的第几个上值(上值索引). 然后在 22 行把这个索引存起来, 并标识它是上层函数的局部变量(在栈中)还是上值(不在栈中). 最后, 如果递归运行到第 7 行, 说明找遍嵌套当前函数的所有函数都找不到这个变量, 就认为它是一个全局变量, 在 20 行直接返回.

在运行时, 对于局部变量, 直接通过索引即可获得这个变量的值; 对于上值, 如果在栈中, 则通过索引在上层函数的局部变量中获得这个变量的值, 否则通过索引在上层函数的上值中获得这个变量的值. 也就是说, 对于局部变量和上值, Lua 在编译的时候就为它们编上号了, 运行时通过编号获取变量, 不 care 变量名.(所以不要再说变量名起短些运行效率高了)

### 全局变量

那么对于无法在局部变量和上值中找到的全局变量 Lua 是怎么做的呢? 这就是最有意思的地方了. 我们来看 `singlevaraux` 的调用者 `singlevar`. 当 Lua 编译时每遇到一个变量都会调用它:

{% highlight c linenos %}
static void singlevar (LexState *ls, expdesc *var) {
  TString *varname = str_checkname(ls);
  FuncState *fs = ls->fs;
  singlevaraux(fs, varname, var, 1);
  if (var->k == VVOID) {  /* global name? */
    expdesc key;
    singlevaraux(fs, ls->envn, var, 1);  /* get environment variable */
    lua_assert(var->k != VVOID);  /* this one must exist */
    codestring(ls, &key, varname);  /* key is variable name */
    luaK_indexed(fs, var, &key);  /* env[varname] */
  }
}
{% endhighlight %}

首先 `singlevar` 调用 `singlevaraux` 寻找变量, 如果找不到, 则第 6 行开始处理全局变量. 这里它首先调用 `singlevaraux` 传入了 `ls->envn`. 查查代码就能发现, `ls->envn` 的值为 `"_ENV"`, 也就是它要寻找一个名为 `_ENV` 的变量. 接着在第 9 行将变量名作为字符串存储在常量区, 然后第 10 行生成了一个表查找指令, 在变量 `_ENV` 中查找键为该变量名的值.

也就是说对于每个全局变量 `var` 来说, Lua 都处理成 `_ENV.var`. 那么在我们没有手动定义的情况下, 这个 `_ENV` 变量是从何而来的呢? 我们可以找到它被设置的地方:

{% highlight c linenos %}
/* lparser.c */
static void mainfunc (LexState *ls, FuncState *fs) {
  BlockCnt bl;
  expdesc v;
  open_func(ls, fs, &bl);
  fs->f->is_vararg = 1;  /* main function is always declared vararg */
  init_exp(&v, VLOCAL, 0);  /* create and... */
  newupvalue(fs, ls->envn, &v);  /* ...set environment upvalue */
  luaX_next(ls);  /* read first token */
  statlist(ls);  /* parse main body */
  check(ls, TK_EOS);
  close_func(ls);
}

/* lapi.c */
LUA_API int lua_load (lua_State *L, lua_Reader reader, void *data,
                      const char *chunkname, const char *mode) {
  ZIO z;
  int status;
  lua_lock(L);
  if (!chunkname) chunkname = "?";
  luaZ_init(L, &z, reader, data);
  status = luaD_protectedparser(L, &z, chunkname, mode);
  if (status == LUA_OK) {  /* no errors? */
    LClosure *f = clLvalue(L->top - 1);  /* get newly created function */
    if (f->nupvalues >= 1) {  /* does it have an upvalue? */
      /* get global table from registry */
      Table *reg = hvalue(&G(L)->l_registry);
      const TValue *gt = luaH_getint(reg, LUA_RIDX_GLOBALS);
      /* set global table as 1st upvalue of 'f' (may be LUA_ENV) */
      setobj(L, f->upvals[0]->v, gt);
      luaC_upvalbarrier(L, f->upvals[0]);
    }
  }
  lua_unlock(L);
  return status;
}
{% endhighlight %}

当调用 `load`, `loadfile` 或 `dofile` 等方法的时候, 都会调用到 `lua_load`, 这会加载代码并进行编译. 先在 23 行调用 `luaD_protectedparser` 编译代码, 这会调用到 `mainfunc` 编译 main 函数(或者说 chunk). 注意到第 8 行, 它会给 main 函数设置一个名为 `_ENV` 的上值变量. 然后在 31 行将全局 table 设为 main 函数的第一个上值, 也是它唯一的上值, 即 `_ENV`. 这个全局 table 在 Lua 虚拟机初始化的时候就被创建, 里面包含各种标准库函数.

也就是说在我们访问全局变量的时候, 实际上是在访问上值 `_ENV` 中的键值; 由于嵌套定义的函数会继承其上层函数的上值, 这使得所有的函数访问到的 `_ENV` 变量都是同一个变量, 看上去就像共用相同的全局变量了. 下面这段代码举了个例子:

{% highlight lua linenos %}
local function foo()
    a = 1
    (function()
      b = "str"
    end)()
end

local function bar()
    local _ENV = {}
    c = 3.14
    (function()
      d = "str"
    end)()
end

foo()
bar()

print(a, b, c, d) -- 1 str nil nil
{% endhighlight %}

对于函数 `foo` 来说, 它在第 2 行实际执行的是 `_ENV.a = 1`. 这里的 `_ENV` 继承自 main 函数的上值, 因此在最后能打印出 `a` 为 1. `b` 也是同样的道理. 但对于函数 `bar` 来说, 它执行到第 10 行和 第 12 行的时候, 实际是为它在第 9 行定义的局部变量设置键值, 因此在最后不能打印出来.

### _G: 那我呢?

既然 Lua 5.3 中的全局变量实际上是 `_ENV` 中的键值, 那 `_G` 是什么呢? 事实上, `_G` 是 `_ENV` 中的一个键, 其值指向 `_ENV` 本身. 也就是有 `_ENV._G = _ENV`. 这样做完全是为了兼容以前的写法, `_G` 已经失去它以前的含义了. 即使你执行 `_G = nil` 也是没关系的, 只要你不手动访问 `_G`, 就不会有任何影响.

BTW, LuaJIT 的用户习惯在文件头写上 `local _G = _G` 并在使用全局变量时显式指定 `_G.var`, 因为这样能更快些. 在 Lua 5.3 中, 这样做就没有任何意义了. 并且如果你忘记在文件头加上 `local _G = _G` 的话还会更慢, 因为这样做相当于 `_ENV._G.var` 多了一次 table 查找.

### 总结

Lua 5.3 把非局部, 非上值的变量 `var` 定义为 `_ENV.var`; 并且为 main 函数设置了一个初始的上值 `_ENV` 等于一个 table. 除此之外没有做任何其他的工作就实现了全局变量的效果. 因此我们可以说 Lua 5.3 中的全局变量实际上只是一个语法糖. 这种设计简洁精美, 非常漂亮. 不得不说 Lua 是一门贯彻了 Less is batter than more 的语言; 它的源码也是一座宝库, 值得每个人学习.
