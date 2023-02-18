---
key: 39
title: 全排列问题
math: true
tag: [algorithms, leetcode]
---
给定 n 个不同的元素, 问有多少种不同的排列方式. 这就是全排列问题. 我们高中时就学过排列公式 $A_n^m = \frac{n!}{(n-m)!}$, 因此对于 n 个元素, 全排列数等于 $A_n^n = \frac{n!}{(n-n)!} = n!$ . 例如对于序列 `[1, 2, 3]` 全排列为

```
[1, 2, 3]
[1, 3, 2]
[2, 1, 3]
[2, 3, 1]
[3, 1, 2]
[3, 2, 1]
```

共 $3! = 6$ 种. 这里我们讨论 Leetcode 上的三道全排列问题.

### 1. 全排列

题目源自 [Leetcode 46 题](https://leetcode-cn.com/problems/permutations/)

> 给定一个**没有重复**数字的序列，返回其所有可能的全排列。
>
> 示例:
>
> ```
> 输入: [1,2,3]
> 输出:
> [
>   [1,2,3],
>   [1,3,2],
>   [2,1,3],
>   [2,3,1],
>   [3,1,2],
>   [3,2,1]
> ]
> ```

熟悉回溯算法的同学应该能很快解出这道题. 我之前写的一篇关于[解数独算法](/2019/10/07/sudoku-solution.html)的文章中介绍了回溯法. 简单地说就是先在数组中选择一个数, 接下来总是递归选择下一个数, 每次选择的数都保存在一个栈里, 直到选择了 n 个数, 便是一个结果; 接着递归调用返回, 开始回溯, 栈中的相应的数会弹出, 然后再接着选择新的数. 当然, 我们不能选择重复的数. 为此我们可以使用一个集合来保存使用过的数. 代码如下:

```py
def permute(nums):
    ans = []
    res = []
    l = len(nums)
    used = [False] * l
    def walk(i):
        if i == l:
            ans.append(res[:])
        else:
            for j, n in enumerate(nums):
                if not used[j]:
                    res.append(n)
                    used[j] = True
                    walk(i + 1)
                    used[j] = False
                    res.pop()

    walk(0)
    return ans
```

这个解法比较简单直白. 不过数组 `used` 会占用额外的空间, 且每次递归都会便利整个数组, 有些浪费.

我们可以做一些优化. 我们可以将 `nums` 数组分为两部分, 当我们已选择 `i` 个数字时, 我们视 `nums[:i]` 为已选择的数字, 而 `nums[i:]` 为未选择的数字. 每次只从未选择的部分 `nums[i:]` 中选择数字, 这样就不会重复; 当要选择第 `j` 个数字时, 我们将 `nums[i]` 与 `nums[j]` 交换, 然后 `i += 1`, 视为选择了 `nums[j]`; 回溯的时候就将它们再次交换 (换回来), 然后 `i -= 1`. 最终的代码如下:

```py
def permute(nums):
    ans = []
    l = len(nums)
    def walk(i):
        if i == l:
            ans.append(nums[:])
        else:
            for j in range(i, l):
                nums[i], nums[j] = nums[j], nums[i]
                walk(i + 1)
                nums[i], nums[j] = nums[j], nums[i]

    walk(0)
    return ans
```

### 2. 第 k 个排列

题目源自 [Leetcode 60 题](https://leetcode-cn.com/problems/permutation-sequence/)

> 给出集合 `[1,2,3,…,n]`，其所有元素共有 n! 种排列。
>
> 按大小顺序列出所有排列情况，并一一标记，当 n = 3 时, 所有排列如下：
>
> 1. `"123"`
> 1. `"132"`
> 1. `"213"`
> 1. `"231"`
> 1. `"312"`
> 1. `"321"`
>
> 给定 n 和 k，返回第 k 个排列。
>
> 说明：
>
> - 给定 n 的范围是 [1, 9]。
> - 给定 k 的范围是[1,  n!]。
>
> 示例 1:
>
> ```
> 输入: n = 3, k = 3
> 输出: "213"
> ```
>
> 示例 2:
>
> ```
> 输入: n = 4, k = 9
> 输出: "2314"
> ```

会做上一题, 这题还不简单 -- -- 加个计数不就好了!

```py
def getPermutation(n, k):
    c = 0
    res = []
    used = [False] * n
    def walk(i):
        nonlocal c

        if i == n:
            c += 1
            if c == k:
                return ''.join(map(str, res))
        else:
            for j in range(n):
                if not used[j]:
                    res.append(j + 1)
                    used[j] = True
                    s = walk(i + 1)
                    if s is not None:
                        return s
                    used[j] = False
                    res.pop()

        return None

    return walk(0)
```

然而这个算法会超时! 实际上, 为了求出第 k 个排列, 我们不必回溯求出第 1 至 k 的所有排列. 当我们已选择 `i` 个数, 也就是还剩 `n - i` 个数未选择时, 我们就已经知道计算完接下来的 `n - i` 个数的排列会产生多少种结果了 -- -- `n - 1` 个不同元素的全排列数为 `(n - 1)!`, 我们就可以直接跳过 `(n - 1)!` 次. 利用这点, 我们可以避免很多不必要的全排列计算. 这种技巧称为**剪枝(pruning)**. 最终的代码如下:

```py
from math import factorial

def getPermutation(n, k):
    c = 0
    res = []
    used = [False] * n
    def walk(i):
        nonlocal c

        f = factorial(n - i)
        if c + f < k:
            c += f
            return None

        if i == n:
            c += 1
            if c == k:
                return ''.join(map(str, res))
        else:
            for j in range(n):
                if not used[j]:
                    res.append(j + 1)
                    used[j] = True
                    s = walk(i + 1)
                    if s is not None:
                        return s
                    used[j] = False
                    res.pop()

        return None

    return walk(0)
```

当然还有优化空间, 阶乘可以预先计算好, 不必每次求算. 这里就不赘述了.

### 3. 下一个排列

题目源自 [Leetcode 31 题](https://leetcode-cn.com/problems/next-permutation/)


> 实现获取下一个排列的函数，算法需要将给定数字序列重新排列成字典序中下一个更大的排列。
>
> 如果不存在下一个更大的排列，则将数字重新排列成最小的排列（即升序排列）。
>
> 必须原地修改，只允许使用额外常数空间。
>
> 以下是一些例子，输入位于左侧列，其相应输出位于右侧列。
>
> `1,2,3` → `1,3,2`<br>
> `3,2,1` → `1,2,3`<br>
> `1,1,5` → `1,5,1`

与其想如何求得一个排列的下一个排列, 不如想怎么让这个排列变得大一点, 但是只能大 "一点", 不能大太多. 我们只需将序列中后面一个较大的数与前面一个较小的数交换, 就能让它变大一些了. 现在的问题就是应该交换哪两个数.

如果一个排列是降序排列, 那么它一定是最大的一个排列, 没什么可交换的了; 因此我们要在排列中找到一个升序的位置, 即 `nums[i] > nums[i - 1]`, 然后通过交换, 把这个位置变为降序. 为了让增长尽可能地小, 这个位置应该尽可能地靠后. 找到这样一个位置之后, 我们再在数组 `nums[i:]` 的部分找到一个比 `nums[i - 1]` 大的数, 与之交换. 为了让增长尽可能地小, 这个数还应该是最小的比 `nums[i - 1]` 大的数.

交换完之后还不够, 因为我们找到 `i` 是从后往前第一个 `nums[i] > nums[i - 1]` 的位置, 因此 `nums[i:]` 一定是降序的. 为了让交换后的数尽可能地小, 我们还得设法把交换后的 `nums[i:]` 变为升序的. 好在 `nums[i:]` 是降序的, 如果我们从后往前找到最小的比 `nums[i - 1]` 大的数然后与 `nums[i - 1]` 交换, 那么交换之后 `nums[i:]` 仍然是升序的. 我们只需反转 `nums[i:]` 的部分即可.

最终的代码如下:

```py
def nextPermutation(nums):
    for i in range(len(nums) - 1, 0, -1):
        if nums[i] > nums[i - 1]:
            k = None
            for j in range(len(nums) - 1, i - 1, -1):
                if nums[j] > nums[i - 1]:
                    if k is None or nums[j] < nums[k]:
                        k = j

            nums[k], nums[i - 1] = nums[i - 1], nums[k]
            for k in range(0, (len(nums) - i) // 2):
                nums[i + k], nums[-k - 1] = nums[-k - 1], nums[i + k]

            return

    return nums.reverse()
```

***

**参考资料:**

- [下一个排列算法详解：思路+推导+步骤，看不懂算我输！](https://leetcode-cn.com/problems/next-permutation/solution/xia-yi-ge-pai-lie-suan-fa-xiang-jie-si-lu-tui-dao-/)
