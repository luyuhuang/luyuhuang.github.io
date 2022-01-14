---
title: "[翻译] x86 汇编的基础介绍"
tag: [translations, assembly]
---
> 原文 [A fundamental introduction to x86 assembly programming](https://www.nayuki.io/page/a-fundamental-introduction-to-x86-assembly-programming)

## 0. 介绍

x86 指令集架构是近 20 年来我们家庭电脑和服务器所使用的 CPU 的核心. 能够阅读和编写低级汇编语言是一项很强大的技能, 这能够让你写出快速的代码, 使用 C 语言中无法使用的机器特性, 以及对编译过的代码进行逆向工程.

不过开始学习汇编可能是一个令人生畏的任务. Intel 的官方文档手册足足有一千多页. 二十年间的演化需要不断地向后兼容, 产生了这样的景观: 不同年代设计原则的冲突, 各种过时的特性, 一层又一层的模式转换, 以及每种模式都有例外.

在这个教程中, 我会帮助你深刻地理解 x86 架构的基础原则. 我会更多地专注在为正在发生的事情建立一个清晰的模型, 而不是详解每一个细节 (这会读起来又长又无聊). 如果你想使用这些知识, 你需要同时参考其他展示如何编写和编译简单函数的教程, 并打开一个 CPU 指令列表以供参考. 我的教程会从熟悉的领域开始并逐步增加复杂性 -- 不会像其他文档一样倾向于一次性列出所有的信息.

阅读这个教程需要你熟悉二进制数字, 有中等程度的命令式语言 (C / C++ / Java / Python / 等) 的编程经验, 并且了解 C/C++ 的内存指针. 你不必需要知道 CPU 内部是如何工作的, 也不需要事先接触过汇编语言.

## 1. 工具和测试

阅读这个教程的时候, 编写并测试自己的汇编程序会很有帮助. 这在 Linux 上是最简单的 (Windows 也可以, 但是更麻烦). 这是一个简单的汇编语言函数的例子:

```nasm
.globl myfunc
myfunc:
    retl
```

将它保存在一个名为 `my-asm.s` 的文件中, 然后使用命令 `gcc -m32 -c -o my-asm.o my-asm.s` 编译它. 目前我们还没法运行它, 因为这需要与 C 程序链接, 或者编写样板代码与操作系统交互以处理启动, 打印, 停止等. 不过至少, 能够便利代码给你提供一种方法来校验你的汇编程序语法是否正确.

注意我的教程使用 AT&T 汇编语法而不是 Intel 语法. 它们在概念上是相同的, 只不过标记法有些不同. 它们之间可以从一种编译到另一种, 所以我们不需要太关心它.

## 2. 基本运行环境

x86 CPU 有八个 32 位通用寄存器. 由于历史愿意, 这八个寄存器名为 {eax, ecx, edx, ebx, esp, ebp, esi, edi}. (其他 CPU 架构会简单地称它们为 r0, r1, ..., r7.) 每个寄存器可以存储任何 32 位整数值. x86 架构实际上有超过一百个寄存器, 但是我们只会在需要时介绍其中特定的一些.

粗略地说, CPU 会按照源代码中列出的顺序, 按顺序一个接着一个地执行一系列指令. 稍后, 我们会看到代码执行路径可以时非线性的, 包括一些概念如 if-then, 循环, 函数调用.

![cpu-model](/assets/images/x86-assembly_1.svg){:width="500"}

实际上有八个 16 位和八个 8 位寄存器，它们是八个 32 位通用寄存器的一部分. 这些特性来源于 16 位时代的 x86 CPU, 但是在 32 位模式下偶尔还是会用. 八个 16 位寄存器名为 {ax, cx, dx, bx, sp, bp, si, di}, 代表相应的 32 位寄存器 {eax, ecx, ..., edi} 的低 16 位部分. (前缀 "e" 表示扩展 "extended"). 八个 8 位寄存器名为 {al, cl, dl, bl, ah, ch, dh, bh}, 代表寄存器 {ax, cx, dx, bx} 的高八位和低八位. 每当修改 16 位或 8 位寄存器的值时, 所属的 32 位寄存器的高位部分将保持不变.

![register-aliasing](/assets/images/x86-assembly_2.svg){:width="500"}

## 3. 基本算术指令

最基础的 x86 算术指令运行在两个 32 位寄存器上. 第一个操作数作为源, 第二个操作数既作为源又作为目标. 例如: `addl %ecx, %eax` -- 用 C 表示, 就是 `eax = eax + ecx;`, 其中 eax 和 ecx 的类型都是 `uint32_t`. 很多指令都符合这个重要的模式, 例如:

- `xorl %esi, %ebp` 意为 `ebp = ebp ^ esi;`.
- `subl %edx, %ebx` 意为 `ebx = ebx - edx;`.
- `andl %esp, %eax` 意为 `eax = eax & esp;`.

有些算术指令只使用一个寄存器作为参数, 例如:

- `notl %eax` 意为 `eax = ~eax;`.
- `incl %ecx` 意为 `ecx = ecx + 1;`.

位移和位旋转指令使用一个 32 位寄存器作为要位移的值, 并使用一个固定 8 位的寄存器 `cl` 作为位移数. 例如 `shll %cl, %ebx` 意为 `ebx = ebx << cl;`.

很多算数指令可以使用立即值 (immediate value) 作为第一个操作数. 立即值是固定的 (不可变) 且编码在指令中. 立即值以 `$` 开头. 例如:

- `movl $0xFF, %esi` 意为 `esi = 0xFF;`.
- `addl $-2, %edi` 意为 `edi = edi + (-2);`.
- `shrl $3, %edx` 意为 `edx = edx >> 3;`.

注意 `movl` 指令将第一个参数的值复制到第二个参数上 (这并不是严格意义上的 "移动 (move)", 但这是惯用的名称). 在使用寄存器时, 如 `movl %eax, %ebx`, 这意味着将 `eax` 寄存器的值复制到 `ebx` 中 (这会覆盖 `ebx` 原先的值).

### 题外话

现在很适合提一下汇编编程的一个原则: 并非所有你想要的操作都能够直接表达成一条指令. 在大多数人使用的编程语言中, 许多结构是可组合的, 以适用于不同的情况, 且算术表达式是可以嵌套的. 而在汇编语言中, 你只能写指令集允许的内容. 举几个例子说明:

- 你不能将两个立即值常量相加, 即使在 C 里能这样做. 在汇编中你只能在编译的时候计算这个值, 或者用多个指令表示它.
- 你可以用一条指令将两个 32 位寄存器相加, 但是你不能将三个寄存器相加 -- 你需要将它拆分成两条指令.
- 你不能将 16 位寄存器与 32 位寄存器相加. 你需要先写一条将 16 位转换成 32 位的指令, 再写一条执行加法的指令.
- 执行位移操作时, 位移数要么是硬编码的立即值, 要么放在寄存器 `cl` 中. 它不能放在其他寄存器里. 如果为位移数在其他寄存器中, 它必须先复制到 `cl` 中.

总之需要记住的是你不能尝试猜测或者发明不存在的语法 (如 `addl %eax, %ebx, %ecx`); 而且, 如果你无法从支持的指令列表中找到想要的指令, 你就必须用一串别的指令手动实现它 (这可能需要分配一些临时的寄存器来存储中间值).

## 4. 标识寄存器和比较

很多指令会隐含地读写一个名为 `eflags` 的 32 位寄存器. 换句话说, 这个寄存器的值会在指令执行时用到, 但它不会写在汇编代码中.

![eflags](/assets/images/x86-assembly_3.svg){:width="600"}

像 `addl` 这样的算术指令经常会根据计算的结果更新 `eflags`. 这个指令会设置或清除一些标志位, 如进位标志 (`CF`), 溢出标志 (`OF`), 符号标志 (`SF`), 奇偶标志 (`PF`), 零标志 (`ZF`) 等. 有些指令会读取标志 -- 例如, `adcl` 指令将两个数字相加并使用进位标志作为第三个操作数: `adcl %ebx, %eax` 意味 `eax = eax + ebx + cf;`. 有些指令根据标志位设置寄存器 -- 例如 `setz %al`, 如果设置了 `ZF` 标志位, 则把 8 位寄存器 `al` 置零. 有些指令指令直接操作单个标志位, 如 `cld` 指令会清除方向标志 (`DF`).

比较指令不改变任何通用寄存器, 而是操作 `eflags`. 例如, `cmpl %eax, %ebx` 会比较两个寄存器的值, 将它们相减并根据差设置标志位. 所以无论在有符号还是无符号模式下他能告诉我们是 `eax < ebx` 还是 `eax == ebx` 抑或是 `eax > ebx`. 类似地, `testl %eax, %ebx` 计算 `eax & ebx` 并根据结果设置标志位. 大多数情况下, 比较指令后面跟着一个条件跳转指令 (稍后介绍)

到目前为止, 我们知道了一些标志位和算术运算相关. 其他标志位于 CPU 的行为相关 -- 如是否接受硬件终端, 虚拟 8086 模式, 和其他系统开发者 (而不是应用开发者) 关心的系统管理方面的东西. 大多数情况下, 系统标志位可以忽略; 除非涉及到比较和大整数运算, 算术标志位我们也不用关心.

## 5. 内存地址, 读和写

CPU 本身并不能成为非常有用的计算机. 只有 8 个数据寄存器严重限制了你能执行的运算, 因为你存不了多少信息. 为了增强 CPU, 我们有 RAM 作为大内存. 基本上, RAM 是一个巨大的字节数组 -- 例如, 128 Mib 的 RAM 有 134 217 728 个字节, 你可以用来存储任何数据.

![ram](/assets/images/x86-assembly_4.svg){:width="500"}

当我们存储一个大于一字节的值时, 该值以小端编码. 例如一个 32 位寄存器的值为 0xDEADBEEF, 它需要存储在起始地址为 10 的内存中, 则字节 0xEF 存放在地址 10 中, 0xBE 存在地址 11 中, 0xAD 存在地址 12 中, 0xDE 存在地址 13 中. 当我们从内存中读取值时, 应用同样的规则 -- 低地址的字节装在在寄存器的低位部分.

![little-endian](/assets/images/x86-assembly_5.svg){:width="500"}

显然, CPU 要有读取内存的指令. 具体地说, 你可以在内存的任意地址加载或存储一个或多个字节. 你能做的最简单的事就是读写单个字节:

- `movb (%ecx), %al` 意为 `al = *ecx;`. (这会将内存地址 ecx 处的字节读取到 8 位寄存器 `al` 中)
- `movb %bl, (%edx)` 意为 `*edx = bl;`; (这会将 `bl` 中的字节写到内存地址 edx 处的字节中)
- (在示例的 C 代码中, `al` 和 `bl` 的类型为 `uint8_t`, `ecx` 和 `edx` 的类型从 `uint32_t` 转换成 `uint8_t*`)

很多算术指令允许其中一个操作数是地址 (不能两个都是). 例如:

- `addl (%ecx), %eax` 意为 `eax = eax + (*ecx);`. (这将从内存中读取 32 位)
- `addl %ebx, (%edx)` 意为 `*edx = (*edx) + ebx;`. (这会从内存中读写 32 位)

### 寻址模式

当我们写循环代码时, 通常会用一个寄存器保存数组的地址, 然后用另一个寄存器保存当前正在处理的索引. 尽管能够手动计算出当前处理的元素的地址, x86 指令集提供了一种更优雅的解决方案 -- 寻址模式. 它允许你你将一些寄存器相加或相乘. 举些例子可能会更清楚:

- `movb (%eax,%ecx), %bh` 意为 `bh = *(eax + ecx);`.
- `movb -10(%eax,%ecx,4), %bh` 意为 `bh = *(eax + (ecx * 4) - 10);`.

地址的格式为 `offset(base, index, scale)`, 其中 `offset` 是一个整形常数 (可为正数, 负数, 或 0), `base` 和 `index` 是 32 位寄存器 (但是某些组合不允许), `scale` 为 `{1, 2, 4, 8}` 中的一个. 例如对于一个存储 64 位整数的数组, 我们使用 `scale = 8` 因为每个元素都是 8 字节长度.

只要内存访问合法, 寻址模式就总是有效的. 因此如果你能写 `sbbl %eax, (%eax)`, 那么你也可以写 `sbbl %eax, (%eax,%eax,2)`, 如果你需要这么做的话. 此外注意计算出的地址是一个临时的值, 并不会存储在任何寄存器中. 这很方便, 因为如果要显式计算地址的话, 你还得为其分配一个寄存器; 只有 8 个通用寄存器相当紧张 , 特别是当你还有别的变量要存储的时候.

## 6. 跳转, 标签和机器码

每个汇编指令可以有零个或多个标签作为前缀. 当我们需要跳转到特定指令时, 这些标签会很有用. 例如:

```nasm
foo:  /* A label */
negl %eax  /* Has one label */

addl %eax, %eax  /* Zero labels */

bar: qux: sbbl %eax, %eax  /* Two labels */
```

The jmp instruction tells the CPU to go to a labelled instruction as the next instruction to execute, instead of going to the next instruction below by default. Here is a simple infinite loop:

`jmp` 指令告诉 CPU 转到标签指定的指令作为下一个执行的指令, 而不是默认的执行接下来的那个指令. 下面的例子是一个简单的死循环:

```nasm
top: incl %ecx
jmp top
```

尽管 `jmp` 跳转是无条件的, x86 还是有其它的跳转指令, 它们检查 `eflags` 的状态, 根据条件是否满足决定是跳转到指定标签还是执行接下来的指令. 条件跳转指令包括: `ja` (大于则跳转), `jle` (小于等于则跳转), `jo` (溢出则跳转), `jnz` (非零则跳转), 等等. 它们总共有 16 种, 其中很多是等价的 -- 例如, `jz` (为零则跳转) 与 `je` (相等则跳转) 相同, `ja` (大于则跳转) 与 `jnbe` (不小于等于则跳转) 相同. 下面是一个使用跳转指令的例子:

## 7. 栈

## 8. 调用约定

## 9. 可重复的字符串指令

## 10. 浮点数和 SIMD

## 11. 虚拟内存

## 12. 64 位模式

## 13. 对比其他架构

## 14. 总结

## 15. 扩展阅读

- [University of Virginia CS216: x86 Assembly Guide](http://www.cs.virginia.edu/~evans/cs216/guides/x86.html)
- [Wikipedia: x86 instruction listings](https://en.wikipedia.org/wiki/X86_instruction_listings)
- [Intel® 64 and IA-32 Architectures Software Developer Manuals](https://software.intel.com/content/www/us/en/develop/articles/intel-sdm.html)
- [Carnegie Mellon University: Introduction to Computer Systems: Machine-Level Programming I: Basics](https://www.cs.cmu.edu/afs/cs/academic/class/15213-f20/www/lectures/05-machine-basics.pdf)
- [Carnegie Mellon University: Introduction to Computer Systems: Machine-Level Programming II: Control](https://www.cs.cmu.edu/afs/cs/academic/class/15213-f20/www/lectures/06-machine-control.pdf)
