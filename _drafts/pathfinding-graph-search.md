---
title: 详解寻路算法(1)-图搜索
category: algorithms
featured: true
---
## 1. 引言
寻路算法广泛应用在各种游戏中. 寻路算法要解决的问题是, 给定一个 **"地图"(定义可行走区域)**, 一个起点, 和一个目标点, 求起点到目标点的最短路径. 解决寻路问题是一个复杂的过程, 涉及到若干个算法. 大体可以分为两个步骤:
1. 把 **地图** 抽象成 **图**. 这里的图指的是数学上的图 $G=(V,E)$;
2. 对图进行搜索.

相比图搜索, 把地图抽象成图通常会比较复杂. 这篇文章先介绍介绍图搜索算法. 在[下篇文章]()中, 我会介绍几种把地图抽象成图的方法.

## 2. 图搜索
图搜索算法有很多, 这里介绍两种: Dijkstra 算法和 A* 算法. 稍后会看到, 这两种算法很相似: Dijkstra 算法总是搜索最近的, 适用于求解**单源对所有点**的最短路径; 而 A* 算法在 Dijkstra 基础上加上了启发式策略, 更适用于求解**单源对单点**的最短路径. 我会假设我们搜索的图都是带权重的无向图(因为寻路算法不会用到有向图), 因此你看到的算法跟教科书上的会有所不同.

### 2.1 Dijkstra 算法
#### 2.1.1 松弛操作
Dijkstra 和 A* 算法都要用到**松弛**操作. 对于每个节点 `v`, 我们维持一个属性 `v.d`, 用于记录从源节点 `s` 到节点 `v` 的最短路径的长度**上界**(意思是最短路径有多长我们暂时不知道;但是肯定小于这个值). 我们称其为**最短路径估计**. 初始时, 原点的 最短路径估计 被赋为 0, 其余的都被赋为无穷大. 除此之外, 每个节点都有一个 `parent` 属性, `v.parant` 表示最短路径中 `v` 的前序. 初始时 `v.parent` 赋值为 `None`.

```python
def dijk_init(graph, s):
    for v in graph.vertices:
        v.d = float('inf')
        v.parent = None
    s.d = 0
```

对一条边 `(u, v)` 的的**松弛**过程为: 如果 s 经由 u 到达 v 的最短路径估计 比 v 的最短路径估计小, 就更新 `v.d` 和 `v.parent`. 这个操作非常直观: 即找到了一条更短的路径, 就收缩**上界**.

```python
new_d = u.d + graph.w(u, v)
if new_d < v.d:
    v.d = new_d
    v.parent = u
```
### 2.1.2 贪心策略
Dijkstra 算法是一个典型的贪心算法. 它总是维护一个优先队列. 初始时, 这个队列中只有源节点; 之后不断地从队列中取出**最短路径估计**最小的节点, 松弛其所有的临边, 如果某个节点 `v` 在松弛操作中改变了 `v.d`, 就把他加入队列, 直到队列为空. 代码如下:

```python
def dijk(graph, s):
    dijk_init(graph, s)
    queue = PriorityQueue()
    queue.put(s, s.d)

    while not queue.empty():
        u = queue.get()
        for v in u.adj:
            new_d = u.d + graph.w(u, v)
            if new_d < v.d:
                v.d = new_d
                v.parent = u
                queue.put(v, v.d)
```

> 你可能会发现这种实现会导致同一个节点入队两次. 但[这篇文章](https://www.redblobgames.com/pathfinding/a-star/implementation.html#optimize-queue)指出, 这样做是没问题的 :
>> I eliminate the check for a node being in the frontier with a higher cost. By not checking, I end up with duplicate elements in the frontier. The algorithm still works. It will revisit some locations more than necessary (but rarely, in my experience, as long as the heuristic is admissible). The code is simpler and it allows me to use a simpler and faster priority queue that does not support the decrease-key operation. The paper ["Priority Queues and Dijkstra’s Algorithm"](https://www3.cs.stonybrook.edu/~rezaul/papers/TR-07-54.pdf) suggests that this approach is faster in practice.

算法的执行过程如下:

![procedure](/assets/images/pathfinding-graph-search_2.png)

执行循环前如图(a)所示; 之后 (b) - (i) 展示了循环的执行过程: 每次从队列(即所有的橙色节点)中选取 `v.d` 最小的节点, 对其所有临边执行松弛操作.

### 2.2 A* 算法


**参考资料:**
- [Introduction to the A* Algorithm](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Implementation of A*](https://www.redblobgames.com/pathfinding/a-star/implementation.html#optimize-queue)
- 算法导论第三版, 机械工业出版社
