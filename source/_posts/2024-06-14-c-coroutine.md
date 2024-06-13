---
key: 79
title: 用 C 语言实现协程
tag: [c/c++, assembly, featured]
---
协程与线程（进程）[^1]都是模拟多*任务（routine）*并发执行的软件实现。操作系统线程在一个 CPU 线程中模拟并发执行多个任务，而*协程（coroutine）*在一个操作系统线程中模拟并发执行多个任务。 因此协程也被称为“用户态线程”、“轻量级线程”。之所以说“模拟并发执行”，是因为任务实际并没有同时运行，而是通过来回切换实现的。

![](/assets/images/c-coroutine_1.svg)

线程切换由操作系统负责，而协程切换通常由程序员直接控制。程序员通过 resume/yield 操作控制协程切换。resume 操作唤醒一个指定协程；yield 操作挂起当前协程，切换回唤醒它的协程。如果你用过 Lua 的协程，就会很熟悉这套流程。不过 Lua 是基于 *Lua 虚拟机（LVM）*的脚本语言，它只需要 LVM 中执行“虚拟的”上下文切换。本文介绍如何用 C 语言（和一点点汇编）实现一个 native 协程，执行真正的上下文切换。这个实现非常简单，总共不到 200 行代码。我参考了 [libco](https://github.com/tencent/libco) 的实现。本文的完整代码见 [toy-coroutine](https://github.com/luyuhuang/toy-coroutine)。

## 上下文切换

所谓的上下文，就是一段程序之前做了什么，接下来要做什么，以及做事情过程的中间产物。例如我们有函数 `f`。`f` 需要知道下一个指令是什么才能接着往下执行，便是“接下来要做什么”。`f` 函数还需要知道之前是谁调用了它，以便把结果返回给调用者，便是“之前做了什么”。在 `f` 函数执行过程中，局部变量要存好（不能被写坏），接下来的指令才能正确执行。这便是“过程的中间产物”。

在 x86-64 下，“之前做了什么” 存储在栈里。函数调用会执行 `call` 指令，把当前函数的下一个指令的地址压入栈顶，然后再跳转到被调用函数。被调用函数返回时执行 `ret` 指令，从栈顶取出调用者的返回点地址，然后跳转到返回点。因此栈上存有所有前序调用者的返回点地址。

函数的局部变量通常储存在 16 个通用寄存器中，如果寄存器不够用，就存在栈里（只要在函数返回前将它们弹出，让栈顶是返回点地址即可）。函数调用的参数也是局部变量，存在约定的 6 个通用寄存器里。如果不够用，也存在栈里。

至于“接下来要做什么”，其实也在栈里。上下文切换不过是调用一个函数，调用者在调用它之前已经把下一个指令的地址压栈了。当上下文切换函数返回，`ret` 指令自然会跳转到接下来要执行的指令。所以上下文就是 16 个通用寄存器 + 栈。

所有的协程共享同一个 CPU，也就共享同样的 16 个通用寄存器。如果我们要把 A 协程切换成 B 协程，就要把当前 16 个通用寄存器的值存在 A 协程的数据结构里；然后再从 B 协程的数据结构里取出 B 协程的寄存器的值，写回通用寄存器中。我们还要处理栈。不过栈与寄存器不同，x86-64 规定 `%rsp` 寄存器（也是通用寄存器之一）存的值便是栈顶的地址。不同的协程不必共享栈，它们可以分配各自的栈，上下文切换时将 `%rsp` 指向各自的栈顶即可。

实际上我们不必存储全部的 16 个通用寄存器，它们有些是*暂存寄存器（Scratch Registers）*，是允许被写坏的。这些寄存器的值可能在执行一次函数调用后就变了（被被调用函数写坏的）。编译器也不会在暂存寄存器里存储函数调用后还要用的值。参考 libco 的实现，我们存储 13 个寄存器：

```c
enum {
    CO_R15 = 0,
    CO_R14,
    CO_R13,
    CO_R12,
    CO_R9,
    CO_R8,
    CO_RBP,
    CO_RDI,
    CO_RSI,
    CO_RDX,
    CO_RCX,
    CO_RBX,
    CO_RSP,
};

struct co_context {
    void *regs[13];
};
```

有些寄存器有特殊的用途。这里我们只需要知道这三个：

- `%rsp`: 栈寄存器，指向栈顶。
- `%rdi`, `%rsi`: 第一参数寄存器和第二参数寄存器，调用函数前将第一个参数存在 `%rdi` 里，第二个存在 `%rsi` 里（剩下的四个依次是 `%rdx`, `%rcx`, `%r8`, `%r9`, 不过这里我们用不上），然后执行 `call` 指令。

接着我们定义一个函数做上下文切换，把当前通用寄存器的值保存在 `curr` 中，再把 `next` 中保存的寄存器的值写回各个通用寄存器。

```c
extern void co_ctx_swap(struct co_context *curr, struct co_context *next);
```

Emm，这个函数没法用 C 语言实现，我们得用到一点点汇编了。其实非常简单，我们只需要用 `movq` 指令存取寄存器。代码如下：

```asm
.globl co_ctx_swap

co_ctx_swap:
    movq %rsp, 96(%rdi)
    movq %rbx, 88(%rdi)
    movq %rcx, 80(%rdi)
    movq %rdx, 72(%rdi)
    movq %rsi, 64(%rdi)
    movq %rdi, 56(%rdi)
    movq %rbp, 48(%rdi)
    movq %r8, 40(%rdi)
    movq %r9, 32(%rdi)
    movq %r12, 24(%rdi)
    movq %r13, 16(%rdi)
    movq %r14, 8(%rdi)
    movq %r15, (%rdi)

    movq (%rsi), %r15
    movq 8(%rsi), %r14
    movq 16(%rsi), %r13
    movq 24(%rsi), %r12
    movq 32(%rsi), %r9
    movq 40(%rsi), %r8
    movq 48(%rsi), %rbp
    movq 56(%rsi), %rdi
    movq 72(%rsi), %rdx
    movq 80(%rsi), %rcx
    movq 88(%rsi), %rbx
    movq 96(%rsi), %rsp
    movq 64(%rsi), %rsi

    ret
```

不懂汇编没关系（其实我也不是很懂），只需要知道 `movq` 指令将第一个操作数的值复制到第二个操作数中。`%` 开头的标识符为寄存器。`%rsp` 这样不带括号的，表示存取寄存器的值。`(%rdi)` 这种带括号的，表示去内存里存取地址为 `%rdi` 的数据。如果括号前面有数字几，就表示这个地址要加几。`movq` 存取数据的长度为 8 字节，寄存器的长度也是 8 字节。

还记得前面说过，`%rdi` 是第一个参数，`%rsi` 是第二个参数吗？所以 `%rdi` 就是 `struct co_context *curr`。`96(%rdi)` 就是 `curr->regs[12]`，`88(%rdi)` 就是 `curr->regs[11]`，……，`(%rdi)` 就是 `curr->regs[0]`。上半部分把 13 个通用寄存器的值全部存到了 `curr` 里。同理 `%rsi` 就是 `struct co_context *next`。`(%rsi)` 就是 `next->regs[0]`、`8(%rsi)` 就是 `next->regs[1]`，依次类推。于是下半部分把 `next` 中保存的寄存器的值写回寄存器中。最后执行 `ret` 指令返回。

注意 29 行写入 `%rsp` 的值就是上次挂起时第 4 行保存的值，这个值我们原封未动，也没有做任何栈操作。因此最后 `ret` 返回时，栈顶就是 `co_ctx_swap` 的调用者设置的返回点地址。一个协程调用 `co_ctx_swap` 将自己挂起，便陷入沉睡。当 `co_ctx_swap` 返回之时，便是其它协程调用 `co_ctx_swap` 将它唤醒之时。此时寄存器被还原、栈被还原、也回到了返回点。它便知道自己之前做了什么、接下来要做什么、中间产物是怎样的。

## 协程的初始化

`struct co_context` 仅存储协程的上下文。我们还需要维护给协程分配的栈空间、记录入口函数地址等。我们定义 `struct coroutine` 表示协程对象。

```c
typedef void (*start_coroutine)();

struct coroutine {
    struct co_context ctx;
    char *stack;
    size_t stack_size;
    start_coroutine start;
};

struct coroutine *co_new(start_coroutine start, size_t stack_size) {
    struct coroutine *co = malloc(sizeof(struct coroutine));
    memset(&co->ctx, 0, sizeof(co->ctx));
    if (stack_size) {
        co->stack = malloc(stack_size);
    } else {
        co->stack = NULL;
    }
    co->stack_size = stack_size;
    co->start = start;

    return co;
}

void co_free(struct coroutine *co) {
    free(co->stack);
    free(co);
}
```

`co_new` 创建一个新协程，接受两个参数：`start` 协程入口函数指针，和 `stack_size` 栈大小；这类似于 `pthread_create`。`co_new` 分配协程的栈空间并设置好各个字段。

要把主线程切换到我们新创建的协程，这里有两个问题。一是主线程并不是一个协程，新协程跟谁交换上下文呢？二是新创建的协程的上下文是空的（19 行），切换过去肯定跑不起来。

第一个问题很简单：创建一个就行。因为主线程已经跑起来了，要切换到新协程，主线程只需要一个“容器”把它的上下文装进去。直接执行 `main = co_new(NULL, 0)` 创建主协程，调用 `co_ctx_swap(&main->ctx, &new->ctx)` 便可切换到新协程。此时主线（协）程的上下文保存在 `main` 中，当新协程反向调用 `co_ctx_swap(&new->ctx, &main->ctx)`，便又切换回主协程了。

为了解决第二个问题，我们需要对新协程初始化。`co_ctx_swap` 将新协程的上下文复制到 CPU 后，执行 `ret` 返回栈顶记录的地址。因此我们要将栈顶置为协程入口函数的地址，这样在 `co_ctx_swap` 返回后便跳转到协程入口函数了。

```c
void co_ctx_make(struct coroutine *co) {
    char *sp = co->stack + co->stack_size - sizeof(void*);
    sp = (char*)((intptr_t)sp & -16LL);
    *(void**)sp = (void*)co->start;
    co->ctx.regs[CO_RSP] = sp;
}
```

因为 x86 的栈是从高地址向低地址增长的，初始栈为空，所以栈顶应该指向 `co->stack` 的最末尾。又因为 x86 的栈必须 16 字节对齐，所以执行 `(intptr_t)sp & -16LL`（-16 低 4 位为 0，其它都为 1）得到栈顶地址。然后将栈顶置为 `co->start`，也就是入口函数的地址。最后我们把保存的 rsp 寄存器的值设置为栈顶地址，这个值会在 `co_ctx_swap` 被复制到寄存器 `%rsp` 中。

现在我们的协程已经可以跑起来了。写一个简单的例子试试：

```c
struct coroutine *main_co, *new_co;

void foo() {
    printf("here is the new coroutine\n");
    co_ctx_swap(&new_co->ctx, &main_co->ctx);
    printf("new coroutine resumed\n");
    co_ctx_swap(&new_co->ctx, &main_co->ctx);
}

int main() {
    main_co = co_new(NULL, 0);
    new_co = co_new(foo, 1024 * 1024);
    co_ctx_make(new_co);

    co_ctx_swap(&main_co->ctx, &new_co->ctx);
    printf("main coroutine here\n");
    co_ctx_swap(&main_co->ctx, &new_co->ctx);
    return 0;
}
```

把上面所有的 C 代码复制到文件 `co.c`，汇编代码存为 `co.S`，然后执行 `gcc -o co co.c co.S` 编译，运行试试！

## 协程的管理

现在的协程虽然可以跑，但是使用起来很不方便，需要手动交换上下文，也容易出错。我们需要实现 resume/yield 操作。resume 操作唤醒指定协程，也就是当前协程与指定协程交换。yield 挂起当前协程，将当前协程与上次唤醒它的协程交换。因此我们需要记录当前运行的协程；而对于每个协程，要保存唤醒它的协程的指针。

![](/assets/images/c-coroutine_2.svg)

协程切换要遵循这几条规则：

- 主协程不能执行 yield 操作。这是显而易见的，因为它没有唤醒者。
- 不能 resume 一个正在运行的协程。
- 如果一个协程通过 resume 操作进入挂起状态，则不能由 resume 操作唤醒。例如，上图所示的协程 B 在 resume 协程 C 后，只能被协程 C 的 yield 操作唤醒。如果允许其它协程通过 resume 操作唤醒它，则协程切换会陷入混乱。
- 除主协程外的协程结束时需要执行 yield 操作，之后进入死亡状态。死亡状态的协程不能被 resume 操作唤醒。

基于此，我们给协程定义五个状态：

```c
enum {
    CO_STATUS_INIT,         // 初始状态
    CO_STATUS_PENDING,      // 执行 yield 操作进入的挂起状态
    CO_STATUS_NORMAL,       // 执行 resume 操作进入的挂起状态
    CO_STATUS_RUNNING,      // 运行状态
    CO_STATUS_DEAD,         // 死亡状态
};
```

我们使用全局变量 `g_curr_co` 记录当前协程。每个协程还要记录当前状态和唤醒自己的协程。

```c
struct coroutine {
    struct co_context ctx;
    char *stack;
    size_t stack_size;
    int status;                 // 协程状态
    struct coroutine *prev;     // 唤醒者
    start_coroutine start;
};

struct coroutine *g_curr_co = NULL;     // 当前协程

struct coroutine *co_new(start_coroutine start, size_t stack_size) {
    struct coroutine *co = malloc(sizeof(struct coroutine));
    ...
    co->status = CO_STATUS_INIT;
    co->prev = NULL;
    return co;
}

void check_init() {
    if (!g_curr_co) {   // 初始化主协程
        g_curr_co = co_new(NULL, 0);
        g_curr_co->status = CO_STATUS_RUNNING;  // 主协程状态初始为 RUNNING
    }
}
```

接着实现 resume 操作和 yield 操作。根据上面描述的思路，实现起来很容易。

```c
int co_resume(struct coroutine *next) {
    check_init();

    switch (next->status) {
        case CO_STATUS_INIT:        // 初始状态，需要执行 co_ctx_make 初始化
            co_ctx_make(next);
        case CO_STATUS_PENDING:     // 只有处于 INIT 和 PENDING 状态的协程可以被 resume 唤醒
            break;
        default:
            return -1;
    }

    struct coroutine *curr = g_curr_co;
    g_curr_co = next;                   // g_curr_co 指向新协程
    next->prev = curr;                  // 设置新协程的唤醒者为当前协程
    curr->status = CO_STATUS_NORMAL;    // 当前协程进入 NORMAL 状态
    next->status = CO_STATUS_RUNNING;   // 新协程进入 RUNNING 状态
    co_ctx_swap(&curr->ctx, &next->ctx);

    return 0;
}

int co_yield() {
    check_init();

    struct coroutine *curr = g_curr_co;
    struct coroutine *prev = curr->prev;

    if (!prev) {    // 没有唤醒者，不能执行 yield 操作
        return -1;
    }

    g_curr_co = prev;       // g_curr_co 指向当前协程的唤醒者
    if (curr->status != CO_STATUS_DEAD) {
        curr->status = CO_STATUS_PENDING;   // 当前协程进入 PENDING 状态
    }
    prev->status = CO_STATUS_RUNNING;       // 唤醒者进入 RUNNING 状态
    co_ctx_swap(&curr->ctx, &prev->ctx);

    return 0;
}
```

除主协程外的协程结束运行时一定要执行 yield 操作将自己切出，否则它不知道该返回到哪儿。为了不让使用者手动执行这个操作，我们将协程入口函数封装一层。

```c
void co_entrance(struct coroutine *co) {
    co->start(); // 执行入口函数
    co->status = CO_STATUS_DEAD;
    co_yield(); // 已经置为 DEAD 状态了，切出后不会有人唤醒它了。这里 co_yield 永远不会返回
    // 不会走到这里来
}

void co_ctx_make(struct coroutine *co) {
    char *sp = co->stack + co->stack_size - sizeof(void*);
    sp = (char*)((intptr_t)sp & -16LL);
    *(void**)sp = (void*)co_entrance;   // 设置入口地址为 co_entrance
    co->ctx.regs[CO_RSP] = sp;
    co->ctx.regs[CO_RDI] = co; // rdi 为第一参数寄存器，将它的值置为 co，这样 co_entrance 就能拿到它的参数了
}
```

这样我们的协程用起来就更方便了:

```c
void foo() {
    printf("here is the new coroutine\n");
    co_yield();
    printf("new coroutine resumed\n");
}

int main() {
    struct coroutine *co = co_new(foo, 1024 * 1024);
    co_resume(co);
    printf("main coroutine here\n");
    co_resume(co);
    return 0;
}
```

## 传递参数

resume/yield 可以用于传递参数。运行上面的例子，我们发现 `co_yield` 返回之时便是其它协程调用 `co_resume` 之时；而 `co_resume` 返回之时又是其它协程调用 `co_yield` 之时。因此 resume 操作接受参数，传递给 yield 返回；yield 操作接受参数，传递给 resume 返回。这样方便在协程之间传递数据。

我们在 `struct coroutine` 中新增一个 `data` 字段用于传递参数。协程切换时，如果要给目标协程传递参数，就对目标协程的 `data` 字段赋值。协程切换后，就能从 `data` 字段中取出上一个协程传递的参数。

```c
struct coroutine {
    ...
    void *data;     // 参数
};

int co_resume(struct coroutine *next, void *param, void **result) {
    ...

    next->data = param;         // 切换到 next 协程，给 next 协程的参数
    co_ctx_swap(&curr->ctx, &next->ctx);
    if (result) {
        *result = curr->data;
    }
    return 0;
}

int co_yield(void *result, void **param) {
    ...

    prev->data = result;        // 切回 prev 协程，给 prev 协程的结果
    co_ctx_swap(&curr->ctx, &prev->ctx);
    if (param) {
        *param = curr->data;    // 其它协程唤醒它时给它的参数
    }
    return 0;
}
```

我们重新定义协程入口函数，让它接受参数和返回值。第一次 resume 的参数传给入口函数；入口函数的返回值在最后一次 yield 时传出去。

```c
typedef void *(*start_coroutine)(void *);

static void co_entrance(struct coroutine *co) {
    void *result = co->start(co->data);
    co->status = CO_STATUS_DEAD;
    co_yield(result, NULL); // 协程的最后一次 yield 操作，将入口函数的返回值传出去
}
```

## 例子

现在，我们的协程库已经完全实现了。我们可以写一些例子测试一下。比如说我们可以创建一个源源不断生成以 n 开头的自然数的协程：

```c
void *number(void *param) {
    intptr_t i = (intptr_t)param;
    co_yield(NULL, NULL);   // 初始化后立刻 yield
    while (1) {
        co_yield((void*)i, NULL);
        ++i;
    }
}

int main() {
    struct coroutine *num = co_new(number, 1024 * 1024);
    co_resume(num, (void*)0, NULL); // 初始化为以 0 开头的自然数流
    for (int i = 0; i < 10; ++i) {
        intptr_t n;
        co_resume(num, NULL, (void**)&n);
        printf("%ld ", n);
    }
    co_free(num);
    return 0;
}
```

运行结果就是

```txt
0 1 2 3 4 5 6 7 8 9
```

这个协程就是一个无限流。我们还可以写一个将两个无限流逐项相加的协程：

```c
void *add(void *param) {
    struct coroutine **cov = param, *co0 = cov[0], *co1 = cov[1]; // cov 指向前序协程的栈，这里要立刻将其中的数据取出来
    co_yield(NULL, NULL);   // 同样，初始化后立刻 yield
    while (1) {
        intptr_t a, b;
        co_resume(co0, NULL, (void**)&a);
        co_resume(co1, NULL, (void**)&b);
        co_yield((void*)(a + b), NULL);
    }
}
```

然后将 0 开头的自然数流与 1 开头的自然数流逐项相加，得到奇数无限流（0 + 1 = 1, 1 + 2 = 3, 2 + 3 = 5, ...）

```c
int main() {
    struct coroutine *num0 = co_new(number, 1024 * 1024);
    struct coroutine *num1 = co_new(number, 1024 * 1024);
    struct coroutine *co_add = co_new(add, 1024 * 1024);
    
    co_resume(num0, (void*)0, NULL); // 以 0 开头的自然数流
    co_resume(num1, (void*)1, NULL); // 以 1 开头的自然数流
    
    struct coroutine *cov[] = {num0, num1};
    co_resume(co_add, cov, NULL);   // 初始化 add 协程

    for (int i = 0; i < 10; ++i) {
        intptr_t s;
        co_resume(co_add, NULL, (void**)&s);
        printf("%ld ", s);
    }

    co_free(num0), co_free(num1), co_free(co_add);
    return 0;
}
```

运行结果就是

```txt
1 3 5 7 9 11 13 15 17 19
```

当然还有更好玩的。我们可以实现一个斐波那契数列生成器。斐波那契数列可以自我定义：令 f(i) 是以第 i 项开头的斐波那契数列，f(a) + f(b) 表示将两个数列逐项相加，那么如下所示，f(2) = f(0) + f(1)。

```txt
    0  1  1  2  3  5
+   1  1  2  3  5  8
-----------------------
    1  2  3  5  8  13
```

所以我们可以这样做

```c
void *fib(void *param) {
    co_yield((void*)0, NULL);   // 第 0 项
    co_yield((void*)1, NULL);   // 第 1 项
    struct coroutine *f0 = co_new(fib, 1024 * 1024);
    struct coroutine *f1 = co_new(fib, 1024 * 1024);
    co_resume(f1, NULL, NULL); // f1 先走一步，让它成为以第 1 项开头的斐波那契数列

    struct coroutine *co_add = co_new(add, 1024 * 1024);
    struct coroutine *cov[] = {f0, f1};
    co_resume(co_add, cov, NULL); // 将 f0 与 f1 逐项相加
    while (1) {
        intptr_t s;
        co_resume(co_add, NULL, (void**)&s);
        co_yield((void*)s, NULL);
    }
}

int main() {
    struct coroutine *f = co_new(fib, 1024 * 1024);
    for (int i = 0; i < 10; ++i) {
        intptr_t s;
        co_resume(f, NULL, (void**)&s);
        printf("%ld ", s);
    }
}
```

运行结果便是斐波那契数列：

```txt
0 1 1 2 3 5 8 13 21 34
```

不过这种写法会创建大量协程，性能很低。仅供演示<span style="background-color: var(--post-text-color)">~~（炫技）~~</span>。

***

[^1]: 对于 Linux 内核而言，线程和进程是同一个东西