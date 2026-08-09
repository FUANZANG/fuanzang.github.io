# 最长连续子数组和不超过 K（Shortest Subarray with Sum at Least K）

**难度：** Medium

## 题目描述

给定一个正整数数组 `nums` 和一个正整数 `k`，请找到**最长的连续子数组**，使得该子数组中所有元素的和 **不超过** `k`。

返回这个最长子数组的长度。如果不存在满足条件的子数组（即数组中最小的单个元素也大于 `k`），返回 `0`。

**约束条件：**
- `1 <= nums.length <= 10^5`
- `1 <= nums[i] <= 10^4`
- `1 <= k <= 10^9`

## 示例

```javascript
输入：nums = [10, 1, 2, 3, 1, 5], k = 6
输出：3
解释：子数组 [1, 2, 3] 的和为 6 <= k，长度为 3。
子数组 [1, 2, 3, 1] 的和为 7 > k，不满足条件。
最长满足条件的连续子数组长度为 3。
```

```javascript
输入：nums = [5, 3, 8], k = 2
输出：0
解释：数组中每个元素都大于 2，不存在满足条件的子数组。
```

```javascript
输入：nums = [1, 2, 3, 4, 5], k = 15
输出：5
解释：整个数组的和为 15 <= k，所以最长子数组就是整个数组。
```

## 提示 / 解题思路

<details>
<summary>点击展开提示 1：暴力法的思路</summary>

最直接的方法是枚举所有可能的子数组起点和终点，计算每个子数组的和，判断是否 `<= k`，记录最大长度。时间复杂度为 O(n²)，对于 n = 10^5 会超时，但可以作为理解题目的起点。
</details>

<details>
<summary>点击展开提示 2：关键观察</summary>

由于数组中**所有元素都是正整数**，这是一个非常重要的性质！

这意味着：当你从左边"收缩"窗口时，窗口内元素的和只会减小；当你从右边"扩张"窗口时，窗口内元素的和只会增大。

这种**单调性**是使用**滑动窗口（Sliding Window）**的前提条件。
</details>

<details>
<summary>点击展开提示 3：滑动窗口框架</summary>

维护一个窗口 `[left, right]`：

1. 用 `right` 指针逐步向右扩张窗口，每次将 `nums[right]` 加入当前窗口和 `sum`
2. 如果 `sum > k`，则用 `left` 指针逐步向右收缩窗口，从 `sum` 中减去 `nums[left]`，直到 `sum <= k`
3. 每次窗口合法时（`sum <= k`），更新最大长度 `maxLen = max(maxLen, right - left + 1)`
4. 最终返回 `maxLen`

时间复杂度：O(n)，因为 `left` 和 `right` 各最多遍历数组一次。
</details>

<details>
<summary>点击展开提示 4：边界情况</summary>

- 单个元素就大于 `k` 的情况
- 整个数组的和都 `<= k` 的情况
- 数组只有一个元素的情况

滑动窗口方法天然处理这些边界情况，不需要特殊判断。
</details>

## 解法

利用元素全为正数的单调性，用双指针滑动窗口：右指针扩张并累加，一旦和超过 k 就左指针收缩，每次合法窗口更新最大长度。

```javascript
/**
 * @param {number[]} nums - 正整数数组
 * @param {number} k - 目标和的上限
 * @return {number} 最长连续子数组的长度
 */
const longestSubarrayWithinK = (nums, k) => {
  let left = 0,
    sum = 0,
    maxLen = 0
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right]
    while (sum > k) {
      sum -= nums[left]
      left++
    }
    maxLen = Math.max(maxLen, right - left + 1)
  }
  return maxLen
}

// 验证
console.log(longestSubarrayWithinK([10, 1, 2, 3, 1, 5], 6)) // 3
console.log(longestSubarrayWithinK([5, 3, 8], 2)) // 0
console.log(longestSubarrayWithinK([1, 2, 3, 4, 5], 15)) // 5
```

- **时间复杂度：** O(n)，左右指针各至多遍历一次。
- **空间复杂度：** O(1)。
