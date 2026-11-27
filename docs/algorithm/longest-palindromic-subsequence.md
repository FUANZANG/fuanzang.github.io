# 最长回文子序列（Longest Palindromic Subsequence）

**难度：** Medium

## 题目描述

给你一个字符串 `s`，找到 `s` 中**最长回文子序列**的长度。

> **子序列**：不改变剩余字符顺序的前提下，删除若干（也可以是零个）字符后得到的新字符串。子序列的字符**不要求连续**，区别于子串。

### 约束条件

- `1 <= s.length <= 1000`
- `s` 只包含小写英文字母

## 示例

```
输入：s = "bbbab"
输出：4
解释："bbbb" 是其中一个最长回文子序列。
```

```
输入：s = "cbbd"
输出：2
解释："bb" 是其中一个最长回文子序列。
```

## 提示 / 解题思路

- 子序列不要求字符连续，「中心扩展」不再直接适用，动态规划是自然选择。
- 定义 `dp[i][j]` 为子串 `s[i..j]` 内最长回文子序列的长度。
  - 若 `s[i] === s[j]`：这两个字符可以作为回文的两端，`dp[i][j] = dp[i + 1][j - 1] + 2`。当 `i + 1 > j - 1`（两端相邻）时，`dp[i + 1][j - 1]` 越界取 0，结果为 2。
  - 若 `s[i] !== s[j]`：至少有一个端点不在最长子序列里，`dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])`。
- 边界：`dp[i][i] = 1`（单个字符是长度为 1 的回文）。
- 填充顺序：按区间长度 `len` 从 2 到 `n` 升序，保证计算 `dp[i][j]` 时依赖的子区间都已算好。
- 答案即 `dp[0][n - 1]`。

## 解法

区间 DP：`dp[i][j]` 表示 `s[i..j]` 内最长回文子序列的长度，按区间长度升序填表；两端相等则 `dp[i + 1][j - 1] + 2`，否则取 `max(dp[i + 1][j], dp[i][j - 1])`。

```javascript
/**
 * @param {string} s
 * @return {number}
 */
const longestPalindromeSubseq = (s) => {
  const n = s.length
  // dp[i][j]：s[i..j] 内最长回文子序列的长度
  const dp = Array.from({ length: n }, () => Array(n).fill(0))

  // 边界：单个字符长度为 1
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1
  }

  // 按区间长度升序填表，保证子区间已计算
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1
      if (s[i] === s[j]) {
        // 两端相等，取子区间；i + 1 > j - 1 时越界，dp 仍为 0
        dp[i][j] = dp[i + 1][j - 1] + 2
      } else {
        // 两端不等，丢弃其中一端
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1])
      }
    }
  }

  return dp[0][n - 1]
}

// 验证
console.log(longestPalindromeSubseq("bbbab")) // 4
console.log(longestPalindromeSubseq("cbbd")) // 2
```

- **时间复杂度：** O(n²)，n = s.length
- **空间复杂度：** O(n²)，dp 表

## 补充

- 本题等价于「最长公共子序列」（LCS）：`s` 的最长回文子序列长度等于 `s` 与其反转串的最长公共子序列，可直接套用 LCS 的 DP 模板，参见 [最长公共子序列](./longest-common-subsequence.md)。
- 相关：[最长回文子串](./longest-palindromic-substring.md)（第 5 题，要求连续子串），注意子序列不要求字符连续。
- 进阶：滚动数组。`dp[i][j]` 只依赖 `dp[i + 1][j - 1]`、`dp[i + 1][j]`、`dp[i][j - 1]`，可将空间压缩到 O(n)。
