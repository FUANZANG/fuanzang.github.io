# 字符串相乘（Multiply Strings）

**难度：** Medium

## 题目描述

给定两个以字符串形式表示的非负整数 `num1` 和 `num2`，返回 `num1` 和 `num2` 的乘积，**同样以字符串形式表示**。

**注意：**
- 不能使用任何内置的 BigInteger 库或直接将输入字符串转换为整数来处理。
- `num1` 和 `num2` 的长度均在 `1` 到 `200` 之间。
- `num1` 和 `num2` 均只包含数字 `0-9`。
- `num1` 和 `num2` 均不以零开头，除非数字 `0` 本身。

## 示例

```
输入：num1 = "123", num2 = "456"
输出："56088"
解释：123 × 456 = 56088
```

```
输入：num1 = "2", num2 = "3"
输出："6"
```

```
输入：num1 = "0", num2 = "12345"
输出："0"
```

## 提示 / 解题思路

1. **模拟竖式乘法**：回想一下小学学的竖式乘法——把一个数的每一位与另一个数相乘，然后错位相加。这正是本题的核心思路。

2. **关键观察**：两个长度分别为 `m` 和 `n` 的数字相乘，结果最多有 `m + n` 位。你可以预先分配一个长度为 `m + n` 的数组来存放中间结果。

3. **逐位相乘**：
   - 从右往左遍历 `num1` 的每一位（索引 `i`）和 `num2` 的每一位（索引 `j`）。
   - 将 `num1[i] * num2[j]` 的结果累加到结果数组的 `i + j + 1` 位置（低位）。
   - 处理进位：从右往左扫描结果数组，把每一位的值对 10 取余存为当前位，除以 10 的商加到左边一位。

4. **处理前导零**：最终结果数组的前面可能有若干个 `0`，需要跳过它们再拼接成字符串。如果全部是 `0`，则返回 `"0"`。

5. **复杂度**：时间复杂度 O(m × n)，空间复杂度 O(m + n)。

## 解法

模拟竖式乘法：预分配长度 `m+n` 的结果数组，从低位到高位逐位相乘累加，再统一处理进位并去掉前导零；不依赖大整数库或直接转整数。

```javascript
/**
 * @param {string} num1
 * @param {string} num2
 * @return {string}
 */
const multiply = (num1, num2) => {
  if (num1 === "0" || num2 === "0") return "0"
  const m = num1.length,
    n = num2.length
  const res = new Array(m + n).fill(0)
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const p = i + j + 1
      const sum = res[p] + (num1.charCodeAt(i) - 48) * (num2.charCodeAt(j) - 48)
      res[p] = sum % 10
      res[p - 1] += Math.floor(sum / 10)
    }
  }
  let start = 0
  while (start < res.length && res[start] === 0) start++
  return res.slice(start).join("")
}

// 验证
console.log(multiply("123", "456")) // "56088"
console.log(multiply("2", "3")) // "6"
console.log(multiply("0", "12345")) // "0"
```

- **时间复杂度：** O(m × n)
- **空间复杂度：** O(m + n)
