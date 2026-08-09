# 最长连续序列（Longest Consecutive Sequence）

**难度：** Medium

## 题目描述

给定一个**未排序**的整数数组 `nums`，找出数字连续的最长序列（不要求序列元素在原数组中连续）的长度。

请你设计并实现时间复杂度为 **O(n)** 的算法来解决此问题。

## 示例

**示例 1：**

```
输入：nums = [100, 4, 200, 1, 3, 2]
输出：4
解释：最长连续序列是 [1, 2, 3, 4]，长度为 4。
```

**示例 2：**

```
输入：nums = [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]
输出：9
解释：最长连续序列是 [0, 1, 2, 3, 4, 5, 6, 7, 8]，长度为 9。
```

## 提示 / 解题思路

1. **排序？不行。** 排序可以做到 O(n log n)，但题目要求 O(n)，所以不能走排序路线。

2. **想想"查找"的效率。** 如果能在 O(1) 时间内判断某个数是否存在于数组中，你就能省去大量重复工作。JavaScript 的 `Set` 正好提供这个能力。

3. **关键观察：** 一个连续序列一定有一个"起点"——即该起点的前一个数（`num - 1`）不存在于数组中。只有从起点开始往后延伸，才能避免重复计算。

4. **思路框架：**
   - 把所有数放入 `Set`。
   - 遍历 `Set` 中的每个数，如果 `num - 1` 不在 `Set` 中，说明 `num` 是某个连续序列的起点。
   - 从该起点开始，依次检查 `num + 1, num + 2, ...` 是否存在，统计连续长度。
   - 记录最大长度即可。

5. **为什么这是 O(n)？** 虽然有嵌套循环的"感觉"，但每个数字最多被访问两次（一次在外层遍历，一次在内层延伸），所以总时间复杂度是 O(n)。

## 解法

把所有数放入 `Set`，仅从「前一个数不存在」的序列起点出发向后延伸统计连续长度。每个数最多被访问两次（外层一次、内层延伸一次），整体 O(n)。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const longestConsecutive = (nums) => {
  const set = new Set(nums)
  let maxLen = 0
  for (const num of set) {
    if (!set.has(num - 1)) {
      let cur = num
      let len = 1
      while (set.has(cur + 1)) {
        cur++
        len++
      }
      maxLen = Math.max(maxLen, len)
    }
  }
  return maxLen
}

// 验证
console.log(longestConsecutive([100, 4, 200, 1, 3, 2])) // 4
console.log(longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])) // 9
console.log(longestConsecutive([1, 0, 1, 2])) // 3
```
