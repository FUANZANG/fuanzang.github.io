# 跳跃游戏 II

**难度：** Medium

## 题目描述

给定一个非负整数数组 `nums`，你最初位于数组的第一个下标 `0`。数组中的每个元素代表你在该位置可以跳跃的最大长度。

你的目标是使用**最少的跳跃次数**到达数组的最后一个下标。

假设你总是可以到达数组的最后一个下标。

请编写一个函数，返回到达最后位置的最少跳跃次数。

## 示例

**输入：** `nums = [2, 3, 1, 1, 4]`

**输出：** `2`

**解释：**
- 从下标 `0` 跳到下标 `1`（跳 1 步，`nums[0] = 2`，可以选择跳 1 或 2 步）
- 从下标 `1` 跳到下标 `4`（跳 3 步，`nums[1] = 3`）
- 总共跳跃 **2** 次，到达最后一个下标。

**输入：** `nums = [2, 3, 0, 1, 4]`

**输出：** `2`

**解释：**
- 从下标 `0` 跳到下标 `1`（跳 1 步）
- 从下标 `1` 跳到下标 `4`（跳 3 步）
- 总共跳跃 **2** 次。

## 提示 / 解题思路

这道题可以用**贪心策略**在 O(n) 时间内解决，核心思想是：

1. 维护三个变量：
   - `jumps`：当前已跳跃的次数
   - `currentEnd`：当前这一跳能到达的最远边界
   - `farthest`：在遍历过程中，下一跳能到达的最远位置

2. 遍历数组（注意不需要遍历到最后一个元素）：
   - 不断更新 `farthest = max(farthest, i + nums[i])`
   - 当 `i` 到达 `currentEnd` 时，说明当前这一跳的边界已到，必须再跳一次：
     - `jumps++`
     - `currentEnd = farthest`
   - 如果 `currentEnd` 已经覆盖了最后一个下标，可以提前退出

3. **关键直觉**：在当前一跳能到达的范围内，贪心地选择能让下一跳跳得最远的位置。

可以把数组看作一个图：
- 每个下标是一个节点
- 从下标 `i` 可以到达 `[i+1, i+nums[i]]` 范围内的所有节点
- 求从节点 `0` 到节点 `n-1` 的最短路径（BFS 天然适合）

每一"层"就是一次跳跃能到达的所有位置。BFS 的层数就是最少跳跃次数。

> 💡 **提示**：贪心方法本质上就是 BFS 的优化版——不需要显式维护队列，只需用 `currentEnd` 和 `farthest` 两个指针来追踪层的边界。

## 解法

贪心（BFS 优化版）：维护当前跳可达边界 `currentEnd` 与遍历中能到达的最远位置 `farthest`；当右指针到达 `currentEnd` 时说明必须再跳一次，更新边界为 `farthest`。

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
const jump = (nums) => {
  let jumps = 0,
    currentEnd = 0,
    farthest = 0
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i])
    if (i === currentEnd) {
      jumps++
      currentEnd = farthest
    }
  }
  return jumps
}

// 验证
console.log(jump([2, 3, 1, 1, 4])) // 2
console.log(jump([2, 3, 0, 1, 4])) // 2
console.log(jump([1, 1, 1, 1])) // 3
console.log(jump([0])) // 0
console.log(jump([1, 2, 3, 4, 5])) // 3
```

- **时间复杂度：** O(n)
- **空间复杂度：** O(1)
