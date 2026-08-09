# 有效的括号扩展（Valid Parentheses）

**难度：** Medium

## 题目描述

给定一个仅包含小写字母 `'a'-'z'`、左括号 `'('`、右括号 `')'` 和逗号 `','` 的字符串 `s`，其中括号可能嵌套。

括号内的内容表示一组**可选字符**，逗号分隔多个选项：

- `(a,b,c)` 表示可以从 `a`、`b`、`c` 中选择一个字符。
- 嵌套括号如 `(a,(b,c),d)` 表示可以从 `a`、`(b,c)` 的结果、`d` 中选择一个。
- 括号外的字符是固定的。

你的任务是：**生成所有可能的展开字符串**。

返回结果需要按**字典序**排序。

## 示例

**示例 1：**

```
输入: "(a,b)c"
输出: ["ac", "bc"]
解释: (a,b) 可以展开为 "a" 或 "b"，后面固定接 "c"
```

**示例 2：**

```
输入: "a,(b,c)d"
输出: ["abd", "acd"]
解释: 第一部分是固定字符 "a"，中间 (b,c) 选 b 或 c，后面固定接 "d"
```

**示例 3（嵌套括号）：**

```
输入: "(a,(b,c),d)"
输出: ["abd", "acd", "ad"]
解释: (a,(b,c),d) 是一个整体，从中选一个：
       - 选 "a"，后面无内容 → "a"
       - 选 (b,c) 的结果 → "b" 或 "c"，后面接 "d" → "bd" 或 "cd"
       - 选 "d" → "d"
       等等，这里需要重新理解...
```

> 💡 提示：示例 3 的输出可能需要你仔细推导。先理解括号解析规则再尝试。

## 提示 / 解题思路

1. **先解析，后展开**：不要试图一边解析一边生成。建议分两步：
   - 第一步：将字符串解析成一个**结构化的树**或**列表**，每个节点要么是固定字符序列，要么是一个"多选一"的分组。
   - 第二步：对解析后的结构做笛卡尔积（Cartesian Product），生成所有组合。

2. **递归/栈解析括号**：遇到 `(` 时压入新层，遇到 `)` 时弹出当前层并合并为一组选项。可以用递归下降解析器，也可以用显式栈。

3. **处理嵌套**：嵌套括号 `(a,(b,c))` 意味着外层括号内有三个候选：`"a"`、`"(b,c)"` 的展开结果（即 `"b"` 和 `"c"`）、以及可能的其他项。关键在于：**括号内的每个逗号分隔项可能本身又是一个括号表达式**，需要递归展开。

4. **笛卡尔积模板**：如果你有一个数组的数组 `[["a","b"], ["c","d"]]`，求所有组合可以用递归来做：
   ```
   遍历第一组的每个元素，对每个元素递归地拼接其余组的组合
   ```

5. **边界情况**：
   - 没有括号的字符串 → 直接返回包含该字符串的单元素数组
   - 空字符串 → 返回 `[]`
   - 括号内有多层嵌套 → 确保递归正确终止

## 解法

先递归解析成「字面量 / 多选一组」的分段结构，再对分段做笛卡尔积，最后按字典序排序。顶层逗号作为连接分隔符（被丢弃）。

```javascript
/**
 * @param {string} s
 * @return {string[]}
 */
const parse = (s) => {
  const tokens = []
  let i = 0,
    cur = ""
  while (i < s.length) {
    const ch = s[i]
    if (ch === "(") {
      if (cur) {
        tokens.push(cur)
        cur = ""
      }
      let depth = 1,
        j = i + 1
      while (j < s.length && depth > 0) {
        if (s[j] === "(") depth++
        else if (s[j] === ")") depth--
        if (depth > 0) j++
      }
      tokens.push(parseGroup(s.substring(i + 1, j)))
      i = j + 1
    } else if (ch === ",") {
      if (cur) {
        tokens.push(cur)
        cur = ""
      }
      i++
    } else {
      cur += ch
      i++
    }
  }
  if (cur) tokens.push(cur)
  return tokens
}
const parseGroup = (content) => {
  const options = []
  let depth = 0,
    cur = ""
  for (let k = 0; k < content.length; k++) {
    const ch = content[k]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      options.push(parse(cur))
      cur = ""
    } else cur += ch
  }
  options.push(parse(cur))
  return options
}
const expandTokens = (tokens) => {
  let combos = [""]
  for (const tok of tokens) {
    if (typeof tok === "string") {
      combos = combos.map((c) => c + tok)
    } else {
      const next = []
      for (const combo of combos)
        for (const opt of tok)
          for (const os of expandTokens(opt)) next.push(combo + os)
      combos = next
    }
  }
  return combos
}
const expand = (s) => {
  if (s === "") return []
  return expandTokens(parse(s)).sort()
}

// 验证
console.log(JSON.stringify(expand("(a,b)c"))) // ["ac","bc"]
console.log(JSON.stringify(expand("a,(b,c)d"))) // ["abd","acd"]
// 注意：源文件示例3声称 "(a,(b,c),d)" → ["abd","acd","ad"]，与解析规则矛盾。
// 按规则从 {a, (b,c), d} 中三选一并无后缀，正确结果应为 ["a","b","c","d"]：
console.log(JSON.stringify(expand("(a,(b,c),d)"))) // ["a","b","c","d"]
console.log(JSON.stringify(expand("abc"))) // ["abc"]
```

- **时间复杂度：** O(C)，C 为所有可能组合的总字符数（指数级，受组合数量限制）。
- **空间复杂度：** O(C)，存储结果与递归解析栈。
