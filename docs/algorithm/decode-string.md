# 字符串解码（Decode String）

**难度：** Medium

## 题目描述

给定一个经过编码的字符串 `s`，返回它**解码后**的字符串。

编码规则为：`k[encoded_string]`，表示其中方括号内部的 `encoded_string` 正好重复 `k` 次。注意 `k` 保证为正整数。

你可以认为输入字符串总是**有效**的：没有额外的空格，方括号总是符合格式要求的；原始数据中不包含数字，所有的数字只表示重复的次数 `k`（因此不会出现 `3a` 或 `2[4]` 这类输入）；测试用例保证输出的长度不会超过 `10^5`。

### 约束条件

- `1 <= s.length <= 30`
- `s` 由小写英文字母、数字和方括号 `'['`、`']'` 组成。
- `s` 保证是一个**有效**的输入。
- 所有整数的范围在 `[1, 300]` 内。
- 题目数据保证输出长度不超过 `10^5`。

## 示例

**示例 1：**

```
输入：s = "3[a]2[bc]"
输出："aaabcbc"
解释：3[a] → "aaa"，2[bc] → "bcbc"，拼接得到 "aaabcbc"。
```

**示例 2：**

```
输入：s = "3[a2[c]]"
输出："accaccacc"
解释：先解最内层 2[c] → "cc"，得到 "a" + "cc" = "acc"；
      再解外层 3[acc] → "accaccacc"。
      注意：嵌套时内层必须先展开。
```

**示例 3：**

```
输入：s = "2[abc]3[cd]ef"
输出："abcabccdcdcdef"
解释：2[abc] → "abcabc"，3[cd] → "cdcdcd"，后面还有未编码的 "ef" 直接拼接。
```

## 提示 / 解题思路

1. **难点在于「嵌套」而不是「重复」。** 如果是 `3[a]2[bc]` 这种平铺结构，顺序扫描就能做；但 `3[a2[c]]` 要求**先算内层再算外层**，这正是**栈**的经典场景——「后遇到的 `[` 要先被 `]` 闭合」。

2. **把「当前正在拼的字符串」和「重复次数」都存起来。** 扫描过程中维护两个变量：
   - `cur`：当前这一层正在拼的字符串；
   - `num`：正在读入的数字（可能是多位，如 `12[ab]`）。

3. **遇到三类字符分别处理：**
   - 数字 `'0'`~`'9'`：`num = num * 10 + Number(ch)`（处理多位数）。
   - 左括号 `'['`：说明要进入**新的一层**。把「外层已经拼好的 `cur`」和「这一层的重复次数 `num`」分别压入两个栈，然后清空 `cur` 和 `num` 开始拼内层。
   - 右括号 `']'`：说明**当前层结束**。弹出重复次数 `repeat` 和外层字符串 `outer`，则本层结果并入外层：`cur = outer + cur.repeat(repeat)`。
   - 其他字母：直接 `cur += ch`。

4. **为什么栈里存的是「外层的 `cur`」？** 因为进入内层后 `cur` 要用来拼内层内容，外层的中间结果必须找个地方暂存——栈正好保存了「逐层回溯」所需的现场。可以想成：`[` 是「保存进度并进入下一层」，`]` 是「弹出进度并合并本层结果」。

5. **伪代码思路：**

   ```
   遍历每个字符 ch：
     若是数字  → num = num * 10 + ch
     若是 '['  → 把 num 压入次数栈；把 cur 压入字符串栈；cur = ''; num = 0
     若是 ']'  → repeat = 次数栈.pop(); outer = 字符串栈.pop()
                 cur = outer + cur.repeat(repeat)
     否则      → cur += ch
   返回 cur
   ```

6. **易错点：**
   - 多位数字没有做 `num * 10 + ...` 累积；
   - 遇到 `]` 时忘了把结果**拼回外层**（写成 `cur = cur.repeat(repeat)` 会丢掉 `3[a]2[bc]` 里的 `"aaa"` 前缀）；
   - 用字符串下标逐字符遍历而非 `for...of`，遇到非 ASCII 字符会有问题（本题只有 ASCII，但 `for...of` 更稳）。

## 解法

栈：`[` 时把「外层的已拼字符串」和「本层重复次数」入栈并清空当前状态，`]` 时出栈并把本层结果乘上次数后拼回外层。

```javascript
/**
 * @param {string} s
 * @return {string}
 */
const decodeString = (s) => {
  const countStack = [] // 每层的重复次数
  const strStack = [] // 进入每层之前，外层已拼好的字符串
  let cur = '' // 当前这一层正在拼的字符串
  let num = 0 // 正在读入的数字（支持多位）

  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      // 数字：累积成多位数，如 "12[ab]"
      num = num * 10 + Number(ch)
    } else if (ch === '[') {
      // 进入新的一层：保存现场
      countStack.push(num)
      strStack.push(cur)
      num = 0
      cur = ''
    } else if (ch === ']') {
      // 当前层结束：弹出次数与外层字符串，合并回外层
      const repeat = countStack.pop()
      const outer = strStack.pop()
      cur = outer + cur.repeat(repeat)
    } else {
      // 普通字母：直接追加到当前层
      cur += ch
    }
  }

  return cur
}

// 验证
console.log(decodeString('3[a]2[bc]')) // aaabcbc
console.log(decodeString('3[a2[c]]')) // accaccacc
console.log(decodeString('2[abc]3[cd]ef')) // abcabccdcdcdef

// 补充用例：多位数字 + 无嵌套
console.log(decodeString('12[ab]')) // abababababababababababab

// 补充用例：多层嵌套
console.log(decodeString('2[3[a]b]')) // aaabaaab

// 补充用例：完全没有编码，原样返回
console.log(decodeString('abc')) // abc

// 补充用例：括号外既有前缀也有后缀
console.log(decodeString('a2[b]c')) // abbc
```

- **时间复杂度：** O(m)，`m` 为解码后字符串的长度。每个字符只被写出一次，`repeat` 与字符串拼接的代价与产出长度成正比，总和不会超过输出规模。
- **空间复杂度：** O(m)，结果字符串本身占 O(m)；两个栈的深度等于嵌套层数（不超过输入长度 `s.length`）。

## 补充

- **递归写法（等价思路）：** 用闭包维护一个下标 `i`，遇到 `[` 就递归求解内层并把返回结果重复 `k` 次，遇到 `]` 就返回当前层结果。可读性好，但嵌套很深时有栈溢出风险，且 `m` 最大 `10^5` 时要注意字符串拼接的拷贝开销。
- **另一种栈写法：** 只用一个栈，压入「进入该层时的数字 + 进入前的字符串」组成的对象/数组 `[prevStr, repeat]`，逻辑与上面完全等价，只是少一个栈变量。
- **易错点回顾：** ① 多位数字没有累积（`12[ab]` 会错）；② 遇到 `]` 时用 `cur.repeat(repeat)` 覆盖 `cur`，丢掉外层前缀（`3[a]2[bc]` 会得到 `bcbc` 而不是 `aaabcbc`）；③ 把「次数」和「字符串」两个栈的弹出顺序写反。
- **同源题目：** 括号匹配与嵌套结构是同一类模型——先用 [有效的括号](./valid-parentheses.md) 熟悉「栈 + 配对」，再看 [括号展开](./brace-expansion.md) 的展开型变体；如果想继续加深，可以挑战纯文字提到的「227. 基本计算器 II」（表达式求值，同样是「栈保存现场」的思想）。
