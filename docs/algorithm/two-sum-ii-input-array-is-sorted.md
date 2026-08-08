# 两数之和 II - 输入有序数组（Two Sum II - Input Array Is Sorted）

**难度：** Medium

## 题目描述

给定一个 **已按非递减顺序排列** 的整数数组 `numbers`，以及一个目标整数 `target`。

请你从数组中找出两个数，使它们的和等于 `target`。返回这两个数的下标（下标从 **1** 开始）。

你可以假设每个输入**恰好有一个解**，并且**同一个元素不能使用两次**。

返回的答案必须是一个包含两个元素的数组 `[index1, index2]`。

## 示例

**示例 1：**

输入：`numbers = [2, 7, 11, 15]`, `target = 9`
输出：`[1, 2]`

解释：`2 + 7 = 9`，下标 1 和下标 2 对应的元素之和等于目标值。

**示例 2：**

输入：`numbers = [2, 3, 4]`, `target = 6`
输出：`[1, 3]`

解释：`2 + 4 = 6`。

**示例 3：**

输入：`numbers = [-1, 0]`, `target = -1`
输出：`[1, 2]`

## 提示 / 解题思路

1. **暴力解法固然可以**——用两层循环遍历所有配对，时间复杂度 O(n²)。但既然题目特别强调了「**已排序**」这个条件，一定有更优的解法。

2. **想一想双指针**：
   - 左指针从数组头部开始，右指针从数组尾部开始。
   - 如果两个指针指向的元素之和 **大于** target，说明和太大了——右指针应该往左移，减小总和。
   - 如果两个指针指向的元素之和 **小于** target，说明和太小了——左指针应该往右移，增大总和。
   - 如果相等，恭喜，找到了答案！

3. **为什么这个方法有效？** 因为数组是有序的，每次排除一个元素时，我们都能保证不会漏掉正确答案。

4. **时间复杂度**：O(n)，只需要一次线性扫描。
5. **空间复杂度**：O(1)，只用了两个指针。

在动手写代码之前，你可以先用示例手动模拟一遍双指针的过程，确认理解正确后再实现。

> **提示：** 返回的下标是从 **1** 开始的，别忘了加 1！

## 解法

双指针（对撞指针）：左指针 `left` 从头部、右指针 `right` 从尾部出发。若两数之和 `sum === target` 则找到答案（下标从 1 开始，返回 `[left+1, right+1]`）；若 `sum < target` 说明和太小，左指针右移增大；若 `sum > target` 说明和太大，右指针左移减小。数组有序保证每次排除一个元素都不会漏掉解。

```javascript
/**
 * @param {number[]} numbers
 * @param {number} target
 * @return {number[]}
 */
const twoSum = (numbers, target) => {
  let left = 0,
    right = numbers.length - 1
  while (left < right) {
    const sum = numbers[left] + numbers[right]
    if (sum === target) {
      return [left + 1, right + 1]
    } else if (sum < target) {
      left++
    } else {
      right--
    }
  }
  return []
}

// 验证
console.log(JSON.stringify(twoSum([2, 7, 11, 15], 9))) // [1,2]
console.log(JSON.stringify(twoSum([2, 3, 4], 6))) // [1,3]
console.log(JSON.stringify(twoSum([-1, 0], -1))) // [1,2]
```

- **时间复杂度：** O(n)，左右指针最多各移动 n 次。
- **空间复杂度：** O(1)，只用到两个指针。
