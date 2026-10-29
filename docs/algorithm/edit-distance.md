# 编辑距离（Edit Distance）

**难度：** Medium

## 题目描述

给定两个单词 `word1` 和 `word2`，返回将 `word1` 转换成 `word2` 所使用的最少操作数。

你可以对单词进行如下三种操作：

- 插入一个字符
- 删除一个字符
- 替换一个字符

### 约束条件

- `0 <= word1.length <= 500`
- `0 <= word2.length <= 500`
- `word1` 和 `word2` 由小写英文字母组成

## 示例

示例 1：

```
输入：word1 = "horse", word2 = "ros"
输出：3
解释：
horse -> rorse （将 'h' 替换为 'r'）
rorse -> rose （删除 'r'）
rose -> ros （删除 'e'）
```

示例 2：

```
输入：word1 = "intention", word2 = "execution"
输出：5
解释：
intention -> entention （将 'i' 替换为 'e'）
entention -> extention （将 'n' 替换为 'x'）
extention -> exeention （将 't' 替换为 'e'）
exeention -> execntion （将 'e' 替换为 'c'）
execntion -> execution （将 'n' 替换为 'u'）
```

## 提示 / 解题思路

- 这是经典的二维动态规划问题。设 `dp[i][j]` 为将 `word1` 的前 `i` 个字符转换成 `word2` 的前 `j` 个字符所需的最少操作数。
- 状态转移：
  - 若 `word1[i-1] === word2[j-1]`，则 `dp[i][j] = dp[i-1][j-1]`（两个字符相同，当前字符无需操作）；
  - 否则 `dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`，分别对应「删除 word1 的字符」「插入 word2 的字符」「替换」三种操作。
- 边界条件：`dp[i][0] = i`（word1 的前 i 个字符全部删掉），`dp[0][j] = j`（向空串插入 j 个字符）。
- 答案即 `dp[m][n]`，其中 `m = word1.length`、`n = word2.length`。

## 解法

二维 DP 逐字符推导：两个字符相同则继承左上角状态，不同则在「删除 / 插入 / 替换」三种操作里取最小代价加一。

```javascript
/**
 * @param {string} word1
 * @param {string} word2
 * @return {number}
 */
const minDistance = (word1, word2) => {
  const m = word1.length;
  const n = word2.length;
  // dp[i][j]：word1 前 i 个字符 -> word2 前 j 个字符 的最少操作数
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
};

// 验证
console.log(minDistance("horse", "ros")) // 期望 3
console.log(minDistance("intention", "execution")) // 期望 5
```

- **时间复杂度：** O(m × n)
- **空间复杂度：** O(m × n)

## 补充

空间优化：`dp[i-1][*]` 只依赖上一行，用两行滚动（上一行 + 当前行）即可把空间降到 O(1 × min(m, n))，更短的一串作为列可进一步压缩：

```javascript
/**
 * @param {string} word1
 * @param {string} word2
 * @return {number}
 */
const minDistanceRolling = (word1, word2) => {
  // 让较短的串作为列，压缩空间
  if (word1.length < word2.length) [word1, word2] = [word2, word1];
  const m = word1.length;
  const n = word2.length;
  let prev = new Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = word1[i - 1] === word2[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
};

// 验证
console.log(minDistanceRolling("horse", "ros")) // 期望 3
console.log(minDistanceRolling("intention", "execution")) // 期望 5
```

相关题目：[最长公共子序列](./longest-common-subsequence.md)（同为二维 DP，但相同字符时不产生代价）、[单词拆分](./word-break.md)（一维 DP 经典）。
