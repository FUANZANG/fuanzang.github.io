# 冗余连接（Redundant Connection）

**难度：** Medium

## 题目描述

在本问题中，**树**是指一个连通且无环的无向图。

给定一个原本为树的图（`n` 个节点，编号 `1` 到 `n`），额外增加了一条边。这条新增边的两个端点不同，且之前不存在这条边。图用长度为 `n` 的数组 `edges` 表示，其中 `edges[i] = [ai, bi]` 表示节点 `ai` 与 `bi` 之间有一条边。

请返回一条可以移除的边，使得移除后剩余的图是包含 `n` 个节点的树（即恰好构成一棵树）。若存在多个答案，返回在输入中**最后出现**的那条。

### 约束条件

- `n == edges.length`
- `3 <= n <= 1000`
- `edges[i].length == 2`
- `1 <= ai < bi <= edges.length`
- `ai != bi`
- 图中没有重复的边。
- 给定图是连通的。

## 示例

**示例 1：**

```
输入：edges = [[1,2],[1,3],[2,3]]
输出：[2,3]
```

**示例 2：**

```
输入：edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]
输出：[1,4]
```

## 提示 / 解题思路

- 一棵 `n` 节点的树恰好有 `n - 1` 条边且无环；本题图有 `n` 条边且连通，因此**有且只有一个环**，找到并移除环上「最后加入」的那条边即可。
- 按输入顺序逐条加边：若一条边的两个端点**已经在同一个连通分量里**，加上它就会产生环——这条就是答案（由于按顺序处理且环唯一，它必然是环上最后出现的那条）。
- 「是否在同一连通分量」用**并查集**判断：
  1. 每个节点初始自成一个集合；
  2. 处理每条边 `[a, b]`：查 `a`、`b` 的根，根相同 → 返回该边；根不同 → 合并两个集合。
- 路径压缩（按秩合并可进一步摊薄）后，均摊时间接近 O(1)。

## 解法

并查集按输入顺序加边：遇到两端点根相同（会成环）的边即为目标答案，否则合并集合。

```javascript
/**
 * @param {number[][]} edges
 * @return {number[]}
 */
const findRedundantConnection = (edges) => {
  const parent = new Array(edges.length + 1).fill(0)
  for (let i = 0; i <= edges.length; i++) parent[i] = i
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]] // 路径减半压缩
      x = parent[x]
    }
    return x
  }
  for (const [a, b] of edges) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return [a, b] // 同根，加入会成环
    parent[ra] = rb
  }
  return []
}

// 验证
console.log(findRedundantConnection([[1,2],[1,3],[2,3]])) // [2,3]
console.log(findRedundantConnection([[1,2],[2,3],[3,4],[1,4],[1,5]])) // [1,4]
```

- **时间复杂度：** O(n α(n))，α 为反阿克曼函数，接近常数（带路径压缩的并查集均摊）。
- **空间复杂度：** O(n)，父节点数组。

## 补充

并查集「连边 + 查环」是这一类题的通用骨架；本题的「返回最后出现的环边」由按输入顺序处理、首个同根边即答案这一性质保证（连通图中 n 节点 n 边有且仅有一个环）。

相关图论 / 并查集题：[岛屿的数量](./number-of-islands.md)、[课程表](./course-schedule.md)、[腐烂的橘子](./rotting-oranges.md)。
