---
title: 牛顿迭代法
category: math
---
$\sqrt{a}$ 可这样求得: 令 $x_0$ 为任意实数, 执行以下迭代式:

$$
x_i = \frac{x_{i-1}+\frac{a}{x_{i-1}}}{2}
$$

迭代若干次, 当 $\|x_i-x_{i-1}\|$ 小于想要的精度时便可停止迭代. 最终的 $x_i$ 便可视为 $\sqrt{a}$.

```python
def sqrt(a):
    x = 1.0
    while True:
        pre = x
        x = (x + a / x) / 2
        if abs(x - pre) < 1e-6:
            break
            
    return x
```