---
key: 14
title: RSA算法背后的数学原理
math: true
tag:
    - math
    - featured
---
## 1. 引言
**RSA算法(RSA algorithm)**是一种非对称加密算法, 广泛应用在互联网和电子商务中. 它使用一对密钥进行加密和解密, 分别称为**公钥(public key)**和**私钥(private key)**. 使用公钥加密的内容只能用私钥解密, 使用私钥加密的内容只能用公钥解密, 并且不能通过公钥在可行的时间内计算出私钥. 这使得加密通信不需要交换私钥, 保证了通信的安全. 那么它是怎么做到这一点的呢? 背后有哪些数学原理? 这篇文章我们来讨论这个问题.

本文会先介绍RSA算法中用到的数论概念和定理: 模算术, 最大公约数与贝祖定理, 线性同余方程, 中国余数定理, 费马小定理; 然后再介绍RSA算法的原理, 并证明其是有效的. 本文会假设你了解数论的基本概念, 如素数, 最大公约数, 互素等.

## 2. 模算术
### 2.1 整数除法
我们用一个正整数去除一个整数, 可以得到一个商和一个余数. 形式化定义为:

**定理 1** 令 a 为整数, d 为正整数, 则存在唯一的整数 q 和 r, 满足 $0 \leqslant r \lt d$, 使得 $a=dq+r$.

当 $r=0$ 时, 我们称 d 整除 a, 记作 $d\mid a$; 否则称 d 不整除 a, 记作 $d\nmid a$

整除有以下基本性质:

**定理 2** 令 a, b, c 为整数, 其中 $a\ne 0$. 则: <a name="theorem2"></a>
- 如果 $a\mid b$ 且 $a\mid c$, 则 $a\mid(b+c)$
- 如果 $a\mid b$, 则对于所有整数 c 都有 $a\mid bc$
- 如果 $a\mid b$ 且 $b\mid c$, 则 $a\mid c$


### 2.2 模算术
在数论中我们特别关心一个整数被一个正整数除时的余数. 我们用 $a\bmod m = b$ 表示整数 a 除以正整数 m 的余数是 b. 为了表示<u>两个整数被一个正整数除时的余数相同</u>, 人们又提出了**同余式(congruence)**.

**定义 1** 如果 a 和 b 是整数而 m 是正整数, 则当 m 整除 a - b 时称 a 模 m 同余 b. 记作 $a\equiv b\pmod m$

$a\equiv b\pmod m$ 和 $a\bmod m = b$ 很相似. 事实上, 如果 $a\bmod m = b$, 则 $a\equiv b\pmod m$. 但他们本质上是两个不同的概念. $a\bmod m = b$ 表达的是一个函数, 而 $a\equiv b\pmod m$ 表达的是两个整数之间的关系.

模算术有下列性质:

**定理 3** 如果 m 是正整数, a, b 是整数, 则有

$$
\begin{align}
(a+b)\bmod m &= ((a\bmod m)+(b\bmod m))\bmod m \\
ab\bmod m &= (a\bmod m)(b\bmod m)\bmod m
\end{align}
$$

根据定理3, 可得以下推论

**推论 1** 设 m 是正整数, a, b, c 是整数; 如果 $a\equiv b\pmod m$ , 则 $ac\equiv bc\pmod m$

**证明** $\because$ $a\equiv b\pmod m$ , $\therefore$ $(a-b)\bmod m=0$ . 那么

$$(ac-bc)\bmod m= c(a-b)\bmod m=(c\bmod m\cdot(a-b)\bmod m)\bmod m=0$$

$\therefore$ $ac\equiv bc\pmod m$ $\blacksquare$

需要注意的是, 推论1反之不成立. 来看推论2:

**推论 2** <a name="corollary2"></a>设 m 是正整数, a, b 是整数, c 是不能被 m 整除的整数; 如果 $ac\equiv bc\pmod m$, 则 $a\equiv b\pmod m$

**证明** $\because$ $ac\equiv bc\pmod m$ , 所以有

$$(ac-bc)\bmod m= c(a-b)\bmod m=(c\bmod m\cdot(a-b)\bmod m)\bmod m=0$$

$\because$ $c\bmod m\ne 0$ , $\therefore$ $(a-b)\bmod m=0$ , $\therefore a\equiv b\pmod m$ . $\blacksquare$

## 3. 最大公约数
如果一个整数 d 能够整除另一个整数 a, 则称 d 是 a 的一个**约数(divisor)**; 如果 d 既能整除 a 又能整除 b, 则称 d 是 a 和 b 的一个**公约数(common divisor)**. 能整除两个整数的最大整数称为这两个整数的**最大公约数(greatest common divisor)**.

**定义 2** 令 a 和 b 是不全为零的两个整数, 能使 $d\mid a$ 和 $d\mid b$ 的最大整数 d 称为 a 和 b 的**最大公约数**. 记作 $\gcd(a, b)$

### 3.1 求最大公约数
如何求两个已知整数的最大公约数呢? 这里我们讨论一个高效的求最大公约数的算法, 称为**辗转相除法**. 因为这个算法是欧几里得发明的, 所以也称为**欧几里得算法**. 辗转相除法基于以下定理:

**引理 1** 令 $a=bq+r$, 其中 a, b, q 和 r 均为整数. 则有 $\gcd(a, b) = \gcd(b, r)$ <a name="lemma1"></a>

**证明** 我们假设 d 是 a 和 b 的公约数, 即 $d\mid a$ 且 $d\mid b$, 那么根据[定理2](#theorem2), d 也能整除 $a-bq=r$. 所以 a 和 b 的任何公约数也是 b 和 r 的公约数;

类似地, 假设 d 是 b 和 r 的公约数, 即 $d\mid b$ 且 $d\mid r$, 那么根据[定理2](#theorem2), d 也能整除 $a=bq+r$. 所以 b 和 r 的任何公约数也是 a 和 b 的公约数;

因此, a 与 b 和 b 与 r 拥有相同的公约数. 所以 $\gcd(a, b) = \gcd(b, r)$. $\blacksquare$

**辗转相除法**就是利用[引理1](#lemma1), 把大数转换成小数. 例如, 求 $\gcd(287, 91)$, 我们就把用较大的数除以较小的数. 首先用 287 除以 91, 得

$$287=91\cdot 3+14$$

我们有 $\gcd(287, 91)=\gcd(91, 14)$. 问题转换成求 $\gcd(91, 14)$. 同样地, 用 91 除以 14, 得

$$91=14\cdot 6+7$$

有 $\gcd(91, 14)=\gcd(14, 7)$. 继续用 14 除以 7, 得

$$14=7\cdot 2+0$$

因为 7 整除 14, 所以 $\gcd(14, 7)=7$. 所以 $\gcd(287, 91)=\gcd(91, 14)=\gcd(14, 7)=7$.

我们可以很快写出辗转相除法的代码:

```python
def gcd(a, b):
    if b == 0: return a
    return gcd(b, a % b)
```

### 3.2 贝祖定理
现在我们讨论最大公约数的一个重要性质:

**定理 4** **贝祖定理** <a name="theorem4"></a>如果整数 a, b 不全为零, 则 $\gcd(a, b)$ 是 a 和 b 的线性组合集 $\\{ax+by\mid x,y\in\mathbf{Z}\\}$ 中最小的元素. 这里的 x 和 y 被称为**贝祖系数**

**证明** 令 $A = \\{ax+by\mid x,y\in\mathbf{Z}\\}$. 设存在 $x_0$, $y_0$ 使 $d_0$ 是 A 中的最小正元素, $d_0=ax_0+by_0$; 现在用 $d_0$ 去除 a, 这就得到唯一的整数 q(商) 和 r(余数) 满足

$$
\begin{matrix}
d_0q+r=a & 0\leqslant r\lt d_0 \\
(ax_0+by_0)q+r=a \\
r=a-aqx_0-bqy_0 \\
r=a(1-qx_0)+b(-qy_0) \in A
\end{matrix}
$$

又 $0\leqslant r\lt d_0$, $d_0$ 是 A 中最小正元素

$\therefore$ $r=0$ , $d_0\mid a$.

同理, 用 $d_0$ 去除 b, 可得 $d_0\mid b$. 所以说 $d_0$ 是 a 和 b 的公约数.

设 a 和 b 的最大公约数是 d, 那么 $d\mid (ax_0+by_0)$ 即 $d\mid d_0$

$\therefore$ $d_0$ 是 a 和 b 的最大公约数. $\blacksquare$

我们可以对辗转相除法稍作修改, 让它在计算出最大公约数的同时计算出贝祖系数.

```python
def gcd(a, b):
    if b == 0: return a, 1, 0
    d, x, y = gcd(b, a % b)
    return d, y, x - (a / b) * y
```

## 4. 线性同余方程
现在我们来讨论求解形如 $ax\equiv b\pmod m$ 的线性同余方程. 求解这样的线性同余方程是数论研究及其应用中的一项基本任务. 如何求解这样的方程呢? 我们要介绍的一个方法是通过求使得方程 $\bar aa\equiv 1\pmod m$ 成立的整数 $\bar a$. 我们称 $\bar a$ 为 a 模 m 的逆. 下面的定理指出, 当 a 和 m 互素时, a 模 m 的逆必然存在.

**定理 5** <a name="theorem5"></a>如果 a 和 m 为互素的整数且 $m>1$, 则 a 模 m 的逆存在, 并且是唯一的.

**证明** 由[贝祖定理](#theorem4)可知, $\because$ $\gcd(a, m)=1$ , $\therefore$ 存在整数 x 和 y 使得

$$ax+my=1$$

这蕴含着

$$ax+my\equiv 1\pmod m$$

$\because$ $my\equiv 0\pmod m$ , 所以有

$$ax\equiv 1\pmod m$$

$\therefore$ x 为 a 模 m 的逆. $\blacksquare$

这样我们就可以调用辗转相除法 `gcd(a, m)` 求得 a 模 m 的逆.

> a 模 m 的逆也被称为 a 在模m乘法群 $\mathbf Z^*_m$ 中的**逆元**. 这里我并不想引入群论, 有兴趣的同学可参阅算法导论

求得了 a 模 m 的逆 $\bar a$, 现在我们可以来解线性同余方程了. 具体的做法是这样的: 对于方程 $ax\equiv b\pmod m$ , 我们在方程两边同时乘上 $\bar a$, 得

$$\bar aax\equiv \bar ab\pmod m$$

把 $\bar aa\equiv 1\pmod m$ 带入上式, 得

$$x\equiv \bar ab\pmod m$$

$x\equiv \bar ab\pmod m$ 就是方程的解. 注意同余方程会有无数个整数解, 所以我们用同余式来表示同余方程的解.

**例 1** 求线性同余方程 $34x\equiv 77\pmod{89}$

**解** 调用 `gcd(34, 89)`, 得 $\gcd(34, 89)=1=13\cdot 89-34\cdot 34$ , 34 模 89 的逆为 -34. 方程两边同时乘 -34 得

$$
\begin{align}
-34\cdot 34x &\equiv -34\cdot 77\pmod{89} \\
x &\equiv -34\cdot 77\pmod{89} \\
x &\equiv -2618\equiv 52\pmod{89}
\end{align}
$$

## 5. 中国余数定理
中国南北朝时期数学著作 *孙子算经* 中提出了这样一个问题:

> 有物不知其数，三三数之剩二，五五数之剩三，七七数之剩二。问物几何？

用现代的数学语言表述就是: 下列同余方程组的解释多少?

$$
\left\{\begin{matrix}
x\equiv 2\pmod 3 \\
x\equiv 3\pmod 5 \\
x\equiv 2\pmod 7 \\
\end{matrix}\right.
$$

*孙子算经* 中首次提到了同余方程组问题及其具体解法. 因此中国剩余定理称为孙子定理.

**定理 6** **中国余数定理** <a name="theorem6"></a>令 $m_1, m_2, ..., m_n$ 为大于 1 且两两互素的正整数, $a_1, a_2, ..., a_n$ 是任意整数. 则同余方程组

$$
\left\{\begin{matrix}
x\equiv a_1\pmod{m_1} \\
x\equiv a_2\pmod{m_2} \\
... \\
x\equiv a_n\pmod{m_n} \\
\end{matrix}\right.
$$

有唯一的模 $m=m_1m_2...m_n$ 的解.

**证明** 我们使用构造证明法, 构造出这个方程组的解. 首先对于 $i=1,2,...,n$, 令

$$M_i=\frac{m}{m_i}$$

即, $M_i$ 是除了 $m_i$ 之外所有模数的积. $\because$ $m_1, m_2, ..., m_n$ 两两互素, $\therefore$ $\gcd(m_i,M_i)=1$. 由[定理 5](#theorem5) 可知, 存在整数 $y_i$ 是 $M_i$ 模 $m_i$ 的逆. 即

$$M_iy_i\equiv 1\pmod{m_i}$$

上式等号两边同时乘 $a_i$ 得

$$a_iM_iy_i\equiv a_i\pmod{m_i}$$

就是第 i 个方程的一个解; 那么怎么构造出方程组的解呢? 我们注意到, 根据 $M_i$ 的定义可得, 对所有的 $j\ne i$, 都有 $a_iM_iy_i\equiv 0\pmod{m_j}$. 因此我们令

$$x = a_1M_1y_1 + a_2M_2y_2 + ... + a_nM_ny_n = \sum_{i=1}^na_iM_iy_i$$

就是方程组的解. $\blacksquare$

有了这个结论, 我们可以解答 *孙子算经* 中的问题了: 对方程组的每个方程, 求出 $M_i$ , 然后调用 `gcd(M_i, m_i)` 求出 $y_i$:

$$
\left\{\begin{matrix}
x\equiv 2\pmod 3 & M_1=35 & y_1=-1 \\
x\equiv 3\pmod 5 & M_2=21 & y_2=1 \\
x\equiv 2\pmod 7 & M_3=15 & y_3=1 \\
\end{matrix}\right.
$$

最后求出 $x=-2\cdot 35+3\cdot 21+2\cdot 15=23\equiv 23\pmod{105}$

## 6. 费马小定理
现在我们来看数论中另外一个重要的定理, **费马小定理(Fermat's little theorem)**

**定理 7** **费马小定理** <a name="theorem7"></a>如果 a 是一个整数, p 是一个素数, 那么

$$a^p\equiv a\pmod p$$

特别地, 当 a 不是 p 的倍数时, 有

$$a^{p-1}\equiv 1\pmod p$$

**证明** 假设 n 是整数, p 是素数, 考虑组合数

$$\binom{n}{p}=\frac{p!}{n!(p-n)!}$$

当 n 不为 p 或 0 时, 由于分子有质数p, 但分母不含p; 故分子的p能保留, 不被约分而除去. 即 $p\mid \binom{n}{p}$.

令 b 为任意整数, 根据二项式定理, 我们有

$$
(b+1)^p = \binom{p}{p}b^p + \binom{p}{p-1}b^{p-1} + \binom{p}{p-2}b^{p-2} +...+ \binom{p}{1} + \binom{p}{0}b^0
= \sum_{i=0}^p \binom{p}{p-i}b^{p-i}
$$

对上式模 p, 可得同余式

$$(b+1)^p\equiv \binom{p}{p}b^p + \binom{p}{0}b^0 \equiv b^p+1 \pmod p$$

通过不断地令 $b=b-1$ , 可得

$$
\begin{align}
(b+1)^p &\equiv b^p+1 &\pmod p \\
b^p &\equiv (b-1)^p+1 &\pmod p \\
(b-1)^p &\equiv (b-2)^p+1 &\pmod p \\
(b-2)^p &\equiv (b-3)^p+1 &\pmod p \\
...
\end{align}
$$

依次代入, 得

$$
\begin{align}
(b+1)^p &\equiv b^p+1 &\pmod p \\
        &\equiv (b-1)^p+2 &\pmod p \\
        &\equiv (b-2)^p+3 &\pmod p \\
        &\equiv (b-3)^p+4 &\pmod p \\
        ... \\
        &\equiv b+1 &\pmod p
\end{align}
$$

令 $a=b+1$, 即得 $a^p\equiv a\pmod p$.

当 p 不整除 a 时, 根据[推论 2](#corollary2), 有 $a^{p-1}\equiv 1\pmod p$ . $\blacksquare$

## 7. RSA算法
我们终于可以来看 RSA 算法了. 先来看 RSA 算法是怎么运作的:

RSA 算法按照以下过程创建公钥和私钥:
1. 随机选取两个大素数 p 和 q, $p\ne q$;
2. 计算 $n=pq$;
3. 选取一个与 $(p-1)(q-1)$ 互素的小整数 e;
4. 求 e 模 $(p-1)(q-1)$ 的逆, 记作 d;
5. 将 $P=(e, n)$ 公开, 是为公钥;
6. 将 $S=(d, n)$ 保密, 是为私钥.

要把明文 $M$ 加密成密文 $C$, 计算

$$C=M^e\bmod n$$

要把密文 $C$ 解密成明文 $M$, 计算

$$M=C^d\bmod n$$

下面证明 RSA 算法是有效的:

**证明** 要证明 RSA 加密算法的有效性, 我们只需要证明 $C^d\equiv M\pmod n$ 也就是 $M^{ed}\equiv M\pmod n$. 注意到 d 为 e 模 $(p-1)(q-1)$ 的逆, 所以有

$$ed\equiv 1\pmod{(p-1)(q-1)}$$

这蕴含着存在整数 k, 使得 $ed=1+k(p-1)(q-1)$. 由此可得

$$M^{ed}\equiv M^{1+k(p-1)(q-1)}\pmod n$$

如果 $M$ 不是 p 的倍数, 那么根据[费马小定理](#theorem7), 可得 $M^{p-1}\equiv 1\pmod p$. 因此

$$M^{ed}\equiv M^{1+k(p-1)(q-1)}\equiv M\cdot(M^{p-1})^{k(q-1)}\equiv M\pmod p$$

如果 $M$ 是 p 的倍数, 那么 $M^{ed}\equiv 0\equiv M\pmod p$. 所以对所有的 $M$ 都有

$$M^{ed}\equiv M\pmod p$$

类似地, 对于所有的 $M$ 都有

$$M^{ed}\equiv M\pmod q$$

由于 p, q 都是素数, 所以 $\gcd(p, q)=1$. 由[中国余数定理](#theorem6) 可得

$$ M^{ed}\equiv M\pmod n \tag{1}$$

所以 RSA 加密算法是有效的. $\blacksquare$

\(1) 式表明, 不仅可以用公钥加密, 私钥解密, 还可以用私钥加密, 公钥解密. 即加密计算 $C=M^d\bmod n$, 解密计算 $M=C^e\bmod n$.

RSA 算法的安全性基于大整数的质因数分解的困难性. 由于目前没有能在多项式时间内对整数作质因数分解的算法, 因此无法在可行的时间内把 n 分解成 p 和 q 的乘积. 因此就无法求得 e 模 $(p-1)(q-1)$ 的逆, 也就无法根据公钥计算出私钥.

## 8. 总结
RSA 算法是一个能体现数学之美的算法. 因为有 RSA 这样的非对称加密算法, 我们的互联网才变得安全, 电子商务, 移动支付, 网银等才得以存在. 在这些的背后都是数学家和计算机科学家的研究成果. 本文主要讨论的是 RSA 算法背后的数学原理而不是其实现, 因此, 限于篇幅, 像**模取幂**, **寻找大素数**, **大整数运算**之类的算法未予讨论. 感兴趣的同学可参阅参考资料中的文献.

***
**参考资料**
- 离散数学及其应用(原书第7版), 机械工程出版社
- 算法导论第三版, 机械工业出版社
- [费马小定理](https://zh.wikipedia.org/wiki/%E8%B4%B9%E9%A9%AC%E5%B0%8F%E5%AE%9A%E7%90%86)
