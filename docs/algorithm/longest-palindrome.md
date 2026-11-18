# 最长回文串（Longest Palindrome）

**难度：** Easy

## 题目描述

给你一个由大小写字母组成的字符串 `s`。你可以使用这些字母构造一个回文串，返回由这些字母能构造的**最长回文串**的长度。

字母是**大小写敏感**的，例如 `"Aa"` 不被视为回文（`"A"` 与 `"a"` 是不同字符）。

### 约束条件

- `1 <= s.length <= 2000`
- `s` 仅由小写和/或大写英文字母组成

## 示例

### 示例 1

```
输入：s = "abccccdd"
输出：7
解释：可以构造的最长回文串之一是 "dccaccd"，长度为 7。
```

### 示例 2

```
输入：s = "a"
输出：1
解释：可以构造的最长回文串是 "a"，长度为 1。
```

### 示例 3

```
输入：s = "bb"
输出：2
```

## 提示 / 解题思路

回文串的结构是对称的：除了最中间最多放一个字符外，其余字符必须成对出现在两侧。因此：

- 一个回文串最多只允许**一个**字符出现奇数次（放在正中间），其余字符的出现次数都必须是偶数；
- 不需要真的去排列字母，只需要统计每个字符出现了多少次 `cnt`：
  - 每个字符贡献 `cnt // 2 * 2` 个字符（取尽可能多的成对部分）；
  - 如果所有成对部分加起来还短于原串，说明存在某个字符出现了奇数次，可以再取 1 个放在正中间；
- 等价地设 `odd` 为出现奇数次的字符种类数，答案为 `s.length - odd + 1`（`odd > 0` 时），`odd === 0` 时答案就是 `s.length`。

## 解法

统计字符频次，把所有出现次数折半成对累加；若存在奇数计数的字符，最多再留一个放中间。

```javascript
/**
 * @param {string} s
 * @return {number}
 */
const longestPalindrome = (s) => {
  const cnt = new Map();
  for (const ch of s) cnt.set(ch, (cnt.get(ch) ?? 0) + 1);
  let odd = 0;
  for (const v of cnt.values()) if (v % 2 === 1) odd++;
  return odd === 0 ? s.length : s.length - odd + 1;
};

// 验证
console.log(longestPalindrome("abccccdd")); // 7
console.log(longestPalindrome("a")); // 1
console.log(longestPalindrome("bb")); // 2
```

- **时间复杂度：** O(n)
- **空间复杂度：** O(n)

## 补充

- 进阶挑战：如果题目改成在原地找最长的回文**子串**（不能重排字母），就是 [最长回文子串](./longest-palindromic-substring.md)（LeetCode 5，Medium），常用中心扩展或 Manacher 算法。
- 本题也可用定长数组（大小写字母共 52 种）替代 Map，空间降为 O(1)。
