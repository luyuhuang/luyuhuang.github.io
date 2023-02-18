---
key: 36
title: "Y-Combinator: 如何在匿名函数中递归调用自身"
math: true
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

```js
'use strict';

const Y = (F) => ((g) => g(g))((g) => F((x) => g(g)(x)));

Y((factorial) => (n) => {
    if (n === 0) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
})
```

其中 5 至 11 行是一个真正的匿名函数表达式; 6 至 10 行与递归版的阶乘函数完全一致, 只不过第 9 行似乎不是在递归调用自身, 而是调用了上层函数的一个参数. 理解起来暂时有点难, 大家可以打开 node 试一试, 比如说

```js
Y((factorial) => (n) => {
    if (n === 0) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
})(5);
```

就能得到 5 的阶乘为 120.

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

以 lambda 项 $(\lambda x . (x\ y))$ 为例, 其中点号右边的 $x$ 在点号左边被标记为 $\lambda x$ , 这样的变量我们称为**约束变量**; 与之相对的 $y$ 则被称为**自由变量**. 在 lambda 项 $(\lambda x . (\lambda y . (x\ y)))$ 中, $x$ 和 $y$ 都是约束变量.

#### Lambda 演算

Lambda 演算仅有如下两个规则:

##### $\alpha$ 变换

约束变量可随意替换, 只要不与自由变量冲突. 例如 $(\lambda x . (x\ y))$ 可以变换成 $(\lambda t . (t\ y))$ 或者 $(\lambda u . (u\ y))$, 它们完全等价. 但是不能变换成 $(\lambda y . (y\ y))$, 这与自由变量 $y$ 冲突了. 我们称这种变换为 $\alpha$ 变换.

##### $\beta$ 规约

对于应用 lambda 项 $(M\ N)$, 其中 $M$ 为抽象 lambda 项, $(M\ N)$ 等价于将 $M$ 中的约束变量替换成 $N$ 的 lambda 项. 例如 $((\lambda x . (x\ y)) k)$ 等价于 $(k\ y)$, $((\lambda x . (\lambda y . (x\ y))) k)$ 等价于 $(\lambda y . (k\ y)))$.

再比如, 我们令 lambda 项 $\times \equiv (\lambda x . (\lambda y . x \times y))$, 这里 $x \times y$ 只是 "伪代码" (它并不符合 lambda 项的规范), 表示求 $x$ 与 $y$ 之积. 则如下的 $\beta$ 规约为:

$$
((\times 2) 3) \equiv (((\lambda x . (\lambda y . x \times y)) 2) 3) \equiv ((\lambda y . 2 \times y) 3) \equiv 2 \times 3 = 6
$$

也就是 $((\times 2) 3)$ 首先会求 $(\times 2)$, $\beta$ 规约得到一个新的抽象 lambda 项 $(\lambda y . 2 \times y)$, 然后再求 $((\lambda y . 2 \times y) 3)$, 最后得到 $2 \times 3 = 6$.

$((\times x) y)$ 这样的写法不太方便, 这种始终<u>左结合</u>的应用 lambda 项可以省略括号, 例如 $(a\ b\ c\ d)$ 实际表示的是 $(((a\ b)\ c)\ d)$. 因此 $((\times x) y)$ 可写作 $(\times x\ y)$ .

$(\lambda x . (\lambda y . x \times y))$ 这样的写法也不太方便, 这种始终<u>右结合</u>的抽象 lambda 项也可以省略括号, 例如 $(\lambda x . \lambda y . \lambda z . M)$ 实际表示的是 $(\lambda x . (\lambda y . (\lambda z . M)))$ . 因此 $(\lambda x . (\lambda y . x \times y))$ 写作 $(\lambda x . \lambda y . x \times y)$ 就可以了.

我们可以很自然地将抽象 lambda 项理解为函数定义, 把应用 lambda 项理解为函数调用. $\alpha$ 变换可理解为参数名字不重要, 可以随意替换; $\beta$ 规约则是将实参带入形参调用函数. 不过 lambda 演算不允许定义多参函数, 只能使用形如 $(\lambda x . \lambda y . M)$ 的方式实现, 称为**柯里化(Currying)**.

### Y-Combinator

我们尝试用 lambda 演算计算阶乘. 为了方便, 我们还定义了以下几个函数(lambda 项):

- $\mathrm{eq} \equiv (\lambda x . \lambda y . x = y)$ 其中 $a = b$ 是伪代码, 当且仅当 $a$ 与 $b$ 相等时值为真.
- $\mathrm{if} \equiv (\lambda\ cond\ .\ \lambda\ a\ .\ \lambda\ b .\ \mathrm{if}\ cond\ \mathrm{then}\ a\ \mathrm{else}\ b )$ 其中 $\mathrm{if}\ cond\ \mathrm{then}\ a\ \mathrm{else}\ b$ 是伪代码, 表示当 cond 为真时值为 $a$ 否则为 $b$.
- $- \equiv (\lambda a . \lambda b . a - b)$ 其中 $a - b$ 是伪代码, 表示求 $a$ 与 $b$ 之差.

然后我们定义出了求阶乘的函数:

$$
factorial \equiv (\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (factorial\ (-\ n\ 1))\ n)\ ))     \tag{1}
$$

其中 $(\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (factorial\ (-\ n\ 1))\ n)\ )$ 应用 $\mathrm{if}$ , 当 $n$ 为 0 即 $(\mathrm{eq}\ n\ 0)$ 为真时值为 1; 否则为 $(\times\ (factorial\ (-\ n\ 1))\ n)$, 即递归调用 $(factorial\ (-\ n\ 1))$ 再乘以 $n$.

我们在编程语言中常常这样用, 但遗憾的是, 在 lambda 演算中, 这是不合法的. Lambda 演算只是简单的符号替换, 不是编程语言中的函数调用. 因此在定义 factorial 的时候, factorial 还没被创建, 你无法对一个不存在的符号执行 $\beta$ 规约.

既然无法使用一个符号代替它自身, 那我们就把它自身原样写进去试试:

$$
\begin{align}
&(\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times \\
&\qquad    ((\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times \\
&\qquad\qquad        ((\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times \\
&\qquad\qquad\qquad            ((\lambda n .\ ...)\ (-\ n\ 1)) \\
&\qquad\qquad        n))) (-\ n\ 1)) \\
&\qquad    n)))\ (-\ n\ 1)) \\
&n)))
\end{align}
\tag{2}
$$

这样写下去就没完没了了. 不妨尝试将重复的部分提取出来, 用 lambda 演算替换:

$$
(\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) \tag{3}
$$

可以看到, 递归调用的部分做成了约束变量 $f$, 然后我们只需使用 $\beta$ 规约把 $f$ 替换成自己, 得到:

$$
\begin{align}
& ( (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) \\
&\qquad ( (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) \\
&\qquad\qquad ( (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) \\
&\qquad\qquad\qquad    ...)))
\end{align}
\tag{4}
$$

与 (2) 式等价. 嗯, 这比 (2) 式好看了些, 不过重复的部分还是有点多. 我们再来进一步改进:

$$
\begin{align}
&((\lambda g. (g (g (g (...))))) \\
&\qquad    (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) )
\end{align}
\tag{5}
$$

我们把 (3) 式应用 $(\lambda g. (g (g (g (...)))))$, 让它不断地对自己执行 $\beta$ 规约, 其结果与 (4) 式等价, 而且简洁了不少.

这时可能有同学要问, 这有什么用呢? 我们不断地让 $g$ 应用它自身, 还是没完没了啊! 其实我们离胜利只剩一步之遥了. 观察 (5) 式, 我们想要的其实不过是

$$
\begin{matrix}
(\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) & f = (g (g (g (...))))
\end{matrix}
$$

也就是我们希望 $(g (g (g (...))))$ 能等价于 $(\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n)))$ 它本身, 使得它能够递归调用. 那么我们能不能不写无数个应用 lambda 项呢? 试试这样:

$$
\begin{align}
&((\lambda g. (g\ g)) \\
&\qquad    (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) )
\end{align}
\tag{6}
$$

这样 $f$ 会等于 $g$ 也就是 (3) 式. 它是不能传入 $(-\ n\ 1)$ 以求 $n - 1$ 的阶乘的. 且慢! 虽然 $g$ 不是 $(\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n)))$, 但是 $g$ 能生成它! 那么, 如果我们让 $g$ 应用它自己, 也就是 $(g\ g)$, 它就会生成一个递归调用 $(g\ g)$ 的函数, 这个函数似乎可以求阶乘! 于是我们把 (6) 式改写成:

$$
\begin{align}
&((\lambda g. (g\ g)) \\
&\qquad    (\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))) )
\end{align}
\tag{7}
$$

我们把它展开试试:


$$
\begin{align}
(7) \equiv\quad
&((\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))) \\
&\qquad (\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n)))) \\\\
\equiv\quad
&((\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (\\
&\qquad  ((\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))) \\
&\qquad\qquad        (\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))))\\
&\qquad\ (-\ n\ 1))\ n)))) \\\\
\equiv\quad
&((\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (\\
&\qquad((\lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (\\
&\qquad\qquad  ((\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))) \\
&\qquad\qquad\qquad        (\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))))\\
&\qquad\qquad\ (-\ n\ 1))\ n)))) \\
&\qquad\ (-\ n\ 1))\ n)))) \\
\equiv\quad & ...
\end{align}
$$

我们惊奇地发现, 它能无限执行 $\beta$ 规约, 其结果与 (2) 式完全一致. 也就是说我们得到了阶乘的 lambda 演算.

虽然 (7) 式能完成递归阶乘运算, 但是 $(g\ g)$ 这种写法有些丑, 能不能优化一下呢? 很简单, 使用 lambda 演算替换掉就好了. 我们先定义:

$$
\begin{align}
Y \equiv \quad & (\lambda F.\ ((\lambda g. (g\ g)) \\
&\qquad (\lambda g. (F\ (g\ g)))))
\end{align}
\tag{8}
$$

我们只需要将 (3) 式应用 $Y$ 即可得到阶乘的 lambda 演算:

$$
factorial \equiv (Y\ (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))))  \tag{9}
$$

我们把它展开看看:

$$
\begin{align}
factorial \equiv \quad &
(Y\ (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n)))) \\
\equiv \quad &
((\lambda g. (g\ g)) \\
&\qquad (\lambda g. ((\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n))) \\
&\qquad\qquad (g\ g)))) \\
\equiv \quad &
((\lambda g. (g\ g)) \\
&\qquad (\lambda g . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ ((g\ g)\ (-\ n\ 1))\ n))))
\end{align}
$$

与 (7) 式完全一致. 至此, 我们得到了完美的阶乘 lambda 项.

\(8) 式被称为 **Y-Combinator**. 我们再回过头看来 (9) 式中传入 $Y$ 中的 lambda 项, 也就是 (3) 式, 令

$$
F \equiv (\lambda f . \lambda n . (\mathrm{if}\ (\mathrm{eq}\ n\ 0)\ 1\ (\times\ (f\ (-\ n\ 1))\ n)))
$$

实际上 $F$ 希望能传入一个 lambda 项 $f$, 使得 $f \equiv (F\ f)$. 因为只有这样, 才能让 $f$ 递归调用自身. 我们称使得 $f \equiv (F\ f)$ 成立的 $f$ 为 $F$ 的**不动点(fixed point)**. 那么 $Y$ 对 $F$ 做了什么呢? 我们算算看:

$$
\begin{align}
(Y\ F) \equiv \quad
&((\lambda g. (g\ g)) \\
&\qquad (\lambda g. (F\ (g\ g)))) \\
\equiv \quad
&((\lambda g. (F\ (g\ g))) \\
&\qquad (\lambda g. (F\ (g\ g)))) \\
\equiv \quad
& (F\ ((\lambda g. (F\ (g\ g))) \\
&\qquad (\lambda g. (F\ (g\ g))))) \\
\equiv \quad & (F\ (Y\ F))
\end{align}
$$

所以我们有 $(Y\ F) \equiv (F\ (Y\ F))$. 因此 $F$ 的不动点为 $(Y\ F)$. 这就是 Y-Combinator 的神奇之处, 它通过求 $F$ 的不动点实现递归.

### 编程语言中的 Y-Combinator

OK, 现在我们来看文章开头的 `Y = (F) => ((g) => g(g))((g) => F((x) => g(g)(x)))` 是什么. 其实它就是 Y-Combinator 的 JavaScript 实现, 等价于 (8) 式. 我们把它写得更清楚些:

```js
const Y = (F) =>
    ((g) => g(g))               // (λ g . (g g))
    ((g) => F((x) => g(g)(x)))  // (λ g . (F (g g)))
```

不过略微不同的是, $(F\ (g\ g))$ 不能直接写成 `F(g(g))`, 这会使 `g(g)` 立即求值导致无限递归. 因此我们需要将 `g(g)` 写作 `(x) => g(g)(x)`, 让它在运行时求值. 明白了 Y-Combinator 的原理, 本文开头的代码也就不足为奇了.

### 延伸阅读 & 参考

笔者最近看完了 *The Little Schemer* , 又参阅了一些关于 lambda 演算的文章, 为之叹服. 这本书以一种自问自答的方式介绍了 Scheme 语言和函数式编程思想, 其中第九章中对 Y-Combinator 的介绍令人拍案叫绝. 这本书给我的感觉是重新学习了编程, 如果你和我一样, 学过很多命令式编程语言, 却从未接触过函数式编程语言, 那么强烈推荐 *The Little Schemer* , 它能极大地开阔我们的思路.

本文还参考了这篇介绍 lambda 演算的文章 [https://github.com/txyyss/Lambda-Calculus](https://github.com/txyyss/Lambda-Calculus) . 本文着重介绍 Y-Combinator, 它只是 lambda 演算的冰山一角, lambda 演算远比本文所讲的精彩美妙. 这篇文章对 lambda 演算有一个较为全面的科普, 写得非常好. 它还附带了一个 lambda 解释器及其实现, 同样推荐大家阅读.
