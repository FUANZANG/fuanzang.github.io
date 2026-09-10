# 缺失的第一个正数（First Missing Positive）

**难度：** Hard

## 题目描述

给你一个未排序的整数数组 `nums`，请你找出其中没有出现的最小正整数。

要求时间复杂度为 O(n)，并且只使用常数级别的额外空间。

### 约束条件

- 1 <= nums.length <= 10^5
- -2^31 <= nums[i] <= 2^31 - 1

## 示例

**示例 1：**

```
输入: nums = [1,2,0]
输出: 3
解释: 数组中包含 1 和 2，但 3 缺失，因此答案为 3。
```

**示例 2：**

```
输入: nums = [3,4,-1,1]
输出: 2
解释: 数组中包含 1，但 2 缺失，因此答案为 2。
```

**示例 3：**

```
输入: nums = [7,8,9,11,12]
输出: 1
解释: 所有正整数从 1 开始都缺失，最小的是 1。
```

## 提示 / 解题思路

1. **答案的范围**：对于一个长度为 n 的数组，答案一定在 `[1, n+1]` 之间。因为如果 `1~n` 都出现，答案就是 `n+1`。
2. **原地哈希**：利用数组本身作为哈希表，把每个在 `[1, n]` 范围内的数放到它「该在的位置」（即 `nums[i]` 放到下标 `nums[i] - 1` 处）。
3. **循环置换**：对每个位置 `i`，当 `nums[i]` 在 `[1, n]` 范围内且不在正确位置时，将其与 `nums[nums[i] - 1]` 交换。
4. **查找答案**：置换完成后，第一个满足 `nums[i] !== i + 1` 的位置就是答案 `i + 1`；如果都满足，答案为 `n + 1`。

## 解法

利用「下标作为哈希键」，通过循环置换将每个数归位，再遍历找第一个不匹配的下标。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const firstMissingPositive = (nums) => {
  const n = nums.length;

  for (let i = 0; i < n; i++) {
    // 把 nums[i] 放到正确的位置 nums[i] - 1，前提是值在 [1, n] 且目标位置不是同一值（避免死循环）
    while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      const correctIdx = nums[i] - 1;
      [nums[i], nums[correctIdx]] = [nums[correctIdx], nums[i]];
    }
  }

  // 第一个 nums[i] !== i + 1 的下标即为答案
  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) {
      return i + 1;
    }
  }

  return n + 1;
};

// 验证
console.log(firstMissingPositive([1, 2, 0])); // 3
console.log(firstMissingPositive([3, 4, -1, 1])); // 2
console.log(firstMissingPositive([7, 8, 9, 11, 12])); // 1
console.log(firstMissingPositive([1, 2, 3, 4, 5])); // 6
```

- **时间复杂度：** O(n) —— 每个元素最多被交换一次就能到达正确位置。
- **空间复杂度：** O(1) —— 仅使用常数级额外变量，原地修改数组。

## 补充

- 核心技巧是「索引当作哈希表键」，在不需要额外空间的情况下完成去重与定位。
- 类似思路可见「数组中的重复元素」（Find the Duplicate Number）和「找出所有数组中消失的数字」（Find All Numbers Disappeared in an Array）。
