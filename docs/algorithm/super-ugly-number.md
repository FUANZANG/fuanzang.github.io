# 超级丑数（Super Ugly Number）

**难度：** Medium

## 题目描述

超级丑数是一个正整数，其所有质因数都包含在数组 `primes` 中。

给定一个整数 `n` 和一个整数数组 `primes`，返回第 `n` 个超级丑数。

**注意：** 第 `n` 个超级丑数保证在 32 位有符号整数范围内。

### 约束条件

- `1 <= n <= 10^5`
- `1 <= primes.length <= 100`
- `2 <= primes[i] <= 1000`
- `primes[i]` 保证是一个质数。
- `primes` 中的所有值唯一且按升序排列。

## 示例

示例 1：

```
输入：n = 12, primes = [2,7,13,19]
输出：32
解释：[1,2,4,7,8,13,14,16,19,26,28,32] 是 primes = [2,7,13,19] 的前 12 个超级丑数。
```

示例 2：

```
输入：n = 1, primes = [2,3,5]
输出：1
解释：1 没有任何质因数，因此它的所有质因数都在数组 primes = [2,3,5] 中。
```

## 提示 / 解题思路

- 本题是「丑数」系列的推广：经典丑数固定质因数集合为 {2, 3, 5}，而本题的质因数集合是任意的 `primes`。
- 暴力枚举或最小堆生成第 n 个数，在 `n` 最大 `10^5`、`primes.length` 最大 `100` 时开销偏大；更优的做法是**多指针动态规划**。
- 关键观察：已经生成好的超级丑数序列 `dp` 是严格递增的。对每个质数 `primes[j]`，维护一个指针 `pos[j]`，表示"下一个候选 = `dp[pos[j]] * primes[j]`"。每个质数的候选值序列随指针前进单调不减。
- 每一步取所有质数候选值的最小者作为下一个超级丑数；然后**只把产生该最小值的指针前移一步**（由于 dp 严格递增，每个指针的候选序列也严格递增，前移一步即可，且所有产生相同最小值的指针都要前移，避免重复）。
- 初始时 `dp = [1]`（1 没有质因数，属于第 1 个超级丑数），所有指针为 0。

伪代码思路：

```
dp = [1]
pos = [0] * len(primes)
for i in 1 .. n-1:
    next = min over j of dp[pos[j]] * primes[j]
    dp[i] = next
    for each j where dp[pos[j]] * primes[j] == next:
        pos[j] += 1
return dp[n-1]
```

## 解法

多指针 DP：每个质数维护一个指向 dp 序列的指针，每步取所有候选 `dp[pos[j]] * primes[j]` 的最小值作为下一个超级丑数，并前移产生最小值的指针去重。

```javascript
/**
 * @param {number} n
 * @param {number[]} primes
 * @return {number}
 */
const superUglyNumber = (n, primes) => {
  const m = primes.length;
  // dp[i] 为第 i+1 个超级丑数（0 起），dp[0] = 1
  const dp = [1];
  // pos[j] 表示质数 primes[j] 的下一个候选来自 dp[pos[j]]
  const pos = new Array(m).fill(0);
  for (let i = 1; i < n; i++) {
    let next = Infinity;
    for (let j = 0; j < m; j++) {
      next = Math.min(next, dp[pos[j]] * primes[j]);
    }
    dp.push(next);
    // 前移所有产生 next 的指针，保证候选严格递增、不产生重复
    for (let j = 0; j < m; j++) {
      if (dp[pos[j]] * primes[j] === next) {
        pos[j]++;
      }
    }
  }
  return dp[n - 1];
};

// 验证
console.log(superUglyNumber(12, [2, 7, 13, 19])); // 32
console.log(superUglyNumber(1, [2, 3, 5])); // 1
```

- **时间复杂度：** O(n × m)，其中 m = primes.length；每步遍历 m 个质数两次。
- **空间复杂度：** O(n + m)，dp 数组长度为 n，指针数组长度为 m。

## 补充

- 本题可看作 LeetCode 264「丑数 II」（固定质因数 {2, 3, 5}）对任意质数集合的推广，算法结构完全一致，只是指针数量从 3 个变成 m 个。
- 另一种常见写法是用最小堆（优先队列）：把每个质数与 1 的乘积入堆，每次弹出最小值 x，将 x × primes[j]（所有 j）去重后入堆。复杂度 O(n·m·log(n·m))，在本题约束下可行但常数更大；多指针方案是面试中更优的写法。
- 边界：`n = 1` 时直接返回 1，循环体一次都不会执行，上述实现天然兼容。
