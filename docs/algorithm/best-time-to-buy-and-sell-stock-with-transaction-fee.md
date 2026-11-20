# 买卖股票的最佳时机含手续费（Best Time to Buy and Sell Stock with Transaction Fee）

**难度：** Medium

## 题目描述

给定一个整数数组 `prices`，其中 `prices[i]` 表示股票在第 `i` 天的价格，以及一个整数 `fee` 表示每笔交易的手续费。

你可以完成任意笔交易，但每笔交易都需要支付手续费。请计算并返回你能够获得的最大利润。

- 你不能同时参与多笔交易（即你必须在再次买入之前卖出之前持有的股票）。
- 手续费在每笔完整的买卖（一买一卖）中只收取一次。

### 约束条件

- `1 <= prices.length <= 5 * 10^4`
- `1 <= prices[i] < 5 * 10^4`
- `0 <= fee < 5 * 10^4`

## 示例

```
输入：prices = [1, 3, 2, 8, 4, 9], fee = 2
输出：8
解释：最大利润由以下交易达成：
- 在 prices[0] = 1 处买入
- 在 prices[3] = 8 处卖出
- 在 prices[4] = 4 处买入
- 在 prices[5] = 9 处卖出
总利润为 ((8 - 1) - 2) + ((9 - 4) - 2) = 8。
```

```
输入：prices = [1, 3, 7, 5, 10, 3], fee = 3
输出：6
解释：最大利润由一次交易达成：在 prices[0] = 1 处买入，在 prices[4] = 10 处卖出，利润 = (10 - 1) - 3 = 6。
```

## 提示 / 解题思路

与「无手续费多笔交易」相比，手续费把每次卖出都打上了成本，贪心不再安全，适合用状态 DP。

把每一天结束时的状态压缩为两个（按是否持有股票划分）：

- `cash`：不持有股票时的最大利润（现金视角）。
- `hold`：持有股票时的最大净收益（因为买入是支出，通常为负值）。

**状态转移（手续费在卖出时扣）：**

- 卖出：`cash = max(cash, hold + p - fee)`
- 买入：`hold = max(hold, cash - p)`

**伪代码思路：**

```
cash = 0, hold = -Infinity
for p in prices:
    cash = max(cash, hold + p - fee)
    hold = max(hold, cash - p)
return cash
```

初值 `hold = -Infinity` 表示尚未买入；第一天自然转移为 `hold = -prices[0]`。两个状态在**同一次迭代内就地更新**是安全的：即便允许"同一天先卖后买"，其净效果等价于不交易（`fee >= 0` 时只会更差），不影响最优解。最终答案取 `cash`——最后一天仍持有股票一定不是最优。

## 解法

用 `cash`（不持有）与 `hold`（持有）两个状态变量逐日转移，卖出时扣手续费，一次线性扫描即可。

```javascript
/**
 * @param {number[]} prices - 各天的股票价格
 * @param {number} fee - 每笔交易的手续费
 * @return {number} 最大利润
 */
const maxProfit = (prices, fee) => {
  let cash = 0;         // 不持有股票时的最大利润
  let hold = -Infinity; // 持有股票时的最大净收益

  for (const p of prices) {
    // 右侧数组先整体求值（用旧值），再解构赋值，保证同一天内转移互不污染
    [cash, hold] = [
      Math.max(cash, hold + p - fee),
      Math.max(hold, cash - p),
    ];
  }

  return cash;
}

// 验证
console.log(maxProfit([1, 3, 2, 8, 4, 9], 2)) // 期望：8
console.log(maxProfit([1, 3, 7, 5, 10, 3], 3)) // 期望：6
```

- **时间复杂度：** O(n)，n 为 `prices.length`，一次线性扫描
- **空间复杂度：** O(1)，仅用两个状态变量

## 补充

- 手续费也可以**在买入时扣**（`hold = max(hold, cash - p - fee)`），转移方程不变、答案相同，只是状态含义略有差异。
- `fee = 0` 时退化为「买卖股票的最佳时机 II」（可任意多笔交易）；`fee` 极大时最优解只交易一次，退化为「买卖股票的最佳时机」。
- 相关题目：[买卖股票的最佳时机](./best-time-to-buy-and-sell-stock.md)、[买卖股票的最佳时机 II](./best-time-to-buy-and-sell-stock-ii.md)、[买卖股票的最佳时机含冷冻期](./best-time-to-buy-and-sell-stock-with-cooldown.md)、[买卖股票的最佳时机 IV](./best-time-to-buy-and-sell-stock-iv.md)。
