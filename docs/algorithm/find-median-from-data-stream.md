# 数据流的中位数（Find Median from Data Stream）

**难度：** Hard

## 题目描述

中位数是有序整数列表中的中间值。如果列表的大小是偶数，则没有中间值，中位数是两个中间值的平均值。

- 例如 `arr = [2,3,4]` 的中位数是 `3`。
- 例如 `arr = [2,3]` 的中位数是 `(2 + 3) / 2 = 2.5`。

实现 `MedianFinder` 类：

- `MedianFinder()` 初始化 `MedianFinder` 对象。
- `void addNum(int num)` 将数据流中的整数 `num` 添加到数据结构中。
- `double findMedian()` 返回到目前为止所有元素的中位数。与实际答案相差 `10⁻⁵` 以内的答案将被接受。

### 约束条件

- `-10⁵ <= num <= 10⁵`
- 在调用 `findMedian` 之前，数据结构中至少有一个元素。
- 最多 `5 * 10⁴` 次调用 `addNum` 和 `findMedian`。

## 示例

```
输入：
["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]
[[], [1], [2], [], [3], []]

输出：
[null, null, null, 1.5, null, 2.0]

解释：
MedianFinder medianFinder = new MedianFinder();
medianFinder.addNum(1);    // arr = [1]
medianFinder.addNum(2);    // arr = [1, 2]
medianFinder.findMedian(); // 返回 1.5，即 (1 + 2) / 2
medianFinder.addNum(3);    // arr = [1, 2, 3]
medianFinder.findMedian(); // 返回 2.0
```

```
输入：
["MedianFinder", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian"]
[[], [5], [], [3], [], [8], [], [2], []]

输出：
[null, null, 5.0, null, 4.0, null, 5.0, null, 4.0]

解释：
依次加入 5、3、8、2，每次查询时的有序序列与中位数：
[5]       -> 5.0
[3, 5]    -> (3 + 5) / 2 = 4.0
[3, 5, 8] -> 5.0
[2, 3, 5, 8] -> (3 + 5) / 2 = 4.0
```

## 提示 / 解题思路

**先想最朴素的做法**：每来一个数就插入有序数组（或每次排序），`findMedian` 直接取下标。单次 `addNum` 需要 O(n) 插入（或 O(n log n) 排序），`5 * 10⁴` 次调用会超时。

**关键观察**：我们并不需要整个数组有序，只需要知道「正中间的那一两个数」是谁。也就是说，把数据切成两半就够了：

- 较小的一半放进**大顶堆** `lo`，堆顶是这一半的最大值；
- 较大的一半放进**小顶堆** `hi`，堆顶是这一半的最小值。

只要保证 `size(lo) == size(hi)`（偶数个）或 `size(lo) == size(hi) + 1`（奇数个），那么：

- 偶数个时，中位数 = `(lo 堆顶 + hi 堆顶) / 2`；
- 奇数个时，中位数 = `lo 堆顶`。

**插入时的两个动作**（维持「`lo` 里的数都 <= `hi` 里的数」这一性质）：

1. 先 `lo.push(num)`，再把 `lo` 的堆顶弹出压入 `hi` —— 保证新数不会把一个更大的值留在 `lo` 里；
2. 若此时 `size(hi) > size(lo)`，把 `hi` 的堆顶弹回 `lo` —— 保证数量平衡。

**语言层面的坑**：JavaScript 没有内置堆（优先队列），必须手写一个二叉堆。用数组存储、下标 `i` 的左右孩子为 `2i+1` / `2i+2`、父节点为 `(i-1)>>1`，比较器由参数传入即可同时支持大顶堆和小顶堆。

**另一种写法**：`addNum` 里判断 `num <= lo 堆顶` 决定进哪个堆，再 rebalance，效果等价。

## 解法

用大顶堆 `lo` 存较小的一半、小顶堆 `hi` 存较大的一半，保持 `lo` 的大小等于或多于 `hi` 一个；`findMedian` 直接读两个堆顶。JS 无内置堆，先手写一个通用的二叉堆。

```javascript
/**
 * 通用二叉堆：compare(a, b) < 0 表示 a 的优先级更高（更靠近堆顶）
 */
class BinaryHeap {
  constructor(compare) {
    this.data = []
    this.compare = compare
  }

  size() {
    return this.data.length
  }

  peek() {
    return this.data[0]
  }

  push(val) {
    const data = this.data
    data.push(val)
    let i = data.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(data[i], data[parent]) >= 0) break
      [data[i], data[parent]] = [data[parent], data[i]]
      i = parent
    }
  }

  pop() {
    const data = this.data
    const top = data[0]
    const last = data.pop()
    if (data.length > 0) {
      data[0] = last
      let i = 0
      for (;;) {
        const left = i * 2 + 1
        const right = left + 1
        let min = i
        if (left < data.length && this.compare(data[left], data[min]) < 0) min = left
        if (right < data.length && this.compare(data[right], data[min]) < 0) min = right
        if (min === i) break
        [data[i], data[min]] = [data[min], data[i]]
        i = min
      }
    }
    return top
  }
}

/**
 * 大顶堆 + 小顶堆，堆顶即中位数
 */
class MedianFinder {
  constructor() {
    this.lo = new BinaryHeap((a, b) => b - a) // 较小的一半，堆顶最大
    this.hi = new BinaryHeap((a, b) => a - b) // 较大的一半，堆顶最小
  }

  /**
   * @param {number} num
   * @return {void}
   */
  addNum(num) {
    this.lo.push(num)
    this.hi.push(this.lo.pop())
    if (this.hi.size() > this.lo.size()) {
      this.lo.push(this.hi.pop())
    }
  }

  /**
   * @return {number}
   */
  findMedian() {
    if (this.lo.size() > this.hi.size()) {
      return this.lo.peek()
    }
    return (this.lo.peek() + this.hi.peek()) / 2
  }
}

// 验证示例 1
const mf = new MedianFinder()
mf.addNum(1)
mf.addNum(2)
console.log(mf.findMedian()) // 1.5
mf.addNum(3)
console.log(mf.findMedian()) // 2.0

// 验证示例 2
const mf2 = new MedianFinder()
mf2.addNum(5)
console.log(mf2.findMedian()) // 5.0
mf2.addNum(3)
console.log(mf2.findMedian()) // 4.0
mf2.addNum(8)
console.log(mf2.findMedian()) // 5.0
mf2.addNum(2)
console.log(mf2.findMedian()) // 4.0

// 验证随机数据流：与排序后求中位数对比
const mf3 = new MedianFinder()
const buffer = []
let seed = 42
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed % 201 - 100
}
let ok = true
for (let i = 0; i < 500; i++) {
  const num = rand()
  buffer.push(num)
  mf3.addNum(num)
  buffer.sort((a, b) => a - b)
  const mid = buffer.length % 2 === 1
    ? buffer[(buffer.length - 1) / 2]
    : (buffer[buffer.length / 2 - 1] + buffer[buffer.length / 2]) / 2
  if (mf3.findMedian() !== mid) {
    ok = false
    console.log('mismatch at', i, mf3.findMedian(), mid)
    break
  }
}
console.log('random check:', ok ? 'PASS' : 'FAIL')
```

- **时间复杂度：** `addNum` O(log n)（两次堆插入/弹出），`findMedian` O(1)
- **空间复杂度：** O(n)，n 为已插入的元素个数

## 补充

**进阶问题（原题 Follow up）：**

- 若数据流中的所有整数都在 `[0, 100]` 范围内：开一个长度 101 的计数数组，`addNum` 直接 `cnt[num]++`，`findMedian` 时用两个「指针」从两端向中间扫，根据累计计数定位中间位置。因为值域只有 101，`addNum` 与 `findMedian` 都是 **O(1)**。
- 若 99% 的整数落在 `[0, 100]`：计数数组 + 两个小堆（分别存小于 0 和大于 100 的离群值）。查询时先根据计数判断中位数是否落在 `[0, 100]` 内，是则走计数数组路径，否则去离群堆里找。

**相关题目：**

- 同为「堆 / 优先队列」家族的 [数组中的第 K 个最大元素](./kth-largest-element-in-an-array.md)、[前 K 个高频元素](./top-k-frequent-elements.md)。
- 变形题「480. 滑动窗口中位数」——窗口滑动时既要插入也要删除，需要支持 `remove` 的堆（或两个 `TreeSet` / 延迟删除技巧）。
- 若数据流是静态数组，[寻找两个正序数组的中位数](./median-of-two-sorted-arrays.md) 用二分达到 O(log(m+n))，与本题的堆思路形成对照。
