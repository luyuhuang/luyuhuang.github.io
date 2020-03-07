---
title: 三个思路相通的最大面积问题
tag:
    - algorithms
    - leetcode
---
笔者在 LeetCode 上看到了三个非常有意思的最大面积问题, 这里来分享一下.

### 1. 接雨水

题目源自Leetcode: [接雨水](https://leetcode-cn.com/problems/trapping-rain-water/)

> 给定 n 个非负整数表示每个宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。
>
> ![trapping-rain-water](/assets/images/three-maximum-area-problems_1.png)
>
> 上面是由数组 [0,1,0,2,1,0,1,3,2,1,2,1] 表示的高度图，在这种情况下，可以接 6 个单位的雨水（蓝色部分表示雨水）。 感谢 Marcos 贡献此图。
>
> 示例:
>
> > 输入: [0,1,0,2,1,0,1,3,2,1,2,1]
> >
> > 输出: 6

#### 思路一

如何去解这个问题呢? 我们注意到, 一个柱子上之所以能储水, 是因为它的两边有别的柱子挡着. 那么一个柱子上最多能储多少水呢? 我们都知道木桶定理: 木桶的储水量取决于它最短的一块木板. 容易看出, 一个柱子上储水的最大高度, 等于**两边柱子最大高度的较小值减去当前高度的值**. 能想明白这一点, 这个问题就很好解了.

我们用数组 `left_max` 和 `right_max` 分别记录对于每个柱子而言左边和右边最高柱子的高度, 这样我们作一次遍历便可求出 `left_max` 或 `right_max`. 之后再作一次遍历求出每个柱子最大储水高度, 即可得解.

```python
def trapping_rain_water(heights):
    left_max = [0] * len(heights)
    right_max = [0] * len(heights)
    ans = 0

    for i in range(1, len(heights)):
        left_max[i] = max(heights[i - 1], left_max[i - 1])
    for i in range(len(heights) - 2, -1, -1):
        right_max[i] = max(heights[i + 1], right_max[i + 1])

    for i, h in enumerate(heights):
        ans += max(0, min(left_max[i], right_max[i]) - h)

    return ans
```

时间复杂度和空间复杂度都为 $\mathrm{O}(n)$.

我们还可以更进一步, 不必预先把 `left_max` 和 `right_max` 求出来, 而是在遍历的同时求出.

我们定义两个指针 `i` 和 `j`. 指针 `i` 初始位于最左端, 向右移动; 指针 `j` 初始位于最右端, 向左移动. 我们让两个指针交替移动: 当 `i` 向右移动的过程中就能求出对第 `i` 个柱子而言左边最高柱子的高度, 记作 `ml`; 同理当 `j` 向左移动的过程中就能求出对第 `j` 个柱子而言右边最高柱子的高度, 记作 `mr`. 但是有一个问题: 我们<u>无法同时得出</u>对于一个柱子而言<u>左边和右边最高柱子的高度</u>. 以指针 `i` 为例, 在它向右移动的过程中, 总能准确地知道对于对第 `i` 个柱子而言左边最高柱子的高度 `ml`, 却无法准确知道右边最高柱子的高度. 怎么办呢? 注意到一个柱子上储水的最大值取决于**两边柱子最大高度的较小值**. 我们知道, 右边最高柱子的高度一定大于或等于 `mr`. 如果有 `mr >= ml`, 那么当前柱子的储水量就与 `mr` 无关, 我们利用 `ml` 就可以求出当前柱子的储水量了. 指针 `j` 同理. 用这样的规则交替移动两个指针, 就可以在一遍循环中解决这个问题.

```python
def trapping_rain_water(heights):
    ans = 0
    i, j = 0, len(heights) - 1
    ml, mr = 0, 0

    while i <= j:
        hi, hj = heights[i], heights[j]

        # 对 i 来说 ml 总是对的, mr 却不一定是对的. 但是如果 mr >= ml, mr 对不对也无所谓了.
        if mr >= ml:
            ans += max(ml - hi, 0)
            if hi > ml:
                ml = hi
            i += 1
        # 对 j 来说 mr 总是对的, ml 却不一定是对的. 但是如果 ml >= mr, ml 对不对也无所谓了.
        else:
            ans += max(mr - hj, 0)
            if hj > mr:
                mr = hj
            j -= 1

    return ans
```

现在空间复杂度就降为 $\mathrm{O}(1)$ 了. 这个做法非常巧妙, 值得细细品味.

#### 思路二

与之前的按列求储水量不同, 我们还可以换种思路: 按行求储水量. 对于每个柱子, 在<u>左边寻找第一个高度不小于它的柱子</u>, 并在<u>右边寻找第一个高度大于它的柱子</u>; 然后<u>用其中高度较小的柱子的高度</u> <u>减去当前柱子的高度</u> <u>再乘以两个柱子之间的距离</u>, 最后把所有的储水量加起来便是问题的解.

![trapping-rain-water](/assets/images/three-maximum-area-problems_7.png)

对于每个柱子, 如何求出它左边第一个不低于它的柱子和右边第一个高于它的柱子呢? 如果我们使用最朴素的做法, 即遍历所有的柱子, 分别向左右两边寻找, 那么时间复杂度为 $\mathrm{O}(n^2)$. 这显然是不合适的.

这里我们采用一种叫做**单调栈**的技巧. 所谓单调栈就是栈中的元素始终保持单调递增或者递减. 在这道题中, 我们在栈中保存每个柱子的下标, 使栈中柱子的高度保持非严格递减, 即前一个柱子的高度始终大于或等于后一个柱子的高度. 为了做到这一点, 我们在每次入栈时都与栈顶相比较, 如果要入栈的柱子高度小于或等于栈顶柱子的高度则直接入栈, 否则不断地弹出栈顶, 直到栈为空或栈顶柱子的高度大于或等于要入栈柱子的高度.

想想看, 当栈弹出的时候会发生什么呢? 因为栈中柱子的高度是非严格递减的, 所以对于刚刚出栈的那个柱子而言, <u>左边第一个高度不小于它的柱子恰恰就是栈顶的柱子</u>; 而<u>右边第一个高度大于它的柱子恰恰就是将要入栈的柱子</u>. 这样一来就能完美地解决问题.

```python
def trapping_rain_water(heights):
    stack = []
    ans = 0
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] < h:
            j = stack.pop()
            if not stack: break
            ans += (i - stack[-1] - 1) * (min(heights[stack[-1]], h) - heights[j])
        stack.append(i)

    return ans
```

由于每个柱子只会入栈和出栈一次, 因此时间复杂度为 $\mathrm{O}(n)$.

### 2. 柱状图中最大的矩形

题目源自Leetcode: [柱状图中最大的矩形](https://leetcode-cn.com/problems/largest-rectangle-in-histogram/)

> 给定 n 个非负整数，用来表示柱状图中各个柱子的高度。每个柱子彼此相邻，且宽度为 1 。
>
> 求在该柱状图中，能够勾勒出来的矩形的最大面积。
>
> ![largest-rectangle-in-histogram](/assets/images/three-maximum-area-problems_2.png)
>
> 以上是柱状图的示例，其中每个柱子的宽度为 1，给定的高度为 [2,1,5,6,2,3]。
>
> ![largest-rectangle-in-histogram](/assets/images/three-maximum-area-problems_3.png)
>
> 图中阴影部分为所能勾勒出的最大矩形面积，其面积为 10 个单位。
>
> 示例:
>
> > 输入: [2,1,5,6,2,3]
> >
> > 输出: 10

#### 思路一

这道题的关键也是找到一个规律. 通过观察我们不难发现: 对于每个柱子, 我们向左右两边扩张, 扩张到不能扩为止; 最后得出的最大值就是问题的解. 那么对于一个柱子而言最多能扩张到哪儿呢? 答案应该是**左右两边第一个高度小于它的柱子的位置**. 能想明白这一点, 这个问题就很好解了.

与接雨水的思路二类似, 我们可以使用单调栈来求解. 但是注意, 单调栈并不能求出左右两边第一个高度小于它的柱子, 它只能求出左边第一个高度不大于它和右边第一个高度小于它的柱子, 或是左边第一个高度小于它和右边第一个高度不大于它的柱子. 如果连续出现多个高度相同的柱子, 就不能为每个柱子求出准确的值. 但是这道题求的是最大值, 所以这样做也能得出正确的解.

这里我们使用非严格递增的单调栈, 它会为每个柱子求出左边第一个高度不大于它和右边第一个高度小于它的柱子.

```python
def largest_rectangle_in_histogram(heights):
    stack = []
    heights = [0] + heights + [0]
    ans = 0
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            j = stack.pop()
            s = heights[j] * (i - stack[-1] - 1)
            if s > ans:
                ans = s
        stack.append(i)

    return ans
```

时间复杂度为 $\mathrm{O}(n)$.

#### 思路二

还有一种思路是像接雨水一样, 使用两个数组 `left_min` 和 `right_min` 分别存储对于每个柱子而言左边和右边第一个高度比它小的柱子的位置.

如何在 $\mathrm{O}(n)$ 的时间求出这个两个数组呢? 以 `left_min` 为例, 对于第 `i` 个柱子, 如果第 `i - 1` 个柱子高度比它小, 那么显然有 `left_min[i] = i - 1`. 但如果高度比它大呢? 我们注意到, 如果 `heights[i - 1] > heights[i]`, 必然有 `left_min[i - 1] >= left_min[i]`. 所以我们只需要不断地迭代 `i = left_min[i]` 即可.

```python
def largest_rectangle_in_histogram(heights):
    if len(heights) == 0: return 0
    left_min = [0] * len(heights)
    right_min = [0] * len(heights)
    ans = 0

    left_min[0] = -1
    for i in range(1, len(heights)):
        j = i - 1
        while j >= 0 and heights[j] >= heights[i]:
            j = left_min[j]
        left_min[i] = j

    right_min[-1] = len(heights)
    for i in range(len(heights) - 2, -1, -1):
        j = i + 1
        while j < len(heights) and heights[j] >= heights[i]:
            j = right_min[j]
        right_min[i] = j

    for i, h in enumerate(heights):
        s = (right_min[i] - left_min[i] - 1) * h
        if s > ans:
            ans = s

    return ans
```

### 3. 最大矩形

题目源自Leetcode: [最大矩形](https://leetcode-cn.com/problems/maximal-rectangle/)

> 给定一个仅包含 0 和 1 的二维二进制矩阵，找出只包含 1 的最大矩形，并返回其面积。
>
> 示例:
>
> > 输入:
> >
> > ```
> > [
> >   ["1","0","1","0","0"],
> >   ["1","0","1","1","1"],
> >   ["1","1","1","1","1"],
> >   ["1","0","0","1","0"]
> > ]
> > ```
> >
> > 输出: 6

这道题的关键就是搞清楚它跟上一题 柱状图中最大的矩形 是一样的. 我们一行行来看, 就会发现这道题其实是在求 n 个柱状图中的最大矩形.

![maximal-rectangle](/assets/images/three-maximum-area-problems_4.png){:width="500"}

能想明白这一点, 这个问题就很好解了.

这里我想重点讲一下利用上一题思路二的方法.

在这个方法中我们试图利用上一行的数据快速推导出下一行的数据. 首先注意到, 对于每一行, 我们能很快求出 `heights`. 具体的做法是遍历这一行的每一列, 如果第 `j` 列为 1 则 `heights[j] += 1` 否则 `heights[j] = 0`.

```python
heights = [0] * cols
for i in range(rows):
    for j in range(cols):
        if matrix[i][j] == "1":
            heights[j] += 1
        else:
            heights[j] = 0
```

对于 `left_min` 和 `right_min` 来说, 如果这一行全为 1, 则它们都与上一行相同.

![maximal-rectangle](/assets/images/three-maximum-area-problems_5.png){:width="500"}

若这一行的第 `j` 列出现了 0, 那么必然有 `heights[j] = 0`. 也就是说这个 0 的出现导致位置 `j` 上的柱子高度降为了0.

![maximal-rectangle](/assets/images/three-maximum-area-problems_6.png){:width="500"}

这必然会影响 `left_min` 和 `right_min` 的值. 如何更新它们呢? 以 `left_min` 为例, 我们可以从左往右扫描, 遇到 0 便位置记录下来. 之后若发现有第 `j` 列的 `left_min[j]` 在上一次出现 0 的位置的左边, 就更新 `left_min[j]`. `right_min` 同理. 最后再求最大面积.

```python
def maximal_rectangle(matrix):
    if len(matrix) == 0: return 0
    rows = len(matrix)
    cols = len(matrix[0])
    heights = [0] * cols
    left_min = [-1] * cols
    right_min = [cols] * cols
    ans = 0

    for i in range(rows):
        for j in range(cols):
            if matrix[i][j] == "1":
                heights[j] += 1
            else:
                heights[j] = 0

        last_zero = -1
        for j in range(cols):
            if matrix[i][j] == "1":
                left_min[j] = max(last_zero, left_min[j])
            else:
                last_zero = j
                left_min[j] = -1

        last_zero = cols
        for j in range(cols - 1, -1, -1):
            if matrix[i][j] == "1":
                right_min[j] = min(last_zero, right_min[j])
            else:
                last_zero = j
                right_min[j] = cols

        for j, h in enumerate(heights):
            s = (right_min[j] - left_min[j] - 1) * h
            if s > ans:
                ans = s

    return ans
```

时间复杂度为 $\mathrm{O}(mn)$, 空间复杂度为 $\mathrm{O}(n)$. m 和 n 分别是行数和列数.

---

**参考资料:**

- [接雨水](https://leetcode-cn.com/problems/trapping-rain-water/solution/jie-yu-shui-by-leetcode/)
- [详细通俗的思路分析，多解法](https://leetcode-cn.com/problems/largest-rectangle-in-histogram/solution/xiang-xi-tong-su-de-si-lu-fen-xi-duo-jie-fa-by-1-7/)
- [详细通俗的思路分析，多解法](https://leetcode-cn.com/problems/maximal-rectangle/solution/xiang-xi-tong-su-de-si-lu-fen-xi-duo-jie-fa-by-1-8/)
