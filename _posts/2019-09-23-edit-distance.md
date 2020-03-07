---
title: 编辑距离
tag:
    - algorithms
    - leetcode
---
题目源自Leetcode: [编辑距离-leetcode](https://leetcode-cn.com/problems/edit-distance/)

给定两个单词 word1 和 word2，计算出将 word1 转换成 word2 所使用的最少操作数 。

你可以对一个单词进行如下三种操作：

- 插入一个字符
- 删除一个字符
- 替换一个字符

示例:

> 输入: word1 = "horse", word2 = "ros"<br/>
> 输出: 3<br/>
> 解释: <br/>
> horse -> rorse (将 'h' 替换为 'r')<br/>
> rorse -> rose (删除 'r')<br/>
> rose -> ros (删除 'e')

### 解法: 动态规划
这是一道很漂亮的动态规划问题. 我们这样想: 越长的单词求解就越困难, 越短的单词求解就越简单: 长度为1的单词只需比较字母是否相等, 相等则编辑距离为1否则为0. 因此, 我们要设法把大问题变成小问题. 这里我们用 `dp[i][j]` 表示 `word1[:i]` 到 `word2[:j]` 的编辑距离. 例如, `word1 = "horse"` `word2 = "ros"`, 那么 `dp[1][1] = 1`, 因为 `"h"` 到 `"r"` 只需要执行一次替换, 编辑距离为1. 特别地, `dp[0][n] = n`, 它表示空字符串到任意长度为n的字符串的编辑距离: 做n次插入即可. 同理, `dp[n][0] = n`.

接下来我们想办法构造出递推式. 我们通过观察可以发现, 把 `word1[:i]` 编辑到 `word2[:j]` 可以看作:

1. 先把 `word1[:i]` 最后一个字母删掉, 得到 `word1[:i-1]`, 再把 `word1[:i-1]` 编辑到 `word2[:j]`. 这个时候的编辑次数等于 `dp[i-1][j] + 1`;
2. 先把 `word1[:i]` 编辑到 `word2[:j-1]`, 再在 `word2[:j-1]` 末尾作一次插入. 这个时候编辑次数等于 `dp[i][j-1] + 1`;
3. 先把 `word1[:i-1]` 编辑到 `word2[:j-1]`, 然后再看:
    - 如果最后一个字母相等, 那么就什么都不用做, 编辑距离等于 `dp[i-1][j-1]`;
    - 如果最后一个字母不相等, 那么就需要作一次修改, 编辑距离等于 `dp[i-1][j-1] + 1`.

由此, 我们可得递推式:

$$
dp[i][j]=\left\{\begin{matrix}
\min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]) & word_1[i-1]=word_2[j-1] \\
\min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1] + 1) & word_1[i-1]\ne word_2[j-1]
\end{matrix}\right.
$$

OK, 有了递推式, 我们可以开始写代码了.

**第一步:初始化**. 因为我们用 `dp[i][j]` 表示 `word1[:i]` 到 `word2[:j]` 的编辑距离, 所以数组 `dp` 两个维度的长度分别要比 `len(word1)` 和 `len(word2)` 多1. 所以有:

```python
m, n = len(word1), len(word2)
dp = [[None] * (n + 1) for _ in xrange(m + 1)]
```

上文提到了 `dp[0][n] = n` 和 `dp[n][0] = n`, 所以有:

```python
dp[0][0] = 0
for i in xrange(m + 1):
    dp[i][0] = i
for j in xrange(n + 1):
    dp[0][j] = j
```

**第二步:安排迭代顺序**. 我们发现, `dp[i][j]` 依赖于 `dp[i-1][j]`, `dp[i][j-1]` 和 `dp[i-1][j-1]`. 如图所示:

![iter](/assets/images/edit-distance_1.png){:width="300"}

图中红色箭头代表依赖. 所以, 很简单, 逐行遍历即可. 所以代码是这样的:

```python
for i in xrange(1, m + 1):
    for j in xrange(1, n + 1):
        if word1[i - 1] == word2[j - 1]:
            dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1])
        else:
            dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + 1)
```

最后 `return dp[-1][-1]` 即可.
