# 买卖股票的最佳时机 IV（Best Time to Buy and Sell Stock IV）

**难度：** Hard

## 题目描述

给你一个整数数组 `prices` 和一个整数 `k`，其中 `prices[i]` 是某只股票在第 `i` 天的价格。

设计一个算法来计算你所能获取的最大利润。你最多可以完成 `k` 笔交易。

**注意：** 你不能同时参与多笔交易（即再次购买之前，必须先卖出当前持有的股票）。

### 约束条件

- `1 <= k <= 100`
- `1 <= prices.length <= 1000`
- `0 <= prices[i] <= 1000`

## 示例

### 示例 1

```
输入：k = 2, prices = [2,4,1]
输出：2
解释：在第 1 天（股票价格 = 2）买入，在第 2 天（股票价格 = 4）卖出，利润 = 4 - 2 = 2 。
```

### 示例 2

```
输入：k = 2, prices = [3,2,6,5,0,3]
输出：7
解释：在第 2 天（股票价格 = 2）买入，在第 3 天（股票价格 = 6）卖出，利润 = 6 - 2 = 4 。
     随后在第 5 天（股票价格 = 0）买入，在第 6 天（股票价格 = 3）卖出，利润 = 3 - 0 = 3 。
```

## 提示 / 解题思路

- 思路：状态 DP。一笔交易 = 一次买入 + 一次卖出，状态由「已完成的交易次数」与「是否持仓」共同决定。
- 一维数组压缩状态：设 `dp[2*j - 1]` 为完成第 `j` 次**买入**后（持仓）的最大现金，`dp[2*j]` 为完成第 `j` 次**卖出**后（空仓）的最大现金。未买入的持仓态初始为 `-Infinity`（不可能态）。
- 逐天转移（设当天价格为 `p`）：
  - 买入：`dp[2*j - 1] = max(dp[2*j - 1], dp[2*j - 2] - p)`
  - 卖出：`dp[2*j] = max(dp[2*j], dp[2*j - 1] + p)`
- 剪枝：每笔交易至少占用 2 天，因此当 `k >= n / 2` 时，交易次数实际不受限制，问题退化为「买卖股票的最佳时机 II」——贪心累加所有上涨区间的差价，O(n) 即可。

## 解法

状态 DP 压成一条 `dp[2*j ± 1]` 一维数组逐天转移；`k >= n/2` 时走贪心快速路径（等价于不限次数）。

```javascript
/**
 * @param {number} k
 * @param {number[]} prices
 * @return {number}
 */
const maxProfit = (k, prices) => {
  const n = prices.length;
  if (n < 2 || k === 0) return 0;

  // k >= n/2 时交易次数实际不受限，退化为「买卖股票的最佳时机 II」：贪心累加上涨区间
  if (k >= n / 2) {
    let profit = 0;
    for (let i = 1; i < n; i++) {
      if (prices[i] > prices[i - 1]) {
        profit += prices[i] - prices[i - 1];
      }
    }
    return profit;
  }

  // dp[2*j - 1]：完成第 j 次买入后（持仓）的最大现金
  // dp[2*j]    ：完成第 j 次卖出后（空仓）的最大现金
  const dp = new Array(2 * k + 1).fill(0);
  for (let j = 1; j <= k; j++) {
    dp[2 * j - 1] = -Infinity; // 尚未完成第 j 次买入前是「不可能」状态
  }

  for (let i = 0; i < n; i++) {
    for (let j = 1; j <= k; j++) {
      dp[2 * j - 1] = Math.max(dp[2 * j - 1], dp[2 * j - 2] - prices[i]);
      dp[2 * j] = Math.max(dp[2 * j], dp[2 * j - 1] + prices[i]);
    }
  }

  return dp[2 * k];
};

// 验证
console.log(maxProfit(2, [2, 4, 1])); // 2
console.log(maxProfit(2, [3, 2, 6, 5, 0, 3])); // 7
```

- **时间复杂度：** O(k · n)（`k >= n/2` 时 O(n)）
- **空间复杂度：** O(k)

## 补充

- 相关题目：
  - [买卖股票的最佳时机（Best Time to Buy and Sell Stock）](./best-time-to-buy-and-sell-stock.md)：k = 1 的特例，一遍扫描维护历史最低价。
  - [买卖股票的最佳时机 II（Best Time to Buy and Sell Stock II）](./best-time-to-buy-and-sell-stock-ii.md)：k 无限制，贪心累加上涨区间，本题剪枝分支即此思路。
  - [买卖股票的最佳时机含冷却期（Best Time to Buy and Sell Stock with Cooldown）](./best-time-to-buy-and-sell-stock-with-cooldown.md)：卖出后需冷冻一天，思路相近的状态机 DP。
- 进阶：若 k 的上限提高到 10⁹，本题的贪心快速分支正好兜住「k 很大」的场景；k 为 O(log n) 量级时还可以用分治（最大子数组和思想）把 O(k·n) 优化到 O(n log n)，常规约束下本解法已足够。
