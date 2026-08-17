# 前 K 个高频元素（Top K Frequent Elements）

**难度：** Medium

## 题目描述

给你一个整数数组 `nums` 和一个整数 `k`，返回数组中出现频率最高的 `k` 个元素。你可以按任意顺序返回答案。

### 约束条件

- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`
- `k` 的取值范围为 `[1, 数组中不同元素的数量]`
- 题目保证答案唯一：即数组中「不同元素的数量」恰好为 `k`，且**答案确定**。

## 示例

**示例 1：**

```
输入：nums = [1,1,1,2,2,3], k = 2
输出：[1,2]
解释：出现频率最高的两个元素是 1 和 2，分别出现了 3 次和 2 次。
```

**示例 2：**

```
输入：nums = [1], k = 1
输出：[1]
```

**示例 3：**

```
输入：nums = [1,2,1,2,1,2,3,1,3,2], k = 2
输出：[1,2]
解释：出现频率最高的两个元素是 1 和 2，二者均出现了 4 次。
```

## 提示 / 解题思路

**进阶要求：** 时间复杂度必须优于 `O(n log n)`。

朴素做法：用哈希表统计频率（`O(n)`），然后对频率排序取前 `k`（`O(n log n)`）—— 排序是瓶颈，无法满足进阶。

关键思路是**「桶排序（计数排序）」**：

1. 用 `Map` 统计每个元素出现的次数；
2. 创建 `n+1` 个桶，第 `i` 个桶存放「出现次数恰好为 `i`」的所有元素。出现次数的取值范围是 `[1, n]`，因此桶的下标天然落在 `[0, n]` 内，**无需排序**；
3. 从出现次数最大的桶（下标 `n`）倒序遍历，把元素依次装入结果，直到收集到 `k` 个元素为止。

因为桶的下标本身就是「出现次数」天然有序，这个过程只需线性扫描，达到 `O(n)`。

## 解法

用哈希表统计频率，再用「出现次数作为桶下标」的桶排序法直接拿到前 `k` 高频元素，无需排序。

```javascript
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
const topKFrequent = (nums, k) => {
  // 1. 统计每个元素的出现频率
  const freq = new Map()
  for (const num of nums) {
    freq.set(num, (freq.get(num) || 0) + 1)
  }

  // 2. 桶排序：把「出现次数」作为桶的下标，桶中存放出现次数等于该下标的元素
  //    最大出现次数不超过 nums.length，因此桶的范围是 [0, n]
  const n = nums.length
  const buckets = Array.from({ length: n + 1 }, () => [])
  for (const [num, count] of freq) {
    buckets[count].push(num)
  }

  // 3. 从出现次数最多的桶倒序遍历，收集 k 个元素即停止
  const result = []
  for (let i = n; i >= 1 && result.length < k; i--) {
    for (const num of buckets[i]) {
      result.push(num)
      if (result.length === k) break
    }
  }
  return result
}

// 验证
console.log(topKFrequent([1, 1, 1, 2, 2, 3], 2)) // [1, 2]
console.log(topKFrequent([1], 1)) // [1]
console.log(topKFrequent([1, 2, 1, 2, 1, 2, 3, 1, 3, 2], 2)) // [1, 2]
```

- **时间复杂度：** O(n)，n 为数组长度；统计频率、装桶与倒序遍历均为线性；
- **空间复杂度：** O(n)，哈希表与桶数组共占线性空间。

## 补充

- **进阶挑战：** 尝试用「快速选择（Quickselect）」在平均 `O(n)` 时间复杂度内解决本题，并分析其最坏情况。
- **变形题**「数组中的第K个最大元素」（Kth Largest Element in an Array）与本题同为「前 K / 第 K」系列，可用小顶堆或快速选择练习。
