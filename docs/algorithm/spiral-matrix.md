# 螺旋矩阵（Spiral Matrix）

**难度：** Medium

## 题目描述

给你一个 `m x n` 的二维数组 `matrix`，要求按照**顺时针螺旋顺序**，返回矩阵中的所有元素。

具体来说，从左上角的第一个元素开始，先向**右**遍历一行，再向**下**遍历一列，再向**左**遍历一行，再向**上**遍历一列，然后继续内层的一圈，直到访问完所有元素。

![](https://assets.leetcode-cn.com/aliyun-lc-upload/uploaded_data/1655444825.png)

**函数签名：**

## 示例

**示例 1：**

```
输入：matrix = [[1,2,3],[4,5,6],[7,8,9]]
输出：[1,2,3,6,9,8,7,4,5]
解释：顺时针螺旋遍历该 3x3 矩阵：
  → 1 → 2 → 3
                ↓
  4 → 5 → 6    9
  ↑            8 ← 7
  ──────────────
```

**示例 2：**

```
输入：matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]
输出：[1,2,3,4,8,12,11,10,9,5,6,7]
解释：这是一张 3x4 的非 square 矩阵，请注意上下左右边界的处理。
```

## 提示 / 解题思路

<details>
<summary>💡 提示 1（最直观的模拟 — 方向切换）</summary>

螺旋遍历的本质是：**在当前方向上一直前进，遇见"墙"（边界或已访问过的位置）时，就顺时针转向**。

我们可以定义一个方向数组 `directions`，记录四个移动方向的坐标增量：

```js
// 右 → 下 → 左 → 上
const directions = [
  [0, 1],   // 向右：行不变，列 +1
  [1, 0],   // 向下：行 +1，列不变
  [0, -1],  // 向左：行不变，列 -1
  [-1, 0],  // 向上：行 -1，列不变
];
```

使用一个指针 `dir` 指向当前方向。每一步：

1. 把当前位置的元素加入结果。
2. 标记当前位置为"已访问"（可以用一个 `visited` 二维数组，或者直接把元素设为 `null` 等特殊值 —— 这里要注意题目允许负数的范围，只要特殊值不在 `[-100, 100]` 内即可）。
3. 计算下一个位置 `(nextRow, nextCol)`。
4. 如果下一个位置越界**或**已被访问，就把方向顺时针切换（`dir = (dir + 1) % 4`），并重新计算下一个位置。
5. 重复直到访问完 `m * n` 个元素。

这种方法的代码框架大致是：

```js
const visited = Array.from({ length: m }, () => new Array(n).fill(false));
const res = [];
let row = 0, col = 0;
let dir = 0; // 当前方向索引

for (let i = 0; i < m * n; i++) {
  res.push(matrix[row][col]);
  visited[row][col] = true;

  // 尝试在当前方向上走一步
  let nextRow = row + directions[dir][0];
  let nextCol = col + directions[dir][1];

  // 如果撞墙（越界或已访问），就换方向
  if (
    nextRow < 0 || nextRow >= m ||
    nextCol < 0 || nextCol >= n ||
    visited[nextRow][nextCol]
  ) {
    dir = (dir + 1) % 4; // 顺时针转向
    nextRow = row + directions[dir][0];
    nextCol = col + directions[dir][1];
  }

  row = nextRow;
  col = nextCol;
}
```

- **时间复杂度：O(m × n)** — 每个元素恰好访问一次。
- **空间复杂度：O(m × n)** — 用于 `visited` 数组。

</details>

<details>
<summary>💡 提示 2（更优雅：按层模拟，无 visited 数组）</summary>

除了方向模拟，还有一种常见的写法是**按层遍历**：把矩阵看作是一圈一圈的"矩形框"，每次遍历完最外层一圈，就进入内层。

定义四条边界：

- `top = 0`（上边界行索引）
- `bottom = m - 1`（下边界行索引）
- `left = 0`（左边界列索引）
- `right = n - 1`（右边界列索引）

每一轮，按照**从外到内**的顺序遍历当前这一圈：

1. **从左到右**沿着 `top` 行遍历：`for (col = left … right)`，遍历完后 `top++`。
2. **从上到下**沿着 `right` 列遍历：`for (row = top … bottom)`，遍历完后 `right--`。
3. **从右到左**沿着 `bottom` 行遍历（**需 `top <= bottom` 判断**）：`for (col = right … left)`，遍历完后 `bottom--`。
4. **从下到上**沿着 `left` 列遍历（**需 `left <= right` 判断**）：`for (row = bottom … top)`，遍历完后 `left++`。

> 🔑 **为什么步骤 3 和 4 需要条件校验？**
> 考虑一个**单行**矩阵 `[[1,2,3,4]]`：
> - 步骤 1 遍历 `[1,2,3,4]`，然后 `top` 变成 1。
> - 此时 `top > bottom`，所以步骤 2 的 `for` 循环不会执行。
> - 如果没有 `top <= bottom` 或 `left <= right` 的保护，步骤 3 就会重复遍历刚刚访问过的元素！
>
> 同样，对于**单列**矩阵 `[[1],[2],[3]]`，步骤 4 也可能重复。因此在步骤 3 和步骤 4 之前，我们必须额外判断是否真的还有一行/列需要遍历。

代码大致结构：

```js
const res = [];
let top = 0, bottom = m - 1;
let left = 0, right = n - 1;

while (top <= bottom && left <= right) {
  // 1. 左 → 右
  for (let col = left; col <= right; col++) res.push(matrix[top][col]);
  top++;

  // 2. 上 → 下
  for (let row = top; row <= bottom; row++) res.push(matrix[row][right]);
  right--;

  // 3. 右 → 左  (判断 top <= bottom，防止重复遍历单行)
  if (top <= bottom) {
    for (let col = right; col >= left; col--) res.push(matrix[top][col]);
    top++; // 等待... 别急！这里 top++ 是错的 —— 请思考
  }

  // 4. 下 → 上  (判断 left <= right，防止重复遍历单列)
  if (left <= right) {
    for (let row = bottom; row >= top; row--) res.push(matrix[row][left]);
    bottom--;
  }
}
```

> ⚠️ **注意**：上面代码框内的"等待...别急！这里 `top++` 是错的" —— 这是一个**陷阱**。在按层模拟中，步骤 1 改变的是 `top`，步骤 3 使用的应该是 `bottom` 行，而不是 `top` 行。请你自己推敲完整逻辑，填写正确的变量名。

- **时间复杂度：O(m × n)** — 每个元素访问一次。
- **空间复杂度：O(1)** — 原地记录边界，仅输出数组不计入。

</details>

<details>
<summary>💡 提示 3（调试技巧 — 手动画出螺旋轨迹）</summary>

对于不熟悉螺旋遍历的人来说，最容易出错的是**边界收缩的时机** 和**重复访问**问题。

推荐的调试方法：

1. **在纸上手绘轨迹**：以 `3 × 4` 矩阵为例，标出访问顺序 `1,2,3,4,8,12,…`，用箩索心方向变化。
2. **构造极端测试用例**：
   - 单行矩阵：`[[1,2,3,4]]`
   - 单列矩阵：`[[1],[2],[3]]`
   - 正方形矩阵：`[[1,2],[3,4]]`
   - 长宽差大矩阵：`[[1,2,3,4,5,6]]`
3. **打印中间状态**：在每一轮边界收缩前后，打印 `top, bottom, left, right` 的值，确认它们在变化逻辑上是"收敛"而不是"跳过"。

最后，不要忘了：

> 🧠 **进阶思考**：如果题目要求按**逆时针**螺旋遍历（左下右上），你的方向数组或边界遍历顺序需要如何修改？

</details>

## 解法

把矩阵看作一圈圈矩形框，维护 `top/bottom/left/right` 四条边界，每轮按「上→右→下→左」顺序遍历当前圈：先从左到右遍历 `top` 行后 `top++`，再从上到下遍历 `right` 列后 `right--`，再（当 `top <= bottom`）从右到左遍历 `bottom` 行后 `bottom--`，再（当 `left <= right`）从下到上遍历 `left` 列后 `left++`，直到边界交错。

```javascript
/**
 * @param {number[][]} matrix
 * @return {number[]}
 */
const spiralOrder = (matrix) => {
  const res = []
  if (matrix.length === 0) return res
  let top = 0,
    bottom = matrix.length - 1
  let left = 0,
    right = matrix[0].length - 1
  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col++) res.push(matrix[top][col])
    top++
    for (let row = top; row <= bottom; row++) res.push(matrix[row][right])
    right--
    if (top <= bottom) {
      for (let col = right; col >= left; col--) res.push(matrix[bottom][col])
      bottom--
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row--) res.push(matrix[row][left])
      left++
    }
  }
  return res
}

// 验证
console.log(
  spiralOrder([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]),
) // [1,2,3,6,9,8,7,4,5]
console.log(
  spiralOrder([
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
  ]),
) // [1,2,3,4,8,12,11,10,9,5,6,7]
```

- **时间复杂度：** O(m × n) — 每个元素恰好访问一次。
- **空间复杂度：** O(1) — 仅用常量边界变量（输出数组不计入）。
