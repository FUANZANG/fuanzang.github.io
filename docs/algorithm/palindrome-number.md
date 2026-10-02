# 回文数（Palindrome Number）

**难度：** Easy

## 题目描述

给你一个整数 `x`，如果 `x` 是一个回文整数，返回 `true`；否则，返回 `false`。

回文数是指正序（从左向右）和倒序（从右向左）读都是一样的整数。例如，`121` 是回文，而 `123` 不是。

### 约束条件

- `-2^31 <= x <= 2^31 - 1`
- **进阶：** 你能不将整数转为字符串来解决这个问题吗？

## 示例

```
输入：x = 121
输出：true
解释：从左向右读和从右向左读都是 121。
```

```
输入：x = -121
输出：false
解释：从左向右读为 -121，从右向左读为 121-。因此它不是一个回文数。
```

```
输入：x = 10
输出：false
解释：从右向左读为 01。因此它不是一个回文数。
```

## 提示 / 解题思路

**第一直觉：** 把数字转成字符串，再用双指针从两端向中间比较（或者判断字符串是否等于它的反转）。代码简单，但会额外分配 O(n) 的字符串空间，题目进阶要求是不借助字符串。

**不转字符串的做法（数学法）：** 负数一定不是回文数（负号位置不对称）；末尾是 0 且数字本身不为 0 的数也一定不是回文数（最高位不可能是 0）。

正数可以**只反转后一半的数字**，再与前一半比较：

1. 每次取 `x % 10` 得到末位数字，累加进 `reverted`：`reverted = reverted * 10 + x % 10`；
2. 同时 `x = Math.floor(x / 10)` 砍掉末位；
3. 当 `x <= reverted` 时说明已经翻转到一半，停止循环。

循环结束后分两种情况：

- 位数为偶数：`x === reverted`；
- 位数为奇数：中间那位数字只属于 `reverted`，用 `Math.floor(reverted / 10)` 去掉它再比较。

这样只需反转一半数字，避免了大整数反转可能溢出的问题。

**伪代码思路：**

```
若 x < 0 或 (x % 10 === 0 且 x !== 0) → false
reverted = 0
当 x > reverted 时：
    reverted = reverted * 10 + x % 10
    x = floor(x / 10)
返回 x === reverted 或 x === floor(reverted / 10)
```

## 解法

不断取 `x` 的末位数字构造反转数，只反转一半即可判断回文。

```javascript
/**
 * @param {number} x
 * @return {boolean}
 */
const isPalindrome = (x) => {
  // 负数不是回文数；末尾为 0 且不为 0 的数也不是回文数
  if (x < 0 || (x % 10 === 0 && x !== 0)) {
    return false;
  }

  let reverted = 0;
  // 只反转后一半数字，当 x <= reverted 时说明已过半
  while (x > reverted) {
    reverted = reverted * 10 + (x % 10);
    x = Math.floor(x / 10);
  }

  // 偶数位：x === reverted；奇数位：去掉中间那位再比较
  return x === reverted || x === Math.floor(reverted / 10);
};

// 验证
console.log(isPalindrome(121)); // true
console.log(isPalindrome(-121)); // false
console.log(isPalindrome(10)); // false
console.log(isPalindrome(0)); // true
console.log(isPalindrome(12321)); // true
console.log(isPalindrome(123321)); // true
```

- **时间复杂度：** O(log n)，每次循环把数字除以 10，循环次数与位数成正比。
- **空间复杂度：** O(1)，只用了常数个变量，没有字符串或数组。

## 补充

**为什么只反转一半？** 如果完整反转整数，结果可能超出 32 位有符号整数范围（虽然 JS 的 `number` 是双精度浮点，不会像 C/Java 那样真正溢出，但逻辑上仍不优雅）。只反转后一半既省时间又避开这个隐患。

**易错点：**

- 忘记排除 `x < 0`，导致 `-121` 被误判；
- 忘记排除末尾为 0 的情况，`10`、`100` 这类数字会在循环里出错；
- `x = 0` 是回文数，要保证上面的判断不会把它误杀（`x % 10 === 0` 但 `x === 0`，条件里用 `x !== 0` 兜住）。

相关题目：

- [整数反转](./reverse-integer.md)
- [回文链表](./palindrome-linked-list.md)
