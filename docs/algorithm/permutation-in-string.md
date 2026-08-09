# 字符串的排列（Permutation in String）

**难度：** Medium

## 题目描述

给你两个字符串 `s1` 和 `s2`，写一个函数来判断 `s2` 是否包含 `s1` 的某个**排列**作为其子串。

换句话说，如果 `s1` 的某个排列是 `s2` 的子串，返回 `true`；否则返回 `false`。

**约束条件：**
- `1 <= s1.length, s2.length <= 10^4`
- `s1` 和 `s2` 仅包含小写英文字母

## 示例

**示例 1：**

```
输入：s1 = "ab", s2 = "eidbaooo"
输出：true
解释：s2 包含 s1 的排列之一 "ba"（位于索引 3-4）。
```

**示例 2：**

```
输入：s1 = "ab", s2 = "eidboaoo"
输出：false
解释：s2 中没有任何子串是 s1 的排列。
```

## 提示 / 解题思路

核心观察：`s1` 的排列虽然顺序不同，但**字符频率完全相同**。所以问题转化为：

> 在 `s2` 中是否存在一个长度等于 `s1.length` 的窗口，使得窗口内每个字符的出现次数与 `s1` 完全一致？

**步骤提示：**
1. 用一个长度为 26 的数组统计 `s1` 中每个字符的频率
2. 在 `s2` 上维护一个大小为 `s1.length` 的滑动窗口
3. 窗口每次右移时，加入新字符、移出旧字符，更新频率数组
4. 比较窗口频率与 `s1` 频率是否一致

不必每次都完整比较两个频率数组，可以维护一个 `matches` 计数器：
- 记录当前窗口中有多少个字符的频率与 `s1` 一致
- 当 `matches === 26` 时，说明找到了匹配

**进一步优化：**
- 用一个差值数组 `count`，其中 `count[i] = windowFreq[i] - s1Freq[i]`
- 只关注 `count` 中非零元素的个数

## 解法

维护一个长度为 26 的窗口频次数组和 `matches` 计数器（记录与 `s1` 频次一致的字符数）。窗口右移时更新进出字符的频次并同步 `matches`，当 `matches === 26` 即找到 `s1` 的排列。

```javascript
/**
 * @param {string} s1
 * @param {string} s2
 * @return {boolean}
 */
const checkInclusion = (s1, s2) => {
  const need = {}
  for (const c of s1) need[c] = (need[c] || 0) + 1
  const window = {}
  let have = 0
  let left = 0
  for (let right = 0; right < s2.length; right++) {
    const c = s2[right]
    window[c] = (window[c] || 0) + 1
    if (need[c] !== undefined && window[c] === need[c]) have++
    while (right - left + 1 > s1.length) {
      const lc = s2[left]
      if (need[lc] !== undefined && window[lc] === need[lc]) have--
      window[lc]--
      left++
    }
    if (right - left + 1 === s1.length && have === Object.keys(need).length) {
      return true
    }
  }
  return false
}

// 验证
console.log(checkInclusion("ab", "eidbaooo")) // true
console.log(checkInclusion("ab", "eidboaoo")) // false
console.log(checkInclusion("adc", "dcda")) // true
```
