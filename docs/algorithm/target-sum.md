# 两数之和的变体 —— 目标和（Target Sum）

**难度：** Medium

## 题目描述

给你一个整数数组 `nums` 和一个整数 `target`。

你需要向数组中的每个整数前添加 `'+'` 或 `'-'`，然后串联起来构成一个表达式。例如，`nums = [2, 1]`，可以添加为 `"+2-1"` 或 `"-2+1"`。

返回可以通过上述方法构造的、运算结果等于 `target` 的不同表达式数目。

## 示例

**示例 1：**

```
输入：nums = [1, 1, 1, 1, 1], target = 3
输出：5
解释：
-1+1+1+1+1 = 3
+1-1+1+1+1 = 3
+1+1-1+1+1 = 3
+1+1+1-1+1 = 3
+1+1+1+1-1 = 3
共有 5 种方法让最终目标和为 3。
```

**示例 2：**

```
输入：nums = [1], target = 1
输出：1
解释：
只有一种方法：+1
```

## 提示 / 解题思路

定义 `dp[j]` 为：和为 `j` 的子集数目。

- **初始状态：** `dp[0] = 1`（什么都不选，和为 0，算一种方案）
- **状态转移：** 对于每个数字 `num`，从后往前更新：
  ```
  dp[j] = dp[j] + dp[j - num]   （当 j >= num 时）
  ```
  其中 `dp[j]` 表示不选当前数字的方案数，`dp[j - num]` 表示选当前数字的方案数。

- **最终答案：** `dp[P]`

## 解法

将「加减号分配」问题转换为子集和问题：设取正号之和为 P，则 P - N = target 且 P + N = sum，解得 P = (sum + target) / 2；问题等价于从数组中选出若干数使其和恰为 P，用 0-1 背包计数求解。

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
const findTargetSumWays = (nums, target) => {
  const sum = nums.reduce((a, b) => a + b, 0)
  // 转换为 0-1 背包：选若干数使其和恰为 P = (sum + target) / 2
  if ((sum + target) % 2 !== 0 || sum + target < 0) return 0
  const P = (sum + target) / 2
  const dp = new Array(P + 1).fill(0)
  dp[0] = 1 // 什么都不选，和为 0，算一种方案
  for (const num of nums) {
    for (let j = P; j >= num; j--) {
      dp[j] += dp[j - num]
    }
  }
  return dp[P]
}

// 验证
console.log(findTargetSumWays([1, 1, 1, 1, 1], 3)) // 5
console.log(findTargetSumWays([1], 1)) // 1
```

- **时间复杂度：** O(n × P)，n 为数组长度，P = (sum + target) / 2
- **空间复杂度：** O(P)
