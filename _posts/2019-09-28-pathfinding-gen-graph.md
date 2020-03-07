---
title: 详解寻路算法(2)-生成图
tag:
    - algorithms
    - featured
---
## 1. 引言
[上篇文章](/algorithms/2019/09/22/pathfinding-graph-search.html) 中主要讲解了 A* 算法. 然而 A* 算法只是一个图搜索算法, 我们在游戏中的地图通常是用一些不规则图形定义的一片行走区域, A* 算法并不能识别这样的地图.

![lol](/assets/images/pathfinding-gen-graph_1.jpeg){:width="400"}

因此我们要做的工作就是把一张这样的地图抽象成可用**邻接矩阵**或**邻接链表**表示的数学上的图 $G=(V,E)$. 本文介绍两种方法, **可视图(visibility graph)** 法和 **导航网络(Navigation Meshes)**法.

## 2. 可视图(visibility graph)
对于大多数地图来说, 我们可以看成由一个无限大的行走区域和若干个障碍物组成; 为了简化问题, 障碍物通常都可以看做多边形. 如下图所示:

![obstacle](/assets/images/pathfinding-gen-graph_2.png)

想象我们处于起始点, 要绕过障碍物到达目标点. 当我们绕过障碍物时, 最短的方式应该是贴着障碍物的边缘走:

![bypass obstacles](/assets/images/pathfinding-gen-graph_3.png)

所以我们选择多边形的各个顶点, 我们称之为**导航点(navigation points)**; 同时, 因为起始点和终止点也是寻路中要用到的关键点, 所以它们也属于导航点.

现在我们尝试通过导航点构造出图. 具体的做法是, 对于任意一对导航点 `u, v`, 如果互相能够 "看见" 对方, 就连接这两个两个点. 所谓的 "看见" 就是, 连接两点, 连线不与任何障碍物相交. 如下图所示:

![bypass obstacles](/assets/images/pathfinding-gen-graph_4.png)

这样, 我们就构造出了一张**可视图(visibility graph)**. 我们把地图抽象成了数学上的图 $G=(V,E)$, V 便是所有的导航点集合, E 便是图中所有的连线集合; 每条边的权重就是这条边实际的长度, 同时每个点保留实际坐标信息, 供 A* 算法的启发式函数使用. 现在, 我们就可以用 A* 算法或 Dijkstra 算法搜索这张图, 就能得到最短路径.

可视图虽然可以把地图抽象成图, 但也有一定的问题. 最大的问题是, 当多边形过于复杂, 顶点过多时, 可视图算法会生成大量的边. 假设有 n 个导航点, 那么边的数量将会是 $O(n^2)$, 如图所示:

![bypass obstacles](/assets/images/pathfinding-gen-graph_5.png)
> 图片源自 [Map representations](https://theory.stanford.edu/~amitp/GameProgramming/MapRepresentations.html)

另外一个问题是, 由于起始点和目标点都是导航点, 所以在每次寻路开始时都需要把起始点和终止点加入图中, 并且构造出必要的边; 在寻路结束时又要把他们删除掉. 这都会在地图过大或过复杂时导致算法运行缓慢.

## 3. 导航网络(Navigation Meshes)
与考虑障碍物的可视图不同, 导航网络考虑的是可行走区域. 对于一个地图, 我们把它看做由若干个多边形相接组成的可行走区域. 如下图所示:

![bypass obstacles](/assets/images/pathfinding-gen-graph_6.png)

同样地, 绕过障碍物时, 最短的方式一定是贴着障碍物的边缘走. 因此在导航网络里, 我们同样选择各个多边形的顶点作为导航点. 当然, 起始点和终止点也同样是导航点, 我们需要把起始点或终止点和其所在的多边形的各个顶点连接起来, 除此之外, 不需要增加其他的边. 如图所示:

![bypass obstacles](/assets/images/pathfinding-gen-graph_7.png)

这样我们就把地图抽象成了数学上的图. 可以看到, 导航网络生成的图的边比可视图少了很多, 把这张图应用 A* 算法试试:

![bypass obstacles](/assets/images/pathfinding-gen-graph_8.png)

呃, 似乎不太对, 最短路径可不应该是这样的! 不用担心, 我们可以用一个很简单的操作优化它. 对于路径中的第 i 个顶点, 如果它能够看见第 i + 2 个顶点, 就移除第 i + 1 个顶点. 这里的 "看见" 同样是两点连线不与任何障碍物相交. 我们对路径中的每个点都执行这样的操作. 这个操作被称为**路径平滑(Path smoothing)**. 执行完平滑操作后的路径就是这样的:

![bypass obstacles](/assets/images/pathfinding-gen-graph_9.png)

使用导航网络生成的图的边更少, 起始点和终止点加入图时创建的边也更少, 算法的速度会更快. 然而导航网络也有它的问题: 它是一个 "爬墙怪", 总是寻找沿墙走最短的路径然后进行平滑. 这在某些特殊的情况下不能保证最短路径. 这种情况我们通常可以通过增加导航点, 或者细分多边形来避免. 但是这样一来生成的图的边又会更多, 算法会更慢.

## 4. 总结
本文介绍了两种生成图算法. 把一张地图生成图, 在使用图搜索算法对其进行搜索, 就可以完成寻路. 生成图的算法相对较为复杂, 本文只是讲解其思路, 并未给出实现. 寻路算法实际是一个复杂的算法. 笔者的这两篇文章介绍的算法只能适用于小型地图的寻路, 针对开放性大地图的游戏, 寻路算法还会采用更加高级的策略, 后续的文章中笔者也会作补充. 笔者也建议大家去看参考资料中的教程.

**参考资料:**
- [Map representations](https://theory.stanford.edu/~amitp/GameProgramming/MapRepresentations.html)
