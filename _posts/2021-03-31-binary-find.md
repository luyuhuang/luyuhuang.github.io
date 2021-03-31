---
title: 并不简单的二分查找
tag: algorithms
aside: false
---
二分查找是一个很经典的入门算法, 我们每个人都学过. 然而它往往没有我们没有想象的那么简单, 它有很多容易出错的细节: 用 `<` 还是 `<=` ? 是 `right = mid` 还是 `right = mid - 1` ? 是用 `mid = (right + left) / 2` 还是 `mid = left + (right - left) / 2` ? 如何使用二分查找找出左边界和右边界? 等等等等. 这篇文章我们就来搞清楚这些问题.

### 基本思路

二分查找的基本思路很简单: 在一个升序排列的数组中找到目标值, 首先检查数组正中间的数, 如果它比目标数大, 那么目标数一定位于数组的前半部分, 否则位于数组的后半部分; 然后在前半部分或者后半部分中执行同样的查找操作, 直到找到目标数.

为了实现这一算法, 我们需要维护一段区间, 为当前的查找区间, 初始为整个数组. 为此我们维护两个变量 `left` 和 `right` 分别表示查找区间的左边界和右边界. 接着我们会找出数组的中点位置 `mid`, 将目标数于中点位置的数比较, 然后收缩区间.

算法何时终止? 显然是找到了就可以终止了. 但若目标数不在数组中呢? 那应当是当查找区间为空时算法终止. 因为查找区间为空意味着没有数可找了, 就可以认为目标数不在数组之中了.

### 前闭后闭区间

如果数组的长度为 `len`, 则它的最大下标为 `len - 1`. 因此很自然地想到将 `left` 初始化为 0, `right` 初始化为 `len - 1`. 这样, `left` 和 `right` 表示的便是一个前闭后闭的区间. 很自然地想到中点位置 `mid = (left + right) / 2`, 即二者的平均数.

```c++
int binfind(const std::vector<int> &array, int target) {
    int left = 0, right = array.size() - 1;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (array[mid] < target) {
            left = mid + 1;
        } else if (array[mid] > target) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}
```

由于区间是前闭后闭的, 因此只要 `left <= right`, 区间便不为空. 同时注意到在收缩区间时, `mid` 已经检查过了, 就不必包含在新区间中了, 因此有 `left = mid + 1` 和 `right = mid - 1`.

### 前闭后开区间

我们还可以初始令 `left = 0` 和 `right = length`, 让 `left` 和 `right` 表示成一个前闭后开的区间. 相应的代码就要改改了:

```c++
int binfind(const std::vector<int> &array, int target) {
    int left = 0, right = array.size();
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (array[mid] < target) {
            left = mid + 1;
        } else if (array[mid] > target) {
            right = mid;
        } else {
            return mid;
        }
    }
    return -1;
}
```

由于是前闭后开的区间, 因此当 `left < right` 时区间不为空. 并且由于 `right` 位置上的数并不包含在区间中, 因此收缩区间时设置 `right = mid` 即可.

这里我们使用了另外一种求中点的方式: `mid = left + (right - left) / 2`. 前闭后开的区间 `[left, right)` 的长度为 `right - left`, 我们让 `left` 向右偏移区间长度的一半, 即为中点的位置.

### 求中点位置

两种求中点位置的方式其实是一样的:

$$
\begin{align}

m &= l + \frac{r - l}{2} \\
  &= \frac{2l}{2} + \frac{r - l}{2} \\
  &= \frac{l + r}{2}

\end{align}
$$

不过不同的是, `left + right` 的值有可能过大而导致整数溢出. 因此推荐使用 `mid = left + (right - left) / 2` 这种方式.

如果认为中点位置应该是 `left` 加上区间长度的一半, 则对于前闭后闭的区间, 中点位置应该是 `mid = left + (right - left + 1) / 2`. 若区间长度为奇数 (即 `right - left` 为偶数), 则两种方式求得的结果是一样的; 若区间长度为偶数, 求得的结果则会比 `(left + right) / 2` 大 1. 不过这一差别并不会对算法造成实质影响.

### 找到边界

提问: 给定一个升序排序数组和一个目标数, 找出目标数在数组中的开始位置和位置. 例如目标数 3 在数组 `[1, 2, 3, 3, 3, 5]` 中的开始位置为 2, 结束位置为 4.

我们仍然可以使用二分查找解决这个问题. 在前面看到的二分查找中, 可以看到:

- 当中点数小于目标数时, 区间右移;
- 当中点数大于目标数时, 区间左移;
- 当中点数等于目标数时, 查找结束.

而此时我们要找到目标数第一个出现当位置 (左边界), 意味着中点数等于目标数时查找不能结束, 而应该让区间左移. 只有这样区间才会不断逼近左边界.

```c++
int leftbound(const std::vector<int> &array, int target) {
    int left = 0, right = array.size();
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (array[mid] < target) {
            left = mid + 1; // move right
        } else { // array[mid] >= target
            right = mid; // move left
        }
    }
    return left;
}
```

这个过程中, `left` 只有在中间数小于目标数 (`array[mid] < target`) 时才会向右移动. 因为有 `array[mid] <= array[mid+1]` 且 `array[mid] < target`, 如果 `target` 在 `array` 中, 则 `mid + 1` 必然不会超过 `target` 的左边界. 因此 `left` 不会超过 `target` 的左边界. 随着区间不断收缩, 循环结束时必然有 `left == right`. 最后 `left` 和 `right` 都会处于 `target` 的左边界的位置.

找右边界的道理是一样的. 不过注意我们使用的时前闭后开的区间, 得到的右边界不属于区间的一部分. 因此最后的结果要减一.

```c++
int rightbound(const std::vector<int> &array, int target) {
    int left = 0, right = array.size();
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (array[mid] > target) {
            right = mid; // move left
        } else { // array[mid] <= target
            left = mid + 1; // move right
        }
    }
    return left - 1;
}
```

能不能使用前闭后闭的方式解这个问题呢? 其实也是可以的. 不过这样的话循环结束时会有 `left == right + 1`, 理解起来没这么自然.

```c++
int leftbound(const std::vector<int> &array, int target) {
    int left = 0, right = array.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (array[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return left;
}

int rightbound(const std::vector<int> &array, int target) {
    int left = 0, right = array.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (array[mid] > target) {
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }
    return right;
}
```

### 总结

这么看下来, 二分查找的细节还是挺多的, 如果不搞清楚这些细节, 就很容易出错. 总的来说, 如果使用前闭后闭区间, 则:

- 循环条件为 `left <= right`
- 左移区间 `right = mid - 1`, 右移区间 `left = mid + 1`
- 循环结束时有 `left == right + 1`

如果使用前闭后开区间, 则:

- 循环条件为 `left < right`
- 左移区间 `right = mid`, 右移区间 `left = mid + 1`
- 循环结束时有 `left == right`

为了防止整数溢出, 应该使用 `mid = left + (right - left) / 2` 的方式求中点. 如果要找到左边界, 则当中间数等于目标数时区间左移; 如果要找右边界, 则当中间数等于目标数时区间右移. 综合看来, 使用前闭后开的区间理解起来容易些, 我个人也比较喜欢这种方式.

