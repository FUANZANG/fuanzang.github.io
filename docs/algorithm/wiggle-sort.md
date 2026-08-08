# 数组波动排序（Wiggle Sort）

**难度：** Medium

## 题目描述

给定一个整数数组 `nums`，将其重新排列，使得满足以下条件：

```
nums[0] <= nums[1] >= nums[2] <= nums[3] >= nums[4] <= ...
```

也就是说，相邻元素交替呈现"小于等于"和"大于等于"的关系。

你需要**原地**完成这个操作（不使用额外的数组拷贝），并尽量将时间复杂度控制在 **O(n)**。

## 示例

**示例 1：**

```
输入：nums = [3, 5, 2, 1, 6, 4]
输出：[3, 5, 2, 6, 1, 4]   （或 [1, 6, 2, 5, 4, 3] 等任意合法排列）
解释：3<=5>=2<=6>=1<=4，满足条件
```

**示例 2：**

```
输入：nums = [1, 2, 3, 4, 5, 6, 7]
输出：[1, 7, 2, 6, 3, 5, 4]   （或其他合法排列）
解释：1<=7>=2<=6>=3<=5>=4，满足条件
```

## 提示 / 解题思路

1. **暴力思路**：先排序再两两交换，时间复杂度 O(n log n)，可以拿到部分分。
2. **贪心一次遍历**：核心观察是——如果当前相邻pair不满足要求，直接交换它们即可。例如当 i 是偶数时希望 `nums[i] <= nums[i+1]`，若实际 `nums[i] > nums[i+1]`，交换后自然满足。同理，i 是奇数时希望 `nums[i] >= nums[i+1]`。
3. 这个贪心策略只需要**一趟扫描**，每次只比较相邻两个元素，必要时交换，就能保证全局满足波动条件。
4. 尝试证明：为什么这种局部交换不会影响前面已经排好的 pair？

## 解法

一趟贪心扫描：下标 `i` 为偶数时要求 `nums[i] <= nums[i+1]`，为奇数时要求 `nums[i] >= nums[i+1]`，不满足则交换相邻两数。局部交换不会影响前面已满足的相邻关系。

```javascript
/**
 * @param {number[]} nums
 * @return {void} Do not return anything, modify nums in-place instead.
 */
const wiggleSort = (nums) => {
  for (let i = 0; i < nums.length - 1; i++) {
    if (i % 2 === 0) {
      if (nums[i] > nums[i + 1]) [nums[i], nums[i + 1]] = [nums[i + 1], nums[i]]
    } else {
      if (nums[i] < nums[i + 1]) [nums[i], nums[i + 1]] = [nums[i + 1], nums[i]]
    }
  }
}

// 验证（波动排序答案不唯一，校验是否满足摆动条件即可）
const isWiggle = (nums) => {
  for (let i = 0; i < nums.length - 1; i++) {
    if (i % 2 === 0) {
      if (!(nums[i] <= nums[i + 1])) return false
    } else {
      if (!(nums[i] >= nums[i + 1])) return false
    }
  }
  return true
}
let a = [3, 5, 2, 1, 6, 4]
wiggleSort(a)
console.log(isWiggle(a), a) // true [满足摆动]
let b = [1, 2, 3, 4, 5, 6, 7]
wiggleSort(b)
console.log(isWiggle(b), b) // true [满足摆动]
```

- **时间复杂度：** O(n)，仅一趟扫描。
- **空间复杂度：** O(1)，原地交换，只用常量级变量。
