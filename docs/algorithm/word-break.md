# 单词拆分（Word Break）

**难度：** Medium

## 题目描述

给你一个字符串 `s` 和一个字符串列表 `wordDict` 作为字典。请你判断是否可以利用字典中出现的单词拼接出 `s`。

**注意：** 不要求字典中出现的单词全部都使用，并且字典中的单词可以重复使用。

### 约束条件

- `1 <= s.length <= 300`
- `1 <= wordDict.length <= 1000`
- `1 <= wordDict[i].length <= 20`
- `s` 和 `wordDict[i]` 仅有小写英文字母组成
- `wordDict` 中的所有字符串互不相同

## 示例

### 示例 1

```
输入: s = "leetcode", wordDict = ["leet","code"]
输出: true
解释: 返回 true，因为 "leetcode" 可以由 "leet" 和 "code" 拼接成。
```

### 示例 2

```
输入: s = "applepenapple", wordDict = ["apple","pen"]
输出: true
解释: 返回 true，因为 "applepenapple" 可以由 "apple"、"pen"、"apple" 拼接成。
```

### 示例 3

```
输入: s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]
输出: false
解释: 无法用字典中的单词拼接出 "catsandog"。
```

## 提示 / 解题思路

这是一道经典的动态规划问题。

- 定义 `dp[i]` 表示字符串 `s` 的前 `i` 个字符（即 `s[0..i-1]`）是否可以拆分为字典中的单词。
- 初始化 `dp[0] = true`（空字符串可以被"拼接"）。
- 对于每个位置 `i`（从 1 到 `n`），我们需要检查所有可能的分割点 `j`（从 0 到 `i-1`）：
  - 如果 `dp[j] === true`（说明前缀 `s[0..j-1]` 可以拆分）
  - 且 `s[j..i-1]` 在字典中
  - 则 `dp[i] = true`
- 如果找到一个合法分割点就 `break`，避免不必要的内层循环。
- 将 `wordDict` 存入 `Set` 以实现 O(1) 的查找。

## 解法

动态规划 + Set 查找，逐位判断子串是否可由字典单词拼接而成。

```javascript
/**
 * @param {string} s
 * @param {string[]} wordDict
 * @return {boolean}
 */
const wordBreak = (s, wordDict) => {
  const wordSet = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.substring(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }

  return dp[n];
};

// 验证
console.log(wordBreak("leetcode", ["leet", "code"])); // true
console.log(wordBreak("applepenapple", ["apple", "pen"])); // true
console.log(wordBreak("catsandog", ["cats", "dog", "sand", "and", "cat"])); // false
```

- **时间复杂度：** O(n²)，其中 n 为字符串长度。双重循环，每次子串查找 O(1)（Set）。
- **空间复杂度：** O(n)，dp 数组大小；加上 Set 的 O(m) 空间。

## 补充

- 若需输出所有可能的拆分方案（而非仅判断可行性），可使用 DFS + 记忆化回溯（对应 LeetCode 140 题「单词拆分 II」）。
- 若字典规模极大，可用 Trie 树优化前缀匹配过程。
