# 分糖果（Candy）

**难度：** Hard

## 题目描述

老师想给孩子们分发糖果，有 n 个孩子站成了一条直线。老师会根据每个孩子的表现，预先给他们评分，评分保存在整数数组 `ratings` 中。

你需要按照以下要求，帮助老师给这些孩子分发糖果：

- 每个孩子至少分配到 1 个糖果。
- 评分更高的孩子必须比他两侧的邻位孩子获得更多的糖果。

请返回老师至少需要准备多少颗糖果。

### 约束条件

- `1 <= ratings.length <= 2 * 10^4`
- `0 <= ratings[i] <= 2 * 31 - 1`（即 `2^31 - 1`）

## 示例

**示例 1：**

```
输入：ratings = [1, 0, 2]
输出：5
解释：按 2、1、2 的方案分给第 1、2、3 个孩子，即 [2, 1, 2]，共 5 颗。
```

**示例 2：**

```
输入：ratings = [1, 2, 2]
输出：4
解释：按 1、2、1 的方案分给第 1、2、3 个孩子，即 [1, 2, 1]，共 4 颗。
     注意：相邻两个孩子评分相同时，糖果数不必不同。
```

## 提示 / 解题思路

- 相邻两个孩子评分不同时，评分高的一方糖果数必须**严格**大于评分低的一方；评分相同时没有额外约束。
- 关键观察：对每个孩子 `i`，其糖果数要同时满足两个方向——
  - 若 `ratings[i] > ratings[i-1]`，则 `candies[i] > candies[i-1]`（左侧递增链）；
  - 若 `ratings[i] > ratings[i+1]`，则 `candies[i] > candies[i+1]`（右侧递减链）。
- 只从左往右扫会漏掉「比右邻高」的需求，只从右往左扫会漏掉「比左邻高」的需求。因此做**两次贪心扫描**：
  1. 左→右：初始每个孩子 1 颗；遇到 `ratings[i] > ratings[i-1]` 时，令 `candies[i] = candies[i-1] + 1`。
  2. 右→左：遇到 `ratings[i] > ratings[i+1]` 时，令 `candies[i] = max(candies[i], candies[i+1] + 1)`。
- 两个方向取最大值后求和即为最小总数。

## 解法

两次贪心遍历：先保证比左邻评分高的孩子多一颗，再保证比右邻评分高的孩子多一颗，对每个孩子取两个方向需求的最大值，最后求和。

```javascript
/**
 * @param {number[]} ratings
 * @return {number}
 */
const candy = (ratings) => {
  const n = ratings.length
  const candies = new Array(n).fill(1)
  // 从左到右：右邻评分更高则多一颗
  for (let i = 1; i < n; i++) {
    if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1
  }
  // 从右到左：左邻评分更高则与右需求取较大值
  for (let i = n - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1)
  }
  return candies.reduce((sum, c) => sum + c, 0)
}

// 验证
console.log(candy([1, 0, 2])) // 5
console.log(candy([1, 2, 2])) // 4
```

- **时间复杂度：** O(n)，两次线性扫描 + 一次求和。
- **空间复杂度：** O(n)，需要一个长度 n 的糖果数组（不计输入）。

## 补充

本题是「两次扫描贪心」的代表题：难点在于同时满足左右两侧邻居的约束——只从左往右扫会漏掉「比右邻高」的需求，必须再补一次从右往左的扫描并用 `max` 合并，才能把每个孩子压到满足两侧约束的最小值。

同属双指针 / 贪心的经典题：[盛最多水的容器](./container-with-most-water.md)、[加油站](./gas-station.md)。
