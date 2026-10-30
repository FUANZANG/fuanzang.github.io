# 最大矩形（Maximal Rectangle）

**难度：** Medium

## 题目描述

给定一个仅包含 `'0'` 和 `'1'` 的二维二进制矩阵，找出只包含 `'1'` 的最大矩形，并返回其面积。

### 约束条件

- `rows == matrix.length`
- `cols == matrix[0].length`
- `1 <= rows, cols <= 200`
- `matrix[i][j]` 为 `'0'` 或 `'1'`

## 示例

**示例 1：**

```
输入：matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
输出：6
解释：最大矩形如上图红色区域所示，面积为 6
```

**示例 2：**

```
输入：matrix = [["0"]]
输出：0
```

**示例 3：**

```
输入：matrix = [["1"]]
输出：1
```

## 提示 / 解题思路

**核心：将问题降维为一维「柱状图中最大矩形」问题。**

1. **逐行累高**：维护一个长度为 `cols` 的 `heights` 数组，`heights[c]` 表示「在当前行、第 `c` 列向上连续延伸的 `'1'` 的个数」。
   - 若 `matrix[r][c] === '1'`，则 `heights[c] += 1`；
   - 若 `matrix[r][c] === '0'`，则 `heights[c] = 0`（连续性断裂）。
2. **每行求直方图最大矩形**：对当前行的 `heights` 数组，套用「柱状图中最大矩形」的单调栈算法，O(cols) 求出该行能勾勒出的最大矩形面积。
3. **取所有行的最大值**：全局最大值即为答案。
4. **时间复杂度分析**：外层遍历 `rows` 行，内层单调栈 O(cols)，合计 O(rows × cols)；空间 O(cols)。

**为什么可以降维？**
以某一行作为矩形的「底边」，该行上每个位置连续向上的 `1` 就构成一个柱状图。这个柱状图中每一个以底边为基准的矩形，都对应原矩阵中的一个合法矩形。枚举所有行，等价于枚举所有可能的矩形底边，因此一定能找到最大矩形。

## 解法

逐行构建高度直方图，每一行用单调递增栈求该直方图的最大矩形面积，取全局最大值。

```javascript
/**
 * @param {character[][]} matrix
 * @return {number}
 */
const maximalRectangle = (matrix) => {
  if (!matrix || matrix.length === 0) return 0;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const heights = new Array(cols).fill(0);
  let maxArea = 0;

  // 单行直方图最大矩形 —— 单调递增栈，O(cols)
  const largestHistogram = (h) => {
    const stack = []; // 存放下标，栈内对应高度单调递增
    let area = 0;
    for (let i = 0; i <= h.length; i++) {
      // i == h.length 时以 0 作哨兵，保证栈内剩余全部弹出
      const curH = i === h.length ? 0 : h[i];
      while (stack.length > 0 && h[stack[stack.length - 1]] >= curH) {
        const top = stack.pop();
        const height = h[top];
        const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
        area = Math.max(area, height * width);
      }
      stack.push(i);
    }
    return area;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === '1') {
        heights[c] += 1;
      } else {
        heights[c] = 0;
      }
    }
    maxArea = Math.max(maxArea, largestHistogram(heights));
  }

  return maxArea;
};

// 验证
console.log(maximalRectangle([["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]])); // 6
console.log(maximalRectangle([["0"]])); // 0
console.log(maximalRectangle([["1"]])); // 1
```

- **时间复杂度：** O(rows × cols)，每一行 O(cols) 的直方图计算。
- **空间复杂度：** O(cols)，`heights` 数组和单调栈各 O(cols)。

## 补充

- 本题是「柱状图中最大矩形」的二维扩展。思路与 [最大正方形（Maximal Square）](./maximal-square.md) 类似，后者是二维 DP 的经典入门；本题则复用单调栈，把二维压成一维。
- 变形方向：若矩阵中的元素不再是等宽的 `1×1` 格子，而是给定每个格子不同的宽度/高度，问题会如何变化？
- 进阶思考：如果要求「只包含 1 的最大正方形」，用 DP 更直接；如果要求「只包含 1 的最大矩形」，单调栈直方图法是标准做法。
