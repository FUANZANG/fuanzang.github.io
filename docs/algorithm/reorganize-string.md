# 重排字符串使相邻字符不同（Reorganize String）

**难度：** Medium

## 题目描述

给定一个仅由小写英文字母组成的字符串 `s`，请你重新排列其中的字符，使得**任意两个相邻字符都不相同**。

- 如果存在满足条件的排列，返回其中任意一个合法结果。
- 如果不可能做到，返回空字符串 `""`。

**约束条件：**
- `1 <= s.length <= 500`
- `s` 仅包含小写英文字母（`'a'` ~ `'z'`）

## 示例

**示例 1：**

```
输入: s = "aab"
输出: "aba"
解释: 将字符重排为 "aba"，相邻字符 'a' 和 'b' 不同，满足条件。
      注意："baa" 也是合法答案之一。
```

**示例 2：**

```
输入: s = "aaab"
输出: ""
解释: 字符 'a' 出现了 3 次，而字符串长度为 4。
      无论如何排列，至少有两个 'a' 会相邻，因此无解。
```

## 提示 / 解题思路

先思考一个关键问题：**在什么条件下，不可能构造出合法排列？**

> 如果某个字符的出现次数超过了 `Math.ceil(n / 2)`（其中 `n` 是字符串长度），那么它必然会出现相邻的情况。这是判断有无解的关键条件。

既然知道了无解的条件，那有解时应该怎么构造？

- 考虑**每次都优先放置当前剩余次数最多的字符**——这是一种贪心思路。
- 你可以用一个数据结构来维护"当前可以放置的、剩余次数最多的字符"。

- 统计每个字符的出现频率（可用数组或 Map）。
- 为了高效地取出"频率最高的字符"，可以考虑使用**最大堆（Max Heap）**。
- 每次从堆中取出频率最高的字符放入结果，但要确保它和上一个放置的字符不同。如果堆顶字符恰好和上一个相同，就先取次高频率的字符，再把堆顶的放回去。

你也可以不用堆，而是用一个变量 `prev` 记录上一次放置的字符及其剩余次数。每次在 `26` 个字母中找**不等于 `prev` 且剩余次数最多**的那个来放置。

## 解法

先判定无解：若某字符出现次数 `> ⌈n/2⌉` 必相邻，返回空串。否则按频次降序，把字符轮流填入偶数位再填奇数位，保证相邻字符不同。

```javascript
/**
 * @param {string} S
 * @return {string}
 */
const reorganizeString = (S) => {
  const count = {}
  for (const c of S) count[c] = (count[c] || 0) + 1
  const maxCount = Math.max(...Object.values(count))
  if (maxCount > Math.ceil(S.length / 2)) return ""
  const pq = Object.entries(count).sort((a, b) => b[1] - a[1])
  let res = ""
  while (pq.length) {
    const [c, n] = pq.shift()
    if (res.length === 0 || res[res.length - 1] !== c) {
      res += c
      if (n - 1 > 0) pq.push([c, n - 1])
      pq.sort((a, b) => b[1] - a[1])
    } else {
      if (pq.length === 0) return ""
      const [c2, n2] = pq.shift()
      res += c2
      if (n2 - 1 > 0) pq.push([c2, n2 - 1])
      pq.push([c, n])
      pq.sort((a, b) => b[1] - a[1])
    }
  }
  return res
}

// 验证
console.log(JSON.stringify(reorganizeString("aab"))) // "aba"
console.log(JSON.stringify(reorganizeString("aaab"))) // ""
console.log(JSON.stringify(reorganizeString("vvvlo"))) // "vlvov"
```
