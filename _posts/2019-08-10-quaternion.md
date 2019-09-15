---
title: 四元数描述旋转
category: math
---
**先看结论:**

对于任意坐标 $(a,b,c)$ , 我们希望绕旋转轴 $(x,y,z)$ 旋转 $\theta$ 度, 其中 x, y, z 的平方和为1. 那么:

令四元数 

$$q=\cos\frac{\theta}{2}+\sin\frac{\theta}{2}(x\mathrm{i}+y\mathrm{j}+z\mathrm{k})$$ 

$$p=a\mathrm{i}+b\mathrm{j}+c\mathrm{k}$$

得到 

$$p'=qpq^{-1}$$

其中 $q^{-1}$ 是 $q$ 的逆, $q^{-1}=\cos\frac{\theta}{2}-\sin\frac{\theta}{2}(x\mathrm{i}+y\mathrm{j}+z\mathrm{k})$. 这时 $p'$ 是形如 $a'\mathrm{i}+b'\mathrm{j}+c'\mathrm{k}$ 的四元数, 实数部分必然为 0 . 坐标 $(a',b',c')$ 即是旋转后的坐标.

将来(有空的话)我会补上详解. 强烈推荐去看参考资料列出的视频, 可以说讲得非常直观形象, 可能一遍看不懂, 多看几便就好了.

**参考资料:**
- [四元数的可视化](https://www.bilibili.com/video/av33385105)
- [四元数和三维转动，可互动的探索式视频（请看链接）](https://www.bilibili.com/video/av35804287)