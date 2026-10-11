# 在排序数组中查找元素的第一个和最后一个位置（Find First and Last Position of Element in Sorted Array）

**难度：** Medium

## 题目描述

给定一个按照**非递减顺序**排列的整数数组 `nums`，和一个目标值 `target`。请你找出给定目标值在数组中的开始位置和结束位置。

如果数组中不存在目标值 `target`，返回 `[-1, -1]`。

你必须设计一个时间复杂度为 **O(log n)** 的算法解决此问题。

### 约束条件

- `0 <= nums.length <= 10^5`
- `-10^9 <= nums[i] <= 10^9`
- `nums` 是一个非递减数组
- `-10^9 <= target <= 10^9`

## 示例

**示例 1：**

```
输入：nums = [5,7,7,8,8,10], target = 8
输出：[3,4]
解释：target = 8 在数组中第一次出现在下标 3，最后一次出现在下标 4，因此返回 [3, 4]。
```

**示例 2：**

```
输入：nums = [5,7,7,8,8,10], target = 6
输出：[-1,-1]
解释：target = 6 不存在于数组中，因此返回 [-1, -1]。
```

**示例 3：**

```
输入：nums = [], target = 0
输出：[-1,-1]
解释：数组为空，target 不存在，返回 [-1, -1]。
```

## 提示 / 解题思路

这道题的核心是**二分查找的变体**。普通二分查找在找到目标值时就返回，但这道题要求找到目标值的**最左边界**和**最右边界**。

**思路分析：**

1. **找左边界**：当 `nums[mid] === target` 时，不立即返回，而是将右边界 `right` 收缩到 `mid - 1`，继续向左查找。最终 `left` 就是目标值的第一个位置。

2. **找右边界**：同理，当 `nums[mid] === target` 时，将左边界 `left` 扩展到 `mid + 1`，继续向右查找。最终 `right` 就是目标值的最后一个位置。

3. **边界检查**：找到左右边界后，需要检查对应位置的值是否真的等于 `target`（可能目标值不存在）。

**要点：**
- 两次二分查找，分别找左边界和右边界，整体时间复杂度 O(log n)
- 注意处理 `nums` 为空、`target` 不在数组中等边界情况
- 找左边界时 `mid` 向下取整（`Math.floor`），避免死循环

## 解法

两次二分查找，分别定位目标值的左边界和右边界。

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
const searchRange = (nums, target) => {
  // 查找左边界（第一个等于 target 的位置）
  const findLeft = () => {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (nums[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    // left 指向第一个 >= target 的位置
    if (left < nums.length && nums[left] === target) return left;
    return -1;
  };

  // 查找右边界（最后一个等于 target 的位置）
  const findRight = () => {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (nums[mid] > target) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    // right 指向最后一个 <= target 的位置
    if (right >= 0 && nums[right] === target) return right;
    return -1;
  };

  const leftBound = findLeft();
  // 如果左边界不存在，直接返回
  if (leftBound === -1) return [-1, -1];
  const rightBound = findRight();
  return [leftBound, rightBound];
};

// 验证示例 1
console.log(searchRange([5, 7, 7, 8, 8, 10], 8)); // [3, 4]

// 验证示例 2
console.log(searchRange([5, 7, 7, 8, 8, 10], 6)); // [-1, -1]

// 验证示例 3
console.log(searchRange([], 0)); // [-1, -1]

// 额外测试：目标在数组两端
console.log(searchRange([1, 2, 3, 4, 5], 1)); // [0, 0]
console.log(searchRange([1, 1, 1, 1, 1], 1)); // [0, 4]
```

- **时间复杂度：** O(log n)，两次二分查找
- **空间复杂度：** O(1)，仅使用常数额外空间

## 补充

**进阶思考：** 如果数组中存在大量重复元素，上述解法依然高效。核心在于二分查找过程中，找到目标值后不立即返回，而是继续向一侧收缩边界。

**相关题目：**
- [搜索旋转排序数组](./search-in-rotated-sorted-array.md) — 在旋转排序数组中二分查找
- [寻找峰值元素](./find-peak-element.md) — 二分查找的另一种变体
