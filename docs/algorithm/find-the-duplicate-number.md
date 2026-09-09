# 找出数组中的重复数字（Find the Duplicate Number）

**难度：** Medium

## 题目描述

给定一个包含 `n + 1` 个整数的数组 `nums`，其数字都在 `[1, n]` 范围内（包括 `1` 和 `n`），可知至少存在一个重复的整数。

假设 `nums` 只有一个重复的整数，返回这个重复的数。

你设计的解决方案必须不修改数组 `nums` 且只用常量级 `O(1)` 的额外空间。

### 约束条件

- `1 <= n <= 10^5`
- `nums.length == n + 1`
- `1 <= nums[i] <= n`
- `nums` 中只有一个整数出现两次或多次，其余整数均只出现一次。

## 示例

### 示例 1

```
输入：nums = [1, 3, 4, 2, 2]
输出：2
```

### 示例 2

```
输入：nums = [3, 1, 3, 4, 2]
输出：3
```

### 示例 3

```
输入：nums = [1, 1]
输出：1
```

### 示例 4

```
输入：nums = [1, 1, 2]
输出：1
```

## 提示 / 解题思路

### 方法一：Floyd 判圈算法（快慢指针）

把数组看成一个链表：下标 `i` 指向 `nums[i]`。由于存在重复数字，这个"链表"必然存在环，且环的入口就是重复数字。

以 `nums = [1, 3, 4, 2, 2]` 为例：
- 下标 0 → 值 1 → 下标 1 → 值 3 → 下标 3 → 值 2 → 下标 2 → 值 4 → 下标 4 → 值 2 → 下标 2 → …
- 从下标 2 开始形成环，入口是下标 2，对应值 `2` 就是重复数字。

算法分两步：
1. **找相遇点**：慢指针每次走一步（`slow = nums[slow]`），快指针每次走两步（`fast = nums[nums[fast]]`），直到相遇。
2. **找环入口**：将慢指针重置到起点，两指针每次都走一步，再次相遇的位置即为重复数字。

### 方法二：二分查找（值域二分）

在值域 `[1, n]` 上进行二分。对于中间值 `mid`，统计数组中小于等于 `mid` 的元素个数 `count`：
- 如果 `count > mid`，说明重复数字在 `[1, mid]` 区间（鸽巢原理）；
- 否则在 `[mid + 1, n]` 区间。

时间复杂度 O(n log n)，空间复杂度 O(1)。

## 解法

Floyd 判圈算法：将数组视为链表，快慢指针找环入口。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const findDuplicate = (nums) => {
  // 阶段 1：快慢指针找相遇点
  let slow = nums[0];
  let fast = nums[0];
  do {
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);

  // 阶段 2：找环入口（即重复数字）
  slow = nums[0];
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }

  return slow;
};

// 验证
console.log(findDuplicate([1, 3, 4, 2, 2])); // 2
console.log(findDuplicate([3, 1, 3, 4, 2])); // 3
console.log(findDuplicate([1, 1]));          // 1
console.log(findDuplicate([1, 1, 2]));       // 1
```

- **时间复杂度：** O(n)
- **空间复杂度：**** O(1)

## 补充

- 本题是 Floyd 判圈算法的经典应用，与「[环形链表 II](./palindrome-linked-list.md)」中环入口的查找思路一致。
- 进阶思考：如果数组中有多个重复数字（每个重复数字可能出现多次），如何找出所有重复数字？可参考「442. 数组中重复的数据」。
