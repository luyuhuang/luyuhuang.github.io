---
title: 谈谈 C++ 中的 const
tag: c/c++
aside: false
---
C++ 用关键字 `const` 标识一个类型不可变. 这其实很容易理解. 不过, 对于 C++ 而言, 简单的概念也有很多可以讨论的. 我们来看一个问题.

### 问题

我们知道 `const` 可以用于修饰成员函数, 标识这个函数不能修改这个类的数据. 假设一个类有一个指向类型 `T` 的指针 `T *p`; 我们希望通过 `get()` 方法获取 `T` 的引用. 如果 `get()` 被 `const` 修饰, 它应该返回什么类型, 是 `const T&` 还是 `T&` 呢?

```c++
class C {
public:
    ??? get() const { return *p; }
private:
    T *p;
};
```

可能很多同学很自然地认为应该返回 `const T&`, 因为 `get()` 不应该改变数据. 的确, 很多类就是这样处理的. 例如标准库的顺序容器都有 `front` 方法, 返回容器中第一个元素的引用. 如 `vector<int>::front()`

```c++
vector<int> v = {1, 2, 3};
v.front() = 10; // int &

const vector<int> cv = {1, 2, 3};
v.front() = 10; // error: assignment of read-only location. const int &
```

可以看到非 const 版本返回的是 `int&`, 而 const 版本返回的是 `const int&`.

我们看另一个例子. 标准库的迭代器, 例如 `vector<int>::iterator` 重载了解引用运算符 `operator*()`. 那么它的返回类型是什么呢?

```c++
vector<int> v = {1, 2, 3};
const auto i = v.begin();
*i = 10; // int &
```

它返回了 `int&` 而不是 `const int&`, 即使这个 `operator*()` 是 const 版本的.

### 引用类型, 顶层 const 和底层 const

首先我们知道, C++ 的类型分为值类型和引用类型. 对于引用类型而言, 例如指针, 它有两层 const: 顶层 const 和底层 const. 顶层 const 表示这个变量本身不可变.

```c++
int a, b;
int *const p = &a;
p = &b; // error: assignment of read-only variable
*p = 10; // ok
```

而底层 const 表示这个变量引用的值不可变.

```c++
int a, b;
const int *p = &a;
p = &b; // ok
*p = 10; // error: assignment of read-only location
```

对变量赋值或初始化时, 顶层 const 可以隐式加上或去除, 底层 const 可以隐式加上, 却不能去除.

```c++
int *p;
int *const q = p; // int* -> int *const
p = q; // int *const -> int*

const int *cp;
cp = p; // int* -> const int*
p = cp; // error error: invalid conversion from ‘const int*’ to ‘int*’
```

如果一个类的成员函数被 `const` 修饰, 则这个函数的 `this` 指针是底层 const 的, 也就是 `const T *this`. 那么通过 `this` 指针访问到的所有成员都是顶层 const 的.

以本文开头的例子, `get()` 被 `const` 修饰, `get()` 中访问到的 `p` 的类型应该时 `T *const p`. 编译器并不阻止我们在 const 成员函数里修改指针成员指向的值, 那为什么有些类要禁止修改, 而有些类允许修改呢?

### 引用类型还是值类型

如果类有一个指向类型 `T` 的指针 `T *p`, 那么我们在拷贝这个类的对象时, 是复制这个指针本身还是复制指针指向的值呢?

```c++
class C {
public:
    C(const C &c) : p(c.p) { } // or
    C(const C &c) : p(new T(*c.p)) {}

    C &operator=(const C &c) {
        if (&c == this) return *this;
        p = c.p
        return *this;
    } // or
    C &operator=(const C &c) {
        if (&c == this) return *this;
        delete p;
        p = new T(*c.p);
        return *this;
    }

private:
    T *p;
};
```

C++ 允许开发者控制对象拷贝时的行为. 我们可以仅拷贝指针, 让拷贝前后指向同一个对象; 也可以完全拷贝指针指向的值, 向用户隐藏这个类存在引用成员这一事实.

当我们拷贝指针指向的值时, 这个类看起来就是个**值类型**. 例如 `std::vector`, 它的内存是动态分配的, `vector` 对象本身只记录指向分配内存的指针. 但是我们在拷贝 `vector` 时, 会复制其包含的所有对象. 因此对于用户来说它就是个值类型.

既然是值类型, 就只有一层 const, 也就是顶层 const. 因此当一个 `vector` 是 const 的时候, `vector::front()` 也应该返回 const 的引用. 类需要负责将顶层的 const 传递到底层.

当我们仅拷贝指针本身时, 这个类看起来就是个**引用类型**. 例如 `vector::iterator`, 它包含一个指向 `vector` 中元素的指针. 当拷贝迭代器时, 仅会拷贝指针本身, 拷贝前后的迭代器指向同一个元素. 因此对于用户来说它就是个引用类型.

既然是引用类型, 就应该区分底层 const 和底层 const. 因此即使迭代器本身是 const 的, `operator*()` 也不会返回 const 的引用, 因为顶层 const 不会传递到底层. 怎样设置迭代器的底层 const? `vector` 提供了两个类, `vector::iterator` 和 `vector::const_iterator`. 后者无论迭代器本身是否是 const, `operator*()` 始终返回 const 的引用, 因为它是底层 const 的.

### C++ 很强大

回到本文开头的问题. 标准答案是, 返回 `const T&` 还是 `T&` 取决于我们如何定义这个类. 如果 `class C` 的拷贝控制函数拷贝 (或移动) 了 `p` 指向的值, 则应当返回 `const T&`; 如果只是拷贝指针本身, 则应当返回 `T&`.
