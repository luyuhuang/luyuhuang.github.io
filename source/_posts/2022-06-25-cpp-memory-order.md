---
key: 68
title: 谈谈 C++ 中的内存顺序 (Memory Order)
tag: [c/c++, featured]
---
C++11 将多线程纳入了标准. 一旦涉及到多线程, 就需要考虑**并发**, **数据竞争 (date race)**, **线程同步**等问题, 为此 C++ 提供了互斥锁 `std::mutex`, 原子变量 `std::atomic` 等标准库. 对于原子变量的操作, 有一个很重要的概念就是**内存顺序 (memory order)**, 其中涉及到的概念很多, 理解起来可能会有些困难. 本文我们来谈谈这个话题.

本文可能有些长, 涉及到的概念有些多. 其中 3.4 节和 3.5 节标注了星号, 它们的实际应用较少, 不感兴趣的同学可以先跳过, 或者读完全文后再阅读.

## 1. 原子变量

我们不能在两个线程中同时访问修改一个变量, 这会导致数据竞争的问题. 程序的结果是未定义的. 从实现上来说, 我们不能保证读写操作是原子的, 例如 32 位机器上, 修改一个 64 位变量可能需要两条指令; 或者变量有可能只是在寄存器里, 对其的修改要在稍后才会写入内存. 解决数据竞争的方式除了使用 `std::mutex` 加锁, 还可以使用原子变量.

```c++
std::atomic<int> a{0};

void thread1() {
    a = 1;
}

void thread2() {
    std::cout << a << std::endl;
}
```

上面的例子展示了原子变量最简单的用法. 使用原子变量不用担心数据竞争, 对它的操作都是原子的. 除此之外, 原子变量的操作可以指定内存顺序, 帮助我们实现线程同步, 这也是本文的重点. 上面的代码中, 线程 1 将值写入原子变量 `a`, 线程 2 则读取 `a` 中的值. 这便是原子变量最基础的两种操作.

### 1.1 原子变量的操作

对原子变量的操作可以分为三种

1. store. 将一个值存到原子变量中.
2. load. 读取原子变量中的值.
3. read-modify-write (RMW). 原子地执行读取, 修改和写入. 如自增操作 `fetch_add`, 交换操作 `exchange` (返回变量当前的值并写入指定值) 等.

每个原子操作都需要指定一个**内存顺序 (memory order)**. 不同的内存顺序有不同的语义, 会实现不同的顺序模型 (order model), 性能也各不相同. C++ 中有六种内存顺序

```c++
enum memory_order {
    memory_order_relaxed,
    memory_order_consume,
    memory_order_acquire,
    memory_order_release,
    memory_order_acq_rel,
    memory_order_seq_cst,
};
```

这六种内存顺序相互组合可以实现三种顺序模型 (ordering model)

- Sequencial consistent ordering. 实现同步, 且保证全局顺序一致 (single total order) 的模型. 是一致性最强的模型, 也是默认的顺序模型.
- Acquire-release ordering. 实现同步, 但不保证保证全局顺序一致的模型.
- Relaxed ordering. 不能实现同步, 只保证原子性的模型.

稍后我们会详细讨论这六种内存顺序. `atomic::store` 和 `atomic::load` 函数都有一个内存顺序的参数, 默认为 `memory_order_seq_cst`. 它们的声明如下

```c++
void store(T desired, std::memory_order order = std::memory_order_seq_cst);
T load(std::memory_order order = std::memory_order_seq_cst) const;
```

此外 `std::atomic` 重载了运算符, 我们可以像使用普通变量一样读写原子变量. 例如上面代码中两个线程的读写操作分别调用的是 `std::atomic<int>::operator=(int)` 和 `std::atomic<int>::operator int()`. 此时会使用默认的内存顺序, 也就是 `memory_order_seq_cst`.

## 2. 基础概念

在开始讲这六种内存顺序之前, 有必要先了解一下几个最基础的概念.

### 2.1 修改顺序 (Modification orders)

对一个原子变量的所有修改操作总是存在一定的先后顺序, 且所有线程都认可这个顺序, 即使这些修改操作是在不同的线程中执行的. 这个所有线程一致同意的顺序就称为**修改顺序 (modification order)**. 这意味着

- 两个修改操作不可能同时进行, 一定存在一个先后顺序. 这很容易理解, 因为这是原子操作必须保证的, 否则就有数据竞争的问题.
- 即使每次运行的修改顺序可能都不同, 但所有线程看到的修改顺序总是一致的. 如果线程 a 看到原子变量 x 由 1 变成 2, 那么线程 b 就不可能看到 x 由 2 变成 1.

无论使用哪种内存顺序, 原子变量的操作总能满足修改顺序一致性, 即使是最松散的 `memory_order_relaxed`. 我们来看一个例子

```c++
std::atomic<int> a{0};

void thread1() {
    for (int i = 0; i < 10; i += 2)
        a.store(i, std::memory_order_relaxed);
}

void thread2() {
    for (int i = 1; i < 10; i += 2)
        a.store(i, std::memory_order_relaxed);
}

void thread3(vector<int> *v) {
    for (int i = 0; i < 10; ++i)
        v->push_back(a.load(std::memory_order_relaxed));
}

void thread4(vector<int> *v) {
    for (int i = 0; i < 10; ++i)
        v->push_back(a.load(std::memory_order_relaxed));
}

int main() {
    vector<int> v3, v4;
    std::thread t1(thread1), t2(thread2), t3(thread3, &v3), t4(thread4, &v4);
    t1.join(), t2.join(), t3.join(), t4.join();

    for (int i : v3) cout << i << " ";
    cout << endl;
    for (int i : v4) cout << i << " ";
    cout << endl;
    return 0;
}
```

上面的代码创建了 4 个线程. `thread1` 和 `thread2` 分别将偶数和奇数依次写入原子变量 `a`, `thread3` 和 `thread4` 则读取它们. 最后输出 `thread3` 和 `thread4` 每次读取到的值. 程序运行的结果可能是这样的

```
$ ./test-modification-order
1 8 7 7 7 9 9 9 9 9
0 2 8 8 8 7 9 9 9 9

$ ./test-modification-order
1 2 5 6 9 9 9 8 8 8
1 3 2 5 9 8 8 8 8 8
```

虽然每次运行的修改顺序不同, 各个线程也不太可能看到每次修改的结果, 但是它们看到的修改顺序是一致的. 例如 `thread3` 看到 8 先于 9, `thread4` 也会看到 8 先于 9, 反之亦然.

### 2.2 Happens-before

**Happens-before** 是一个非常重要的概念. 如果操作 a "happens-before" 操作 b, 则操作 a 的结果对于操作 b 可见. happens-before 的关系可以建立在用一个线程的两个操作之间, 也可以建立在不同的线程的两个操作之间.

#### 2.2.1 单线程的情况: sequenced-before

单线程的情况很容易理解. 函数的语句按顺序依次执行, 前面的语句先执行, 后面的后执行. 正式地说, 前面的语句总是 **"sequenced-before"** 后面的语句. 显然, 根据定义, sequenced-before 具有传递性:

- 如果操作 a "sequenced-before" 操作 k, 且操作 k "sequenced-before" 操作 b, 则操作 a "sequenced-before" 操作 b.

Sequenced-before 可以直接构成 happens-before 的关系. 如果操作 a "sequenced-before" 操作 b, 则操作 a "happens-before" 操作 b. 例如

```c++
a = 42; // (1)
cout << a << endl; // (2)
```

语句 (1) 在语句 (2) 的前面, 因此语句 (1) "sequenced-before" 语句 (2), 也就是 (1) "happens-before" 语句 (2). 所以 (2) 可以打印出 (1) 赋值的结果.

#### 2.2.2 多线程的情况: synchronizes-with 和 inter-thread happens-before

多线程的情况就稍微复杂些. 一般来说多线程都是并发执行的, 如果没有正确的同步操作, 就无法保证两个操作之间有 happens-before 的关系. 如果我们通过一些手段, 让不同线程的两个操作同步, 我们称这两个操作之间有 **synchronizes-with** 的关系. 稍后我们会详细讨论如何组合使用 6 种内存顺序, 让两个操作达成 synchronizes-with 的关系.

如果线程 1 中的操作 a "synchronizes-with" 线程 2 中的操作 b, 则操作 a **"inter-thread happens-before"** 操作 b. 此外 synchronizes-with 还可以 "后接" 一个 sequenced-before 关系组合成 inter-thread happens-before 的关系:

- 如果操作 a "synchronizes-with" 操作 k, 且操作 k "sequenced-before" 操作 b, 则操作 a "inter-thread happens-before" 操作 b.

Inter-thread happens-before 关系则可以 "前接" 一个 sequenced-before 关系以延伸它的范围; 而且 inter-thread happens-before 关系具有传递性:

- 如果操作 a "sequenced-before" 操作 k, 且操作 k "inter-thread happens-before" 操作 b, 则操作 a "inter-thread happens-before" 操作 b.
- 如果操作 a "inter-thread happens-before" 操作 k, 且操作 k "inter-thread happens-before" 操作 b, 则操作 a "inter-thread happens-before" 操作 b.

正如它的名字暗示的, 如果操作 a "inter-thread happens-before" 操作 b, 则操作 a "happens-before" 操作 b. 下图展示了这几个概念之间的关系:

![happens-before](/assets/images/cpp-memory-order_1.svg)

注意, 虽然 sequenced-before 和 inter-thread happens-before 都有传递性, 但是 **happens-before 没有传递性**. 后面我们会在 3.5 节中看到这个性质的重要性, 以及 C++ 为什么要定义这么多概念.

现在我们来看一个例子. 假设下面的代码中 `unlock()` 操作 "synchronizes-with" `lock()` 操作.

```c++
void thread1() {
    a += 1 // (1)
    unlock(); // (2)
}

void thread2() {
    lock(); // (3)
    cout << a << endl; // (4)
}
```

假设直到 `thread1` 执行到 (2) 之前, `thread2` 都会阻塞在 (3) 处的 `lock()` 中. 那么可以推导出:

- 根据语句顺序, 有 (1) "sequenced-before" (2) 且 (3) "sequenced-before" (4);
- 因为 (2)  "synchronizes-with" (3) 且 (3) "sequenced-before" (4), 所以 (2) "inter-thread happens-before" (4);
- 因为 (1) "sequenced-before" (2) 且 (2) "inter-thread happens-before" (4), 所以 (1) "inter-thread happens-before" (4); 所以 (1) "happens-before" (4).

因此 (4) 可以读到 (1) 对变量 `a` 的修改.

### 2.3 Happens-before 不代表指令实际的执行顺序

需要说明的是, happens-before 是 C++ 语义层面的概念, 它并不代表指令在 CPU 中实际的执行顺序. 为了优化性能, 编译器会在不破坏语义的前提下对指令重排. 例如

```c++
extern int a, b;
int add() {
    a++;
    b++;
    return a + b;
}
```

虽然有 `a++;` "happens-before" `b++;`, 但编译器实际生成的指令可能是先加载 `a`, `b` 两个变量到寄存器, 接着分别执行 "加一" 操作, 然后再执行 `a + b`, 最后才将自增的结果写入内存.

```nasm
add():
    movl    a(%rip), %eax   # 将变量 a 加载到寄存器
    movl    b(%rip), %ecx   # 将变量 b 加载到寄存器
    addl    $1, %eax        # a 的值加一
    leal    1(%rcx), %edx   # b 的值加一
    movl    %eax, a(%rip)   # 将 a 加一的结果写入内存
    addl    %edx, %eax      # a + b
    movl    %edx, b(%rip)   # 将 b 加一的结果写入内存
    ret
```

上面展示了 x86-64 下的一种可能的编译结果. 可以看到 C++ 的一条语句可能产生多条指令, 这些指令都是交错执行的. 其实编译器甚至还有可能先自增 `b` 再自增 `a`. 这样的重排并不会影响语义, 两个自增操作的结果仍然对 `return a + b;` 可见.

## 3. 内存顺序

前面我们提到 C++ 的六种内存顺序相互组合可以实现三种顺序模型. 现在我们来具体看看如何使用这六种内存顺序, 以及怎样的组合可以实现 synchronizes-with 的关系.

### 3.1 memory_order_seq_cst

`memory_order_seq_cst` 可以用于 store, load 和 read-modify-write 操作, 实现 sequencial consistent 的顺序模型. 在这个模型下, 所有线程看到的所有操作都有一个一致的顺序, 即使这些操作可能针对不同的变量, 运行在不同的线程. 2.1 节中我们介绍了修改顺序 (modification order), 即单一变量的修改顺序在所有线程看来都是一致的. Sequencial consistent 则将这种一致性扩展到了所有变量. 例如

```c++
std::atomic<bool> x{false}, y{false};

void thread1() {
    x.store(true, std::memory_order_seq_cst); // (1)
}

void thread2() {
    y.store(true, std::memory_order_seq_cst); // (2)
}
```

`thread1` 和 `thread2` 分别修改原子变量 `x` 和 `y`. 运行过程中, 有可能先执行 (1) 再执行 (2), 也有可能先执行 (2) 后执行 (1). 但无论如何, 所有线程中看到的顺序都是一致的. 因此如果我们这样测试这段代码:

```c++
std::atomic<int> z{0};

void read_x_then_y() {
    while (!x.load(std::memory_order_seq_cst)); // (3)
    if (y.load(std::memory_order_seq_cst)) ++z; // (4)
}

void read_y_then_x() {
    while (!y.load(std::memory_order_seq_cst)); // (5)
    if (x.load(std::memory_order_seq_cst)) ++z; // (6)
}

int main() {
    std::thread a(thread1), b(thread2), c(read_x_then_y), d(read_y_then_x);
    a.join(), b.join(), c.join(), d.join();
    assert(z.load() != 0); // (7)
}
```

\(7) 处的断言永远不会失败. 因为 `x` 和 `y` 的修改顺序是全局一致的, 如果先执行 (1) 后执行 (2), 则 `read_y_then_x` 中循环 (5) 退出时, 能保证 `y` 为 `true`, 此时 `x` 也必然为 `true`, 因此 (6) 会被执行; 同理, 如果先执行 (2) 后执行 (1), 则循环 (3) 退出时 `y` 也必然为 `true`, 因此 (4) 会被执行. 无论如何, `z` 最终都不会等于 0.

Sequencial consistent 可以实现 synchronizes-with 的关系. 如果一个 `memory_order_seq_cst` 的 load 操作在某个原子变量上读到了一个 `memory_order_seq_cst` 的 store 操作在这个原子变量中写入的值, 则 store 操作 "synchronizes-with" load 操作. 在上面的例子中, 有 (1) "synchronizes-with" (3) 和 (2) "synchronizes-with" (5).

实现 sequencial consistent 模型有一定的开销. 现代 CPU 通常有多核, 每个核心还有自己的缓存. 为了做到全局顺序一致, 每次写入操作都必须同步给其他核心. 为了减少性能开销, 如果不需要全局顺序一致, 我们应该考虑使用更加宽松的顺序模型.

### 3.2 memory_order_relaxed

`memory_order_relaxed` 可以用于 store, load 和 read-modify-write 操作, 实现 relaxed 的顺序模型. 这种模型下, 只能保证操作的原子性和修改顺序 (modification order) 一致性, 无法实现 synchronizes-with 的关系. 例如

```c++
std::atomic<bool> x{false}, y{false};

void thread1() {
    x.store(true, std::memory_order_relaxed); // (1)
    y.store(true, std::memory_order_relaxed); // (2)
}
```

`thread1` 对不同的变量执行 store 操作. 那么在某些线程看来, 有可能是 `x` 先变为 `true`, y 后变为 `true`; 另一些线程看来, 又有可能是 `y` 先变为 `true`, `x` 后变为 `true`. 如果这样测试这段代码:

```c++
void thread2() {
    while (!y.load(std::memory_order_relaxed)); // (3)
    assert(x.load()); // (4)
}
```

\(4) 处的断言就有可能失败. 因为 (2) 与 (3) 之间没有 synchronizes-with 的关系, 所以就不能保证 (1) "happens-before" (4). 因此 (4) 就有可能读到 `false`. 至于 relaxed 顺序模型能保证的修改顺序一致性的例子, 2.1 节中已经讨论过了, 这里就不多赘述了.

Relaxed 顺序模型的开销很小. 在 x86 架构下, `memory_order_relaxed` 的操作不会产生任何其他的指令, 只会影响编译器优化, 确保操作是原子的. Relaxed 模型可以用在一些不需要线程同步的场景, 但是使用时要小心. 例如 `std::shared_ptr` 增加引用计数时用的就是 `memory_order_relaxed`, 因为不需要同步; 但是减小应用计数不能用它, 因为需要与析构操作同步.

### 3.3 Acquire-release

在 acquire-release 模型中, 会使用 `memory_order_acquire`, `memory_order_release` 和 `memory_order_acq_rel` 这三种内存顺序. 它们的用法具体是这样的:

- 对原子变量的 load 可以使用 `memory_order_acquire` 内存顺序. 这称为 **acquire 操作**.
- 对原子变量的 store 可以使用 `memory_order_release` 内存顺序. 这称为 **release 操作**.
- read-modify-write 操作即读 (load) 又写 (store), 它可以使用 `memory_order_acquire`, `memory_order_release` 和 `memory_order_acq_rel`:
    - 如果使用 `memory_order_acquire`, 则作为 acquire 操作;
    - 如果使用 `memory_order_release`, 则作为 release 操作;
    - 如果使用 `memory_order_acq_rel`, 则同时为两者.

Acquire-release 可以实现 synchronizes-with 的关系. 如果一个 acquire 操作在同一个原子变量上读取到了一个 release 操作写入的值, 则这个 release 操作 "synchronizes-with" 这个 acquire 操作. 我们来看一个例子:

```c++
std::atomic<bool> x{false}, y{false};

void thread1() {
    x.store(true, std::memory_order_relaxed); // (1)
    y.store(true, std::memory_order_release); // (2)
}

void thread2() {
    while (!y.load(std::memory_order_acquire)); // (3)
    assert(x.load(std::memory_order_relaxed)); // (4)
}
```

在上面的例子中, 语句 (2) 使用 `memory_order_release` 在 `y` 中写入 `true`, 语句 (3) 中使用 `memory_order_acquire` 从 `y` 中读取值. 循环 (3) 退出时, 它已经读取到了 `y` 的值为 `true`, 也就是读取到了操作 (2) 中写入的值. 因此有 (2) "synchronizes-with" (3). 根据 2.2 节介绍的规则我们可以推导出:

- 因为 (2) "synchronizes-with" (3) 且 (3) "sequenced-before" (4), 所以 (2) "inter-thread happens-before" (4);
- 因为 (1) "sequenced-before" (2) 且 (2) "inter-thread happens-before" (4), 所以 (1) "inter-thread happens-before" (4);

所以 (1) "happens-before" (4). 因此 (4) 能读取到 (1) 中写入的值, 断言永远不会失败. 即使 (1) 和 (4) 用的是 `memory_order_relaxed`.

3.1 节我们提到 sequencial consistent 模型可以实现 synchronizes-with 关系. 事实上, 内存顺序为 `memory_order_seq_cst` 的 load 操作和 store 操作可以分别视为 acquire 操作和 release 操作. 因此对于两个指定了 `memory_order_seq_cst` 的 store 操作和 load 操作, 如果后者读到了前者写入的值, 则前者 "synchronizes-with" 后者.

为了实现 synchronizes-with 关系, acquire 操作和 release 操作应该成对出现. 如果 `memory_order_acquire` 的 load 读到了 `memory_order_relaxed` 的 store 写入的值, 或者 `memory_order_relaxed` 的 load 读到了 `memory_order_release` 的 store 写入的值, 都不能实现 synchronizes-with 的关系.

虽然 sequencial consistent 模型能够像 acquire-release 一样实现同步, 但是反过来 acquire-release 模型不能像 sequencial consistent 一样提供全局顺序一致性. 如果将 3.1 节的例子中的 `memory_order_seq_cst` 换成 `memory_order_acquire` 和 `memory_order_release`

```c++
void thread1() {
    x.store(true, std::memory_order_release); // (1)
}

void thread2() {
    y.store(true, std::memory_order_release); // (2)
}

void read_x_then_y() {
    while (!x.load(std::memory_order_acquire)); // (3)
    if (y.load(std::memory_order_acquire)) ++z; // (4)
}

void read_y_then_x() {
    while (!y.load(std::memory_order_acquire)); // (5)
    if (x.load(std::memory_order_acquire)) ++z; // (6)
}
```

则最终不能保证 `z` 不为 0. 在同一次运行中, `read_x_then_y` 有可能看到先 (1) 后 (2), 而 `read_y_then_x` 有可能看到先 (2) 后 (1). 这样有可能 (4) 和 (6) 的 load 的结果都为 `false`, 导致最后 `z` 仍然为 0.

Acquire-release 的开销比 sequencial consistent 小. 在 x86 架构下, `memory_order_acquire` 和 `memory_order_release` 的操作不会产生任何其他的指令, 只会影响编译器的优化: 任何指令都不能重排到 acquire 操作的前面, 且不能重排到 release 操作的后面; 否则会违反 acquire-release 的语义. 因此很多需要实现 synchronizes-with 关系的场景都会使用 acquire-release.

### 3.4* Release sequences

到目前为止我们看到的, 无论是 sequencial consistent 还是 acquire-release, 要想实现 synchronizes-with 的关系, acquire 操作必须在同一个原子变量上读到 release 操作的写入的值. 如果 acquire 操作没有读到 release 操作写入的值, 那么它俩之间通常没有 synchronizes-with 的关系. 例如

```c++
std::atomic<int> x{0}, y{0};

void thread1() {
    x.store(1, std::memory_order_relaxed); // (1)
    y.store(1, std::memory_order_release); // (2)
}

void thread2() {
    y.store(2, std::memory_order_release); // (3)
}

void thread3() {
    while (!y.load(std::memory_order_acquire)); // (4)
    assert(x.load(std::memory_order_relaxed) == 1); // (5)
}
```

上面的例子中, 只要 `y` 的值非 0 循环 (4) 就会退出. 当它退出时, 有可能读到 (2) 写入的值, 也有可能读到 (3) 写入的值. 如果是后者, 则只能保证 (3) "synchronizes-with" (4), 不能保证与 (2) 与 (4) 之间有同步关系. 因此 (5) 处的断言就有可能失败.

但并不是只有在 acquire 操作读取到 release 操作写入的值时才能构成 synchronizes-with 关系. 为了说这种情况, 我们需要引入 **release sequence** 这个概念.

针对一个原子变量 M 的 release 操作 A 完成后, 接下来 M 上可能还会有一连串的其他操作. 如果这一连串操作是由

- 同一线程上的写操作, 或者
- 任意线程上的 read-modify-write 操作

这两种构成的, 则称这一连串的操作为**以 release 操作 A 为首的 release sequence**. 这里的写操作和 read-modify-write 操作可以使用任意内存顺序.

如果一个 acquire 操作在同一个原子变量上读到了一个 release 操作写入的值, 或者读到了以这个 release 操作为首的 release sequence 写入的值, 那么这个 release 操作 "synchronizes-with" 这个 acquire 操作. 我们来看个例子

```c++
std::vector<int> data;
std::atomic<int> flag{0};

void thread1() {
    data.push_back(42); // (1)
    flag.store(1, std::memory_order_release); // (2)
}

void thread2() {
    int expected = 1;
    while (!flag.compare_exchange_strong(expected, 2, std::memory_order_relaxed)) // (3)
        expected = 1;
}

void thread3() {
    while (flag.load(std::memory_order_acquire) < 2); // (4)
    assert(data.at(0) == 42); // (5)
}
```

上面的例子中, (3) 处的 `compare_exchange_strong` 是一种 read-modify-write 操作, 它判断原子变量的值是否与期望的值 (第一个参数) 相等, 如果相等则将原子变量设置成目标值 (第二个参数) 并返回 `true`, 否则将第一个参数 (引用传递) 设置成原子变量当前值并返回 `false`. 操作 (3) 会一直循环检查, 当 `flag` 当值为 1 时, 将其替换成 2. 所以 (3) 属于 (2) 的 release sequence. 而循环 (4) 退出时, 它已经读到了 (3) 写入的值, 也就是 release 操作 (2) 为首的 release sequence 写入的值. 所以有 (2) "synchronizes-with" (4). 因此 (1) "happens-before" (5), (5) 处的断言不会失败.

注意 (3) 处的 `compare_exchange_strong` 的内存顺序是 `memory_order_relaxed`, 所以 (2) 与 (3) 并不构成 synchronizes-with 的关系. 也就是说, 当循环 (3) 退出时, 并不能保证 `thread2` 能读到 `data.at(0)` 为 42. 但是 (3) 属于 (2) 的 release sequence, 当 (4) 以 `memory_order_acquire` 的内存顺序读到 (2) 的 release sequence 写入的值时, 可以与 (2) 构成 synchronizes-with 的关系.

### 3.5* memory_order_consume

`memory_order_consume` 其实是 acquire-release 模型的一部分, 但是它比较特殊, 它涉及到数据间相互依赖的关系. 为此我们又要提出两个新概念: **carries dependency** 和 **dependency-ordered before**.

如果操作 a "sequenced-before" b, 且 b 依赖 a 的数据, 则 a "carries a dependency into" b. 一般来说, 如果 a 的值用作 b 的一个操作数, 或者 b 读取到了 a 写入的值, 都可以称为 b 依赖于 a. 例如

```c++
p++;  // (1)
i++;  // (2)
p[i]; // (3)
```

有 (1) "sequenced-before" (2) "sequenced-before" (3); (1) 和 (2) 的值作为 (3) 的下标运算符 `[]` 的操作数, 所以有 (1) "carries a dependency into" (3) 和 (2) "carries a dependency into" (3). 但是 (1) 和 (2) 并没有相互依赖, 它们之间没有 carries dependency 的关系. 类似于 sequenced-before, carries dependency 关系具有传递性.

`memory_order_consume` 可以用于 load 操作. 使用 `memory_order_consume` 的 load 称为 consume 操作. 如果一个 consume 操作在同一个原子变量上读到了一个 release 操作写入的值, 或以其为首的 release sequence 写入的值, 则这个 release 操作 "dependency-ordered before" 这个 consume 操作.

Dependency-ordered before 可以 "后接" 一个 carries dependency 的关系以延伸它的范围: 如果 a "dependency-ordered before" k 且 k "carries a dependency into" b, 则 a "dependency-ordered before" b. Dependency-ordered before 可以直接构成 inter-thread happens-before 的关系: 如果 a "dependency-ordered before" b 则 a "inter-thread happens-before" b.

概念很复杂, 但是基本思路是:

- release 操作和 acquire 操作构成的 synchronizes-with 可以后接 sequenced-before 构成 inter-thread happens-before 的关系;
- release 操作和 consume 操作构成的 dependency-ordered before 则只能后接 carries dependency 构成 inter-thread happens-before 的关系.
- 无论 inter-thread happens-before 是怎么构成的, 都可以前接 sequenced-before 以延伸其范围.

![dependency-ordered before](/assets/images/cpp-memory-order_2.svg)

我们来看一个例子:

```c++
std::atomic<std::string*> ptr;
int data;

void thread1() {
    std::string* p  = new std::string("Hello"); // (1)
    data = 42; // (2)
    ptr.store(p, std::memory_order_release); // (3)
}

void thread2() {
    std::string* p2;
    while (!(p2 = ptr.load(std::memory_order_consume))); // (4)
    assert(*p2 == "Hello"); // (5)
    assert(data == 42); // (6)
}
```

\(4) 处的循环退出时, consume 操作 (4) 读取到 release 操作 (3) 写入的值, 因此 (3) "dependency-ordered before" (4). 由此可以推导出:

- `p2` 的值作为 (5) 的操作数, 因此 (4) "carries a dependency into" (5);
- 因为 (3) "dependency-ordered before" (4) 且 (4) "carries a dependency into" (5), 所以 (3) "inter-thread happens-before" (5);
- 因为 (1) "sequenced-before" (3) 且 (3) "inter-thread happens-before" (5), 所以 (1) "inter-thread happens-before" (5);

所以 (1) "happens-before" (5). 因此 (5) 可以读到 (1) 写入的值, 断言 (5) 不会失败. 但是操作 (6) 并不依赖于 (4), 所以 (3) 和 (6) 之间没有 inter-thread happens-before 的关系, 因此断言 (6) 就有可能失败. 回想 2.2 节强调过的, happens-before 没有传递性. 所以不能说因为 (3) "happens-before" (4) 且 (4) "happens-before" (6) 所以 (2) "happens-before" (6).

与 acquire-release 类似, 在 x86 下使用 `memory_order_consume` 的操作不会产生任何其他的指令, 只会影响编译器优化. 与 consume 操作有依赖关系的指令都不会重排到 consume 操作前面. 它对重排的限制比 acquire 宽松些, acquire 要求所有的指令都不能重排到它的前面, 而 consume 只要求有依赖关系的指令不能重排到它的前面. 因此在某些情况下, consume 的性能可能会高一些.

## 4. 一些例子

前面讲了很多概念和理论, 现在我们来看两个实际的例子来加深理解.

### 4.1 自旋锁

在一些场景下, 如果锁被占用的时间很短, 我们会选择自旋锁, 以减少上下文切换的开销. 锁一般用来保护临界数据的读写, 我们希望同一时间只有一个线程能获取到锁, 且获取到锁后, 被锁保护的数据总是最新的. 前者通过原子操作即可保证, 而后者就需要考虑内存顺序了.

```c++
std::deque<int> queue;
spinlock mu;

void thread1() {
    int val;
    while ((val = read_from_remote())) {
        mu.lock(); // (1)
        queue.push_back(val); // (2)
        mu.unlock(); // (3)
    }
}

void thread2() {
    while (true) {
        mu.lock(); // (4)
        cout << queue.front() << endl;
        queue.pop_front(); // (5)
        mu.unlock(); // (6)
    }
}
```

两个线程并发运行, `thread1` 往队列里写入数据, `thread2` 从队列里读出数据. 入队操作 (2) 可能需要复制数据, 移动指针, 甚至 resize 队列, 因此我们要保证获取到锁时, 这些操作的结果完全可见. 出队操作也是同理. 所以自旋锁要保证 unlock 操作 "synchronizes-with" lock 操作, 保证锁保护的数据是完整的.

我们可以用 acquire-release 模型实现自旋锁. 下面是一个简单的实现:

```c++
class spinlock {
    std::atomic<bool> flag{false};
public:
    void lock() {
        while (flag.exchange(true, std::memory_order_acquire)); // (1)
    }
    void unlock() {
        flag.store(false, std::memory_order_release); // (2)
    }
};
```

上面的实现中, (1) 处加锁用到的 `exchange` 是一种 read-modify-write 操作, 它将目标值 (第一个参数) 写入原子变量, 并返回写入前的值. 在这个实现中, 锁被占用时 `flag` 为 `true`. 如果锁被占用, (1) 处的 exchange 操作会一直返回 `true`, 线程阻塞在循环中; 直到锁被释放, `flag` 为 `false`, exchange 操作将 `flag` 重新置为 `true` 以抢占锁, 并且返回其原来的值 `false`, 循环退出, 加锁成功. 解锁则很简单, 将 `flag` 置为 `false` 即可.

由于解锁操作使用 `memory_order_release` 且加锁操作使用 `memory_order_acquire`, 所以能保证加锁成功时与上一次解锁操作构成 "synchronizes-with" 的关系, 也就是 unlock 操作 "synchronizes-with" lock 操作.

加锁时的 exchange 操作是一个 read-modify-write 操作, 它既读又写. 当它使用 `memory_order_acquire` 时, 只能保证它读的部分是一个 acquire 操作. 如果有两个线程抢占同一个锁

```c++
spinlock mu;

void thread1() {
    // some operations
    mu.lock(); // (1)
}

void thread2() {
    mu.lock(); // (2)
}
```
\(1) 和 (2) 之间没有任何同步关系, 假设先执行操作 (1) 后执行操作 (2), 那么 `thread1` 中 (1) 之前的操作结果不一定对 `thread2` 可见. 但能确定的是, 只会有一个线程得到锁, 这是由原子变量的修改顺序 (modification order) 所保证的. 要么 `thread1` 先将 `flag` 置为 `true`, 要么 `thread2` 先将 `flag` 置为 `true`, 这个顺序是全局一致的.

### 4.2 线程安全的单例模式

单例模式是一种很常用的设计模式. 我们通常用一个静态成员指针存储这个类的唯一实例, 然后用一个静态成员函数获取它, 如果指针为空则创建.

```c++
class App {
    static App *instance;
public:
    static App *get_instance() {
        if (!instance)
            instance = new App;
        return instance;
    }
};
```

但是这种做法在多线程下有并发的问题. 解决这个问题最简单的办法就是加锁. 但是给整个函数加锁是没有必要的, 因为只有在初始创建对象时才会有并发的问题, 后续则只需要返回指针, 此时的锁会造成不必要的性能负担. 更好的做法是仅在要创建对象的时候加锁, 我们可以这样实现:

```c++
class App {
    static App *instance;
    static std::mutex mu;
public:
    static App *get_instance() {
        if (!instance) { // (1)
            std::lock_guard<std::mutex> guard(mu);
            if (!instance)
                instance = new App; // (2)
        }
        return instance;
    }
};
```

在上面的实现中, 如果发现 `instance` 指针为空, 则加锁并创建对象. 获取到锁后, 还需要再判断一下 `instance` 是否为空, 以免在判断 (1) 之后, 锁获取到之前, 有其他线程创建了对象. 但是这种做法是有问题的: (1) 并没有在锁的保护下, 它有可能与 (2) 并发, 导致数据竞争.

我们可以使用原子变量解决这个问题, 将 `instance` 指针改成原子类型 `std::atomic<App*>`. 那么在读取和写入 `instance` 时, 应该使用什么内存顺序呢, `memory_order_relaxed` 可以吗?

```c++
class App {
    static std::atomic<App*> instance;
    static std::mutex mu;
public:
    static App *get_instance() {
        auto *p = instance.load(std::memory_order_relaxed); // (1)
        if (!p) {
            std::lock_guard<std::mutex> guard(mu);
            if (!(p = instance.load(std::memory_order_relaxed))) { // (2)
                p = new App;
                instance.store(p, std::memory_order_relaxed); // (3)
            }
        }
        return p;
    }
};
```

假设线程 1 调用了 `get_instance`, 发现对象没有创建, 然后成功获取到锁并且创建对象, 接着执行 (3) 将新对象的指针写入 `instance` 中; 随后线程 2 也调用 `get_instance` 执行 (1) 读取到线程 1 在操作 (3) 中写入的值, 此时能保证得到的指针 `p` 是有效的吗?

注意线程 1 执行 `p = new App` 时需要调用构造函数初始化 `App` 中的成员. 因为 (1) 和 (3) 都是 `memory_order_relaxed` 的内存顺序, 它们之间没有任何 synchronizes-with 的关系. 所以当线程 2 在操作 (1) 读取到线程 1 在操作 (3) 写入的指针时, 不能保证 `App` 成员的初始化结果对线程 2 可见. 这会导致线程 2 得到的对象数据不完整, 造成非常意外的结果.

正确的做法是使用 acquire-release 模型:

```c++
class App {
    static std::atomic<App*> instance;
    static std::mutex mu;
public:
    static App *get_instance() {
        auto *p = instance.load(std::memory_order_acquire); // (1)
        if (!p) {
            std::lock_guard<std::mutex> guard(mu);
            if (!(p = instance.load(std::memory_order_relaxed))) { // (2)
                p = new App;
                instance.store(p, std::memory_order_release); // (3)
            }
        }
        return p;
    }
};
```

这样当线程 2 在操作 (1) 读取到线程 1 在操作 (3) 写入的指针时, 有 (3) "synchronizes-with" (1). 因此线程 1 初始化 `App` 成员的结果对线程 2 可见, 此时线程 2 返回 `p` 不会有任何问题.

操作 (2) 仍然使用 `memory_order_relaxed`, 因为它在锁的保护下, 锁可以保证线程同步, 因此没有问题.

## 5. 总结

总结一下这几种内存顺序模型:

- `memory_order_release`: 最宽松的内存顺序, 只保证操作的**原子性**和**修改顺序 (modification order)**.
- `memory_order_acquire`, `memory_order_release` 和 `memory_order_acq_rel`: 实现 **acquire 操作**和 **release 操作**, 如果 acquire 操作读到了 release 操作写入的值, 或其 release sequence 写入的值, 则构成 **synchronizes-with 关系**, 进而可以推导出 **happens-before 的关系**.
- `memory_order_consume`: 实现 **consume 操作**, 能实现数据依赖相关的同步关系. 如果 consume 操作读到了 release 操作写入的值, 或其 release sequence 写入的值, 则构成 **dependency-ordered before 的关系**, 对于有数据依赖的操作可以进而推导出 **happens-before 的关系**.
- `memory_order_seq_cst`: 加强版的 acquire-release 模型, 除了可以实现 **synchronizes-with 关系**, 还保证**全局顺序一致**.

## 6. 扩展阅读

对于有些概念, 如 sequenced-before 和 carries dependency, 本文只描述了其中几种简单的情况, 并没有给出严谨的定义. 在实际应用中我们一般不用考虑它们的严格定义, 但如果你需要了解或对其感兴趣, 可以参考 cppreference.com.

关于内存顺序, C++ 还有一些本文没提到的功能, 如内存栅栏 (memory fences). C++ 的原子变量提供的操作也很多, 本文只提到了其中一部分. 对其感兴趣或需要了解的同学可以参考 *C++ Concurrency in Action* 和 cppreference.com. 限于篇幅, 本文的有些内容可能解释地不够详尽, 或者定义不够严谨. 如果想了解概念的严格定义, 可以参考 cppreference.com; 如果需要详细的讲解, 可以参考 *C++ Concurrency in Action*.

***

**参考资料:**

- C++ Concurrency in Action: Practical Multithreading, Anthony Williams.
- [std::memory_order - cppreference.com](https://en.cppreference.com/w/cpp/atomic/memory_order)
