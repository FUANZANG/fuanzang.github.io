# 字母异位词分组

**难度：** Medium

## 题目描述

给定字符串数组 `strs`，请将**字母异位词**（Anagram，即字母相同但排列不同的字符串）分组。

字母异位词的判断规则是：包含的字符种类和每种字符的数量都完全相同，顺序可以不同。

返回的结果可以按任意顺序给出，每组内部的顺序也不作要求。

**示例 1：**
```
输入: strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
输出: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
```

**示例 2：**
```
输入: strs = [""]
输出: [[""]]
```

**示例 3：**
```
输入: strs = ["a"]
输出: [["a"]]
```

## 示例

（原题未提供示例）

## 提示 / 解题思路

**提示 1：**  
字母异位词的本质是「相同字符序列」。比如 `"eat"`、`"ate"`、`"tea"` 归根到底都是 `a`、`e`、`t` 各出现一次。如何把「一个字符串」变成「一个可以作为哈希 map 键的值」？

**提示 2：**  
常用的两种哈希 key 思路，请二选一或自由发挥：
- **排序法**：对字符串排序后作为 key，异位词排序后必然相同。
- **计数法**：用一个固定长度的数组（26 个英文小写字母）记录每个字符出现的次数，再把这个数组变成字符串作为 key。

**提示 3：**  
不需要额外写排序方法也能实现计数法。思考 `String.fromCharCode` 与字符编码 `charCodeAt(0)` 之间的关系，以及数组 `join('')` 的作用。

> ✅ **要求**：不要硬复制粘贴标准答案，先自己在草稿纸或本地写实现。可以在 `localStorage` 或本地写一个 `index.html` 跑一跑，验证你的分组结果是否正确。

## 解法

把每个字符串排序后作为哈希 key（异位词排序后必定相同），用 `Map` 把相同 key 的字符串聚到同一组，最后返回所有分组。

```javascript
/**
 * @param {string[]} strs
 * @return {string[][]}
 */
const groupAnagrams = (strs) => {
  const map = new Map()
  for (const s of strs) {
    const key = s.split("").sort().join("")
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return Array.from(map.values())
}

// 验证
console.log(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
// [["eat","tea","ate"],["tan","nat"],["bat"]]（组内/组间顺序可不同）
console.log(groupAnagrams([""])) // [[""]]
console.log(groupAnagrams(["a"])) // [["a"]]
```

- **时间复杂度：** O(n · k log k)（n 为字符串个数，k 为平均长度）
- **空间复杂度：** O(n · k)
