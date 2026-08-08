# 螺旋矩阵 II

**难度：** Medium

## 题目描述

给你一个正整数 `n`，请生成一个包含 `1` 到 `n²` 所有元素、且这些元素按**顺时针螺旋顺序**填充的 `n × n` 二维矩阵。

换句话说，你需要从外到内、按顺时针方向依次填入 `1, 2, 3, ..., n²`。

## 示例

**示例 1：**

输入：`n = 3`

输出：
```
[
  [1, 2, 3],
  [8, 9, 4],
  [7, 6, 5]
]
```

解释：从 (0,0) 开始，向右 → 向下 → 向左 → 向上，一圈一圈往里螺旋填入。

**示例 2：**

输入：`n = 1`

输出：
```
[[1]]
```

## 提示 / 解题思路

1. **核心观察**：这是一道典型的"模拟填充"问题。你需要模拟四个方向的移动：
   - **右**：从左到右遍历当前层的第一行
   - **下**：从上到下遍历当前层的最后一列
   - **左**：从右到左遍历当前层的最后一行
   - **上**：从下到上遍历当前层的最后一列

2. **边界管理**：每完成一个方向的填充，该方向的边界就"收缩"一次。可以用四个变量 `top`、`bottom`、`left`、`right` 来表示当前待填充区域的边界。

3. **终止条件**：当 `top > bottom` 或 `left > right` 时，说明所有位置都已填满。

4. **注意奇数 n**：当 `n` 为奇数时，最中心的位置只会被一次填充。确保在每一轮循环中，你检查每个方向是否"越界"（即填充前判断 `top <= bottom` / `left <= right`），避免重复填充中心点。

5. **数据结构选择**：直接创建一个 `n × n` 的二维数组，所有位置初始化为 0，然后按方向填入递增的数字即可。

## 解法

模拟填充：用 `top / bottom / left / right` 四个边界表示当前待填充环，按「右 → 下 → 左 → 上」顺序顺时针填数，每填完一条边就收缩对应边界。填左、上两条边前需判断边界是否仍合法（`top <= bottom` / `left <= right`），避免奇数 `n` 时中心点被重复填充。

```javascript
/**
 * @param {number} n
 * @return {number[][]}
 */
const generateMatrix = (n) => {
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0))
  let top = 0,
    bottom = n - 1,
    left = 0,
    right = n - 1,
    num = 1
  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) matrix[top][i] = num++
    top++
    for (let i = top; i <= bottom; i++) matrix[i][right] = num++
    right--
    if (top <= bottom) {
      for (let i = right; i >= left; i--) matrix[bottom][i] = num++
      bottom--
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) matrix[i][left] = num++
      left++
    }
  }
  return matrix
}

// 验证
console.log(JSON.stringify(generateMatrix(3))) // [[1,2,3],[8,9,4],[7,6,5]]
console.log(JSON.stringify(generateMatrix(1))) // [[1]]
```

- **时间复杂度：** O(n²)，每个单元格恰好填一次。
- **空间复杂度：** O(n²)，结果矩阵本身（若不计输出则为 O(1)）。
