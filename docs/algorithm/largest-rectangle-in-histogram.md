# 柱状图中最大的矩形（Largest Rectangle in Histogram）

**难度：** Hard

## 题目描述

给定 n 个非负整数，用来表示柱状图中各个柱子的高度。每个柱子彼此相邻，且宽度为 1 。

求在该柱状图中，能够勾勒出来的矩形的最大面积。

### 约束条件

- `1 <= heights.length <= 10^5`
- `0 <= heights[i] <= 10^4`

## 示例

**示例 1：**

```
输入：heights = [2,1,5,6,2,3]
输出：10
解释：最大的矩形为图中红色区域，面积为 10
```

**示例 2：**

```
输入：heights = [2,4]
输出：4
```

## 提示 / 解题思路

**核心思路：单调栈**

1. **暴力思路**：枚举所有可能的矩形左右边界，取最小高度计算面积，时间复杂度 O(n²)，会超时。

2. **转换视角**：对于每个柱子 `i`，如果它是某个矩形中最矮的柱子，那么这个矩形的宽度就是 `i` 向左右延伸直到遇到比它矮的柱子为止的距离。

3. **单调栈**：维护一个单调递增栈，栈中存放下标。当遇到比栈顶元素矮的柱子时，栈顶元素出栈，此时：
   - 栈顶元素的高度就是矩形的高度
   - 新的栈顶元素就是左边界（比它矮的第一个位置）
   - 当前元素就是右边界（比它矮的第一个位置）
   - 宽度 = 右边界 - 左边界 - 1

4. **边界处理**：在数组两端各加一个高度为 0 的哨兵，简化边界判断。

## 解法

单调栈：每个柱子入栈出栈各一次，找到左右第一个比它矮的柱子，计算以当前柱子为高的最大矩形面积。

```javascript
/**
 * @param {number[]} heights
 * @return {number}
 */
const largestRectangleArea = (heights) => {
  // 在数组两端添加哨兵 0，简化边界处理
  const h = [0, ...heights, 0];
  const n = h.length;
  const stack = []; // 单调递增栈，存放下标
  let maxArea = 0;

  for (let i = 0; i < n; i++) {
    // 当前柱子比栈顶矮，栈顶元素出栈并计算面积
    while (stack.length > 0 && h[i] < h[stack[stack.length - 1]]) {
      const top = stack.pop();
      const height = h[top];
      // 左边界是新的栈顶，右边界是当前 i
      const width = i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, height * width);
    }
    stack.push(i);
  }

  return maxArea;
};

// 验证
console.log(largestRectangleArea([2, 1, 5, 6, 2, 3])); // 10
console.log(largestRectangleArea([2, 4])); // 4
```

- **时间复杂度：** O(n)，每个元素最多入栈出栈各一次
- **空间复杂度：** O(n)，栈的空间

## 补充

- **相关题目**：85. 最大矩形（将本题思路扩展到二维矩阵，逐行构建柱状图后复用本题解法）
- **变形题**：[42. 接雨水](./trapping-rain-water.md)（同样使用单调栈，但找的是两边第一个比它高的柱子）
- **进阶思考**：如果柱子宽度不再为 1，而是给定每个柱子的宽度数组 `widths`，如何修改算法？
