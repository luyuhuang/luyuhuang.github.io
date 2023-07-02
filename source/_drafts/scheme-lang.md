---
title: Scheme 语言
tags: comupter-science
---
我最近在读 *SICP*，感觉收益匪浅。我打算开个坑，总结分享一下我学到的一些内容，主要内容可能包括

- Scheme 语言
- Scheme 元循环解释器
- 神奇的 `call/cc`
- 通过 CPS 解释器实现 `call/cc`
- 通过 CPS 变换（也就是传说中的[“王垠 40 行代码”](https://www.zhihu.com/question/20822815)）实现 `call/cc`
- ...

我最近刚读完第四章，待最后一章读完再看情况更新一些内容。这些内容的基础是 Scheme 语言，我们从介绍 Scheme 语言开始。本文介绍的 Scheme 语言主要目的是让不了解 Scheme 的同学看完之后能看得懂后面几篇文章，因此不会涉及到一些很细节的内容。（特别细节的内容我也不懂，*SICP* 也没有很深入介绍）如果要深入了解，可以阅读相关的文档。

## 1 Scheme 的特性

Scheme 是一种 Lisp 的方言。而 Lisp 是世界上第二古老的语言（第一古老的是 Fortran），有着众多的方言。这些方言有着一个共同的特性——基于 **S 表达式 (S-expressions)**。

S 表达式可以是**原子表达式 (atom)** 或者**列表**。原子表达式可以是数字，如 `1`, `42`, `3.14`；可以是字符串，如 `"hello"`；可以是布尔值，如 `#t`, `#f`；也可以直接是符号，如 `a`, `if`, `add`。而列表则是将若干个 S 表达式放在一对括号里，用空格隔开：

```scheme
(<s-exp1> <s-exp2> <s-exp3> ...)
```

下面给出了一些 S 表达式的例子：

```scheme
100
100.13
"Hello world"
(add 1 2)
(display "Hello world")
(list (list 1 2) (list "a" "b"))
```

前三个 S 表达式都是原子表达式。`(add 1 2)` 是一个长度为 3 的列表，3 个元素分别是符号 `add`、数字 1 和数字 2。`(display "Hello world")` 是一个长度为 2 的列表，第一个元素是符号 `display`，第二个元素是字符串 `"Hello world"`。`(list (list 1 2) (list "a" "b"))` 是一个长度为 3 的列表，三个元素分别是符号 `list`、列表 `(list 1 2)`、列表 `(list "a" "b")`。

Scheme 全部是由 S 表达式组成的。在 Scheme 中，复合表达式的第一个元素作为表达式的类型，剩余的元素则作为表达式的参数。

![Alt text](/assets/images/scheme-lang_1.png)

表达式类型决定这个表达式的语义和参数的含义。例如 `if` 表达式规定有三个参数，第一个参数为条件，第二个参数为条件为真时执行的表达式，第三个参数为条件为假时执行的表达式。由于 S 表达式可以任意嵌套，因此利用它就可以构造出任意复杂的代码。下面就是一段 Scheme 代码的例子：

```scheme
(define (queens board-size)
  (define (queen-cols k)
    (if (= k 0)
      (list '())
      (filter
        (lambda (positions) (safe? positions))
        (flatmap
          (lambda (rest-of-queens)
            (map (lambda (new-row)
                   (adjoin-position new-row k rest-of-queens))
                 (enumerate-interval 1 board-size)))
          (queen-cols (- k 1))))))
  (queen-cols board-size))
```

可以看到 S 表达式互相嵌套，形成了一个树状结构，这其实就是语法树。也就是说这个语言实际是把语法树明确的写出来。后面我们能看到这种做法的好处：代码可以直接表示为数据结构，代码极其容易解析、编译。

## 2 编程环境

Scheme 作为 Lisp 的一种方言，它本身又有很多方言，例如 Chez Scheme, MIT Scheme, Racket 等。我们使用的环境是 Racket，它功能强大，易于使用。我们可以到它的[官网](https://racket-lang.org/)下载最新版本。Racket 自带一个 IDE，叫 DrRacket，我们可以使用它学习编写 Scheme。

有些同学可能不习惯这种全是括号的语言，阅读代码需要数括号，十分麻烦。但如果代码做好缩进与对齐，之间的嵌套关系是一目了然的。我们可以让参数另起一行，相对类型缩进两个空格：

```scheme
(type
  arg1
  arg2
  ...)
```

或者第一个参数与类型同行，后续参数与第一个参数对齐：

```scheme
(type arg1
      arg2
      ...)
```

如果第一个参数比较特殊，也可以让第一个参数与类型同行，剩余的参数另起一行，并缩进两个空格

```scheme
(type special-arg1
  arg2
  arg3
  ...)
```

基本上就这三种缩进风格。使用 DrRacket 可以自动缩进；阅读代码时不需要关心括号，直接看代码缩进即可，就像 Python 一样。

## 3 基础表达式

一个高级语言一定具备这三个要素：

1. 原子表达式
2. 组合方法
3. 抽象方法

我们说汇编语言不是高级语言，因为它有非常弱的组合能力和抽象能力。例如 `add $42 %eax` 可以表示 `eax + 42`，但是要想表示 `(eax + 42) * 3` 就得写两条指令了，因为这个语言根本没有嵌套组合的能力。至于抽象能力，汇编中的函数更像是个 goto。而 Scheme 是非常高级的语言，因为它有非常强的组合能力和抽象能力，稍后我们可以看到。

### 3.1 原子表达式

原子表达式有这么几种：

- 数字。可以是整数 `10`、`-12`；浮点数 `3.14`；有理数 `1/2`、`-3/5`，形式是两个由 `/` 分隔的整数，注意中间不能由空格，因为这是一个原子。
- 字符串。由双引号标识，如 `"Hello world"`。
- 布尔。有两种，`#t` 和 `#f`。
- 符号。也就是所谓的“变量”，或者说标识符。例如 `pi`，值为 `3.141592653589793`；`sqrt`，为一个内建函数。不同于很多语言，Scheme 的符号不局限于字母、数字和下划线，例如 `reset!`、`*important*`、`+`、`1st-item` 都是有效的符号。

### 3.2 复合表达式

## 4 定义函数

##