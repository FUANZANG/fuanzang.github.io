# 买卖股票的最佳时机 II（Best Time to Buy and Sell Stock II）

**难度：** Medium

## 题目描述

给你一个数组 `prices`，其中 `prices[i]` 表示股票在第 `i` 天的价格。

完成尽可能多的交易。但是你**同一时间只能持有一股**，即不能同时参与多笔交易（但你可以在同一天卖出并买入）。

**约束条件：**

- `1 <= prices.length <= 3 * 10^4`
- `0 <= prices[i] <= 10^4`

## 示例

```
输入：prices = [7, 1, 5, 3, 6, 4]
输出：7
解释：第 2 天买入（价格 1），第 3 天卖出（价格 5），利润 4。
     第 4 天买入（价格 3），第 5 天卖出（价格 6），利润 3。
     总利润 4 + 3 = 7。
```

```
输入：prices = [1, 2, 3, 4, 5]
输出：4
解释：第 1 天买入（价格 1），第 5 天卖出（价格 5），利润 4。
     不能在第 5 天买入后再卖出（已卖出）。
```

## 提示 / 解题思路

这是经典**贪心**问题。关键观察：

> 只要明天的价格比今天高，就可以**把今天的上涨部分**算入利润。

也就是说，遍历数组，只要 `prices[i] > prices[i-1]`，就把这段上涨（`prices[i] - prices[i-1]`）加到总利润里。这样就把"连续上涨段"切成了多个单日上行，等价于一次完整的买卖，但贪心更简洁。

**伪代码思路：**

```
profit = 0
for i = 1 to len(prices) - 1:
    if prices[i] > prices[i-1]:
        profit += prices[i] - prices[i-1]
return profit
```

## 解法

遍历数组，每次遇到价格上涨（`prices[i] > prices[i-1]`）就把这段上涨累入总利润，贪心地取所有单日上行部分。

```javascript
/**
 * @param {number[]} prices - 各天的股票价格
 * @return {number} 最大利润
 */
const maxProfit = (prices) => {
  let profit = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
  }
  return profit;
}

// 验证
console.log(maxProfit([7, 1, 5, 3, 6, 4])); // 期望：7
console.log(maxProfit([1, 2, 3, 4, 5]));     // 期望：4
console.log(maxProfit([7, 6, 4, 3, 1]));     // 期望：0
```

- **时间复杂度：** O(n)，只需一次线性扫描
- **空间复杂度：** O(1)，仅用固定几个变量

## 补充

本题是 LeetCode 121（[买卖股票的最佳时机](./best-time-to-buy-and-sell-stock.md)）的进阶：121 只允许一次交易，而 122 允许多次交易。

变形题「122. 买卖股票的最佳时机 II（含冷冻期）」：LeetCode 309. 买卖股票的最佳时机含冷却，需多状态 DP。
