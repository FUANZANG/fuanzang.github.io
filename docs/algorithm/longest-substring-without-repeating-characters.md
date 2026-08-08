# 最长无重复子串的长度

**难度：** Medium

## 题目描述

给定一个字符串 `s`，请找出其中**不含有重复字符**的**最长子串**的长度。

- 子串是字符串中连续的字符序列。
- 字符串长度范围：`0 <= s.length <= 5 * 10^4`
- 字符串由英文字母、数字、符号和空格组成。

## 示例

**示例 1：**

```
输入: s = "abcabcbb"
输出: 3
解释: 最长无重复字符的子串是 "abc"，长度为 3。
```

**示例 2：**

```
输入: s = "pwwkew"
输出: 3
解释: 最长无重复字符的子串是 "wke"，长度为 3。
      注意 "pwke" 是一个子序列，不是子串（不连续）。
```

## 提示 / 解题思路

1. **暴力解法**：枚举所有子串，逐一检查是否有重复字符 —— 时间复杂度较高（O(n³) 或 O(n²)），可以尝试优化。
2. **滑动窗口**：维护一个窗口 `[left, right]`，窗口内不允许有重复字符。当右指针遇到重复字符时，左指针应如何移动？
3. **数据结构辅助**：可以用 `Set` 或 `Map` 来快速判断字符是否已在当前窗口中出现过。用 `Map` 存储字符最近出现的位置，可以一次性跳过不必要的左指针移动。
4. **边界情况**：空字符串、全相同字符的字符串、所有字符都不相同的字符串，都要考虑到。

## 解法

用哈希表记录字符最近出现位置，右指针推进时若遇到窗口内重复字符，就把左指针跳到该字符上次位置的下一位，全程只需一次扫描。

```javascript
/**
 * @param {string} s
 * @return {number}
 */
const lengthOfLongestSubstring = (s) => {
  let left = 0
  let maxLen = 0
  const seen = {}
  for (let right = 0; right < s.length; right++) {
    const c = s[right]
    if (seen[c] !== undefined && seen[c] >= left) {
      left = seen[c] + 1
    }
    seen[c] = right
    maxLen = Math.max(maxLen, right - left + 1)
  }
  return maxLen
}

// 验证
console.log(lengthOfLongestSubstring("abcabcbb")) // 3
console.log(lengthOfLongestSubstring("bbbbb")) // 1
console.log(lengthOfLongestSubstring("pwwkew")) // 3
console.log(lengthOfLongestSubstring("")) // 0
```
