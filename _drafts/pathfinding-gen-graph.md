---
title: 详解寻路算法(2)-生成图
category: algorithms
featured: true
---
## 1. 引言
[上篇文章](/algorithms/2019/09/22/pathfinding-graph-search.html) 中讲解了 A* 算法. 然而 A* 算法只是一个图搜索算法, 我们在游戏中的地图通常是用一些不规则图形定义的一片行走区域, A* 算法并不能识别这样的地图.

![lol](/assets/images/pathfinding-gen-graph_1.jpeg){:width="400"}

因此我们要做的工作就是把一张这样的地图抽象成可用**邻接矩阵**或**邻接链表**表示的数学上的图 $G=(V,E)$. 本文介绍两种方法, **可视图(visibility graph)** 法和 **导航网络(Navigation Meshes)**法.

## 2. 可视图(visibility graph)

## 3. 导航网络(Navigation Meshes)

## 4. 总结

**参考资料:**
- [Map representations](https://theory.stanford.edu/~amitp/GameProgramming/MapRepresentations.html)