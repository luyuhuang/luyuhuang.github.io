---
key: 72
title: 图论巧解复杂依赖问题
tags: [leetcode, algorithms]
aside: false
---
我最近做到一道比较难的 Hard 题目. 这道题综合性比较高, 也比较抽象, 但是越琢磨越觉得有意思,
值得分享一下. 涉及到的知识点有**图论基础**, **拓扑排序**, **并查集**等, 本文假设你已经比较熟悉它们.

问题来自 [LeetCode 1632 题](https://leetcode.cn/problems/rank-transform-of-a-matrix/).
给定一个 M * N 的矩阵 `matrix`, 返回一个新的矩阵 `ans`, 其中 `ans[i][j]` 是 `matrix[i][j]`
的**秩(rank)**.  这里的秩不同于线性代数中的秩. 每个元素的秩是一个整数, 表示它与其它元素之间的关系.
它是这样计算的:

- 秩是从 1 开始的一个整数.
- 如果两个元素 `p` 和 `q` 处于**同一行**或**同一列**, 那么
    - 如果 `p < q`, 那么 `rank(p) < rank(q)`
    - 如果 `p > q`, 那么 `rank(p) > rank(q)`
    - 如果 `p == q`, 那么 `rank(p) == rank(q)`
- 秩需要越**小**越好

### 思路分析

我们先从简单的问题开始. 如果矩阵只有一列 (或者一行), 那么对于每个元素, 只需要考虑多少个不同的元素比它小.

$$
\begin{bmatrix}
20 \\ 10 \\ 42 \\ 10
\end{bmatrix} \Rightarrow \begin{bmatrix}
2 \\ 1 \\ 3 \\ 1
\end{bmatrix}
$$

上面的例子中, 两个 10 都是最小的元素, 秩都为 1; 20 是第二大的元素, 秩为 2; 42 的秩则为 3.

然而一旦将问题拓展到二维, 事情就变复杂了. 如下图所示, 我们将矩阵扩展到 4 列. 这种情况下, 我们还能断定 20
的秩为 2 吗?

![2-dimension](/assets/images/rank-transform-of-a-matrix_1.svg)

答案是否定的. 有两种情况:

1. 20 在其所在的行中, 有可能不是第二大的元素. 如果那一行有两个比他小的元素, 则它的秩至少为 3.
2. 10 的秩有可能大于 1. 因为 10 在其所在的行中有可能不是最小的元素. 如果 10 的秩至少为 2,
    则 20 的秩至少为 3.

![counter-examples](/assets/images/rank-transform-of-a-matrix_2.svg)

这样看来, 要想求出一个元素的秩, 就要先求出同行和同列其他元素的秩; 而这些元素的秩又依赖于它们所在行/列其它元素的秩.
这个问题中元素互相依赖, 依赖关系错综复杂. 什么数据结构最适合处理依赖关系呢? 答案是**图**.

### 用图处理依赖关系

我们进一步分析元素之间的依赖关系. 为了简单, 我们先假设矩阵中没有重复元素. 我们发现,
一个元素其实并没有依赖其同行和同列的其它所有元素, 它只是依赖于同行和同列中**大小仅次于它的元素**.
对于元素 `x`, 记同行中大小仅次于它的元素为 `a`, 同列中大小仅次于它的元素为 `b`, 则有

```
rank(x) = max(rank(a) + 1, rank(b) + 1)
```

![dependant](/assets/images/rank-transform-of-a-matrix_3.svg)

我们可以按照这个关系将问题抽象成图. 使用邻接列表表示图, 我们只需要分别对每行和每列排序,
得到升序序列 `S`, 然后将 `S[i]` 加入 `S[i-1]` 的邻接列表中.

```cpp
vector<vector<int>> buildGraph(vector<vector<int>> &matrix) {
    int M = matrix.size(), N = matrix.front().size(), P = M * N;
    vector<vector<int>> G(P);
    vector<int> aux;

    aux.resize(N);
    for (int i = 0; i < M; ++i) { // 考虑每行
        for (int j = 0; j < N; ++j) aux[j] = j;
        sort(aux.begin(), aux.end(), [&](int a, int b){
            return matrix[i][a] < matrix[i][b];
        });

        for (int k = 1; k < N; ++k) {
            int p = i * N + aux[k-1], q = i * N + aux[k];
            G[p].push_back(q); // 较大元素加入较小元素的邻接列表
        }
    }

    aux.resize(M);
    for (int j = 0; j < N; ++j) { // 考虑每列
        for (int i = 0; i < M; ++i) aux[i] = i;
        sort(aux.begin(), aux.end(), [&](int a, int b){
            return matrix[a][j] < matrix[b][j];
        });

        for (int k = 1; k < M; ++k) {
            int p = aux[k-1] * N + j, q = aux[k] * N + j;
            G[p].push_back(q); // 较大元素加入较小元素的邻接列表
        }
    }

    return G;
}
```

利用上面的算法我们就能构造出一张反映元素间依赖关系的图. 例如矩阵
$\begin{bmatrix} 5 & 1 \\ 3 & 2 \\ 4 & 6 \end{bmatrix}$ 所对应的图如下所示:

![build-graph](/assets/images/rank-transform-of-a-matrix_4.svg)

注意我们让较大元素加入较小元素的邻接列表, 因此是较小元素指向较大元素.
这么做的原因是较大元素依赖与较小元素, 我们需要先求出较小元素的秩, 才能求出较大元素的秩.

### 广搜拓扑排序

有了依赖关系图后, 思路就变得明朗了. 首先将所有入度为 0 的节点的秩标为 1, 因为它们是同行和同列中最小的元素.
接着就向下广搜, 所有与之相邻的阶段的秩至少为 2, 以此类推.

注意一个节点可能有多个入度, 必须每个入度都计算过, 这个节点的秩才算确定了. 如下图所示,
橙色的边表示计算过的边; 只有当节点的所有入度都计算过, 节点才会标记为橙色, 表示它的秩已经确定了.
否则灰色的节点表示秩待定.

![process](/assets/images/rank-transform-of-a-matrix_5.svg)

```cpp
vector<int> bfs(vector<vector<int>> &G, vector<int> &in) { // in 数组记录每个节点的入度
    int P = G.size(); // P = M * N, 节点总数量
    deque<int> Q;
    vector<int> ans(P, 1);
    for (int i = 0; i < P; ++i) // 从所有入度为 0 的节点开始
        if (in[i] == 0) Q.push_back(i);

    while (!Q.empty()) {
        int p = Q.front();
        Q.pop_front();
        for (int q : G[p]) {
            ans[q] = max(ans[q], ans[p] + 1);
            if (--in[q] == 0) // 如果所有节点的入度都计算过, 则秩已经确定, 可以入队了
                Q.push_back(q);
        }
    }
    return ans;
}
```

上面是一个使用广搜的拓扑排序算法. 前面建图的时候需要顺便求出每个节点的入度, 存放在 `in` 数组中.
因为图中不会有环, 所以当队列 `Q` 为空时, 所有节点的秩都已计算完毕.

### 并查集处理重复元素

前面我们讨论的情况都在假设矩阵中没有重复元素的前提下. 实际上矩阵可能有重复元素, 如何处理这种情况呢?

因为同行和同列的相同元素需要有相同的秩, 我们不妨将其当作一个整体. 也就是说,
同行同列中相同的元素视为图中的一个节点.

![union](/assets/images/rank-transform-of-a-matrix_6.svg)

我们可以分别对每行每列排序, 遍历排序后的序列很容易获取相同元素, 然后用并查集合并它们.
因为后面建图的时候也需要使用排序后的各行各列, 这里我们可以将排序的结果存起来. 之后建图和广搜中,
要查到元素在并查集中的根节点, 因为只有根节点才会作为这些相同节点的代表加入图中. 完整代码如下:

```cpp
int find(vector<int> &pi, int a) {
    if (pi[a] == a)
        return a;
    return pi[a] = find(pi, pi[a]);
}
void merge(vector<int> &pi, int a, int b) {
    a = find(pi, a), b = find(pi, b);
    if (a != b)
        pi[a] = b;
}

vector<vector<int>> matrixRankTransform(vector<vector<int>>& matrix) {
    int M = matrix.size(), N = matrix.front().size(), P = M * N;

    // 1. 并查集合并相同元素
    vector<int> pi(P); // 并查集用到的 pi 数组
    vector<vector<int>> rows(M, vector<int>(N)), cols(N, vector<int>(M)); // 记录排序后的各行各列
    for (int i = 0; i < P; ++i) pi[i] = i;
    for (int i = 0; i < M; ++i) {
        auto &aux = rows[i];
        for (int j = 0; j < N; ++j) aux[j] = j;
        sort(aux.begin(), aux.end(), [&](int a, int b){ // 对每行排序
            return matrix[i][a] < matrix[i][b];
        });
        for (int k = 0; k < N;) {
            int j = aux[k], n = matrix[i][j];
            while (k < N && n == matrix[i][aux[k]]) // 用并查集合并相同的元素
                merge(pi, i*N + j, i*N + aux[k]),
                ++k;
        }
    }
    for (int j = 0; j < N; ++j) {
        auto &aux = cols[j];
        for (int i = 0; i < M; ++i) aux[i] = i;
        sort(aux.begin(), aux.end(), [&](int a, int b){ // 对每列排序
            return matrix[a][j] < matrix[b][j];
        });
        for (int k = 0; k < M;) {
            int i = aux[k], n = matrix[i][j];
            while (k < M && n == matrix[aux[k]][j]) // 用并查集合并相同的元素
                merge(pi, i*N + j, aux[k]*N + j),
                ++k;
        }
    }

    // 2. 建图
    vector<vector<int>> G(P);
    vector<int> in(P); // in 数组记录入度
    for (int i = 0; i < M; ++i) { // 考虑每行
        auto &aux = rows[i];
        for (int k = 1; k < N; ++k) {
            int p = find(pi, i*N + aux[k-1]), q = find(pi, i*N + aux[k]); // 要找到并查集的根节点
            if (p != q)
                G[p].push_back(q), // 较大元素加入较小元素的邻接列表
                ++in[q]; // 较大元素的入度加一
        }
    }
    for (int j = 0; j < N; ++j) { // 考虑每列
        auto &aux = cols[j];
        for (int k = 1; k < M; ++k) {
            int p = find(pi, aux[k-1]*N + j), q = find(pi, aux[k]*N + j); // 要找到并查集的根节点
            if (p != q)
                G[p].push_back(q), // 较大元素加入较小元素的邻接列表
                ++in[q]; // 较大元素的入度加一
        }
    }

    // 3. 广搜
    deque<int> Q;
    vector<int> abstract(P, 1);
    for (int i = 0; i < P; ++i)
        if (find(pi, i) == i && in[i] == 0) Q.push_back(i); // 只有并查集的根节点才能参与广搜
    while (!Q.empty()) {
        int p = Q.front();
        Q.pop_front();
        for (int q : G[p]) {
            abstract[q] = max(abstract[q], abstract[p] + 1);
            if (--in[q] == 0)
                Q.push_back(q);
        }
    }
    vector<vector<int>> ans(M, vector<int>(N)); // 构造结果
    for (int i = 0; i < M; ++i)
        for (int j = 0; j < N; ++j)
            ans[i][j] = abstract[find(pi, i*N + j)]; // 根节点的结果就是这个元素的结果

    return ans;
}
```
