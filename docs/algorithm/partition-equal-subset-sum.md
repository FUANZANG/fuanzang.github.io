# 分割等和子集（Partition Equal Subset Sum）

**难度：** Medium

## 题目描述

给你一个只包含正整数的非空数组 `nums`。请你判断是否可以将这个数组分割成两个子集，使得两个子集的元素和相等。

### 约束条件

- `1 <= nums.length <= 200`
- `1 <= nums[i] <= 100`

## 示例

**示例 1：**

```
输入：nums = [1,5,11,5]
输出：true
解释：数组可以分割成 [1, 5, 5] 和 [11]，两个子集的元素和都为 11。
```

**示例 2：**

```
输入：nums = [1,2,3,5]
输出：false
解释：数组不能分割成两个元素和相等的子集。
```

## 提示 / 解题思路

「能否分成两个和相等的子集」等价于：**能否从数组中选出若干个数，使它们的和恰好等于整个数组总和的一半**。

1. 先求总和 `sum`。若 `sum` 为奇数，一定无法平分，直接返回 `false`。
2. 否则目标为 `target = sum / 2`，问题转化为经典的 **0/1 背包**：每个数只能选一次，问能否恰好装满容量为 `target` 的背包。
3. 用一维布尔数组 `dp`，`dp[j]` 表示「能否凑出和为 `j`」。初始化 `dp[0] = true`（和为 0 天然可达）。
4. 遍历每个数 `num`，对容量 **从大到小** 更新：`dp[j] = dp[j] || dp[j - num]`。
   - **为什么必须倒序？** 倒序保证本轮更新 `dp[j]` 时用到的 `dp[j - num]` 还是「上一轮（不含当前数）」的旧值，从而每个数只被用一次；若正序则会重复使用同一个数（那是「完全背包」的写法）。
5. 最终 `dp[target]` 即为答案。

伪代码思路：

```
if sum 为奇数: return false
target = sum / 2
dp[0] = true
for num in nums:
  for j from target down to num:
    dp[j] = dp[j] || dp[j - num]
return dp[target]
```

## 解法

用 0/1 背包（一维布尔 DP）判断能否凑出总和的一半。

```javascript
/**
 * @param {number[]} nums
 * @return {boolean}
 */
const canPartition = (nums) => {
  const sum = nums.reduce((a, b) => a + b, 0)
  if (sum % 2 !== 0) return false

  const target = sum / 2
  const dp = new Array(target + 1).fill(false)
  dp[0] = true

  for (const num of nums) {
    // 从大到小遍历，保证每个数只被使用一次
    for (let j = target; j >= num; j--) {
      dp[j] = dp[j] || dp[j - num]
    }
  }

  return dp[target]
}

// 验证
console.log(canPartition([1, 5, 11, 5])) // true
console.log(canPartition([1, 2, 3, 5])) // false
```

- **时间复杂度：** O(n × target)，其中 n 为数组长度，target 为总和的一半。
- **空间复杂度：** O(target)，仅需一维 DP 数组。

## 补充

- **进阶挑战：** 如果要求返回具体的两个子集（而不仅是判断可行性），可以额外用二维 DP 记录每个状态的选择路径，再回溯构造出其中一个子集。
- **变形题：** [目标和（Target Sum）](./target-sum.md) —— 把「选/不选」扩展为「加/减」，同样可归约为子集和问题。
- **相关题型：** 零钱兑换、背包问题系列都属于「凑和」类动态规划，掌握一维倒序更新的技巧后可一并迁移。
