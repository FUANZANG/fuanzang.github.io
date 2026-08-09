# 最长回文子串（Longest Palindromic Substring）

**难度：** Medium

## 题目描述

给定一个字符串 `s`，请找到 `s` 中**最长的回文子串**并返回它。

> **回文串**：正着读和反着读都一样的字符串。例如 `"aba"`、`"abba"`、`"a"` 都是回文串。
> **子串**：字符串中连续的一段字符，不同于子序列（不要求连续）。

### 约束条件

- `1 <= s.length <= 1000`
- `s` 仅由数字和英文字母组成

## 示例

```
输入：s = "babad"
输出："bab"
解释："aba" 同样是有效的答案。
```

```
输入：s = "cbbd"
输出："bb"
```

## 提示 / 解题思路

回文串的核心特征是**对称**。以每一个字符（或每两个相邻字符之间的空隙）作为"中心"，向两侧扩展，直到两侧字符不相等为止。

1. 遍历字符串，对每个位置 `i`，尝试以 `i` 为中心扩展（处理奇数长度回文，如 `"aba"`）。
2. 同时尝试以 `i` 和 `i+1` 为中心扩展（处理偶数长度回文，如 `"abba"`）。
3. 记录每次扩展得到的最长回文子串的起始位置和长度。

**提示**：写一个辅助函数 `expandAroundCenter(left, right)`，它会返回以 `left` 和 `right` 为初始边界向外扩展后的回文长度。

## 解法

以每个位置（及相邻两位置）为中心向两侧扩展，记录能扩展出的最长回文长度与起始位置，奇数/偶数长度分别处理。

```javascript
/**
 * @param {string} s
 * @return {string}
 */
const longestPalindrome = (s) => {
  if (s.length < 2) return s
  let start = 0
  let maxLen = 1
  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      l--
      r++
    }
    const len = r - l - 1
    if (len > maxLen) {
      maxLen = len
      start = l + 1
    }
  }
  for (let i = 0; i < s.length; i++) {
    expand(i, i)
    expand(i, i + 1)
  }
  return s.slice(start, start + maxLen)
}

// 验证
console.log(longestPalindrome("babad")) // "bab" 或 "aba"
console.log(longestPalindrome("cbbd")) // "bb"
console.log(longestPalindrome("a")) // "a"
console.log(longestPalindrome("ac")) // "a" 或 "c"
```

- **时间复杂度：** O(n²)，每个中心扩展最坏 O(n)
- **空间复杂度：** O(1)，只用到常数变量
