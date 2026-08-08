# 乘积最大子数组（Maximum Product Subarray）

**难度：** Medium

## 题目描述

给你一个整数数组 `nums`，请你找出数组中**乘积最大**的**非空连续子数组**，并返回该子数组的最大乘积。

测试用例保证答案是一个 32 位整数。

**约束条件：**
- `1 <= nums.length <= 2 * 10^5`
- `-10 <= nums[i] <= 10`
- 数组中可能包含正数、负数和零

## 示例

**示例 1：**

```
输入：nums = [1, -3, 4, -2, 5]
输出：40
解释：连续子数组 [4, -2, 5] 的乘积为 4 × (-2) × 5 = 40，是所有连续子数组中乘积最大的。
```

**示例 2：**

```
输入：nums = [-2, 0, -1]
输出：0
解释：数组包含 0，而子数组 [-2] 和 [-1] 的乘积分别为 2 和 1，
但整个数组中乘积最大的连续子数组是 [0]（乘积为 0）或 [-2, 0]（乘积为 0）。
注意：虽然 [-2, -1] 不连续（中间有 0 隔开），所以不能选。
实际上，最大乘积为 0（子数组 [0]）。
```

**示例 3：**

```
输入：nums = [2, 3, -2, 4]
输出：6
解释：连续子数组 [2, 3] 的乘积为 6，是所有连续子数组中乘积最大的。
```

## 提示 / 解题思路

> ⚠️ 以下提示帮助你思考方向，**不包含完整代码**，请尝试自己实现！

如果你做过"最大子数组和"（Kadane 算法），第一反应可能是类似地维护一个 `maxProduct`。但这里有一个关键区别：**负数乘以负数会变成正数**。

这意味着，当前元素是负数时，之前记录的"最小乘积"（可能是一个很小的负数）反而可能变成最大的乘积！

在遍历数组时，对于每个位置 `i`，你需要同时记录：
- 以 `nums[i]` 结尾的连续子数组的**最大乘积** `maxProd`
- 以 `nums[i]` 结尾的连续子数组的**最小乘积** `minProd`

当 `nums[i]` 为负数时，交换 `maxProd` 和 `minProd`（因为负数会让大的变小、小的变大）。

对于每个元素 `nums[i]`：
- 新的 `maxProd = max(nums[i], maxProd * nums[i], minProd * nums[i])`
- 新的 `minProd = min(nums[i], maxProd * nums[i], minProd * nums[i])`
- 用全局变量记录遍历过程中出现的最大 `maxProd`

- 数组只有一个元素时，直接返回该元素。
- 数组中有 `0` 时，`0` 会将数组"切断"——以 `0` 结尾的子数组乘积为 `0`，下一段要从 `0` 之后重新开始。上面的状态转移公式天然能处理这种情况（因为 `max(0, ...) = 0` 或正数）。

## 解法

维护以当前元素结尾的「最大乘积」与「最小乘积」两个状态，遇到负数时交换二者（负负得正），滚动更新并取全局最大值即可。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const maxProduct = (nums) => {
  let maxSoFar = nums[0]
  let minSoFar = nums[0]
  let result = nums[0]
  for (let i = 1; i < nums.length; i++) {
    const n = nums[i]
    const tempMax = Math.max(n, n * maxSoFar, n * minSoFar)
    minSoFar = Math.min(n, n * maxSoFar, n * minSoFar)
    maxSoFar = tempMax
    result = Math.max(result, maxSoFar)
  }
  return result
}

// 验证
console.log(maxProduct([2, 3, -2, 4])) // 6
console.log(maxProduct([-2, 0, -1])) // 0
console.log(maxProduct([-2, 3, -4])) // 24
```
