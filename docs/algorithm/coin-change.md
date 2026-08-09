# 零钱兑换（Coin Change）

**难度：** Medium

## 题目描述

给定一组不同面额的硬币 `coins` 和一个总金额 `amount`，请计算凑成该总金额所需的 **最少硬币个数**。

- 每种硬币的数量是无限的。
- 如果没有任何一种硬币组合能组成总金额，返回 `-1`。

**函数签名：**

## 示例

**示例 1：**

```
输入：coins = [1, 5, 10, 25], amount = 30
输出：2
解释：25 + 5 = 30，共需要 2 枚硬币。
```

**示例 2：**

```
输入：coins = [2], amount = 3
输出：-1
解释：只有面额为 2 的硬币，无法凑出 3。
```

## 提示 / 解题思路

<details>
<summary>💡 点击查看提示</summary>

**核心思路：动态规划（Dynamic Programming）**

1. **定义状态：** 设 `dp[i]` 表示凑成金额 `i` 所需的最少硬币数。

2. **状态转移方程：** 对于每个金额 `i`，遍历所有硬币面额 `c`：
   - 如果 `i >= c`，则 `dp[i] = min(dp[i], dp[i - c] + 1)`
   - 含义：凑出金额 `i`，可以选择用一枚面额为 `c` 的硬币，加上凑出 `i - c` 所需的最少硬币数。

3. **初始条件：**
   - `dp[0] = 0`（金额为 0 时不需要硬币）
   - 其余 `dp[i]` 初始化为 `amount + 1`（一个不可能达到的大值，代表"无法凑出"）

4. **最终答案：** 如果 `dp[amount] > amount`，说明无法凑出，返回 `-1`；否则返回 `dp[amount]`。

**为什么是动态规划？**
- 问题具有 **最优子结构**：凑出金额 `i` 的最优解包含凑出金额 `i - c` 的最优解。
- 问题具有 **重叠子问题**：多个金额会依赖相同的子金额结果。

**复杂度参考：**
- 时间复杂度：O(amount × coins.length)
- 空间复杂度：O(amount)

</details>

## 解法

动态规划：`dp[i]` 表示凑出金额 `i` 的最少硬币数。对每个金额遍历硬币面额 `c`，若 `i ≥ c` 则 `dp[i] = min(dp[i], dp[i-c] + 1)`。初始化 `dp[0]=0`、其余为 `amount+1`，最终若 `dp[amount] > amount` 返回 -1。

```javascript
/**
 * @param {number[]} coins - 硬币面额数组
 * @param {number} amount - 目标总金额
 * @return {number} - 最少硬币数量，无法凑出则返回 -1
 */
const coinChange = (coins, amount) => {
  const dp = new Array(amount + 1).fill(amount + 1)
  dp[0] = 0
  for (let i = 1; i <= amount; i++) {
    for (const c of coins) {
      if (i - c >= 0) dp[i] = Math.min(dp[i], dp[i - c] + 1)
    }
  }
  return dp[amount] > amount ? -1 : dp[amount]
}

// 验证
console.log(coinChange([1, 5, 10, 25], 30)) // 期望输出: 2
console.log(coinChange([2], 3)) // 期望输出: -1
```

- **时间复杂度：** O(amount × coins.length)
- **空间复杂度：** O(amount)，dp 数组长度
