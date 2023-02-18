---
key: 6
title: 调和级数的渐进表示
math: true
tag: math
---
> 令 $H_n$ 为第 n 项调和数
>
$$
H_n=1+\frac{1}{2}+\frac{1}{3}+...+\frac{1}{n}=\sum_{i=1}^{n}\frac{1}{i}
$$
>
> 证明 $H_n$ 是 $O(\log n)$ 的

**证明** 如下图所示:

![img](/assets/images/harmonic-series_1.png)

$\sum_{i=1}^{n}\frac{1}{i}$可以看作图中蓝色阴影的面积; 而橙色部分的面积则可以看作函数 $y=\frac{1}{x}$ 的积分 $\int_{0}^{n}\frac{1}{x}\mathrm{d}x$. 因此有

$$
\sum_{i=2}^{n}\frac{1}{i}\lt \int_{0}^{n}\frac{1}{x}\mathrm{d}x=\ln n
$$

$$
\sum_{i=1}^{n}\frac{1}{i}\lt \ln n + 1 = O(\log n)
$$

证毕.
