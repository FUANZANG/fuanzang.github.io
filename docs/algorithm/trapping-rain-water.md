# 接雨水（Trapping Rain Water）

**难度：** Hard

## 题目描述

给定 `n` 个非负整数表示每个宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

你可以将每个柱子想象成一道竖直的墙壁，高度由数组 `height[i]` 给出。当下雨后，某些凹陷区域会积蓄雨水。你需要返回这些积水的**总面积**（即总水量）。

## 示例

```
输入：height = [0,1,0,2,1,0,1,3,2,1,2,1]
输出：6

解释：
图示（# 表示柱子，· 表示水）：

                    #
        #   ·   ·   #   #   ·   #
        #   #   ·   #   #   ·   #   #
    #   #   #   #   #   #   #   #   #   #
    0   1   0   2   1   0   1   3   2   1   2   1

在柱子之间可以积蓄 6 个单位的雨水。
```

```
输入：height = [4,2,0,3,2,5]
输出：9

解释：
- 索引 1~4 之间可接水：柱子高度 [2,0,3,2]，左右两侧最高为 4 和 5
- 最终总共积蓄 9 个单位的雨水
```

## 提示 / 解题思路

> 💡 **不要急着看提示！先独立思考 15~20 分钟，实在没思路再往下看。**

<details>
<summary>💡 提示 1：核心观察</summary>

对于每一个位置 `i`，它能接多少水取决于什么？

想一想：某一格能蓄水，是因为它**左边有更高的柱子**且**右边也有更高的柱子**。具体来说，位置 `i` 能接的水量 = `min(左边最高柱子, 右边最高柱子) - height[i]`（当然结果不能为负）。

</details>

<details>
<summary>💡 提示 2：暴力法 → 优化</summary>

最朴素的做法：对每个位置 `i`，分别向左和向右扫描找到最高柱子。这样时间复杂度是 O(n²)。

能否预处理出每个位置的"左边最高"和"右边最高"？用两个数组来存？这样时间复杂度可以优化到 O(n)，空间 O(n)。

</details>

<details>
<summary>💡 提示 3：进阶 — 双指针法</summary>

能否将空间复杂度优化到 O(1)？

提示：使用**左右双指针**，从两端向中间逼近。维护 `leftMax` 和 `rightMax`，每次移动较小那一侧的指针。想一想为什么这样可以？

关键逻辑：当 `leftMax < rightMax` 时，左指针所在位置的水量已经可以确定（因为右边一定有更高的柱子兜底）。

</details>

<details>
<summary>💡 提示 4：另一种思路 — 单调栈</summary>

维护一个**单调递减栈**（栈中存索引）。当遇到比栈顶高的柱子时，说明形成了一个可以蓄水的"凹槽"，弹出栈顶并计算水量。

这种思路的时间复杂度也是 O(n)，而且只需要遍历一次数组。

</details>

## 解法

双指针从两端向中间逼近，维护 `leftMax` 与 `rightMax`。每次移动较小一侧的指针：较小侧的水量已可由对侧更高的柱子兜底，直接用 `min(leftMax,rightMax) - height` 累加，空间优化到 O(1)。

```javascript
/**
 * @param {number[]} height
 * @return {number}
 */
const trap = (height) => {
  let left = 0
  let right = height.length - 1
  let leftMax = 0
  let rightMax = 0
  let water = 0
  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left])
      water += leftMax - height[left]
      left++
    } else {
      rightMax = Math.max(rightMax, height[right])
      water += rightMax - height[right]
      right--
    }
  }
  return water
}

// 验证
console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])) // 6
console.log(trap([4, 2, 0, 3, 2, 5])) // 9
console.log(trap([1, 0, 2])) // 1
```
