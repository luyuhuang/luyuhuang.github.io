---
title: 从 SystemTap 到 eBPF
tag: [linux, tools]
---

这篇文章我们谈一谈调试技术。

## 交互式调试与动态插桩 (dynamic instrumentation)

如果我们使用 gdb 调试程序，首先要设置断点。gdb 会通过 `ptrace` 系统调用修改断点处的指令，当该指令执行时会触发中断，并通过信号唤醒 gdb 进程。此时便进入了 gdb 的交互界面，我们可以通过命令查询或修改当前上下文的变量，这都是 gdb 通过 `ptrace` 系统调用实现的。这样的调试我们在这里称为*交互式调试*。也就是设置断点，运行到断点处进入交互界面，然后执行操作。

另外一种技术是 *dynamic instrumentation*, 我们这里翻译为*动态插桩*。不同于交互式调试，调试者需要预先设定断点 (probe) 和断点处执行的操作。调试器会修改目标进程的 text 空间，将调试指令动态插桩到断点指令处。Linux 支持 kprobe 和 uprobe，分别对应用户态插桩和内核态插桩。

交互式调试和动态插桩应用于不同的场景。

- 交互式调试适用于临时查找、调试一个问题，断点处的操作是随心所欲的，整个调试过程也是手动的。
- 而动态插桩适用于性能分析、程序运行情况统计。例如可以 probe `malloc` 函数，统计内存分配情况；或者 probe 内核函数 `task_switch`，统计进程切换情况。这样的调试程序可以写成一个脚本，需要时直接运行。整个过程是自动的。

本文主要介绍两种动态插桩工具：SystemTap 和 eBPF。

## SystemTap

Kprobe 和 uprobe 是 Linux 内核的功能。我们可以通过编写内核模块来使用它们。然而编写内核模块不仅费时费力，而且危险。如果出现错误会导致 kernel panic，就只能重启机器了。为了解决这个问题，SystemTap 应运而生。SystemTap 提供了一种脚本语言，用户编写 SystemTap 脚本，然后 SystemTap 工具链将脚本编译成 C 语言，然后再编译成内核模块，最后加载运行。SystemTap 脚本比 C 语言好写，并且限制了一些能力，使之只能执行一些相对安全的操作。

### 安装

要安装 SystemTap，首先需要确保系统安装了内核调试信息。这可以直接通过包管理器安装。以 Ubuntu 系统为例：

```sh

```

或者编译安装。这需要下载对应版本的 Linux 内核，然后编译

### Get Started

SystemTap 脚本的基本语法是 `probe 探测点 {调试代码}`。例如：

```systemtap
probe begin {
    print("tracing...\n")
}

probe syscall.open* {
    printf("%s(%d) %s(%s)\n", execname(), pid(), ppfunc(), argstr)
}
```

- `begin` 是一个特殊的探测点，表示 SystemTap 程序开始。这里会在开始时打印 "tracing..."。
- `syscall.open*` 表示探测所有以 `open` 开头的系统调用，如 `open`, `openat`。`*` 在这里表示通配符。
- `printf` 用法与 C 语言相同，这里在每次 `open*` 系统调用触发时，都打印一些信息：
    - `execname()` 程序的名字
    - `pid()` 进程的 PID
    - `ppfunc()` 被调用函数的名称
    - `argstr` 函数的参数，以便于人类理解的方式显示

我们把上面的 SystemTap 脚本存为文件 `opensnoop.stp`，并执行：

```sh
$ sudo stap opensnoop.stp
tracing...
init(156) __x64_sys_open("/proc/net/tcp", O_RDONLY|O_LARGEFILE)
init(156) __x64_sys_open("/proc/net/tcp6", O_RDONLY|O_LARGEFILE)
ls(1511) __x64_sys_openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC)
ls(1511) __x64_sys_openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libselinux.so.1", O_RDONLY|O_CLOEXEC)
ls(1511) __x64_sys_openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC)
ls(1511) __x64_sys_openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libpcre2-8.so.0", O_RDONLY|O_CLOEXEC)
ls(1511) __x64_sys_openat(AT_FDCWD, "/proc/filesystems", O_RDONLY|O_CLOEXEC)
```

可以看到每当 open 系的系统调用被调用时，SystemTap 都答应一条信息，显示调用进程名、进程 ID、调用的函数名、函数参数等信息。执行命令 `stap opensnoop.stp` 的时候，SystemTap 会解析脚本，将其编译成 C 语言，然后再编译成内核模块，并加载执行。我们可以使用命令 `lsmod` 查看加载的内核模块：

```sh
$ lsmod
stap_24fb7ff819dbf573d3fc20084c5065a4__1568   118784  1
```

### 语法介绍

#### 探测点

SystemTap 支持各种各样的探测点

- `begin`, `end` 分别对应 SystemTap 的开始和结束
- `kernel.function("sys_open")`: 内核函数 `sys_open` 的入口
- `syscall.close.return`: 系统调用 close 的返回点
- `module("ext3").statement(0xdeadbeef)`: ext3 文件系统驱动在 0xdeadbeef 处的指令
- `timer.ms(200)`: 200ms 定时器
- `timer.profile`: 在每个CPU上周期性启动的计时器
- `process("a.out").function("foo")`: a.out 中名为 `foo` 的函数
- `process("a.out").statement("*@main.c:200")`: a.out 在 main.c 200 行处的语句

如果不清楚具体的探测点，我们可以用 `stap -l PATTERN` 命令列出可用的探测点。例如

```sh
$ stap -l 'syscall.open*'
syscall.open
syscall.open_by_handle_at
syscall.openat
```

#### 语法结构

SystemTap 的语法类似于 C 语言。它有基础的控制流语句

```systemtap
if (pid() == target()) {
    print(1);
} else {
    print(0);
}

while (i < 10) {
    ++i;
}

for (i = 0; i < 10; ++i)
    print(i);
```

运算符有与 C 相同的算数运算符 `+`, `-`, `*`, `/`、比较运算符 `<`, `<=`, `>`, `>=`, `==`、逻辑运算符 `&&`, `||`, `!`、赋值运算符 `=`, `+=`, `-=`、自增运算符 `i++`, `--i` 等。`.` 为字符串连接运算符，类似的有 `.=` 运算符。

```systemtap
a + b
a * (b + 1)
a > b && b > c
a = 42
a += 10
s = "hello" . " " . "world"
s .= "!"
```

局部变量使用赋值语句直接定义，如 `a = 0`。全局变量需要用关键字 `global` 声明，如 `global a = 0`。变量类型自动推导，但这不意味着它支持动态类型。如果出现类型不一致，如 `a = 1; a = "hello";` 则会报错。

使用 `$var` 可以获取探测点上下文的变量。例如函数 `int foo(int a) {}`, 如果 probe `foo` 函数，我们可以用 `$a` 获取参数 `a` 的值。在取变量前可以用 `@define` 判断变量是否存在。例如

```systemtap
probe process("a.out").function("foo") {
    if (@define($a)) {
        printf("%d\n", $a);
    }
}
```

上下文变量有可能是结构体或者指向结构体的指针。我们可以使用成员运算符 `->` 访问其中的成员。在 SystemTap 中永远使用 `->` 作为成员运算符，无论是值类型还是指针类型。（`.` 是字符串连接运算符）

```systemtap
probe process("lua").function("luaD_precall") {
    printf("%d\n", $L->ci->callstatus);
}
```

#### 数据类型

SystemTap 只有两种基础类型：数字和字符串。数字是一个 64 位有符号整数，也就是 `int64_t`。字符串实际上是一个固定大小的字符数组，用 `'\0'` 标识字符串结尾。字符串最大长度由宏 `MAXSTRINGLEN` 决定，默认大小是 128，超出的部分会被截断。可以在执行 `stap` 的指定参数 `-DMAXSTRINGLEN=1024` 修改它，但是要注意过大的值会导致内核占用内存过高。

SystemTap 支持关联数组作为复合数据结构。关联数组只能定义为全局变量。关联数组实际上是一个固定容量的哈希表，容量由宏 `MAXMAPENTRIES` 决定，默认大小是 2048。同样可以通过参数 `-DMAXMAPENTRIES=` 修改它。

```systemtap
global a;

probe begin {
    ++a[0];
    a[1] = 123;
    printf("%d\n", a[0]);
    delete a[0]; // 删除一个 key
    delete a; // 删除所有 key
}
```

一次 `a[1] = 123` 或 `++a[0]` 这样的操作会让编译器推导出 `a` 是一个 key 和 value 都为数字的关联数组。后续的所有操作不能与之冲突。

```systemtap
global a;

probe begin {
    a[1] = 123;
    a[2] = "hello"; // 错误：value 应该是数字
    a["ma"] = 123; // 错误：key 应该是数字
    a = 123; // 错误：a 是关联数组，不能赋值为数字
}
```

关联数组 key 和 value 都只能是基础类型，不支持嵌套。也就是说 `a[0][1] = 1` 这样的操作是非法的。但是关联数组支持多维 key:

```systemtap
global b;

probe begin {
    b[1, "hello"] = 123;
}
```

可以用 `foreach` 语句遍历数组。

```systemtap
foreach (k in a) {
    printf("%d -> %d\n", k, a[k]);
}

foreach ([k1, k2] in b) { // 注意多维 key 的遍历语法
    printf("%d, %s -> %d\n", k1, k2, b[k1, k2])
}
```

#### 内建函数与变量

SystemTap 提供了很多方便的内建变量和函数。

| 函数 | 描述 |
|:----|:-----|
| `tid()` | 当前线程的 ID |
| `pid()` | 当前进程（组）的 ID |
| `uid()` | 当前用户的 ID |
| `execname()` | 当前进程的名称 |
| `cpu()` | 当前的 CPU 号 |
| `gettimeofday_s()` | 当前的 UNIX 时间戳 |
| `get_cycles()` | 硬件周期计数器的快照 |
| `pp()` | 返回一个描述当前探测点的字符串 |
| `ppfunc()` | 当前探测点所在的函数名 |
| `argstr` | 一个描述当前探测点所在的函数的参数的字符串 |

更多请参照 SystemTap 官方文档。

### 实战：基于采样的火焰图

火焰图是一种很实用的性能分析工具。

## eBPF
