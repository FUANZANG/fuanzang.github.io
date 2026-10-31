# 质数计数（Count Primes）

**难度：** Medium

## 题目描述

给定一个整数 `n`，返回**严格小于** `n` 的质数（素数）的个数。

### 约束条件

- `0 <= n <= 5 * 10^6`

## 示例

输入：

```
n = 10
```

输出：

```
4
```

解释：小于 10 的质数有 4 个，分别是 `2, 3, 5, 7`。

输入：

```
n = 0
```

输出：

```
0
```

解释：`n = 0` 时，严格小于 0 的数不存在，因此没有质数。

## 提示 / 解题思路

- **逐个判断不可行**：对每个 `[2, n)` 中的数单独判质数要 `O(sqrt(n))`，`n` 达 `5*10^6` 时总体约 `O(n * sqrt(n))`，会超时。
- **埃拉托斯特尼筛法（Sieve of Eratosthenes）**：用一个布尔数组 `isPrime[0..n-1]` 记录「是否仍为质数」。从 `i = 2` 开始，若 `isPrime[i]` 为真，则 `i` 是质数，于是把它的所有倍数 `i*i, i*i+i, ...`（小于 `n`）全部标记为合数。
- **为什么从 `i*i` 开始标记**：小于 `i` 的因子已经在更小质数那一步把 `i` 的对应倍数筛掉了；而 `i*i` 是「最小质因子为 `i`」的第一个合数。这一步把筛法总操作数压到 `O(n log log n)`。
- **循环上界可优化到 `sqrt(n)`**：大于 `sqrt(n)` 的合数必然有一个小于等于 `sqrt(n)` 的质因子，因此外层筛到 `i*i < n` 即可；不过直接筛到 `n` 也满足约束，代码更直观。
- **边界**：`n < 2`（即 `0`、`1`）时无质数，直接返回 0，避免数组越界。

## 解法

用埃拉托斯特尼筛法标记合数，扫描一遍统计仍为真的下标个数即为小于 `n` 的质数个数。

```javascript
/**
 * @param {number} n
 * @return {number}
 */
const countPrimes = (n) => {
  // 小于 3 时不存在质数，提前返回避免数组越界
  if (n < 3) return 0;
  // isPrime[i] 表示 i 当前是否仍被认为是质数
  const isPrime = new Array(n).fill(true);
  isPrime[0] = false;
  isPrime[1] = false;
  let count = 0;
  for (let i = 2; i < n; i++) {
    if (isPrime[i]) {
      count += 1;
      // 从 i*i 起把 i 的倍数标记为合数；i*i >= n 时内层不执行
      for (let j = i * i; j < n; j += i) {
        isPrime[j] = false;
      }
    }
  }
  return count;
};

// 验证
console.log(countPrimes(10)); // 4  （2, 3, 5, 7）
console.log(countPrimes(0)); // 0
console.log(countPrimes(1)); // 0
console.log(countPrimes(5)); // 2  （2, 3）
```

- **时间复杂度：** O(n log log n)
- **空间复杂度：** O(n)

## 补充

- **为什么要筛「小于 `n`」而非「小于等于 `n`」**：题目要求严格小于 `n`，所以 `isPrime` 开成长度为 `n`（下标 `0..n-1`），外层循环 `i < n`，`n` 本身不参与统计。
- **大 `n` 下的内存**：`n = 5 * 10^6` 时 `isPrime` 是 `5*10^6` 个布尔值的数组，JavaScript 中约为几 MB 到十余 MB（取决于引擎是否用 `Uint8Array` 优化），仍完全可接受；若要进一步省内存，可用 `new Uint8Array(n)` 代替 `Array`，访问性能也更好。
- **进阶**：线性筛（欧拉筛）可以把时间降到 `O(n)`，同时能顺便记录每个数的最小质因子；当题目要「列出」质数本身或要求 `n` 更大时，线性筛与分段筛（Segmented Sieve）是后续选项。
