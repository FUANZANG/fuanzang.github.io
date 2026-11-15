# 爱吃香蕉的珂珂（Koko Eating Bananas）

**难度：** Medium

## 题目描述

珂珂喜欢吃香蕉。这里有 n 堆香蕉，第 i 堆中有 piles[i] 根香蕉。警卫将会离开，恰好 H 小时后回来。

珂珂必须决定香蕉的消耗速度：每个小时，她可以选择一堆香蕉，然后最多吃 k 根。对于该小时，如果没有足够多的香蕉，她就会吃掉那一堆中的所有香蕉，并且不会在这一小时内继续吃另一堆。

返回让珂珂能够在警卫回来之前吃掉所有香蕉的最小整数 k（每小时吃的香蕉数）。

### 约束条件

- piles.length == n
- 1 <= n <= 10^4
- 1 <= H <= 10^9
- 1 <= piles[i] <= 10^9

## 示例

```
输入：piles = [3, 6, 7, 11], H = 8
输出：4
解释：当 k = 4（每小时吃 4 根）时：
  第 1 小时：吃 3 根香蕉的那堆（剩 1 根不吃），共 4 根
  第 2 小时：吃 6 根香蕉堆中的 4 根，共 8 根
  第 3 小时：吃 6 根堆剩下的 2 根，不继续吃其他堆，共 10 根
  第 4 小时：吃 7 根香蕉堆中的 4 根，共 14 根
  第 5 小时：吃 11 根香蕉堆中的 4 根，共 18 根
  第 6 小时：吃 11 根香蕉堆中的 4 根，共 22 根
  第 7 小时：吃 11 根香蕉堆剩下的 3 根，共 23 根
  7 小时吃完全部，H = 8 内可行。
```

```
输入：piles = [30, 11, 23, 4, 20], H = 5
输出：30
解释：H = 5 且共 5 堆，必须每堆恰好用 1 小时吃完，
  因此速度至少为最大堆的根数 30。
```

## 提示 / 解题思路

- 固定速度 k 时，吃完某堆所需小时数为 ceil(piles[i] / k)，总时长 = Σceil(piles[i] / k)；判断条件就是总时长是否 ≤ H。
- k 越大所需总时长越短：「总时长 ≤ H」关于 k 单调成立（小 k 不成立、大 k 一定成立），这是典型的**在答案上二分**结构。
- 答案下界为 1，上界为 max(piles)（一小时吃完最大堆，总时长 = n，而约束保证 n ≤ H，故必有解）。
- 用 `Math.ceil(a / b)` 计算单堆时长（a、b 均为正整数，也可用 `(a + b - 1) >> 1`）。
- 二分时取 `mid = (lo + hi) >> 1`：若 `need(mid) <= H` 则 `hi = mid`（答案可能更小），否则 `lo = mid + 1`；循环结束返回 `lo`。

## 解法

二分答案：对速度 k 检查 Σceil(piles[i]/k) 是否 ≤ H，利用「时长随 k 单调不增」找最小可行 k。

```javascript
/**
 * @param {number[]} piles
 * @param {number} h
 * @return {number}
 */
const minEatingSpeed = (piles, h) => {
  const needHours = (k) => piles.reduce((acc, p) => acc + Math.ceil(p / k), 0);
  let lo = 1;
  let hi = Math.max(...piles);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (needHours(mid) <= h) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};

// 验证
console.log(minEatingSpeed([3, 6, 7, 11], 8));       // 4
console.log(minEatingSpeed([30, 11, 23, 4, 20], 5)); // 30
```

- **时间复杂度：** O(n log m)，n 为堆数，m 为最大堆香蕉数（每次检查 O(n)，二分 log m 轮）
- **空间复杂度：** O(1)

## 补充

- 本题是「在答案空间上二分」的标准练习：二分的对象不是下标而是答案值本身。可对照同样是二分查找的 [旋转排序数组中的最小元素](./find-minimum-in-rotated-sorted-array.md)、[搜索旋转排序数组](./search-in-rotated-sorted-array.md)。
- 变形：若要求珂珂恰好 H 小时吃完（允许最后小时没吃完的剩余），答案仍是 k = max(piles)；把「不超过 H」改成「等于 H」会退化为贪心问题。
- 相关二分题：[寻找两个正序数组的中位数](./median-of-two-sorted-arrays.md)。
