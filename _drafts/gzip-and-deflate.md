---
title: Gzip 格式和 DEFLATE 压缩算法
tag:
    - algorithms
    - featured
---
## 1. 引言

当你键入 `tar -zcf src.tar.gz src`, 就可以将 `src` 下的所有文件打包成一个 tar.gz 格式的压缩包. 这里的 "tar" 是归档格式, 将多个文件组合成一个文件; 而 "gz" 指的就是 gzip 压缩格式, 使用 DEFLATE 算法压缩得到. 作为使用最广泛的无损压缩算法, DEFLATE 是怎样工作的, 背后的原理是什么? 这篇文章我们来讨论下这个问题.

DEFLATE 算法结合了 LZ77 算法和 Huffman 编码, 由 Phil Katz 设计, 并被 [RFC1951](https://tools.ietf.org/html/rfc1951) 标准化. 本文是笔者对 [RFC1951](https://tools.ietf.org/html/rfc1951) 研究的总结, 首先介绍 LZ77 算法, 再阐述 Huffman 编码在 DEFLATE 中的作用, 以及 Gzip 的格式.

## 2. LZ77 算法

> Four score and seven years ago our fathers brought forth, on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

## 3. Huffman 编码

## 4. 总结

***

**参考资料**

- [RFC1951: DEFLATE Compressed Data Format Specification version 1.3](https://tools.ietf.org/html/rfc1951)
- [gzip 原理与实现](http://www.360doc.com/content/11/0218/15/2150347_94086443.shtml)
