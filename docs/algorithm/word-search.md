# 单词搜索（Word Search）

**难度：** Medium

## 题目描述

给定一个 `m x n` 二维字符网格 `board` 和一个字符串 `word`，判断 `word` 是否存在于网格中。

单词必须按照字母顺序，通过**相邻的单元格**中的字母构成，其中"相邻"单元格是水平或垂直方向上相邻的单元格。**同一个单元格不能重复使用**。

### 约束条件

- `m == board.length`
- `n == board[i].length`
- `1 <= m, n <= 6`
- `1 <= word.length <= 15`
- `board` 和 `word` 仅由大小写英文字母组成

## 示例

**示例 1：**

```
输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
输出：true
解释：A → B → C → C → E → D
```

**示例 2：**

```
输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"
输出：true
解释：S → E → E
```

**示例 3：**

```
输入：board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"
输出：false
解释：路径 A→B→C→B 无法构成（B 已被使用）
```

## 提示 / 解题思路

这是一道经典的**回溯（Backtracking）**问题，可以使用深度优先搜索（DFS）解决。

**核心思路：**

1. 遍历网格中的每一个单元格，将其作为单词的起始点
2. 从起始点出发，向四个方向（上、下、左、右）深度优先搜索
3. 每次搜索一个字符，检查是否与单词对应位置匹配
4. 如果匹配，继续搜索下一个字符；如果不匹配或越界，回溯
5. 使用一个访问标记数组记录已访问的单元格，避免重复使用

**关键点：**

- 搜索前先将当前单元格标记为已访问
- 搜索完成后需要将标记还原（回溯）
- 如果找到完整单词，立即返回 true
- 如果所有路径都尝试过仍未找到，返回 false

## 解法

使用回溯法（DFS）遍历所有可能路径，找到匹配单词的路径。

```javascript
/**
 * @param {character[][]} board
 * @param {string} word
 * @return {boolean}
 */
const exist = (board, word) => {
  const m = board.length;
  const n = board[0].length;
  const visited = Array.from({ length: m }, () => new Array(n).fill(false));

  const dfs = (row, col, index) => {
    // 已匹配完整个单词
    if (index === word.length) {
      return true;
    }

    // 边界检查
    if (row < 0 || row >= m || col < 0 || col >= n) {
      return false;
    }

    // 已访问或字符不匹配
    if (visited[row][col] || board[row][col] !== word[index]) {
      return false;
    }

    // 标记为已访问
    visited[row][col] = true;

    // 向四个方向搜索
    const result = dfs(row - 1, col, index + 1) ||  // 上
                   dfs(row + 1, col, index + 1) ||  // 下
                   dfs(row, col - 1, index + 1) ||  // 左
                   dfs(row, col + 1, index + 1);    // 右

    // 回溯：取消标记
    visited[row][col] = false;

    return result;
  };

  // 遍历每个单元格作为起始点
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (dfs(i, j, 0)) {
        return true;
      }
    }
  }

  return false;
};

// 验证
console.log(exist([["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED")); // true
console.log(exist([["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "SEE")); // true
console.log(exist([["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCB"))); // false
```

- **时间复杂度：** O(m × n × 4^L)，其中 m、n 是网格维度，L 是单词长度。每个单元格最多作为起点，每条路径最长 L 步，每步最多 4 个方向
- **空间复杂度：** O(L)，递归栈深度最多为单词长度

## 补充

- **剪枝优化：** 可以先统计网格中各字符的出现次数，如果某个字符在单词中出现次数超过网格中的次数，直接返回 false
- **变形题：** [单词搜索 II](https://leetcode.com/problems/word-search-ii/) —— 同时查找多个单词，可使用 Trie 树优化
- 相关题目：[迷宫问题](https://leetcode.com/problems/the-maze/)、[机器人移动范围](https://leetcode.com/problems/moving-calculator/)
