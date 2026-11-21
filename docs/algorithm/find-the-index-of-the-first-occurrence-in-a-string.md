# 找出字符串中第一个匹配项的下标（Find the Index of the First Occurrence in a String）

**难度：** Easy

## 题目描述

给你两个字符串 `haystack` 和 `needle`，请你在 `haystack` 字符串中找出 `needle` 字符串的第一个匹配项的下标（下标从 0 开始）。如果 `needle` 不是 `haystack` 的一部分，则返回 `-1`。

注：部分语言（如 JavaScript）有内置的 `indexOf` 函数可以解决此问题，请尝试自己实现该算法。

### 约束条件

- `1 <= haystack.length, needle.length <= 10^4`
- `haystack` 和 `needle` 仅由小写英文字母组成

## 示例

**示例 1：**

```
输入：haystack = "sadbutsad", needle = "sad"
输出：0
解释："sad" 在下标 0 和 6 处匹配。
我们返回下标 0 因为它出现最早。
```

**示例 2：**

```
输入：haystack = "leetcode", needle = "leeto"
输出：-1
解释：「leeto」没有匹配到，因此返回 -1。
```

## 提示 / 解题思路

- **双指针暴力**：枚举 `haystack` 中每个起始位置 `i`，逐字符与 `needle` 比对，一旦不匹配立即停止当前子串的匹配，对下一个起始位置继续。最坏时间复杂度 `O((n-m+1) * m)`，在大量「部分匹配后失败」的场景（如 `haystack = "aaaaaaaab"`，`needle = "ba"`）下会退化到接近 `O(n * m)`。
- **KMP（Knuth-Morris-Pratt）**：核心思想是「已经匹配完成的部分不会失配」。预处理模式串 `needle` 的 `next`（失配）数组——`next[i]` 表示 `needle[0..i]` 中「既是前缀又是后缀」的最长真前缀长度；匹配过程中若 `haystack[i]` 与 `needle[j]` 失配，模式指针不回退、文本指针也不回退，而是按 `j = next[j-1]` 跳跃到下一个可能匹配的位置，保证整体线性时间。

## 解法

KMP：先为 `needle` 构建 `next` 数组，再用双指针扫描 `haystack`，失配时模式指针沿 `next` 跳跃，匹配满整个模式串即返回 `i - m + 1`。

```javascript
/**
 * @param {string} haystack
 * @param {string} needle
 * @return {number}
 */
const strStr = (haystack, needle) => {
  const n = haystack.length;
  const m = needle.length;
  if (m === 0) return 0;

  // 构建 next 数组：next[i] = needle[0..i] 的最长「既是前缀又是后缀」的真前缀长度
  const next = new Array(m).fill(0);
  let k = 0;
  for (let i = 1; i < m; i++) {
    while (k > 0 && needle[i] !== needle[k]) k = next[k - 1];
    if (needle[i] === needle[k]) k++;
    next[i] = k;
  }

  // 扫描 haystack，j 为已匹配上的 needle 前缀长度
  let j = 0;
  for (let i = 0; i < n; i++) {
    while (j > 0 && haystack[i] !== needle[j]) j = next[j - 1];
    if (haystack[i] === needle[j]) j++;
    if (j === m) return i - m + 1;
  }
  return -1;
};

// 验证
console.log(strStr('sadbutsad', 'sad')); // 0
console.log(strStr('leetcode', 'leeto')); // -1
```

- **时间复杂度：** O(n + m)，n、m 分别为 `haystack` 与 `needle` 的长度
- **空间复杂度：** O(m)，next 数组

## 补充

- 本题为 LeetCode 28，即经典的 `strStr` 题。面试中可先给出双指针暴力解法，再补充 KMP 优化；数据规模较小时（`m` 较小或匹配较少）暴力解已足够快。
- KMP 的变体是 **Z-algorithm**（Z 函数），两者同为线性时间字符串匹配。
- 相关题目：[正则表达式匹配](./regular-expression-matching.md)（LeetCode 10）也是字符串匹配类问题，但采用动态规划解法。
