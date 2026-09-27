# 寻找两个正序数组的中位数（Median of Two Sorted Arrays）

**难度：** Hard

## 题目描述

给定两个大小分别为 `m` 和 `n` 的正序（从小到大）数组 `nums1` 和 `nums2`。请你找出并返回这两个正序数组的**中位数**。

算法的时间复杂度应该为 `O(log (m+n))`。

### 约束条件

- `nums1.length == m`
- `nums2.length == n`
- `0 <= m <= 1000`
- `0 <= n <= 1000`
- `1 <= m + n <= 2000`
- `-10^6 <= nums1[i], nums2[i] <= 10^6`

## 示例

```
输入：nums1 = [1,3], nums2 = [2]
输出：2.00000
解释：合并数组 = [1,2,3]，中位数是 2
```

```
输入：nums1 = [1,2], nums2 = [3,4]
输出：2.50000
解释：合并数组 = [1,2,3,4]，中位数是 (2 + 3) / 2 = 2.5
```

## 提示 / 解题思路

- 直接合并再取中位数是 O(m+n)，达不到 O(log(m+n)) 要求。
- 核心思想：在较短数组上二分搜索**分割线**位置 `i`，让左侧恰好有 `(m+n+1)/2` 个元素，`j = k - i` 由 `i` 唯一确定。
- 分割正确时，满足 `left1 <= right2 && left2 <= right1`（越界用 ±Infinity 处理）；奇数个直接取左侧最大元素，偶数个再平均右侧最小元素。
- 若 `left1 > right2`，分割线右端偏大，`hi = i - 1`；反之 `lo = i + 1`。
- 边界处理：先让 `nums1` 是较短的数组，保证 `i` 的搜索区间始终落在 `nums1` 内。

## 解法

在较短数组上二分搜索分割线位置，使左侧元素总数恰好为 `(m+n+1)/2`，满足左侧最大值 ≤ 右侧最小值时取中位数。

```javascript
/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
const findMedianSortedArrays = (nums1, nums2) => {
  if (nums1.length > nums2.length) {
    return findMedianSortedArrays(nums2, nums1);
  }
  const m = nums1.length;
  const n = nums2.length;
  let lo = 0;
  let hi = m;
  const k = Math.floor((m + n + 1) / 2);
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);
    const j = k - i;
    const left1 = i === 0 ? -Infinity : nums1[i - 1];
    const right1 = i === m ? Infinity : nums1[i];
    const left2 = j === 0 ? -Infinity : nums2[j - 1];
    const right2 = j === n ? Infinity : nums2[j];
    if (left1 <= right2 && left2 <= right1) {
      if ((m + n) % 2 === 1) {
        return Math.max(left1, left2);
      }
      return (Math.max(left1, left2) + Math.min(right1, right2)) / 2;
    } else if (left1 > right2) {
      hi = i - 1;
    } else {
      lo = i + 1;
    }
  }
  throw new Error('不应到达这里');
};

// 验证
console.log(findMedianSortedArrays([1, 3], [2])); // 2
console.log(findMedianSortedArrays([1, 2], [3, 4])); // 2.5
console.log(findMedianSortedArrays([], [1])); // 1
console.log(findMedianSortedArrays([2], [])); // 2
console.log(findMedianSortedArrays([0, 0], [0, 0])); // 0
console.log(findMedianSortedArrays([4, 5, 9, 14], [7, 11])); // 9
console.log(findMedianSortedArrays([1000000, 1000000, 1000000, 1000000], [1, 1, 1, 1, 1, 1, 1])); // 1
```

- **时间复杂度：** O(log(min(m, n)))
- **空间复杂度：** O(1)（递归深度 O(log(min(m,n)))）

## 补充

- 变形题「33. 搜索旋转排序数组」同属二分变体，已收录在 [search-in-rotated-sorted-array](./search-in-rotated-sorted-array.md)。
- 本题是面试高频 Hard 题，掌握"分割线法"后可迁移至多个二分类/二分解场景。
