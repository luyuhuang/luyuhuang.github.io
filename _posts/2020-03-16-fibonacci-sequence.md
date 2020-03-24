---
key: 26
title: 矩阵的 n 次方和斐波那契数列通项式
tag: math
---
斐波那契数列大家应该非常熟悉, 这是一个典型的递归定义的数列. 那么这样一个递归定义的数列的通项式是怎样的, 它又是如何推导出来的呢? 这里我们从寻找矩阵的 n 次方说起.

### 矩阵的 n 次方

首先只有方阵才有与自己相乘, 所以我们实际讨论的是方阵的 n 次方. 为了高效地求得一个 $m\times m$ 的矩阵 $A$ 的 n 次方 $A^n$, 我们的做法是找到一个矩阵 $P$ 和一个对角矩阵 $B$, 使得 $B=P^{-1}AP$. 这个过程称为矩阵的**对角化(Diagonalize)**. 因为有 $B=P^{-1}AP$, 必然有 $A=PBP^{-1}$. 所以

$$A^n = (PBP^{-1})^n = (PBP^{-1})(PBP^{-1})...(PBP^{-1}) = PB^nP^{-1}$$

因为 $B$ 是对角矩阵, 所以我们就可以很快地求出 $A^n$ 了.

为了对角化矩阵, 我们需要找到所有的实数 $\lambda$ 和非零单位向量 $v$ 使得

$$Av=\lambda v \tag 1$$

成立. 实数 $\lambda$ 就被称为矩阵 $A$ 的特征值, 与之对应的向量 $v$ 就被称为矩阵 $A$ 的特征向量. 这也就是说对于向量 $v$ 来说, 乘上矩阵 $A$ 和乘上实数 $\lambda$ 的效果是一样的.

我们在 $Av=\lambda v$ 右边乘上单位矩阵 $I$, 可以转换成 $(A-\lambda I)v=0$. 把 $v$ 看作未知数, 这就是个齐次线性方程. 因为 $v$ 是非零向量, 也就是说这个方程要有非零解; 而 $(A-\lambda I)$ 是方阵, 这样的齐次线性方程有非零解的条件就是 $\|A-\lambda I\|=0$. 解这个方程就可得到若干个特征值 $\lambda_1, \lambda_2, ...$. 然后把这些特征值带入 (1) 式, 就可得到每个特征值对应的特征向量.

以 $$
A = \begin{pmatrix}
4 & -12\\
-12 & 11
\end{pmatrix}
$$ 为例. 首先我们解方程 $\|A-\lambda I\|=0$

$$
\begin{vmatrix}
4 - \lambda & -12\\
-12 &  11 - \lambda
\end{vmatrix} = 0 \\
(4 - \lambda)(11 - \lambda) - 144 = 0 \\
\lambda^2 - 15\lambda - 100 = 0 \\
(\lambda - 20)(\lambda + 5) = 0 \\
\lambda_1 = 20, \lambda_2 = -5
$$

得到两个特征值 $\lambda_1 = 20, \lambda_2 = -5$. 然后我们分别将 $\lambda_1, \lambda_2$ 代入 (1) 式, 得到关于每个特征向量的方程. 注意到特征向量是单位向量, 因此每个方程都有唯一解.

对于 $\lambda_1 = 20$,

$$
\left\{\begin{matrix}
\begin{pmatrix}
4 & -12\\
-12 & 11
\end{pmatrix}
\begin{pmatrix}
x_1\\y_1
\end{pmatrix} = 20
\begin{pmatrix}
x_1\\y_1
\end{pmatrix}
\\
x_1^2 + y_1^2 = 1
\end{matrix}\right.

\Leftrightarrow

\left\{\begin{matrix}
4x_1 - 12y_1 = 20x_1\\
-12x_1 + 11y_1 = 20y_1\\
x_1^2 + y_1^2 = 1
\end{matrix}\right.

\Leftrightarrow

\left\{\begin{matrix}
4x_1 + 3y_1 = 0 \\
x_1^2 + y_1^2 = 1
\end{matrix}\right.

\\

v_1 = \begin{pmatrix}
x_1 \\ y_1
\end{pmatrix} =
\begin{pmatrix}
3/5 \\ -4/5
\end{pmatrix}
$$

对于 $\lambda_1 = -5$,

$$
\left\{\begin{matrix}
\begin{pmatrix}
4 & -12\\
-12 & 11
\end{pmatrix}
\begin{pmatrix}
x_2\\y_2
\end{pmatrix} = -5
\begin{pmatrix}
x_2\\y_2
\end{pmatrix}
\\
x_2^2 + y_2^2 = 1
\end{matrix}\right.

\Leftrightarrow

\left\{\begin{matrix}
4x_2 - 12y_2 = -5x_2\\
-12x_2 + 11y_2 = -5y_2\\
x_2^2 + y_2^2 = 1
\end{matrix}\right.

\Leftrightarrow

\left\{\begin{matrix}
3x_2 - 4y_2 = 0 \\
x_2^2 + y_2^2 = 1
\end{matrix}\right.

\\

v_2 = \begin{pmatrix}
x_2 \\ y_2
\end{pmatrix} =
\begin{pmatrix}
4/5 \\ 3/5
\end{pmatrix}
$$

求得特征向量和特征值之后, 我们就可以对角化矩阵了. 假设一个 $m\times m$ 的矩阵 $A$ 有 m 个不同的特征值和特征向量, 我们以特征向量为列向量构造矩阵 $P = (v_1, v_2, ..., v_m)$. 那么有

$$
AP = A(v_1, v_2, ..., v_m) \\
= (Av_1, Av_2, ..., Av_m) \\
= (\lambda_1 v_1, \lambda_2 v_2, ..., \lambda_m v_m) \\
= (v_1, v_2, ..., v_m)\begin{pmatrix}
\lambda_1 & &  & \\
 & \lambda_2 &  & \\
 &  & ... & \\
 &  &  & \lambda_m
\end{pmatrix}
$$

我们记对角矩阵 $$
\begin{pmatrix}
\lambda_1 & &  & \\
 & \lambda_2 &  & \\
 &  & ... & \\
 &  &  & \lambda_m
\end{pmatrix}
$$ 为 $B$, 所以有 $AP = PB$. 因为 $A$ 有 m 个不同的特征值, 所以这些特征值对应的特征向量是线性无关的(证明略). 因此矩阵 $P$ 的逆存在, 所以有 $A=PBP^{-1}$ 和 $B=P^{-1}AP$. 这就完成了矩阵的对角化.

我们还以 $$
A = \begin{pmatrix}
4 & -12\\
-12 & 11
\end{pmatrix}
$$ 为例, $A$ 有两个特征值 $\lambda_1 = 20, \lambda_2 = -5$ 和与之对应的特征向量 $$v_1 = \begin{pmatrix}
3/5 \\ -4/5
\end{pmatrix}, v_2 = \begin{pmatrix}
4/5 \\ 3/5
\end{pmatrix} $$. 因此 $$
P = \begin{pmatrix}
3/5 & 4/5 \\
-4/5 & 3/5
\end{pmatrix} $$ 和 $$
B = \begin{pmatrix}
20 & 0 \\
0 & -5
\end{pmatrix}$$. 可以计算出

$$
A^n = \begin{pmatrix}
3/5 & 4/5 \\
-4/5 & 3/5
\end{pmatrix} \begin{pmatrix}
20^n & 0 \\
0 & -5^n
\end{pmatrix} \begin{pmatrix}
3/5 & 4/5 \\
-4/5 & 3/5
\end{pmatrix}^{-1} \\
= \frac{1}{25} \begin{pmatrix}
9 \cdot 20^n + 12(-5)^n & -12 \cdot 20^n + 12(-5)^n \\
-12 \cdot 20^n + 12(-5)^n & -16 \cdot 20^n + 9(-5)^n
\end{pmatrix}
$$

### 斐波那契数列的通项式

斐波那契数列 $F_n$ 定义 $F_1 = F_2 = 0$, 且 $F_n = F_{n-1} + F_{n-2}$. 因此我们有

$$
\begin{pmatrix}
F_{n+2} \\ F_{n+1}
\end{pmatrix} = \begin{pmatrix}
F_{n+1} + F_n \\ F_{n+1}
\end{pmatrix} \\
= \begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix} \begin{pmatrix}
F_{n+1} \\ F_n
\end{pmatrix} \\
= \begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix}^2 \begin{pmatrix}
F_n \\ F_{n-1}
\end{pmatrix} \\
... \\
= \begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix}^n \begin{pmatrix}
F_2 \\ F_1
\end{pmatrix} \\
= \begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix}^n \begin{pmatrix}
1 \\ 1
\end{pmatrix} \tag 2
$$

问题转换成求矩阵 $$ \begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix}$$ 的 n 次方.

那么我们首先求解方程 $\|A-\lambda I\| = 0$:

$$
\begin{vmatrix}
1 - \lambda & 1 \\
1 & -\lambda
\end{vmatrix} = 0 \\
\lambda^2 - \lambda - 1 = 0 \\
\lambda_1 = \frac{1+\sqrt 5}{2}, \lambda_2 = \frac{1-\sqrt 5}{2}
$$

又根据 (1) 式, 有

$$
\begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix} \begin{pmatrix}
x_1 \\ y_1
\end{pmatrix} = \lambda_1 \begin{pmatrix}
x_1 \\ y_1
\end{pmatrix} \\
\begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix} \begin{pmatrix}
x_2 \\ y_2
\end{pmatrix} = \lambda_2 \begin{pmatrix}
x_2 \\ y_2
\end{pmatrix}
$$

可得 $$v_1 = \begin{pmatrix}
\lambda_1 \\ 1
\end{pmatrix}, v_2 = \begin{pmatrix}
\lambda_2 \\ 1
\end{pmatrix}$$. 所以 $$P = \begin{pmatrix}
\lambda_1 & \lambda_2 \\
1 & 1
\end{pmatrix}, B = \begin{pmatrix}
\lambda_1 & 0 \\
0 & \lambda_2
\end{pmatrix}$$.

接下来求 $A^n$:

$$
A^n = \begin{pmatrix}
\lambda_1 & \lambda_2 \\
1 & 1
\end{pmatrix} \begin{pmatrix}
\lambda_1^n & 0 \\
0 & \lambda_2^n
\end{pmatrix} \begin{pmatrix}
\lambda_1 & \lambda_2 \\
1 & 1
\end{pmatrix}^{-1} \\
= \begin{pmatrix}
\lambda_1 & \lambda_2 \\
1 & 1
\end{pmatrix} \begin{pmatrix}
\lambda_1^n & 0 \\
0 & \lambda_2^n
\end{pmatrix} \frac{1}{\sqrt 5}\begin{pmatrix}
1 & -\lambda_2 \\
-1 & \lambda_1
\end{pmatrix} \\
= \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^{n+1} & \lambda_2^{n+1} \\
\lambda_1^n & \lambda_2^n
\end{pmatrix} \begin{pmatrix}
1 & -\lambda_2 \\
-1 & \lambda_1
\end{pmatrix} \\
= \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^{n+1} - \lambda_2^{n+1} & \lambda_1^n - \lambda_2^n \\
\lambda_1^n - \lambda_2^n & \lambda_1^{n-1} - \lambda_2^{n-1}
\end{pmatrix}
$$

由 (2) 式得

$$
\begin{pmatrix}
F_{n+2} \\ F_{n+1}
\end{pmatrix} = \begin{pmatrix}
1 & 1 \\
1 & 0
\end{pmatrix}^n \begin{pmatrix}
1 \\ 1
\end{pmatrix} = \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^{n+1} - \lambda_2^{n+1} & \lambda_1^n - \lambda_2^n \\
\lambda_1^n - \lambda_2^n & \lambda_1^{n-1} - \lambda_2^{n-1}
\end{pmatrix} \begin{pmatrix}
1 \\ 1
\end{pmatrix} \\
= \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^{n+1} - \lambda_2^{n+1} + \lambda_1^n - \lambda_2^n \\
\lambda_1^n - \lambda_2^n + \lambda_1^{n-1} - \lambda_2^{n-1}
\end{pmatrix}
= \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^n(\lambda_1+1) - \lambda_2^n(\lambda_2 + 1) \\
\lambda_1^{n-1}(\lambda_1+1) - \lambda_2^{n-1}(\lambda_2 + 1)
\end{pmatrix} \\
= \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^n\lambda_1^2 - \lambda_2^n\lambda_2^2 \\
\lambda_1^{n-1}\lambda_1^2 - \lambda_2^{n-1}\lambda_2^2
\end{pmatrix}
= \frac{1}{\sqrt 5} \begin{pmatrix}
\lambda_1^{n+2} - \lambda_2^{n+2} \\
\lambda_1^{n+1} - \lambda_2^{n+1}
\end{pmatrix}
$$

最后我们得到斐波那契数列的通项公式为

$$
F_n = \frac{1}{\sqrt 5}(\lambda_1^n - \lambda_2^n) = \frac{(\frac{1+\sqrt 5}{2})^2 - (\frac{1-\sqrt 5}{2})^2}{\sqrt 5}
$$

***

**参考资料**

- [Nth power of a square matrix and the Binet Formula for Fibonacci sequence](https://www.qc.edu.hk/math/Teaching_Learning/Nth%20power%20of%20a%20square%20matrix.pdf)
- [什么样的矩阵可以对角化?](https://www.zhihu.com/question/323578684/answer/753474442)
