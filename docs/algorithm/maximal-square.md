# 最大正方形（Maximal Square）

**难度：** Medium

## 题目描述

给你一个由 `0` 和 `1` 组成的二维矩阵 `matrix`。找出其中**只包含 `1` 的最大正方形**，并返回其面积。

### 约束条件

- `m == matrix.length`
- `n == matrix[i].length`
- `1 <= m, n <= 300`
- `matrix[i][j]` 是 `'0'` 或 `'1'`

## 示例

示例 1：

```
输入：matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
输出：4
解释：矩阵中最大的全 1 正方形边长为 2（如第 2、3 行的第 3、4 列），面积为 4。
```

示例 2：

```
输入：matrix = [["0","1"],["1","0"]]
输出：1
```

## 提示 / 解题思路

- 暴力法：枚举正方形的每个左上角和边长，检查整个正方形是否全为 1，时间 O(m · n · min(m,n))。可以过，但有更优解。
- 动态规划：设 `dp[i][j]` 表示以 `matrix[i-1][j-1]` 为**右下角**的全 1 正方形的最大边长：
  - 若 `matrix[i-1][j-1] === '0'`，`dp[i][j] = 0`；
  - 否则 `dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1`。
- 为什么取 min：一个以 (i,j) 为右下角的正方形要成立，上方、左方、左上方三个方向都不能「短板」，取三者最小值再 +1 才能扩展。
- 答案 = `max(dp[i][j])` 的平方。
- 技巧：dp 数组首行首列全 0 作为哨兵，可以不写越界判断。

## 解法

二维 DP：`dp[i][j]` 为以 (i,j) 为右下角的最大全 1 正方形边长，格子为 1 时 `dp[i][j] = min(上, 左, 左上) + 1`，答案取最大边长的平方。

```javascript
/**
 * @param {character[][]} matrix
 * @return {number}
 */
const maximalSquare = (matrix) => {
  const m = matrix.length
  const n = matrix[0].length
  // dp[i][j]：以 matrix[i-1][j-1] 为右下角的全 1 正方形最大边长；
  // 首行首列补 0 哨兵，免边界判断
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  let side = 0
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (matrix[i - 1][j - 1] === '1') {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
        side = Math.max(side, dp[i][j])
      }
    }
  }
  return side * side
}

// 验证
const matrix1 = [
  ['1', '0', '1', '0', '0'],
  ['1', '0', '1', '1', '1'],
  ['1', '1', '1', '1', '1'],
  ['1', '0', '0', '1', '0'],
]
console.log(maximalSquare(matrix1)) // 期望输出 4

console.log(maximalSquare([['0', '1'], ['1', '0']])) // 期望输出 1
```

- **时间复杂度：** O(m × n)
- **空间复杂度：** O(m × n)（可用一维 DP 优化到 O(n)）

## 补充

- 空间优化：`dp[i][j]` 只依赖上一行（上、左上）和同行（左），用一维数组加一个 `prev` 变量保存左上旧值即可把空间压到 O(n)。
- 相关题目：「85. 最大矩形（Maximal Rectangle）」需要每行高度数组 + 单调栈，是本题的矩形推广；「63. 不同路径 II（Minimum Path Sum）」同属二维 DP；题库内 [最大子数组和（Maximum Subarray）](./maximum-subarray.md) 是一维前驱 DP 的代表。
