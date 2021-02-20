---
key: 50
title: 经典动态规划问题
tag: [algorithms, leetcode]
---
我最近温习了一下动态规划, 发现有些问题解法的代码十分相似, 但思路却大相径庭, 非常容易混淆. 这里总结一下. 这涉及到几个经典的动态规划问题: **0-1 背包问题**, **完全背包问题**和**爬楼梯问题**. 题目源自 LeetCode  [416 题][416], [518 题][518], [377 题][377] 和 [70 题][70].

[518]: https://leetcode-cn.com/problems/coin-change-2/
[416]: https://leetcode-cn.com/problems/partition-equal-subset-sum/
[377]: https://leetcode-cn.com/problems/combination-sum-iv/
[70]:  https://leetcode-cn.com/problems/climbing-stairs/

我们先来来看问题和它们的解法, 你会发现这些解法十分相似. 接着我们再来逐步分析其中的思路.

## 不同的问题, 相似的解法

### 分割等和子集

给定一个只包含正整数的非空数组, 问是否可以将这个数组分割成两个子集, 使得两个子集的元素和相等. 程序输入一个整数数组 `nums`, 输出一个布尔值.

这个问题可以转换成: 是否可以从数组中选出一些数, 使它们的和等于全部元素之和的一半. 这是一个 0-1 背包问题, 解法如下:

```py
def canPartition(nums):
    S = sum(nums)
    if S % 2 != 0: return False
    S //= 2

    dp = [False] * (S + 1)
    dp[0] = True

    for num in nums:
        for s in range(S, -1, -1):
            if s >= num:
                dp[s] = dp[s] or dp[s - num]

    return dp[-1]
```

### 零钱兑换

我们要用一些不同面额的硬币凑出指定的金额, 问有一共多少种组合方式. 假设每一种面额的硬币有无限个. 程序输入一个表示指定金额的整数 `amount`, 和一个表示硬币面额的整数数组 `coins`; 输出组合数.

每种硬币都有无限个, 嗅到了完全背包问题的味道. 解法如下:

```py
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1

    for coin in coins:
        for a in range(amount + 1):
            if a >= coin:
                dp[a] += dp[a - coin]

    return dp[-1]
```

注意这两道题的内层循环: 一个是从大到小, 一个是从小到大.

### 组合总和

给定一个不存在重复数字的正整数数组, 找出和为给定目标正整数的组合的个数. 注意顺序不同的序列被视作不同的组合. 程序输入一个整数数组 `nums`, 和一个目标整数 `target`; 返回一个表示组合个数的整数.

这道题跟零钱兑换很像, 但这道题中顺序不同的序列视为不同的组合. 我不认为这道题是背包问题, 我更愿意称它为 "爬楼梯问题". 它的解法如下:

```py
def combinationSum4(nums, target):
    dp = [0] * (target + 1)
    dp[0] = 1

    for i in range(target + 1):
        for n in nums:
            if i >= n:
                dp[i] += dp[i - n]

    return dp[-1]
```

这个解法跟零钱兑换的解法几乎一样, 但是内外层循环换了个位置.

这些问题的解答甚至不超过十行. 这短短的十行代码可不简单! 要搞懂其中的原理, 让我们先忘掉这几个问题, 先来回顾一下背包问题.

## 背包问题

### 0-1 背包问题

有 `N` 件物品和一个容量为 `C` 的背包. 第 `i` 件物品的费用是 `v[i]`, 价值是 `w[i]`. 求解将哪些物品装入背包可使这些物品的费用总和不超过背包容量, 且价值总和最大.

这个问题我们要对每件物品考虑是否要放入背包. 能不能直接令 `dp[i]` 为选取前 `i` 个物品放入背包的最大价值呢? 你会发现这样完全写不出递推式, 因为没有考虑到背包的容量. 正确的做法是令 `dp[i][c]` 为选取前 `i` 个物品放入容量为 `c` 的背包的最大价值. 这样的话, 对于第 `i` 个物品, 我们可以考虑:

- 不将第 `i` 个物品放入容量为 `c` 的背包. 这种情况与选取前 `i-1` 个物品放入容量为 `c` 的背包相同, 即 `dp[i][c] = dp[i-1][c]`.
- 将第 `i` 个物品放入容量为 `c` 的背包. 这种情况下物品的总价值就增加了 `w[i]`, 同时背包还必须有足够的容量容纳容纳该物品. 所以有 `dp[i][c] = dp[i-1][c-v[i]] + w[i]`.

我们要求最大总价值, 因此要取两者的最大值. 因此得到递推式为:

$$
dp[i][c] = \max(dp[i-1][c], dp[i-1][c-v[i]] + w[i]) \tag{1}
$$

当然我们还要考虑初始值. 我们可以认为对于所有的 `c >= v[0]`, 都有 `dp[0][c] = w[0]`, 否则 `dp[0][c] = 0`. 即对于第一个物品, 能放进背包就放进去.

好, 现在我们就能写出 0-1 背包问题的代码了:

```py
def knapsack_01(C, v, w):
    N = len(v)
    dp = [[0] * (C + 1) for _ in range(N)]

    for c in range(C + 1): # 动态规划初始值
        if c >= v[0]:
            dp[0][c] = w[0]

    for i in range(1, N):
        for c in range(C + 1):
            if c >= v[i]: # 判断当前容量 c 是否有可能容纳物品 i
                dp[i][c] = max(dp[i-1][c], dp[i-1][c-v[i]] + w[i]) # (1) 式
            else:
                dp[i][c] = dp[i-1][c] # 无法容纳, 没得选

    return dp[-1][-1]
```

#### 优化空间复杂度

观察下这个动态规划, 我们发现前 `i` 个物品放入背包的情况 `dp[i][c]` 只依赖于前 `i-1` 个物品放入背包的情况. 这就没必要将所有的情况都存起来了. 我们完全可以用一个一维数组 `dp[c]` 表示选取前 n 个物品放入容量为 `c` 的背包的最大价值. 初始都为 `0`, 即没有物品时价值为 0; 然后再循环中一直迭代更新它即可.

```py
def knapsack_01(C, v, w):
    dp = [0] * (C + 1)

    for i in range(N):
        for c in range(C, v[i] - 1, -1):
            dp[c] = max(dp[c], dp[c-v[i]] + w[i])

    return dp[-1]
```

注意内层循环要倒着来, 从大到小. 因为在为第 `i` 个物品考虑容量为 `c` 的背包时, 会依赖容量比 `c` 小的情况. 从大到小的迭代顺序保证每次依赖的容量都是上个物品的. 此外容量减到 `v[i]` 就可以停止了, 因为当容量无法容纳当前物品时, 结果与上次相同.

#### 回到问题: 分割等和子集

分割等和子集问题可以转换成: 能否从给定数组 `nums` 中选出一些数, 使它们的和等于给定值 `S`? 这与 0-1 背包问题的求最大值不同, 但是有一点是一样的: 对每个元素, 考虑是否要选取它. 类似地, 我们令 `dp[i][s]` 为能否从前 `i` 个数中选取若干个数, 使它们的和等于 `s`. 这样的话, 对于第 `i` 个数, 我们可以考虑:

- 不选取第 `i` 个数, 总和能否等于 `s`. 这种情况等同于能否从前 `i-1` 个数中选取若干个总和等于 `s` 的数. 即 `dp[i][s] = dp[i-1][s]`
- 选取第 `i` 个数, 总和能否等于 `s`. 这就取决于能否从前 `i-1` 个数中选取若干个总和等于 `s - nums[i]` 的数. 即 `dp[i][s] = dp[i-1][s-nums[i]]`

选取第 `i` 个数能让总和等于 `s`, 或者不选取第 `i` 个数能让总和等于 `s`, 都意味着前 `i` 个数中能选出若干个总和等于 `s` 的数. 因此有递推式:

$$
dp[i][s] = dp[i-1][s] \vee dp[i-1][s-nums[i]] \tag{2}
$$

至于初始值, 显然有 `dp[0][0] = dp[0][nums[0]] = True`. 因为对于第一个数而言, 不选它则总和为 0, 选它则总和为 `nums[0]`.

足够熟练了就可以直接写出优化了空间复杂度的代码了:

```py
def pickNums(S, nums):
    dp = [False] * len(S + 1)
    dp[0] = True

    for num in nums:
        for s in range(S, num - 1, -1):
            dp[s] = dp[s] or dp[s - num] # (2) 式

    return dp[-1]
```

前面的例子为了说明三个问题的相似性, 没有让 `s` 减到 `num` 就停止, 而是使用 if 判断. 这里让迭代提前结束, 效率要高些.

可以看到, 虽然这个问题的递推式与 0-1 背包问题不同, 但是推导公式的思路是一样的, 最终的解法也十分相似.

### 完全背包问题

有 `N` 种物品和一个容量为 `C` 的背包, 每种物品有无限个. 第 `i` 种物品的费用是 `v[i]`, 价值是 `w[i]`. 求解将哪些物品装入背包可使这些物品的费用总和不超过背包容量, 且价值总和最大.

这个问题中, 每种物品有无限个. 我们不仅需要考虑每种物品是否需要放入背包, 还需要考虑应该放多少个. 思路应该是一样的, 只不过考虑的情况要多一些. 我们同样令 `dp[i][c]` 为选取前 `i` 个物品放入容量为 `c` 的背包的最大价值. 这里对于第 `i` 个物品, 我们要考虑的是应该放入几个:

- 放入 0 个. 自然是 `dp[i][c] = dp[i-1][c]`.
- 放入 1 个. 总价值增加了 `w[i]`, 同时要求背包至少有 `v[i]` 的空间. 所以 `dp[i][c] = dp[i-1][c-v[i]] + w[i]`.
- 放入 2 个. 总价值增加 `2 * w[i]`, 同时要求背包至少有 `2 * v[i]` 的空间. 所以 `dp[i][c] = dp[i-1][c - 2*v[i]] + 2*w[i]`
- ...

我们不需要考虑将无数个物品放入背包的情况, 因为背包的容量是有限的, 对于第 `i` 个物品, 最多放入 `C / v[i]` 个. 我们得到递推式为:

$$
dp[i][c] = \max_{0\leqslant n\cdot v[i] \leqslant c}(dp[i-1][c - n\cdot v[i]] + n\cdot w[i]) \tag{3}
$$

有了递推式我们就能写出完全背包问题的代码了:

```py
def knapsack_complete(C, v, w):
    dp = [0] * (C + 1)

    for i in range(N):
        for c in range(C, -1, -1):
            res = n = 0
            while n * v[i] <= c: # (3) 式
                res = max(res, dp[c - n*v[i]] + n*w[i])
                n += 1

            dp[c] = res

    return dp[-1]
```

这里我们已经优化了空间复杂度, 使用一维数组, 在循环中迭代更新它, 实现递推式.

#### 还能不能优化呢?

上面给出解法有三重循环, 有没有优化的空间呢? 我们给 (3) 式来一通变形:

$$
\begin{align}

dp[i][c] & = \max_{0\leqslant n\cdot v[i] \leqslant c}(dp[i-1][c - n\cdot v[i]] + n\cdot w[i]) \\
         & = \max(dp[i-1][c],\ \max_{1\leqslant n\cdot v[i] \leqslant c}(dp[i-1][c - n\cdot v[i]] + n\cdot w[i])) \\
         & = \max(dp[i-1][c],\ \max_{0\leqslant n\cdot v[i] \leqslant c-v[i]}(dp[i-1][c - v[i] - n\cdot v[i]] + n\cdot w[i]) + w[i]) \\
         & = \max(dp[i-1][c],\ dp[i][c - v[i]] + w[i]) \tag{4}

\end{align}
$$

我们惊奇地发现, 我们得到了更简洁的完全背包问题的递推式. 它和 0-1 背包问题的递推式 (1) 式很像. 一个是依赖于上次的, 一个是依赖于这次的. 有了 (4) 式, 我们就能写出更高效的解法了:

```py
def knapsack_complete(C, v, w):
    dp = [0] * (C + 1)

    for i in range(N):
        for c in range(v[i], C + 1):
            dp[c] = max(dp[c], dp[c-v[i]] + w[i]) # (4) 式

    return dp[-1]
```

它只是将 0-1 背包问题的内层循环倒过来. 0-1 背包问题为了避免覆盖上次循环的数据, 要从大到小循环; 而完全背包问题依赖的就是本次循环的数据, 所以从小到大循环即可.

#### 回到问题: 零钱兑换

理解了这些, 再来看零钱兑换问题就不难了. 我们令 `dp[i][a]` 为从前 `i` 中硬币中凑成金额 `a` 的组合数. 对于第 `i` 个硬币, 如果不选它, 则有 `dp[i-1][a]` 种组合; 如果选 1 个, 则有 `dp[i-1][a - coins[i]]` 种; 如果选 2 个, 则有 `dp[i-1][a - 2*coins[i]]` 种; 以此类推. 最终的结果为所有组合数之和. 所以得到递推式为:

$$
\begin{align}

dp[i][a] & = \sum_{0 \leqslant n\cdot coins[i] \leqslant a} dp[i-1][a - n\cdot coins[i]] \\
         & = dp[i-1][a] + \sum_{1 \leqslant n\cdot coins[i] \leqslant a} dp[i-1][a - n\cdot coins[i]] \\
         & = dp[i-1][a] + \sum_{0 \leqslant n\cdot coins[i] \leqslant a-coins[i]} dp[i-1][a - coins[i] - n\cdot coins[i]] \\
         & = dp[i-1][a] + dp[i][a - coins[i]] \tag{5}

\end{align}
$$

有了 (5) 式, 就能很自然地写出这道题的解答了:

```py
def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1 # 凑出 0 元需要 0 个硬币, 是一种可能

    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] += dp[a - coin] # (5) 式

    return dp[-1]
```

## 爬楼梯

爬楼梯是一道很经典的动态规划, 我想大家在学习算法的时候都做过它: 有 `n` 级台阶, 你每次可以爬 1 或 2 个台阶, 问有多少种方法爬到楼顶?

我们令 `dp[i]` 为爬到第 `i` 级台阶的方法数. 首先有 `dp[0] = 1`, 初始就站在 0 级台阶上; 以及 `dp[1] = 1`, 到达第 1 级台阶唯一的方法就是从 0 级台阶迈一步. 要到达其它的 `i > 1` 级台阶, 要么从 `i - 1` 级台阶迈一步, 要么从 `i - 2` 级台阶迈两步. 所有有 `dp[i] = dp[i-1] + dp[i-2]`. 所以解法就是:

```py
def climbStairs(n):
    dp = [0] * (n + 1)
    dp[0] = dp[1] = 1
    for i in range(2, n+1):
        dp[i] = dp[i-1] + dp[i-2]

    return dp[-1]
```

仔细一看这不就是斐波那契数列吗? 所以不需要用 `dp` 数组存起来:

```py
def climbStairs(n):
    n0 = n1 = 1
    for _ in range(2, n+1):
        N = n0 + n1
        n0 = n1
        n1 = N
    return n1
```

### 扩展爬楼梯

假设我们每次可以爬 1, 2 或 3 个台阶呢? 再更进一步地, 假设给出一个数组 `a` 表示我们每次能爬的台阶数呢? 做法是类似的.

```py
def climbStairs(n, a):
    dp = [0] * (n + 1):
    dp[0] = 1
    for i in range(1, n + 1):
        for j in a:
            if i >= j:
                dp[i] += dp[i - j]

    return dp[-1]
```

细心的你一定发现了, 这不就是组合总和问题的解法吗? 它们实际上是一个问题. 先迈一步再迈两步 和 先迈两步再迈一步 是两种不同的方法, 因此与零钱兑换不同, 爬楼梯问题求的是排列数. 从最终的代码上看, 它们仅仅是调换了一下内外循环的位置, 然而思路却是不同的: 零钱兑换是从一个复杂的二维动态规划简化而来, 而爬楼梯本身就是个一维动态规划.

***

**参考资料:**

- [深度讲解背包问题：面试中每五道动态规划就有一道是背包模型](https://leetcode-cn.com/circle/discuss/GWpXCM/)
- [零钱兑换II和爬楼梯问题到底有什么不同？](https://leetcode-cn.com/problems/coin-change-2/solution/ling-qian-dui-huan-iihe-pa-lou-ti-wen-ti-dao-di-yo/)
