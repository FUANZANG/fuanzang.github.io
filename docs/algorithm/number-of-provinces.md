# 省份数量（Number of Provinces）

**难度：** Medium

## 题目描述

有 `n` 个城市，其中一些彼此相连，另一些没有相连。如果城市 a 与城市 b 直接相连，且城市 b 与城市 c 直接相连，那么城市 a 与城市 c 间接相连。

「省份」是一组直接/间接相连的城市且组内不存在其他未相连的城市。

给你一个 `n x n` 的矩阵 `isConnected`，其中 `isConnected[i][j] = 1` 表示第 `i` 个城市和第 `j` 个城市直接相连，而 `isConnected[i][j] = 0` 则表示二者不直接相连。

返回该总数量中省份的数量。

### 约束条件

- `1 <= n <= 200`
- `isConnected[i][j] == isConnected[j][i]`
- `isConnected[i][i] == 1`

## 示例

**示例 1：**

```
输入：isConnected = [[1,1,0],[1,1,0],[0,0,1]]
输出：2
解释：第一个省份包含城市 0 和 1（它们彼此相连），
     第二个省份包含城市 2，因此共有 2 个省份。
```

**示例 2：**

```
输入：isConnected = [[1,0,0],[0,1,0],[0,0,1]]
输出：3
解释：每个城市只与自身「间接相连」，所以共有 3 个省份。
```

## 提示 / 解题思路

- `isConnected` 就是无向图的**邻接矩阵**，「省份数量」等价于求图中**连通分量的个数**。
- 思路：维护一个 `visited` 数组。遍历每个城市，若它尚未访问，说明发现了一个新的省份——以此城市为起点做一次 DFS/BFS，把整个连通分量标记为已访问，省份计数 +1。
- DFS/BFS 每个城市最多访问一次，扫矩阵是 `O(n^2)`；并查集（Union-Find）也能做：遍历上三角，`isConnected[i][j] === 1` 时合并，最后统计不同根的数量。
- 和「岛屿数量」是同一道题的邻接矩阵版本。

## 解法

一次 DFS 标记一个连通分量，统计 DFS 启动次数即为省份数。

```javascript
/**
 * @param {number[][]} isConnected
 * @return {number}
 */
const findCircleNum = (isConnected) => {
  const n = isConnected.length
  const visited = new Array(n).fill(false)
  let provinces = 0

  const dfs = (city) => {
    visited[city] = true
    for (let next = 0; next < n; next++) {
      if (isConnected[city][next] === 1 && !visited[next]) {
        dfs(next)
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      provinces += 1
      dfs(i)
    }
  }

  return provinces
}

// 验证
console.log(findCircleNum([[1,1,0],[1,1,0],[0,0,1]])) // 2
console.log(findCircleNum([[1,0,0],[0,1,0],[0,0,1]])) // 3
```

- **时间复杂度：** O(n²)
- **空间复杂度：** O(n)（visited 数组 + DFS 递归栈，最坏 O(n)）

## 补充

- 进阶挑战：用并查集（Union-Find）解法重写，遍历上三角 `i < j` 处为 1 的格子做 union，最后统计不同根的数量。
- 相关题目：[岛屿数量](./number-of-islands.md)（网格版同题）、[冗余连接](./redundant-connection.md) 与 [课程表](./course-schedule.md)（并查集 / 拓扑排序的典型应用）。
