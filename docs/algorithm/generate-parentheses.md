# 有效的括号组合（Generate Parentheses）

**难度：** Easy

## 题目描述

给定一个只包含 `'('`、`')'`、`'{'`、`'}'`、`'['`、`']'` 的字符串 `s`，判断字符串是否有效。

有效字符串需满足：
1. 左括号必须用相同类型的右括号闭合。
2. 左括号必须以正确的顺序闭合。
3. 每个右括号都有一个对应的相同类型的左括号。

## 示例

```javascript
输入：s = "()"
输出：true

输入：s = "()[]{}"
输出：true

输入：s = "(]"
输出：false
```

## 提示 / 解题思路

- 使用**栈（Stack）**数据结构：遇左括号入栈，遇右括号检查栈顶是否匹配。
- 关键：栈必须为空（所有左括号都被匹配）且匹配过程中不出现失配。
- 可用哈希表记录右括号到左括号的映射，简化匹配判断。

## 解法

遇左括号入栈，遇右括号时检查栈顶是否匹配对应左括号且栈非空；遍历结束后栈必须为空。

```javascript
/**
 * @param {string} s
 * @return {boolean}
 */
const isValid = (s) => {
  const stack = []
  const map = { ")": "(", "]": "[", "}": "{" }
  for (const ch of s) {
    if (ch === "(" || ch === "{" || ch === "[") stack.push(ch)
    else {
      if (stack.length === 0) return false
      if (stack.pop() !== map[ch]) return false
    }
  }
  return stack.length === 0
}

// 验证
console.log(isValid("()")) // true
console.log(isValid("()[]{}")) // true
console.log(isValid("(]")) // false
console.log(isValid("([)]")) // false
console.log(isValid("{[]}")) // true
console.log(isValid("")) // true
console.log(isValid("(({{[[]]}}))")) // false
```

- **时间复杂度：** O(n)，每个字符最多入栈、出栈各一次。
- **空间复杂度：** O(n)，最坏情况全部为左括号。
