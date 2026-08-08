# 替换后的最长重复字符（Longest Repeating Character Replacement）

**难度：** Medium

## 题目描述

给你一个由大写英文字母组成的字符串 `s`（`1 <= s.length <= 10^5`）和一个非负整数 `k`（`0 <= k <= 10^5`）。

你最多可以将字符串 `s` 中任意位置上的字符**替换**为其它大写字母，最多替换次数不超过 `k` 次。

返回经过最多 `k` 次替换后，字符串 `s` 中**只包含同一字母**的最长连续子串的长度。

> 注意：替换操作改变的是字符本身，而不是顺序。题目要求的是 **连续子串**，而非子序列。

## 示例

**示例 1：**

```
输入：s = "AABABBA", k = 1
输出：4
解释：
将索引 3（字符 'B'）替换为 'A'，得到 "AABAAA"，最长连续全为 'A' 的子串是 "AABA"（长度为 4）。
或者将索引 1（字符 'A'）替换为 'B'，得到 "ABBA..."，最长连续全为 'B' 的子串是 "BABB"...，同样为 4。
更简洁的方式：子串 "AABAB" 有 3 个 'A'，只需 1 次替换即可使整段都变成 'A'，长度为...（再思考滑动窗口怎么判断呢）。
```

**示例 2：**

```
输入：s = "ABAB", k = 2
输出：4
解释：用 2 次替换把全部替换为 'A'（或 'B'），整串都是同一字符，长度为 4。
```

```js
console.log(characterReplacement("AABABBA", 1)); // 期望 4
console.log(characterReplacement("ABAB", 2));    // 期望 4
console.log(characterReplacement("AAAA", 0));    // 期望 4
console.log(characterReplacement("ABCDE", 1));   // 期望 2
```

## 提示 / 解题思路

> ⚠️ 以下仅为提示，不提供完整代码。

**1. 核心模型转换**
一段连续子串 `s[i..j]` 能被“替换成统一字符”的充要条件是：

```
子串长度 减去 该子串中出现次数最多的字符的频次  <=  k
```

这个差值，其实就是“需要被替换的其它字符的个数”。

**2. 固定窗口右端，用什么维护“最大频次”？**
当窗口右端 `j` 向右滑时，你需要随时知道窗口内 **某个字符的出现次数**。想想什么数据结构最适合“记录窗口内各字符计数”。在 JavaScript 里，你可以用一个 `Map`（或定长数组，字母只有 26 个），键是字符，值是出现次数。

**3. 缩小窗口还是不缩小？**
当窗口 `s[i..j]` 违规（即 `长度 - 最大频次 > k`）时，直觉告诉你要把左端 `i` 往右移动。**但**，仔细想一想：题目只需要你求 **最长** 合法子串的长度，当前最大长度记录下即可。是否真的需要在违规时收缩左指针才能保证答案正确？画出 `s = "AABABBA"` 在 `k = 1` 的时候窗口是如何伸张的，看 `left` 是否真的需要跟上 `right`。

**4. JS 特别注意**
- 在 `for...in` 或对象上迭代时要小心 `Object.keys` 带来的性能陷阱 —— 这里 26 个字母，你愿意的话可以直接用长度为 26 的数组 `new Array(26).fill(0)` 下标映射 `charCodeAt - 'A'`。
- 维护 `maxCount`（窗口内出现最多的字符次数）时，不要在缩小窗口时试图 `Math.max` 刷一遍 —— 惰性更新即可。

**5. 复杂度期望**
- 时间复杂度：`O(n)`（每个字符进出窗口各一次）。
- 空间复杂度：`O(1)`（字母表定长）。

## 解法

滑动窗口 + 计数数组：右指针右移时更新字符计数与窗口内最大频次 `maxCount`；当「窗口长度 - maxCount > k」时右移左指针收缩窗口。由于只需求最长合法子串长度，合法时不必收缩左指针，答案即过程中记录的最大窗口长度。

```javascript
/**
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
const characterReplacement = (s, k) => {
  let left = 0
  let maxFreq = 0
  const count = {}
  for (let right = 0; right < s.length; right++) {
    count[s[right]] = (count[s[right]] || 0) + 1
    maxFreq = Math.max(maxFreq, count[s[right]])
    if (right - left + 1 - maxFreq > k) {
      count[s[left]]--
      left++
    }
  }
  return s.length - left
}

// 验证
console.log(characterReplacement("ABAB", 2)) // 4
console.log(characterReplacement("AABABBA", 1)) // 4
console.log(characterReplacement("ABCD", 0)) // 1
```
