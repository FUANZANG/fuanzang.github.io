# 寻找峰值元素

**难度：** Medium

## 题目描述

**语言：** JavaScript

给定一个整数数组 `nums`，其中 `nums[i] ≠ nums[i+1]`（相邻元素不相等）。

数组中的**峰值元素**是指严格大于其相邻元素的元素。即对于索引 `i`，如果 `nums[i] > nums[i-1]` 且 `nums[i] > nums[i+1]`，则 `nums[i]` 是一个峰值元素。

假设 `nums[-1] = nums[n] = -∞`（边界外的值视为负无穷）。

请找出数组中任意一个峰值元素，并返回它的索引。

你可以假设数组中至少存在一个峰值。

要求算法的时间复杂度为 **O(log n)**。

## 示例

**输入：** `[1, 2, 3, 1]`  
**输出：** `2`  
**解释：** 3 是峰值元素，它的索引为 2。

**输入：** `[1, 2, 1, 3, 5, 6, 4]`  
**输出：** `1` 或 `5`  
**解释：** 2 是峰值元素（索引 1），6 也是峰值元素（索引 5）。你可以返回任意一个峰值的索引。

## 提示 / 解题思路

1. **O(log n) 的时间复杂度**暗示我们应该使用**二分查找**的思路，而不是线性遍历。

2. 考虑数组的"地形"：由于相邻元素不相等，且两端视为负无穷，那么从任意位置出发，如果我们往数值更大的方向走，最终一定会到达一个峰值。

3. 在二分查找的过程中，检查中间元素 `mid`：
   - 如果 `nums[mid] > nums[mid + 1]`，说明 `mid` 右侧是下降趋势，峰值一定在左半部分（包括 `mid` 本身）。
   - 如果 `nums[mid] < nums[mid + 1]`，说明 `mid` 右侧还在上升，峰值一定在右半部分（不包括 `mid`）。

4. 只需要比较 `nums[mid]` 和 `nums[mid + 1]` 即可决定搜索方向，不需要同时比较左右两边。

5. 想一想：为什么这样一定能找到峰值？

## 解法

二分查找：比较 `mid` 与 `mid+1`，若 `nums[mid] > nums[mid+1]` 则峰值在左半（含 `mid`），否则在右半；每步向更高的一侧收缩，最终收敛到峰值，满足 O(log n)。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const findPeakElement = (nums) => {
  let left = 0,
    right = nums.length - 1
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (nums[mid] > nums[mid + 1]) right = mid
    else left = mid + 1
  }
  return left
}

// 验证
console.log(findPeakElement([1, 2, 3, 1])) // 2
console.log(findPeakElement([1, 2, 1, 3, 5, 6, 4])) // 1 或 5（均可，此处返回 5）
```

- **时间复杂度：** O(log n)
- **空间复杂度：** O(1)
