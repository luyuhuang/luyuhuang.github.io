---
title: 最小覆盖子串
category: algorithms
---

题目源自Leetcode: [最小覆盖子串-leetcode](https://leetcode-cn.com/problems/minimum-window-substring/)

> 给你一个字符串 S、一个字符串 T，请在字符串 S 里面找出：包含 T 所有字母的最小子串。
>
> 示例：
>
> > 输入: `S = "ADOBECODEBANC"`, `T = "ABC"`<br/>
> > 输出: `"BANC"`
>
> 说明：
> - 如果 S 中不存这样的子串，则返回空字符串 `""`。
> - 如果 S 中存在这样的子串，我们保证它是唯一的答案。

### 解法: 滑动窗口
