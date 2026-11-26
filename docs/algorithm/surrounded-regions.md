# 被围绕的区域（Surrounded Regions）

**难度：** Medium

## 题目描述

给你一个 `m x n` 的矩阵 `board`，其中每个元素是字母 `'X'` 或 `'O'`，请捕获所有被围绕的区域：

- **连接**：水平或垂直相邻的 `'O'` 属于同一区域。
- **区域**：由所有相互连接的 `'O'` 组成。
- **围绕**：若一个区域中**没有**任何 `'O'` 位于矩阵边缘，则该区域被完全包围。

捕获被围绕区域的方式：将该区域内所有 `'O'` **原地**替换为 `'X'`。

### 约束条件

- `m == board.length`
- `n == board[i].length`
- `1 <= m, n <= 200`
- `board[i][j]` 为 `'X'` 或 `'O'`

## 示例

### 示例 1

输入：

```
board = [
  ["X","X","X","X"],
  ["X","O","O","X"],
  ["X","X","O","X"],
  ["X","O","X","X"]
]
```

输出：

```
[
  ["X","X","X","X"],
  ["X","X","X","X"],
  ["X","X","X","X"],
  ["X","O","X","X"]
]
```

解释：图中下方那个 `'O'` 区域不会被捕获，因为它位于矩阵边缘、无法被 `'X'` 包围；只有不接触边缘、完全被 `'X'` 围住的 `'O'` 区域才会被翻转为 `'X'`。

### 示例 2

输入：

```
board = [["X"]]
```

输出：

```
[["X"]]
```

## 提示 / 解题思路

- 直接判断「哪些 `'O'` 区域被 `'X'` 完全包围」比较绕，换个角度思考：
- **边界上的 `'O'` 及其连通区域一定是安全的**，永远不会被翻转。因此从矩阵四条边出发做 DFS/BFS，把所有与边界连通的 `'O'` 标记为「安全」（比如改成 `'M'`）。
- 标记完成后只需再扫一遍：`'M'` 还原为 `'O'`，剩下的 `'O'` 必然是被围绕的，全部翻转为 `'X'`。
- 注意题目要求**原地**修改，不能复制整个矩阵。
- `m, n` 最大 200，全 `'O'` 时递归 DFS 深度可能到 40000 层，JS 默认栈会爆；建议用显式栈（迭代 DFS）或队列（BFS）。

## 解法

边界标记法：从四条边出发，把与边界连通的 `'O'` 区域标记为 `'M'`；最后把 `'M'` 还原为 `'O'`，其余未标记的 `'O'` 翻转为 `'X'`。

```javascript
/**
 * @param {string[][]} board 字母棋盘，原地翻转
 * @return {string[][]} 翻转后的 board（LeetCode 无需返回值，这里返回便于验证）
 */
const solve = (board) => {
  const m = board.length;
  const n = board[0].length;

  // 迭代 DFS：把从 (i, j) 连通的 "O" 区域整体标记为 "M"（安全区）
  const markSafe = (i, j) => {
    if (board[i][j] !== "O") return;
    const stack = [[i, j]];
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      board[x][y] = "M";
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < m && ny >= 0 && ny < n && board[nx][ny] === "O") {
          stack.push([nx, ny]);
        }
      }
    }
  };

  // 从四条边发起标记（角落会被访问两次，markSafe 天然幂等）
  for (let i = 0; i < m; i++) {
    markSafe(i, 0);
    markSafe(i, n - 1);
  }
  for (let j = 0; j < n; j++) {
    markSafe(0, j);
    markSafe(m - 1, j);
  }

  // 还原标记，翻转被围绕的区域
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] === "M") board[i][j] = "O";
      else if (board[i][j] === "O") board[i][j] = "X";
    }
  }
  return board;
};

// 验证示例 1
const board1 = [
  ["X", "X", "X", "X"],
  ["X", "O", "O", "X"],
  ["X", "X", "O", "X"],
  ["X", "O", "X", "X"],
];
console.log(JSON.stringify(solve(board1)));
// 期望: [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]

// 验证示例 2
const board2 = [["X"]];
console.log(JSON.stringify(solve(board2)));
// 期望: [["X"]]
```

- **时间复杂度：** O(m × n)
- **空间复杂度：** O(m × n)（标记位，及最坏情况下的显式栈）

## 补充

- 同样的「从边缘出发标记连通区域」模板也适用于 [腐烂的橘子](./rotting-oranges.md)（多源 BFS 求扩散时间）与 [岛屿数量](./number-of-islands.md)（数连通块，本解法只是把「计数」换成了「标记后翻转」）。
- 进阶：用并查集（Union-Find）把边界 `'O'` 与一个虚拟根节点合并，再逐个检查内部 `'O'` 是否连到根，时间复杂度 O(m × n × α(m × n))。
