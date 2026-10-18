# 买卖股票的最佳时机含冷冻期（Best Time to Buy and Sell Stock with Cooldown）

**难度：** Medium

## 题目描述

给定一个整数数组 `prices`，其中 `prices[i]` 表示股票在第 `i` 天的价格。

设计一个算法计算出最大利润。你可以尽可能地完成多次交易（多次买卖一支股票），但有以下限制：

- 卖出股票后，你无法在第二天买入股票（即冷冻期为 1 天）。
- 你不能同时参与多笔交易（你必须在再次买入前卖出之前的股票）。

### 约束条件

- `1 <= prices.length <= 5000`
- `0 <= prices[i] <= 1000`

## 示例

```
输入：prices = [1, 2, 3, 0, 2]
输出：3
解释：对应的交易状态为 [买入, 卖出, 冷冻期, 买入, 卖出]，利润 = (3-1) + (2-0) = 3。
```

```
输入：prices = [1]
输出：0
解释：只有一天的价格，无法完成一笔买入+卖出交易，利润为 0。
```

## 提示 / 解题思路

本题的关键在于冷冻期引入了「不能立即买入」的限制，因此需要把每天结束后的状态细分为三种：

- `hold`：当天结束时**持有**股票的最大利润。
- `rest`：当天结束时**不持有**股票且**不在冷冻期**的最大利润（可以自由买入）。
- `sold`：当天结束时**刚卖出**股票的最大利润（次日进入冷冻期）。

**状态转移：**

- `hold` = max(继续持有 `hold`，从 `rest` 买入 `rest - prices[i]`)
- `sold` = 从 `hold` 卖出 `hold + prices[i]`
- `rest` = max(继续休息 `rest`，从冷冻期恢复 `sold`)

**伪代码思路：**

```
hold = -prices[0], sold = 0, rest = 0
for i = 1 to n-1:
    prevHold = hold, prevSold = sold, prevRest = rest
    hold = max(prevHold, prevRest - prices[i])
    sold = prevHold + prices[i]
    rest = max(prevRest, prevSold)
return max(sold, rest)
```

初始时 `hold = -prices[0]` 表示第 0 天买入，其余为 0。由于冷冻期只有一天，`rest` 从上一日的 `sold` 恢复，因此 `hold` 的买入只能从 `rest` 转移过来，自然满足冷冻期约束。最终答案取 `sold` 和 `rest` 的最大值（最后一天不可能还持有股票获得最大利润）。

## 解法

用三个状态变量 `hold`、`sold`、`rest` 分别表示持有、刚卖出、休息的最大利润，按上述状态转移逐日更新即可。

```javascript
/**
 * @param {number[]} prices - 各天的股票价格
 * @return {number} 最大利润
 */
const maxProfit = (prices) => {
  if (prices.length === 0) return 0;

  let hold = -prices[0]; // 第 0 天买入
  let sold = 0;          // 第 0 天无法卖出
  let rest = 0;          // 第 0 天休息

  for (let i = 1; i < prices.length; i++) {
    const prevHold = hold;
    const prevSold = sold;
    const prevRest = rest;

    hold = Math.max(prevHold, prevRest - prices[i]);
    sold = prevHold + prices[i];
    rest = Math.max(prevRest, prevSold);
  }

  return Math.max(sold, rest);
};

// 验证
console.log(maxProfit([1, 2, 3, 0, 2])); // 期望：3
console.log(maxProfit([1]));             // 期望：0
console.log(maxProfit([2, 1, 4]));       // 期望：3（第 2 天买入，第 3 天卖出）
```

- **时间复杂度：** O(n)，一次线性扫描
- **空间复杂度：** O(1)，仅用三个状态变量

## 补充

本题与 [买卖股票的最佳时机 II](./best-time-to-buy-and-sell-stock-ii.md) 同为多交易 DP，区别在于卖出后多了一天冷冻期，因此需要三个状态而非简单的贪心。

变形题「714. 买卖股票的最佳时机含手续费」与 309 思路几乎相同，只需在卖出时减去手续费，但无冷冻期限制，可用两个状态解决。
