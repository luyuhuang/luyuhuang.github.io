---
title: "Y-Combinator: 如何在匿名函数中递归调用自身"
tag: math
---
如何实现一个阶乘函数? 最简单的做法是使用递归:

```js
'use strict';

function factorial(n) {
    if (n === 0) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}
```

很好. 那么如何将 `factorial` 函数写成一个匿名函数, 且同样递归调用自身呢? (`arguments.callee` 禁止)

答案略显诡异. 它是这样的:

{% highlight js linenos %}
'use strict';

const Y = (F) => ((g) => g(g))((g) => F((x) => g(g)(x)));

Y((factorial) => (n) => {
    if (n === 0) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
})
{% endhighlight %}

其中 5 至 11 行是一个真正的匿名函数表达式; 6 至 10 行与递归版的阶乘函数完全一致, 只不过第 9 行似乎不是在递归调用自身, 而是调用了上层函数的一个参数. 大家可以打开 node 试一试, 比如说

```js
Y((factorial) => (n) => {
    if (n === 0) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
})(5);
```

就能得到 5 的阶乘 120.

那么, 这其中诡异 `Y = (F) => ((g) => g(g))((g) => F((x) => g(g)(x)))` 是什么呢? 第 9 行中调用的 `factorial` 又是什么? 这就是本文要讨论的主角: **Y-Combinator**.

### Lambda 演算

现代语言几乎都有匿名函数这一特性, 而匿名函数常常有另一个名字: lambda 表达式. 为什么要叫它 lambda 表达式呢? 这是因为它来自于 lambda 演算. Lambda 演算本身非常简单, 这里我们简单介绍.

#### Lambda 项

一个 Lambda 项可以是:

- **原子 (atom)**: 一个合法的标识符即是原子, 所有的原子都是 lambda 项
- **应用**: 如果 $M$ 和 $N$ 是 lambda 项, 则 $(M\ N)$ 也是 lambda 项
- **抽象**: 如果 $M$ 是 lambda 项, $\phi$ 是一个合法的标识符, 则 $(\lambda \phi . M)$ 也是 lambda 项

以下的式子都是 lambda 项:

- $a$
- $(a\ b)$
- $(a (b\ c))$
- $(\lambda x . (x\ y))$
- $(\lambda x . (\lambda y . (x\ y)))$

以 lambda 项 $(\lambda x . (x\ y))$ 为例, 其中点号右边的 $x$ 在点号左边被标记为 $\lambda x$ , 我们称这样的变量为**约束变量**; 与之相对的 $y$ 则被称为**自由变量**. 在 lambda 项 $(\lambda x . (\lambda y . (x\ y)))$ 中, $x$ 和 $y$ 都是约束变量.

#### Lambda 演算

Lambda 演算仅有如下两个规则:

##### $\alpha$ 变换

约束变量可随意替换, 只要不与自由变量冲突. 例如 $(\lambda x . (x\ y))$ 可以变换成 $(\lambda t . (t\ y))$ 或者 $(\lambda u . (u\ y))$, 它们完全等价. 但是不能变换成 $(\lambda y . (y\ y))$, 这与自由变量 $y$ 冲突了. 我们称这种变换为 $\alpha$ 变换.

##### $\beta$ 规约

对于应用 lambda 项 $(M\ N)$, 其中 $M$ 为抽象 lambda 项, $(M\ N)$ 等价于将 $M$ 中所有的约束变量替换成 $N$ 的 lambda 项. 例如 $((\lambda x . (x\ y)) k)$ 等价于 $(k\ y)$, $((\lambda x . (\lambda y . (x\ y))) k)$ 等价于 $(\lambda y . (k\ y)))$.

为了方便, 我们令 lambda 项 $\times$ 为 $(\lambda x . (\lambda y . x \times y))$, 这里 $x \times y$ 只是 "伪代码", 表示求 $x$ 与 $y$ 之积. 则如下的 $\beta$ 规约为:

$$
((\times 2) 3) = (((\lambda x . (\lambda y . x \times y)) 2) 3) = ((\lambda y . 2 \times y) 3) = 2 \times 3 = 6
$$

也就是 $((\times 2) 3)$ 首先会求 $(\times 2)$, $\beta$ 规约得到一个新的抽象 lambda 项 $(\lambda y . 2 \times y)$, 然后再求 $((\lambda y . 2 \times y) 3)$, 最后得到 $2 \times 3 = 6$.

$((\times x) y)$ 这样的写法不太方便, 这种始终左结合的应用 lambda 项可以省略括号, 例如 $(a\ b\ c\ d)$ 实际表示的是 $(((a\ b)\ c)\ d)$. 因此 $((\times x) y)$ 可写作 $(\times x\ y)$

我们可以很自然地将抽象 lambda 项理解为函数定义, 把应用 lambda 项理解为函数调用. $\alpha$ 变换可理解为参数名字不重要, 可以随意替换; $\beta$ 规约则是将实参带入形参调用函数. 不过 lambda 演算不允许定义多参函数, 只能使用形如 $(\lambda x . (\lambda y . (x\ y)))$ 的方式实现.

### Y-Combinator

<!-- 我们很快就发现 lambda 演算的问题: 它 "定义" 的 "函数" 都是 "匿名函数". 匿名函数如何递归调用自身呢? 这个问题乍一看是无解的: 我们无法使用一个没有创建完毕的东西! 以本文开头的阶乘函数为例: -->

我们尝试用 lambda 演算计算阶乘. 为了方便, 我们还定义了以下几个函数(lambda 项):

- $\mathrm{eq} = (\lambda x . (\lambda y . x = y))$ 其中 $a = b$ 是伪代码, 当且仅当 a 与 b 相等时值为真.
- $\mathrm{if} = (\lambda\ cond . (\lambda\ a . (\lambda\ b .\ if\ cond\ then\ a\ else\ b )))$ 其中 $if\ cond\ then\ a\ else\ b$ 是伪代码, 表示当 cond 为真时值为 a 否则为 b.
- $- = (\lambda a . (\lambda b . a - b))$ 其中 $a - b$ 是伪代码, 表示求 a 与 b 之差.

然后我们定义出了求阶乘的函数:

$$
factorial = (\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (factorial\ (-\ n\ 1))\ n)\ ))
$$

但是这是不合法的. Lambda 演算只是简单的符号替换, 不是编程语言中的函数调用. 因此在定义 factorial 的时候, factorial 还没被创建处理, 你无法对一个不存在的符号执行 $\beta$ 规约.

### 延伸阅读 & 参考

笔者最近看完了 *The Little Schemer* , 又参阅了一些关于 lambda 演算的文章, 为之叹服. *The Little Schemer* 这本书以一种自问自答的方式介绍了 Scheme 语言和函数式编程思想, 其中第九章中对 Y-Combinator 的介绍令人拍案叫绝. 这本书给我的感觉是重新学习了编程, 因此笔者强烈推荐 *The Little Schemer* , 它能极大地开阔我们的思路.

这里还有一篇介绍 lambda 演算的文章 [https://github.com/txyyss/Lambda-Calculus](https://github.com/txyyss/Lambda-Calculus) , 写得非常好. 它还附带了一个 lambda 解释器及其实现, 同样强烈推荐.
