# 反转字符串中的单词（Reverse Words in a String）

**难度：** Medium

## 题目描述

给你一个字符串 `s`，请你反转字符串中 **单词** 的顺序。

- 单词是由非空格字符组成的字符串。`s` 中至少存在一个单词，单词之间使用至少一个空格分隔。
- 输入字符串 `s` 中可能会存在**前导空格、尾随空格或者单词间的多个空格**。返回的结果字符串中，单词间应当仅用**单个空格**分隔，且**不包含任何额外的空格**。

### 约束条件

- `1 <= s.length <= 10^4`
- `s` 包含英文大小写字母、数字和空格 `' '`
- `s` 中至少存在一个单词

## 示例

**示例 1：**

```
输入: s = "the sky is blue"
输出: "blue is sky the"
```

**示例 2：**

```
输入: s = "  hello world  "
输出: "world hello"
解释: 反转后的字符串不能存在前导空格和尾随空格。
```

**示例 3：**

```
输入: s = "a good   example"
输出: "example good a"
解释: 如果两个单词间有多余的空格，反转后将单词间的空格减少到仅有一个。
```

## 提示 / 解题思路

1. **先想最朴素的方案**：把字符串按空格拆成单词数组，反转数组，再用单个空格拼回来。难点在于"多余空格"——前导、尾随以及单词间的多个空格，拆出来会有空字符串。
2. **拆分技巧**：`trim()` 去掉前导和尾随空格后，用正则 `/\s+/` 把连续多个空格当作一个分隔符拆分，得到干净的单词数组；或者 `split(' ')` 后用 `filter` 丢掉空串。
3. **拼接技巧**：反转后用 `join(' ')` 连接，天然保证单词间只有一个空格。
4. **进阶思考**：如果要求 O(1) 额外空间的原地解法（字符串可变的数据类型，如 C 的 char 数组），可以「整体反转 → 逐个单词反转」：先反转整个字符串（前导空格变尾随、单词顺序颠倒），再扫描并反转每个单词内部的字符，最后压缩多余空格。JavaScript 的字符串是不可变的，本题用拆分数组（O(n) 空间）即可。

## 解法

先 `trim` 去掉首尾空格，再用 `/\s+/` 正则按「一个或多个空格」拆分成单词数组，反转后用单个空格 `join` 回来。

```javascript
/**
 * @param {string} s
 * @return {string}
 */
const reverseWords = (s) => {
  const words = s.trim().split(/\s+/)
  words.reverse()
  return words.join(' ')
}

// 验证
console.log(reverseWords("the sky is blue")) // "blue is sky the"
console.log(reverseWords("  hello world  ")) // "world hello"
console.log(reverseWords("a good   example")) // "example good a"
console.log(reverseWords("a")) // "a"
```

- **时间复杂度：** O(n)，n 为字符串长度（trim、split、reverse、join 各扫描一次）。
- **空间复杂度：** O(n)，保存拆分出的单词数组。

## 补充

- 变形题「557. 反转字符串中的单词 III（Reverse Words in a String III）」：保持单词顺序不变，只反转每个单词内部的字符。
- 进阶：可变字符数组语言（C/C++/Rust）下的 O(1) 空间原地解法——「整体反转 + 逐词反转 + 压缩空格」，即整体 `reverse` 后，前导空格恰好被甩到末尾，扫描时逐个反转单词并合并连续空格。
- 相关题：344. 反转字符串（Reverse String，整体反转的基础操作）。
