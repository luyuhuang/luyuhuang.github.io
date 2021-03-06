---
title: 详解 KMP 算法及其背后思路
tag:
    - algorithms
    - featured
---
## 1. 引言

每当谈论字符串匹配算法的时候, 都不得不提到 KMP 算法. KMP 算法是由 Knuth, Morris 和 Pratt 三人设计的线性时间字符串匹配算法. 对于长度为 m 的模式匹配长度为 n 的字符串, 它仅需 $\mathrm{O}(m + n)$. 这是一个非常精妙非常漂亮的算法, 但是理解起来有一点难. 笔者当时学习它的时候, 也只是明白了它的工作原理, 却不知其思路. 学习算法 (应该说学习任何东西) 应当知其然更应知其所以然, 仅仅记住算法而不理解其思路是不正确的. 因此本文会详细介绍 KMP 算法, 不仅介绍其工作原理, 还着重介绍它的思路. 最后我们会发现, 如此精妙的算法并不是哪个天才灵光一闪搞出来的, 而是顺着它的思路, 水到渠成.

为了阐述 KMP 的思路, 本文会先介绍有穷状态机匹配法, 一种比 KMP 易理解得多的算法; 然后顺着状态机匹配法的思路, 引出 KMP 算法. 不过在此之前, 我们先来看看朴素匹配法和它的问题.

## 2. 朴素匹配法和它的问题

朴素匹配法是最简单最直观, 任何人都能想到的匹配算法 -- -- 直接写一个二重循环依次匹配每个字符即可.

```python
def naive(s, p):
    for i in range(len(s) - len(p) + 1):
        eq = True
        for j, c in enumerate(p):
            if s[i + j] != c:
                eq = False
                break
        if eq:
            return i
```

它的时间复杂度为 $\mathrm{O}(mn)$, 固然是不能让人满意的. 我们可以分析下它执行的过程, 看看有没有什么可以优化的点. 以模式 `a` 匹配字符串 `a` 为例, 它的执行过程如下:

## 3. 有穷状态机匹配法

## 4. KMP 算法

## 5. 总结

***

**参考资料**
- 算法导论第三版, 机械工业出版社
