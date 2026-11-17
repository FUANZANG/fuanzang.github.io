# 去除重复字母（Remove Duplicate Letters）

**难度：** Medium

## 题目描述

给你一个字符串 `s`，请你去掉字符串中重复出现的字母，使得每个字母只出现一次。要求返回的结果是**所有可能结果中字典序最小**的那一个，并且不能打乱剩余字符之间的相对位置。

### 约束条件

- `1 <= s.length <= 10^4`
- `s` 由小写英文字母组成

## 示例

```text
输入：s = "bcabc"
输出："abc"
解释：删除第一个 "b" 和第一个 "c" 得到 "abc"；若保留先出现的 b、c 则得到 "bca"，"abc" 字典序更小。

输入：s = "cbacdcbc"
输出："acdb"
解释：删除后可以得到 "bacd"、"acdb" 等多种结果，其中 "acdb" 字典序最小。
```

## 提示 / 解题思路

- **目标拆成两件事**：① 每个字母恰好保留一次；② 结果字典序最小。第二点是典型的「贪心 + 单调栈」信号。
- 从左到右扫描时维护一个**单调递增栈**：如果当前字母 `ch` 比栈顶字母小，就希望把栈顶弹掉、换成更小的 `ch`，这样前缀字典序更优。
- **但不能无脑弹**：栈顶字母必须「后面还会再出现」才允许被弹，否则它就永远丢失了，无法满足「每个字母保留一次」。所以先预处理出每个字母**最后出现的下标**。
- 用 `seen` 集合记录哪些字母已经进过栈，避免同一个字母入栈两次。
- 关键点：弹栈时条件要同时满足「栈顶 > 当前字母」且「栈顶在 i 之后仍会出现」，循环弹出直到不满足为止。

伪代码：

```text
last[ch] = ch 最后出现的下标
stack = [], seen = {}
for i, ch in s:
  if ch in seen: continue
  while stack 非空 and stack[-1] > ch and last[stack[-1]] > i:
    seen.remove(stack.pop())
  stack.push(ch); seen.add(ch)
return join(stack)
```

## 解法

单调递增栈 + 贪心：栈顶字母比当前大且后面还会再出现时就弹出，保证字典序最小的同时不丢字母。

```javascript
/**
 * @param {string} s
 * @return {string}
 */
const removeDuplicateLetters = (s) => {
  // 每个字母最后出现的下标：栈顶只有「后面还会再出现」才允许被弹出
  const lastIndex = {};
  for (let i = 0; i < s.length; i++) lastIndex[s[i]] = i;

  const seen = new Set(); // 已入栈的字母，防止重复入栈
  const stack = [];       // 单调递增栈，最后即答案

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (seen.has(ch)) continue; // 该字母已保留过一次，直接跳过
    while (
      stack.length &&
      stack[stack.length - 1] > ch &&
      lastIndex[stack[stack.length - 1]] > i
    ) {
      seen.delete(stack.pop()); // 栈顶更大且后面还会出现：弹出换更小的 ch
    }
    stack.push(ch);
    seen.add(ch);
  }

  return stack.join('');
};

// 验证
console.log(removeDuplicateLetters('bcabc'));    // 期望 "abc"
console.log(removeDuplicateLetters('cbacdcbc')); // 期望 "acdb"
```

- **时间复杂度：** O(n)，每个字母至多入栈、出栈各一次（n = s.length）。
- **空间复杂度：** O(1)，`lastIndex` / `seen` / `stack` 的规模上限为字符集大小 26。

## 补充

- **易错点**：`lastIndex[stack[stack.length - 1]] > i` 这个条件不能省。少了它，"cbacdcbc" 会在处理末尾 `b` 时错误地把 `d` 弹掉（`d` 只在下标 4 出现过），导致结果错误。
- **变形**：把「保留 1 次」改成「保留 k 次」，思路相同，只需把 `seen` 换成计数 + 每个字母的剩余可用次数。
- **同思路题目**：[重排字符串使相邻字符不同](./reorganize-string.md)（贪心 + 计数）、[每日温度](./daily-temperatures.md)（单调栈入门）。
