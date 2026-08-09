# 最长和谐子序列（Longest Harmonious Subsequence）

**难度：** Easy

## 题目描述

和谐数组是指一个数组里元素的最大值和最小值之间的差别**正好是 1**。

现在，给你一个整数数组 `nums`，请你在所有可能的子序列中找到最长的和谐子序列的长度。

注意：数组的子序列是一个由数组派生出来的序列，它可以通过删除一些元素或不删除元素、且不改变其余元素的顺序而得到。

## 示例

```javascript
输入：nums = [1, 3, 2, 2, 5, 2, 3, 7]
输出：5
解释：最长的和谐子序列是 [3, 2, 2, 2, 3]

输入：nums = [1, 1, 1, 1]
输出：0
解释：没有差为 1 的两个数，最长和谐子序列长度为 0。
```

## 提示 / 解题思路

- 和谐子序列只由两个值组成： `x` 和 `x + 1` ，且两者都要出现。
- 用哈希表统计每个数字出现的频率。
- 遍历每个数字 `x`，若 `x + 1` 也在表中，则和谐子序列长度为 `count(x) + count(x + 1)`，取最大值。

## 解法

哈希表统计每个数字频率；和谐子序列只含 `x` 与 `x+1` 两种值（差为 1），遍历每个 `x`，若 `x+1` 存在则长度为 `count(x) + count(x+1)`，取最大值。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const findLHS = (nums) => {
  const count = new Map()
  for (const n of nums) count.set(n, (count.get(n) || 0) + 1)
  let maxLen = 0
  for (const [x, c] of count) {
    if (count.has(x + 1)) maxLen = Math.max(maxLen, c + count.get(x + 1))
  }
  return maxLen
}

// 验证
console.log(findLHS([1, 3, 2, 2, 5, 2, 3, 7])) // 5
console.log(findLHS([1, 1, 1, 1])) // 0
```

- **时间复杂度：** O(n)
- **空间复杂度：** O(n)
