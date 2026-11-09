# 插入区间（Insert Interval）

**难度：** Medium

## 题目描述

给定一个**区间**数组 `intervals`，其中 `intervals[i] = [start_i, end_i]` 表示第 `i` 个区间的起点与终点，区间互不重叠，且已按 `start_i` **升序**排列。再给定另一个区间 `newInterval = [start, end]`。

请将 `newInterval` 插入到 `intervals` 中，使得插入后 `intervals` 仍满足：

- 按 `start_i` 升序排列；
- 区间互不重叠（必要时合并重叠的区间）。

返回插入后的 `intervals`。

> 注意：你**不需要**原地修改 `intervals`，可以构造一个新的数组返回。

### 约束条件

- `0 <= intervals.length <= 10^4`
- `intervals[i].length == 2`
- `0 <= start_i <= end_i <= 10^5`
- `intervals` 按 `start_i` 升序排列
- `newInterval.length == 2`
- `0 <= start <= end <= 10^5`

## 示例

```
输入：intervals = [[1,3],[6,9]], newInterval = [2,5]
输出：[[1,5],[6,9]]
```

```
输入：intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]
输出：[[1,2],[3,10],[12,16]]
解释：新区间 [4,8] 与 [3,5]、[6,7]、[8,10] 重叠，合并为 [3,10]。
```

## 提示 / 解题思路

输入数组**已经排好序且不重叠**，这是与「合并重叠区间」最大的区别——本题**无需再排序**，只需把新区间"插进去并就地合并"。

把区间按与 `newInterval` 的关系分成三段（一次遍历即可）：

1. **左段**：终点 `end_i < newInterval[0]` 的区间，落在新区间左侧、互不重叠，直接原样收入结果。
2. **中段**：起点 `start_i <= 当前右边界` 的区间与新区间重叠（"当前右边界"在合并过程中不断向右扩），它们与 `newInterval` 一起合并成一个区间，其左右端点分别取 `min` / `max`。
3. **右段**：剩下的区间起点都大于合并后的右端点，直接原样收入结果。

要点提醒：

- 中段合并条件是 `intervals[i][0] <= end`，其中 `end` 是**不断扩张中的右边界**（`Math.max`），这样能一次性吞掉所有重叠区间。
- 左段判定用 `intervals[i][1] < newInterval[0]`（终点严格小于新区间起点才算不重叠；端点相接不算重叠，会被中段合并）。
- 三个 `while` 循环共用同一个下标 `i`，合起来恰好扫描一遍，无需额外排序。

## 解法

单次遍历分三段：左侧不重叠区间直接收，中间与新区间重叠的合并成一个，右侧不重叠区间直接收。

```javascript
/**
 * @param {number[][]} intervals
 * @param {number[]} newInterval
 * @return {number[][]}
 */
const insertInterval = (intervals, newInterval) => {
  const res = []
  const n = intervals.length
  let i = 0

  // 左段：终点早于新区间起点的，互不重叠，直接收
  while (i < n && intervals[i][1] < newInterval[0]) {
    res.push(intervals[i])
    i++
  }

  // 中段：把所有与新区间重叠的区间合并成一个
  let start = newInterval[0]
  let end = newInterval[1]
  while (i < n && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0])
    end = Math.max(end, intervals[i][1])
    i++
  }
  res.push([start, end])

  // 右段：起点晚于合并后右端点的，直接收
  while (i < n) {
    res.push(intervals[i])
    i++
  }

  return res
}

// 验证
console.log(JSON.stringify(insertInterval([[1, 3], [6, 9]], [2, 5])))
// 期望输出：[["1,5"],["6,9"]] 即 [[1,5],[6,9]]
console.log(
  JSON.stringify(
    insertInterval([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]),
  ),
)
// 期望输出：[[1,2],[3,10],[12,16]]
```

- **时间复杂度：** O(n)，n 为 `intervals.length`；三个 `while` 循环共用下标一次扫完，无排序。
- **空间复杂度：** O(n)，结果数组空间（不计输出则为 O(1) 辅助空间）。

## 补充

- 前置题 [合并重叠区间（Merge Intervals）](./merge-intervals.md)：输入**无序**需先排序再合并；本题输入已有序，省去排序，只需插入单个区间并就地合并，因此能从 O(n log n) 优化到 O(n)。
- 同属区间贪心家族的 [用最少数量的箭引爆气球（Minimum Number of Arrows to Burst Balloons）](./minimum-number-of-arrows-to-burst-balloons.md)：按右端点排序后贪心，是"合并重叠区间"的变体。
- 变形题「228. 汇总区间（Summary Ranges）」：把**一维数组**中的连续整数压缩成区间列表，是本题的反向操作。
