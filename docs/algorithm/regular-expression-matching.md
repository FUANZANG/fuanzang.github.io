# 正则表达式匹配（Regular Expression Matching）

**难度：** Medium

## 题目描述

给你一个字符串 `s` 和一个字符规律 `p`，请你来实现一个支持 `'.*'` 的**正则表达式匹配**。

其中：

- `.` 匹配**任意**单个字符
- `*` 匹配**零个或多个**它前面的字符（例如 `a*` 表示匹配零个或多个 `a`）

你的任务是判断整个字符串 `s` 是否被规律 `p` **完全匹配**（而非部分匹配）。

### 约束条件

- `0 <= s.length <= 20`
- `0 <= p.length <= 30`
- `s` 仅由小写英文字母组成
- `p` 仅由小写英文字母、`.` 和 `*` 组成
- 所有出现在 `*` 前面的字符，均保证是有效字符（即 `*` 前面一定存在一个字符或 `.`）

## 示例

**示例 1：**

```
输入：s = "aa"，p = "a"
输出：false
解释：p 无法匹配整个字符串，因为只有一个 'a'，无法匹配 "aa"
```

**示例 2：**

```
输入：s = "aa"，p = "a*"
输出：true
解释：'*' 表示可匹配零个或多个 'a'，这里匹配两个 'a'
```

**示例 3：**

```
输入：s = "ab"，p = ".*"
输出：true
解释：".*" 表示匹配零个或多个任意字符，可以匹配 "ab"
```

**示例 4：**

```
输入：s = "aab"，p = "c*a*b"
输出：true
解释：c* 匹配零个 'c'（空），a* 匹配两个 'a'（重复两次），b 匹配 'b'，拼起来即 "aab"
```

**示例 5：**

```
输入：s = "mississippi"，p = "mis*is*p*."
输出：false
解释：p 末尾的 "." 只能匹配恰好一个字符，无法覆盖整个 "mississippi"，故不匹配
```

## 提示 / 解题思路

这道题是经典的**二维动态规划**，与「编辑距离」的状态定义方式一致：

1. 定义 `dp[i][j]`：`s` 的前 `i` 个字符（`s[0..i-1]`）能否被 `p` 的前 `j` 个字符（`p[0..j-1]`）完全匹配。
2. 初始化：`dp[0][0] = true`（空串匹配空规律）。当 `p` 的前 `j` 个字符以 `x*` 结尾时，`x*` 可以匹配空，因此 `dp[0][j] = dp[0][j-2]`。
3. 状态转移（考察 `p` 的第 `j` 个字符 `c = p[j-1]`）：
   - **普通字符或 `.`**：`c` 必须与 `s[i-1]` 匹配（`c === s[i-1]` 或 `c === '.'`），且前面也要匹配：`dp[i][j] = dp[i-1][j-1]`。
   - **`*`**：分两种情况取或：
     - `*` 匹配**零个**前面的字符：直接跳过 `p[j-2]` 和 `p[j-1]`，即 `dp[i][j-2]`；
     - `*` 匹配**一个或多个**（前提是 `s[i-1]` 与 `p[j-2]` 匹配）：字符位置前进但规律仍用 `*`，即 `dp[i-1][j]`。

伪代码：

```
if p[j-1] === '*':
    dp[i][j] = dp[i][j-2] || (p[j-2] matches s[i-1] ? dp[i-1][j] : false)
else if p[j-1] === '.' or p[j-1] === s[i-1]:
    dp[i][j] = dp[i-1][j-1]
```

> 提示：回退到子问题 `dp[i-1][j]` 时，`*` 仍在"值守"，可以不断吃掉更多字符，这是 `*` 匹配"零或多个"的关键。

## 解法

二维 DP：`dp[i][j]` 表示前缀匹配关系，`*` 分"匹配零个"与"匹配一个或多个"两条转移路径取或。

```javascript
/**
 * @param {string} s
 * @param {string} p
 * @return {boolean}
 */
const isMatch = (s, p) => {
  const m = s.length
  const n = p.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false))

  // 基线：空串可匹配 p 中所有形如 x*x* 的前缀
  dp[0][0] = true
  for (let j = 2; j <= n; j += 2) {
    if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2]
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = p[j - 1]
      if (c === '*') {
        // 情况 1：x* 匹配零个，跳过 x 和 *
        dp[i][j] = dp[i][j - 2]
        // 情况 2：x* 匹配一个或多个（当前字符与 x 匹配时）
        const x = p[j - 2]
        if (x === '.' || x === s[i - 1]) {
          dp[i][j] = dp[i][j] || dp[i - 1][j]
        }
      } else if (c === '.' || c === s[i - 1]) {
        // 普通字符 / 通配符 .：对齐匹配
        dp[i][j] = dp[i - 1][j - 1]
      }
    }
  }

  return dp[m][n]
}

// 验证
console.log(isMatch('aa', 'a'))                    // false
console.log(isMatch('aa', 'a*'))                   // true
console.log(isMatch('ab', '.*'))                   // true
console.log(isMatch('aab', 'c*a*b'))               // true
console.log(isMatch('mississippi', 'mis*is*p*.'))  // false
```

- **时间复杂度：** O(m × n)，m 为 `s` 的长度，n 为 `p` 的长度，每个 DP 格子 O(1)
- **空间复杂度：** O(m × n)，DP 表大小；若只保留两行滚动数组可优化至 O(n)

## 补充

进阶挑战：将空间优化到 O(n)——只保留 `prev` 行与 `curr` 行滚动数组即可，注意初始化时 `curr[0]` 与星号前缀的处理。

相关题目：[单词拆分（Word Break）](./word-break.md) 是只含 `*` 变体的简化版（词表匹配）；[有效的括号（Valid Parentheses）](./valid-parentheses.md) 是另一个栈 + 匹配的入门对照。
