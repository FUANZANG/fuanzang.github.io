# 数组中的第K个最大元素（Kth Largest Element in an Array）

**难度：** Medium

## 题目描述

给定整数数组 `nums` 和整数 `k`，请返回数组中第 `k` 个最大的元素。

请注意，你需要找的是**数组排序后的第 `k` 个最大的元素，而不是第 `k` 个不同的元素**。

你必须设计并实现时间复杂度为 `O(n)` 的算法解决此问题。

### 约束条件

- `1 <= k <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`

## 示例

```
输入: [3,2,1,5,6,4], k = 2
输出: 5
解释: 数组排序后为 [6,5,4,3,2,1]，第 2 个最大的元素是 5。
```

```
输入: [3,2,3,1,2,4,5,5,6], k = 4
输出: 4
解释: 数组排序后为 [6,5,5,4,3,3,2,2,1]，第 4 个最大的元素是 4（注意重复元素计入排名）。
```

## 提示 / 解题思路

- 最直接的做法是排序后取倒数第 `k` 个，时间复杂度 `O(n log n)`，但题目要求 `O(n)`（面试中至少要给出优于排序的解法）。
- **维护一个大小为 `k` 的最小堆**：遍历数组，把元素依次入堆；一旦堆大小超过 `k` 就弹出堆顶（当前最小的）。遍历结束后，堆里保留的正是**最大的 `k` 个元素**，堆顶就是第 `k` 大 —— 因为最小堆的堆顶是这 `k` 个数中最小的那个。
- 为什么用最小堆而不是最大堆？因为我们要随时淘汰“当前前 `k` 大里最小的那个”，最小堆的堆顶正好就是它，弹出代价 `O(log k)`。
- 复杂度：`n` 次入堆 + 出堆，每次 `O(log k)`，总计 `O(n log k)`；当 `k << n` 时明显优于排序。空间 `O(k)`。
- 进阶思路（达到严格 `O(n)`）：快速选择（Quickselect）—— 随机选 pivot 做_partition_，根据 pivot 最终落点递归一侧，期望复杂度 `O(n)`；或利用值域 `[-10^4, 10^4]` 做计数排序 `O(n + C)`。

## 解法

维护大小为 `k` 的最小堆，遍历结束堆顶即答案。

```javascript
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
const findKthLargest = (nums, k) => {
  const heap = new MinHeap()
  for (const num of nums) {
    heap.push(num)
    if (heap.size() > k) {
      heap.pop()
    }
  }
  return heap.peek()
}

// 最小堆（手写实现，不依赖库）
const swap = (arr, i, j) => {
  const tmp = arr[i]
  arr[i] = arr[j]
  arr[j] = tmp
}

class MinHeap {
  constructor() {
    this.data = []
  }

  size() {
    return this.data.length
  }

  peek() {
    return this.data[0]
  }

  push(val) {
    this.data.push(val)
    // 上浮：与父节点比较，比父小则交换
    let i = this.data.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.data[i] >= this.data[parent]) break
      swap(this.data, i, parent)
      i = parent
    }
  }

  pop() {
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0) {
      this.data[0] = last
      // 下沉：与较小的子节点比较，比子大则交换
      let i = 0
      const n = this.data.length
      while (true) {
        let smallest = i
        const left = 2 * i + 1
        const right = 2 * i + 2
        if (left < n && this.data[left] < this.data[smallest]) smallest = left
        if (right < n && this.data[right] < this.data[smallest]) smallest = right
        if (smallest === i) break
        swap(this.data, i, smallest)
        i = smallest
      }
    }
    return top
  }
}

// 验证
console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2)) // 期望输出 5
console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)) // 期望输出 4
```

- **时间复杂度：** O(n log k)（`n` 次堆操作，每次 `O(log k)`；`k << n` 时接近线性）
- **空间复杂度：** O(k)（堆中最多保留 `k` 个元素）

## 补充

- **进阶挑战**：用快速选择（Quickselect）把平均复杂度做到 `O(n)` —— 随机取 pivot，`partition` 后只递归包含第 `k` 大的一侧；最坏退化为 `O(n²)`，随机化后期望 `O(n)`。
- 相关题目：[前 K 个高频元素](./top-k-frequent-elements.md)（同样是“前 k 个”套路，堆解法可复用）、[数组中重复的数字](./find-the-duplicate-number.md)（值域受限时的计数/原地哈希思路）。
- 面试话术：数据流场景（元素动态到来）用堆；静态数组求严格 `O(n)` 用 Quickselect；值域小（如本题 `[-10^4, 10^4]`）可计数排序。
