# 搜索旋转排序数组（Search in Rotated Sorted Array）

**难度：** Medium

## 题目描述

整数数组 `nums` 按升序排列，数组中的值 **互不相同**。在传递给函数之前，`nums` 可能在某个下标 `k`（`0 <= k < nums.length`）上进行了旋转，使数组变为 `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]`（下标从 0 开始计数）。例如，`[0,1,2,4,5,6,7]` 在下标 `3` 处旋转后变为 `[4,5,6,7,0,1,2]`。

给定旋转后的数组 `nums` 和一个整数 `target`，如果 `nums` 中存在这个目标值，则返回它的下标，否则返回 `-1`。

你必须设计一个时间复杂度为 `O(log n)` 的算法解决此问题。

### 约束条件

- `1 <= nums.length <= 5000`
- `-10^4 <= nums[i] <= 10^4`
- `nums` 中的每个值都 **互不相同**
- `nums` 肯定会在某个下标上旋转
- `-10^4 <= target <= 10^4`

## 示例

```text
示例 1：
输入：nums = [4,5,6,7,0,1,2], target = 0
输出：4

示例 2：
输入：nums = [4,5,6,7,0,1,2], target = 3
输出：-1

示例 3：
输入：nums = [1], target = 0
输出：-1
```

## 提示 / 解题思路

虽然数组整体不是有序的，但**旋转点把数组分成左右两段，每一段各自有序**。关键性质是：在任意区间 `[left, right]` 内，**至少有一半**（左半 `[left, mid]` 或右半 `[mid, right]`）是严格有序的。

利用这一点做二分查找：

1. 取中点 `mid`，如果 `nums[mid] === target` 直接返回。
2. 判断哪一半有序：
   - 若 `nums[left] <= nums[mid]`，说明左半 `[left, mid]` 有序。
     - 若 `target` 落在 `[nums[left], nums[mid])` 区间内，则目标在左半，收缩右边界；否则在右半。
   - 否则右半 `[mid, right]` 有序。
     - 若 `target` 落在 `(nums[mid], nums[right]]` 区间内，则在右半，收缩左边界；否则在左半。
3. 循环直到找到或区间为空。

注意边界比较用 `nums[left] <= nums[mid]`（含等号）处理长度为 2 等小区间；区间判断用闭区间 `nums[left] <= target && target < nums[mid]` / `nums[mid] < target && target <= nums[right]`，与「有序半段」的端点对应。

## 解法

一句话思路：旋转数组每段局部有序，二分时先判断哪一半有序，再判断 target 是否落在该有序半段内以收缩区间，从而把搜索空间每次减半。

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
const search = (nums, target) => {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      return mid;
    }

    // 左半段 [left, mid] 是有序的
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半段 [mid, right] 是有序的
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  return -1;
}

// 验证
console.log(search([4, 5, 6, 7, 0, 1, 2], 0)); // 4
console.log(search([4, 5, 6, 7, 0, 1, 2], 3)); // -1
console.log(search([1], 0)); // -1
```

- **时间复杂度：** O(log n)（每次循环区间减半）
- **空间复杂度：** O(1)（只用到常数个指针变量）
