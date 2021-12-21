---
title: "[翻译] x86 汇编编程的基础介绍"
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

x86 CPU 有八个 32 位通用寄存器. 由于历史愿意, 这八个寄存器名为 {eax, ecx, edx, ebx, esp, ebp, esi, edi}. (其他 CPU 架构会简单地称它们为 r0, r1, ..., r7.) 每个寄存器可以存储任何 32 位证书值. x86 架构实际上有超过一百个寄存器, 但是我们只会在需要时介绍其中特定的一些.

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

## 5. 内存地址, 读和写

## 6. 跳转, 标签和机器码

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
