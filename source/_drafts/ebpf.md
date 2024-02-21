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

运算符有与 C 相同的算数运算符 `+`, `-`, `*`, `/`; 比较运算符 `<`, `<=`, `>`, `>=`, `==`; 复制运算符 `=`, `+=`, `-=` 等、自增运算符 `i++`, `--i` 等。使用 `.` 作为字符串连接运算符。

局部变量使用赋值语句直接定义，如 `a = 0`。全局变量需要用关键字 `global` 声明，如 `global a = 0`。

使用 `$var` 可以获取探测点上下文的变量。例如函数 `int foo(int a) {}`, 如果 probe `foo` 函数，我们可以用 `$a` 获取参数 `a` 的值。在取变量前可以用 `@define` 判断变量是否存在。例如

```systemtap
probe process("a.out").function("foo") {
    if (@define($a)) {
        printf("%d\n", $a);
    }
}
```



#### 内建变量与函数

### 实战：基于采样的火焰图



## eBPF