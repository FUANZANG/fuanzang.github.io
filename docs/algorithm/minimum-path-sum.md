# 最小路径和（Minimum Path Sum）

**难度：** Medium

## 题目描述

给定一个包含非负整数的 `m x n` 网格 `grid`，找一条从左上角移动到右下角的路径，使路径上的数字总和最小。

**注意：** 每次只能向下或者向右移动一步。

### 约束条件

- `m == grid.length`
- `n == grid[i].length`
- `1 <= m, n <= 200`
- `0 <= grid[i][j] <= 10^9`

## 示例

示例 1：

```text
输入：grid = [[1,3,1],[1,5,1],[4,2,1]]
输出：7
解释：通过路径 1 → 3 → 1 → 1 → 1 的总和最小。
```

示例 2：

```text
输入：grid = [[1,2,3],[4,5,6]]
输出：12
解释：通过路径 1 → 2 → 3 → 6 的总和最小。
```

## 提示 / 解题思路

- 典型的二维 DP：到达格子 `(i, j)` 只有两种方式——从上方 `(i-1, j)` 或从左侧 `(i, j-1)` 进入。
- 状态转移：`dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`。
- 边界初始化：第一行只能从左往右走，第一列只能从上往下走，均为前缀累加。
- 因为每个格子只依赖「上一行」与「左边一格」，可以进一步压缩成一维滚动数组，空间 O(n)。

## 解法

二维 DP：`dp[i][j]` 等于当前格值加上其上方、左方两个邻格最小路径和的最小值；首行、首列用前缀和初始化。

```javascript
/**
 * @param {number[][]} grid
 * @return {number}
 */
const minPathSum = (grid) => {
  const m = grid.length;
  const n = grid[0].length;

  // dp[i][j]：从左上角到 (i, j) 的最小路径和
  const dp = Array.from({ length: m }, () => new Array(n).fill(0));
  dp[0][0] = grid[0][0];

  // 首行：只能从左来；首列：只能从上来
  for (let j = 1; j < n; j++) dp[0][j] = dp[0][j - 1] + grid[0][j];
  for (let i = 1; i < m; i++) dp[i][0] = dp[i - 1][0] + grid[i][0];

  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = grid[i][j] + Math.min(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[m - 1][n - 1];
};

// 验证
console.log(minPathSum([[1, 3, 1], [1, 5, 1], [4, 2, 1]])); // 7
console.log(minPathSum([[1, 2, 3], [4, 5, 6]])); // 12
```

- **时间复杂度：** O(m × n)
- **空间复杂度：** O(m × n)（dp 表；若直接原地修改 grid 则为 O(1) 额外空间）

## 补充

### 空间优化：一维滚动 DP

逐行更新时，更新前的 `dp[j]` 就是「上一行」的值，更新后的 `dp[j-1]` 就是「本行左侧」的值，一行滚动数组足够。

```javascript
/**
 * @param {number[][]} grid
 * @return {number}
 */
const minPathSum1D = (grid) => {
  const m = grid.length;
  const n = grid[0].length;
  const dp = new Array(n).fill(0);

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (i === 0 && j === 0) dp[j] = grid[0][0];
      else if (i === 0) dp[j] = dp[j - 1] + grid[0][j];
      else if (j === 0) dp[j] = dp[j] + grid[i][0];
      else dp[j] = grid[i][j] + Math.min(dp[j], dp[j - 1]);
    }
  }

  return dp[n - 1];
};

// 验证
console.log(minPathSum1D([[1, 3, 1], [1, 5, 1], [4, 2, 1]])); // 7
console.log(minPathSum1D([[1, 2, 3], [4, 5, 6]])); // 12
```

- **时间复杂度：** O(m × n)
- **空间复杂度：** O(n)

### 相关题目

- [不同路径](./unique-paths.md)：无权路径计数；本题即其带权（路径和最小）变体。
- [零钱兑换](./coin-change.md)：一维 DP（完全背包）与本题滚动数组的形态类似，可对照理解状态转移。
