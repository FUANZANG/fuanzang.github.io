# 最长有效括号子串（Longest Valid Parentheses）

**难度：** Hard

## 题目描述

给定只含 `(` 和 `)` 的字符串 `s`，返回最长的有效（格式正确、完全匹配）括号**子串**的长度。

### 约束条件

- `0 <= s.length <= 3 * 10^4`
- `s[i]` 为 `(` 或 `)`

## 示例

```
// 示例 1
输入：s = "(()"
输出：2
解释：最长有效括号子串是 "()"。

// 示例 2
输入：s = ")()())"
输出：4
解释：最长有效括号子串是 "()()".

// 示例 3
输入：s = ""
输出：0
```

## 提示 / 解题思路

有效括号的核心在于**匹配与边界**。关键思想：

1. 用一个栈保存**索引**。栈底初始化一个永远拿不还的「基准值」`-1`，这样每次弹出后都能用来算长度。
2. 遇到 `(`：把它的索引压栈。
3. 遇到 `)`：弹出栈顶。
   - 若此时栈为空，说明这个 `)` 无法匹配任何左括号，它本身是一次无效起点，把**当前索引**作为新的基准压栈（为之后的子串提供参考左边界）。
   - 若栈非空，说明匹配成功，当前有效子串长度为 `i - stack.top`（`stack.top` 是最近一个无法再与右侧 `)` 匹配的左侧边界），更新最大值。

```
stack = [-1]            // 基准值，保证能算出长度
maxLen = 0
for i, ch in s:
  if ch == '(':
    stack.push(i)
  else:                 // ')'
    stack.pop()
    if stack 空:
      stack.push(i)     // 新基准
    else:
      maxLen = max(maxLen, i - stack.top)
return maxLen
```

> **为什么 `i - stack.top` 是有效子串长度？** 弹掉一个匹配的 `(` 之后，栈顶剩余的索引正好是「距离当前 `)` 最近的、还未被匹配/成为无效基准的左侧位置」——二者之间的 `(...)` 段就是一段合法连续括号子串。

## 解法

栈存索引、以无法匹配的前一个位置为基准，每次配对 `)` 时用 `i - stack.top` 量出当前合法段长。

```javascript
/**
 * @param {string} s
 * @return {number}
 */
const longestValidParentheses = (s) => {
  const stack = [-1]; // 初始基准值
  let max = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else {
      stack.pop();
      if (stack.length === 0) {
        stack.push(i); // 新的无法再匹配的基准
      } else {
        max = Math.max(max, i - stack[stack.length - 1]);
      }
    }
  }
  return max;
};

// 验证
console.log(longestValidParentheses("(()"));    // 期望输出：2
console.log(longestValidParentheses(")()())")); // 期望输出：4
console.log(longestValidParentheses(""));      // 期望输出：0
console.log(longestValidParentheses("()(())"));// 期望输出：6
console.log(longestValidParentheses(")("));    // 期望输出：0

// 时间复杂度：O(n)  —— 每个字符入栈一次、出栈一次。
// 空间复杂度：O(n)  —— 栈最多存 n 个索引。
```

## 补充

- **进阶 — O(1) 空间**：可用**双指针**法，从左到右一次扫描，用 `left`，`right` 计数左右括号。当 `left == right` 记录长度；`right > left` 时将 `left = right = 0` 重置；然后从右向左再扫一次（对称处理 `left > right`）。两趟保证漏掉的合法段都被捕获。
- 与「[20. 有效的括号](./valid-parentheses.md)」本质相同：本题问的是最长一段、而不是全局是否合法。
- 变形题「1190. 反转每对括号之外的单词」也常用索引栈+基准值技巧。
