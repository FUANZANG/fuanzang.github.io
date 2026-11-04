# 最长递增子序列的个数（Number of Longest Increasing Subsequence）

**难度：** Medium

## 题目描述

给定一个整数数组 `nums`，请计算其中**最长**严格递增子序列（LIS）的**个数**。

### 约束条件

- `1 <= nums.length <= 3000`
- `-10^5 <= nums[i] <= 10^5`
- 答案保证符合 32 位整数范围。

## 示例

输入：`nums = [1, 3, 5, 4, 7]`
输出：`2`
解释：存在两个最长递增子序列：`[1, 3, 4, 7]` 和 `[1, 3, 5, 7]`。

输入：`nums = [2, 2, 2, 2]`
输出：`4`
解释：最长递增子序列的长度为 1（如 `[2]`），共有 4 个位置各自构成一个长度为 1 的 LIS，因此答案为 4。

## 提示 / 解题思路

这是第 300 题「最长递增子序列」的计数加强版，用 DP 维护两个数组：

- `len[i]`：以 `nums[i]` 结尾的 LIS 长度，初始为 1。
- `cnt[i]`：以 `nums[i]` 结尾、长度为 `len[i]` 的递增子序列**个数**，初始为 1。

对每个 `i`，枚举 `j < i`，若 `nums[j] < nums[i]`：

- 当 `len[j] + 1 > len[i]`：发现更长的序列，`len[i] = len[j] + 1`，同时 `cnt[i] = cnt[j]`（**整体替换**，旧计数作废）；
- 当 `len[j] + 1 == len[i]`：同一条最大长度可由多条路径到达，`cnt[i] += cnt[j]`（**累加**，这是本题最易踩的坑——等长分支不能覆盖）。

最后答案 = 所有 `len[i]` 等于全局最大长度 `maxLen` 的 `cnt[i]` 之和。

## 解法

DP 同时记录每个位置的 LIS 长度与个数：严格变长时替换个数，同长时累加个数，最终汇总最大长度对应的所有个数。

```javascript
  /**
   * @param {number[]} nums 整数数组
   * @return {number} 最长严格递增子序列的个数
   */
  const findNumberOfLIS = (nums) => {
    const n = nums.length;
    const len = Array(n).fill(1); // 以 i 结尾的 LIS 长度
    const cnt = Array(n).fill(1); // 以 i 结尾、长度为 len[i] 的递增子序列个数
    let maxLen = 1;

    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (nums[j] < nums[i]) {
          if (len[j] + 1 > len[i]) {
            len[i] = len[j] + 1; // 发现更长的序列
            cnt[i] = cnt[j];     // 个数整体替换
          } else if (len[j] + 1 === len[i]) {
            cnt[i] += cnt[j];    // 同长度分支，累加个数
          }
        }
      }
      maxLen = Math.max(maxLen, len[i]);
    }

    let ans = 0;
    for (let i = 0; i < n; i++) {
      if (len[i] === maxLen) ans += cnt[i];
    }
    return ans;
  };

  // 验证
  console.log(findNumberOfLIS([1, 3, 5, 4, 7])); // 2
  console.log(findNumberOfLIS([2, 2, 2, 2])); // 4
```

- **时间复杂度：** O(n²)，两趟枚举 n² 个 (i, j) 对
- **空间复杂度：** O(n)，两个 DP 数组

## 补充

相关题目：[最长递增子序列](./longest-increasing-subsequence.md)（本题的基础版，只要求长度）。本题为计数版，答案保证符合 32 位整数，故无需处理大数溢出；若放宽该保证，需自行用 BigInt 或取模。
