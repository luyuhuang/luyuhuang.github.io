---
title: Gzip 格式和 DEFLATE 压缩算法
tag:
    - algorithms
    - featured
---
## 1. 引言

当你键入 `tar -zcf src.tar.gz src`, 就可以将 `src` 下的所有文件打包成一个 tar.gz 格式的压缩包. 这里的 "tar" 是归档格式, 将多个文件组合成一个文件; 而 "gz" 指的就是 gzip 压缩格式, 使用 DEFLATE 算法压缩得到. 作为使用最广泛的无损压缩算法, DEFLATE 是怎样工作的, 背后的原理是什么? 这篇文章我们来讨论下这个问题.

DEFLATE 算法结合了 LZ77 算法和 Huffman 编码, 由 Phil Katz 设计, 并被 [RFC1951](https://tools.ietf.org/html/rfc1951) 标准化. 本文是笔者对 [RFC1951](https://tools.ietf.org/html/rfc1951) 和 [zlib](http://www.zlib.net/) 研究的总结, 首先介绍 LZ77 算法, 再阐述 Huffman 编码在 DEFLATE 中的作用, 以及 Gzip 的格式.

## 2. LZ77 算法

J. Ziv 和 A. Lempel 在 1977 发表了一篇名为 [A Universal Algorithm for Sequential Data Compression](https://ieeexplore.ieee.org/abstract/document/1055714/) 的论文, 提出了一种顺序数据的通用压缩算法. 这个算法后来被称为 LZ77 算法. 事实上 DEFLATE 算法使用的 LZ77 跟原版有所不同, 这里我们以 DEFLATE 中的为准.

### 2.1 基本原理

我们平时使用的文件总是会有很多重复的部分, LZ77 压缩算法正是利用了这一点. 它会试图尽可能地找出文件中重复的n内容, 然后用一个标记代替重复的部分, 这个标记能够明确地指示这部分在哪里出现过. 举个例子, 以 *葛底斯堡演说* 的第一段为例:

> Four score and seven years ago our fathers brought forth, on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

我们可以找出不少重复的片段. 我们规定, 只要有两个以上的字母与前文重复, 就使用记号 `<d,l>` 代替它. `<d,l>` 表示这个位置的字符串等价与 `d` 个字符前, 长度为 `l` 的字符串. 于是上面的内容就可以表示为:

> Four score and seven years ago <30,4>fathe<16,3>brought forth, on this continent, a new nation,<25,4>ceived in Liberty<36,3><102,3>dedicat<26,3>to<69,3>e proposi<56,4><85,3>at all m<138,3>a<152,3>cre<44,5>equal.

实现这个算法最简单的方式就是遍历字符串, 对于每个字符都在前文中顺序查找是否有重复的字符, 然后求出最长重复子串. 这种做法时间复杂度为 $\mathrm{O}(n^2)$, 效率较低, 特别是在处理大文件的时候. 为了提高效率, 我们使用滑动窗口和哈希表来优化它.

### 2.2 滑动窗口

### 2.3 使用哈希表

## 3. Huffman 编码

如果我们真的使用 `<d,l>` 这样的格式表示重复的内容, 那就太愚蠢了. 首先是这样的格式太占空间了, 2.1 节中使用这种方式 "压缩" 的 *葛底斯堡演说* 比甚至原文还长. 其次这种格式让尖括号变成了特殊字符, 还得设法转义它们. 那么应该如何表示 距离-长度 对呢? 我们要做的是打破旧秩序, 建立新秩序 -- 使用 Huffman 编码对数据重新编码.

## 4. 总结

***

**参考资料**

- [RFC1951: DEFLATE Compressed Data Format Specification version 1.3](https://tools.ietf.org/html/rfc1951)
- [gzip 原理与实现](http://www.360doc.com/content/11/0218/15/2150347_94086443.shtml)
