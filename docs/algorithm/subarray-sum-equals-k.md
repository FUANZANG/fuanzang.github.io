# 和为 K 的子数组（Subarray Sum Equals K）

**难度：** Medium

## 题目描述

给定一个整数数组 `nums` 和一个整数 `k`，请你找出数组中**和为 `k` 的连续子数组的个数**。

子数组是数组中元素的连续非空序列。

**约束条件：**
- `1 <= nums.length <= 2 * 10⁴`
- `-1000 <= nums[i] <= 1000`
- `-10⁷ <= k <= 10⁷`

## 示例

**示例 1：**

```javascript
// 输入
;((nums = [1, 1, 1]), (k = 2))

// 输出
2

// 解释：有两个满足条件的子数组 [1, 1]（索引 0~1 和 索引 1~2）
```

**示例 2：**

```javascript
// 输入
;((nums = [1, 2, 3, -3, 1, 2]), (k = 3))

// 输出
4

// 解释：满足条件的子数组有：
// [1, 2]     (索引 0~1)
// [3]        (索引 2)
// [3, -3, 1, 2]  (索引 2~5)
// [1, 2]     (索引 4~5)
```

## 提示 / 解题思路

<details>
<summary>💡 提示 1：暴力思路</summary>

最直接的方式是枚举所有可能的子数组（两层循环），计算每个子数组的和，判断是否等于 `k`。时间复杂度为 O(n²) 或 O(n³)，想想能否优化？

</details>

<details>
<summary>💡 提示 2：前缀和</summary>

考虑使用前缀和（prefix sum）。如果从索引 `0` 到索引 `i` 的元素之和为 `sum[i]`，那么子数组 `nums[j+1 ... i]` 的和就等于 `sum[i] - sum[j]`。我们希望这个差值等于 `k`。

</details>

<details>
<summary>💡 提示 3：哈希表优化</summary>

在遍历数组的过程中，用一个哈希表记录每个前缀和出现的次数。对于当前的前缀和 `currentSum`，检查 `currentSum - k` 是否在哈希表中出现过——如果出现过，说明存在以当前位置结尾、和为 `k` 的子数组。

</details>

<details>
<summary>🔑 关键思路（再想一想再展开）</summary>

核心等式：

```
如果 sum[0..i] - sum[0..j] = k，则 sum[j+1..i] = k
```

因此，在遍历到位置 `i` 时：
1. 计算当前前缀和 `currentSum`
2. 查找哈希表中 `currentSum - k` 出现的次数，累加到结果中
3. 将 `currentSum` 存入哈希表

⚠️ 别忘了初始化哈希表：`map.set(0, 1)`（前缀和为 0 出现了 1 次），这处理了子数组恰好从索引 0 开始的情况。

时间复杂度：O(n)，空间复杂度：O(n)

</details>

## 解法

用前缀和 + 哈希表：遍历时维护当前前缀和，查找 sum-k 已出现的次数即是以当前位置结尾、和为 k 的子数组个数；注意初始化 map(0)=1。

```javascript
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
const subarraySum = (nums, k) => {
  const prefix = { 0: 1 }
  let sum = 0
  let count = 0
  for (const n of nums) {
    sum += n
    if (prefix[sum - k] !== undefined) count += prefix[sum - k]
    prefix[sum] = (prefix[sum] || 0) + 1
  }
  return count
}

// 验证
console.log(subarraySum([1, 1, 1], 2)) // 2
console.log(subarraySum([1, 2, 3], 3)) // 2
console.log(subarraySum([1, -1, 0], 0)) // 3
```
