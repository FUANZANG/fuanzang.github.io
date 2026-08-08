# 找出所有字母异位词

**难度：** Medium

## 题目描述

给定两个字符串 `s` 和 `p`，找到 `s` 中所有 `p` 的 **字母异位词**（anagram）的起始索引，并以数组形式返回这些索引。顺序不限。

**字母异位词** 是指由相同字符以不同（或相同）顺序组成的字符串。例如，`"abc"` 和 `"bca"` 是字母异位词。

## 示例

**输入：**
```
s = "cbaebabacd"
p = "abc"
```

**输出：**
```
[0, 6]
```

**解释：**
- 起始索引 `0` 处的子串是 `"cba"`，是 `"abc"` 的字母异位词。
- 起始索引 `6` 处的子串是 `"bac"`，是 `"abc"` 的字母异位词。

**输入：**
```
s = "abab"
p = "ab"
```

**输出：**
```
[0, 1, 2]
```

**解释：**
- 起始索引 `0` 处子串 `"ab"` ✅
- 起始索引 `1` 处子串 `"ba"` ✅
- 起始索引 `2` 处子串 `"ab"` ✅

## 提示 / 解题思路

> ⚠️ 以下内容仅提供思路指引，**不包含完整代码**。请自己思考实现！

1. **核心观察**：由于 `p` 的长度是固定的（设为 `k`），我们需要在 `s` 中检查每个长度为 `k` 的子串是否与 `p` 构成字母异位词。

2. **暴力法的瓶颈**：对每个窗口重新统计字符频率会导致 O(n * k) 的时间复杂度，在输入较大时会超时。

3. **滑动窗口优化**：
   - 用一个频率数组（大小 26，对应 a-z）记录 `p` 中每个字符的出现次数。
   - 维护另一个频率数组记录当前窗口内的字符分布。
   - 窗口每次向右滑动一格：**移除**左边出去的字符，**添加**右边新进入的字符。
   - 比较两个频率数组是否完全相同，相同则记录当前窗口的起始索引。

4. **进一步优化技巧**：
   - 不需要每次都完整比较两个长度为 26 的数组。可以维护一个计数器来跟踪"匹配的字符种类数"。
   - 或者使用 `diff` 计数器：初始化为 `p` 的字符频率，窗口进入一个字符就 `--`，出去一个字符就 `++`，当所有值都为 0 时就是异位词。

5. **边界情况**：
   - `s.length < p.length` 时直接返回 `[]`
   - `s` 和 `p` 长度相等时需检查一次

## 解法

用两个长度为 26 的频率数组分别记录 p 与当前窗口的字符频次，滑动窗口每次右移时增减字符并比较两数组，相等则记录起始索引。

```javascript
/**
 * @param {string} s
 * @param {string} p
 * @return {number[]}
 */
const findAnagrams = (s, p) => {
  const res = []
  const need = {}
  for (const c of p) need[c] = (need[c] || 0) + 1
  const window = {}
  let have = 0
  let left = 0
  for (let right = 0; right < s.length; right++) {
    const c = s[right]
    window[c] = (window[c] || 0) + 1
    if (need[c] !== undefined && window[c] === need[c]) have++
    while (right - left + 1 > p.length) {
      const lc = s[left]
      if (need[lc] !== undefined && window[lc] === need[lc]) have--
      window[lc]--
      left++
    }
    if (right - left + 1 === p.length && have === Object.keys(need).length) {
      res.push(left)
    }
  }
  return res
}

// 验证
console.log(findAnagrams("cbaebabacd", "abc")) // [0, 6]
console.log(findAnagrams("abab", "ab")) // [0, 1, 2]
console.log(findAnagrams("aaaa", "aa")) // [0, 1, 2]
```
