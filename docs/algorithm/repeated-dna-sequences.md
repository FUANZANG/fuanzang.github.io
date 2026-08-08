# 寻找重复的 DNA 序列（Repeated DNA Sequences）

**难度：** Medium

## 题目描述

DNA 序列由字符 `'A'`、`'C'`、`'G'`、`'T'` 组成，例如 `"ACGAATTCCG"`。在研究 DNA 时，有时需要识别序列中**重复出现**的子串。

请实现一个函数，找出字符串 `s` 中所有**恰好长度为 10** 且**出现次数超过一次**的子串。返回结果中每个子串只出现一次（去重），顺序不限。

**函数签名：**

## 示例

**示例 1：**

```
输入：s = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"
输出：["AAAAACCCCC", "CCCCCAAAAA"]
解释：
  - "AAAAACCCCC" 出现了 2 次
  - "CCCCCAAAAA" 出现了 2 次
```

**示例 2：**

```
输入：s = "AAAAAAAAAAAAA"
输出：["AAAAAAAAAA"]
解释：长度为 10 的子串 "AAAAAAAAAA" 出现了 4 次，去重后只保留一份。
```

## 提示 / 解题思路

<details>
<summary>💡 提示 1（基础思路）</summary>

使用**滑动窗口**的思想：依次截取所有长度为 10 的子串，用哈希表记录每个子串出现的次数。最后收集出现次数 > 1 的子串即可。时间复杂度 O(n × 10) = O(n)。
</details>

<details>
<summary>💡 提示 2（进阶优化 — 位运算 + 滚动哈希）**</summary>

由于只有 4 种字符（A/C/G/T），可以用 **2 bit** 表示每个字符：A=00, C=01, G=10, T=11。一个长度为 10 的子串仅需 20 bit，可以压缩为一个整数。

利用**滚动哈希**：当窗口右移一位时，去掉最高位的 2 bit，左移后加上新字符的 2 bit。这样可以在 O(1) 时间内计算下一个子串的哈希值，将整体时间复杂度优化到严格的 O(n)。
</details>

<details>
<summary>💡 提示 3（边界情况）**</summary>

- 当 `s.length < 10` 时，直接返回空数组 `[]`。
- 注意去重：同一个重复子串只需要在结果中出现一次。
</details>

## 解法

用滑动窗口截取所有长度为 10 的子串，借助两个 Set 分别记录「出现过」和「重复出现」的子串，最后返回重复集合去重后的结果。

```javascript
/**
 * @param {string} s
 * @return {string[]}
 */
const findRepeatedDnaSequences = (s) => {
  const seen = new Set()
  const repeated = new Set()
  for (let i = 0; i + 10 <= s.length; i++) {
    const sub = s.slice(i, i + 10)
    if (seen.has(sub)) repeated.add(sub)
    else seen.add(sub)
  }
  return Array.from(repeated)
}

// 验证
console.log(findRepeatedDnaSequences("AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT")) // ["AAAAACCCCC", "CCCCCAAAAA"]
console.log(findRepeatedDnaSequences("AAAAAAAAAAAAA")) // ["AAAAAAAAAA"]
```

- **时间复杂度：** O(n)，n 为字符串长度，每个长度为 10 的子串 O(1) 截取。
- **空间复杂度：** O(n)，哈希表最多存储 O(n) 个不同子串。
