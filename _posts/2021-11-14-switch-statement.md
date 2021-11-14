---
key: 59
title: Switch 语句的语义
tag: c/c++
aside: false
---
`switch` 语句一般用于多重分支选择. 不过 `switch` 的语义与 `if ... else if` 完全不同, 它更像是 `goto` 语句. `switch` 只接一个语句块, 语句块中可以包含一些 `case` 跳转标签, `switch` 先对表达式求值, 然后跳转至对应的标签. `break` 可以跳出 `switch` 语句.

```c++
switch (state) {
    case 1:
        foo();
        break;
    case 2:
        bar();
        break;
}
```

因为 `switch` 语句是简单粗暴的跳转, 所以它并没有什么结构性可言. 所以我们可以写出一些奇奇怪怪的 `switch` 语句:

```c++
int n, i = 0;
switch (std::cin >> n, n) {
    default:
    for (i = n; i < 10; ++i) {
        case 0:
        std::cout << i << std::endl;
    }
}
```

上面的代码完全合法, 类似 `goto`, 跳转是无所谓层级结构的, 因此当 `n` 等于 0 时, 跳转至循环体内部也是完全合法的. 也许是因为这种用法比较 hack, 很少有教材和教程会告诉你 `switch` 语句还能这么用. 这一特性的一个比较著名的应用就是 [Duff's device](https://en.wikipedia.org/wiki/Duff%27s_device):

```c
send(to, from, count)
register short *to, *from;
register count;
{
    register n = (count + 7) / 8;
    switch (count % 8) {
    case 0: do { *to = *from++;
    case 7:      *to = *from++;
    case 6:      *to = *from++;
    case 5:      *to = *from++;
    case 4:      *to = *from++;
    case 3:      *to = *from++;
    case 2:      *to = *from++;
    case 1:      *to = *from++;
            } while (--n > 0);
    }
}
```

这是风格非常古老的 C 代码. 它所做的是将 `from` 指向的数据复制到 `to`, 中, 一共有 `count` 个. 如果使用常规的写法, `while` 循环要执行 `count` 次, 表达式 `--n > 0` 也需求值 `count` 次. Duff's device 的做法是让循环执行 $$\lceil \frac{\mathrm{count}}{8} \rceil$$ 次, 如果 `count` 不能被 8 整除, 则会在第一次循环时用 `switch` 语句跳转至循环体的相应位置, 让第一次循环时 `*to = *from++` 执行 `count % 8` 次; 再加上接下来的 $$ \lfloor \frac{\mathrm{count}}{8} \rfloor $$ 次循环, 保证赋值语句始终执行 `count` 次. 这样 `while` 的条件判断次数减少为常规做法的 1/8.

正是因为这种可随意跳转的特性, C/C++ 就必须对其做一些限制. 我们不能在 `switch` 语句块中随意初始化变量:

```c++
switch (state) {
    case 1:
        int a = foo(); // error: jump bypasses variable initialization
        break;
    case 2:
        bar();
        break;
}
```

这是因为整个 `switch` 的语句块是同一个作用域, 因此变量 `a` 的作用域包括 `case 2:`. 如果 `state` 为 2, `case 2:` 中就能访问到一个未初始化都变量 (虽然它没这么做). 这个规则与 `goto` 语句一致:

```c++
goto next
int a = foo(); // error: jump bypasses variable initialization
next:
bar();
```

解决办法是手动限制变量的作用域, 让变量只存在于特定 case 中:

```c++
switch (state) {
    case 1: {
        int a = foo();
        break;
    }
    case 2: {
        bar();
        break;
    }
}
```

如果只是声明变量而没有初始化它, 则也是合法的. 这与 `goto` 语句一样:

```c++
switch (state) {
    int a, b;
    case 1:
        a = 1;
        break;
    case 2:
        b = 2;
        break;
}

goto next
int c;
next:
foo(c = 1);
```

因此与其称 `switch` 为 "多分支选择语句", 不如称其为 "条件跳转语句" -- 与之对应的 `goto` 是无条件跳转语句. 正是因为这种语义比较 hack, 所以后来新出的一些语言虽然有 `switch` 语句, 但是语义完全不同. 例如 C# 的 `switch` 语句要求 `case` 必须对应一个 `break`, 除非这个 `case` 为空; Go 的 `switch` 语句的每个 `case` 都是一个明确的分支. 这样的 `switch` 语句才能光明正大地称为 "多分支选择语句".

Python 中的 `if ... elif` 也可以认为是多分支选择语句:

```python
if a == 1:
    foo()
elif a == 2:
    bar()
elif a == 3:
    baz()
```

其中各个 `if` 和 `elif` 的地位是等同的, 它的语法树是这样的:

```
if
├── case 1
│     ├── condition: a == 1
│     └── statements...
├── case 2
│     ├── condition: a == 2
│     └── statements...
└── case 3
      ├── condition: a == 3
      └── statements...
```

而 C/C++ 中 `if ... else if` 这样的用法则不能认为是多分支选择语句, 因为它的语义实际上是嵌套 if-else. 它的语法树是这样的:

```
if: a == 1
├── statements...
└── if: a == 2
    ├── statements...
    └── if: a == 3
         └── statements...
```
