# 最小高度树（Minimum Height Trees）

**难度：** Medium

## 题目描述

给定一个有 `n` 个节点的无向连通图（即一棵树），节点编号从 `0` 到 `n - 1`。我们可以选取任意一个节点作为根，此时得到的有根树的高度定义为「根到最远叶子节点的最长路径上的边数」。在所有可能的有根树中，高度最小的那些称为**最小高度树（MHT）**。

请找出所有最小高度树的根节点，返回它们的节点编号列表（顺序不限）。

### 约束条件

- `1 <= n <= 2 * 10^4`
- `n - 1 == edges.length`
- `0 <= ai < bi < n`
- `edges` 中不包含重复边
- 给定的图是连通的且不含环

## 示例

### 示例 1

```
输入：n = 4, edges = [[1,0],[1,2],[1,3]]
输出：[1]
```

### 示例 2

```
输入：n = 6, edges = [[0,3],[1,3],[2,3],[4,3],[5,4]]
输出：[3,4]
```

## 提示 / 解题思路

最小高度树的根一定位于整棵树的「中心」。树的中心要么是 1 个节点，要么是 2 个节点（相邻）。直接对每个节点跑 DFS 求高度是 O(n²)，而 n 可达 2×10⁴，需要 O(n) 的算法。

**思路分析（剥叶子 / 拓扑剪枝）：**

- 把树看成一堆不断剥壳的洋葱：反复去掉当前所有「叶子」（度数为 1 的节点），每剥完一层，剩下的子树中心就向内缩了一圈。
- 用队列维护当前所有叶子，每一轮同时弹出整层叶子，并对其邻居的度数减 1；邻居度数变为 1 时，它成为下一轮的叶子入队。
- 不断剥直到剩余节点数 ≤ 2，此时队列里剩下的就是中心节点（1 个或 2 个），即所有最小高度树的根。

**要点：** 用「剩余节点数」控制循环终止条件（`remaining > 2`），每轮扣掉整层叶子的数量；特判 `n === 1` 直接返回 `[0]`。

## 解法

剥叶子（拓扑剪枝）：每轮移除全部叶子并更新邻居度数，直到剩余节点 ≤ 2，剩余节点即最小高度树的根。

```javascript
/**
 * @param {number} n
 * @param {number[][]} edges
 * @return {number[]}
 */
const findMinHeightTrees = (n, edges) => {
  if (n === 1) return [0];
  // 建无向图邻接表
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  // 初始叶子：度数为 1 的节点
  const degree = adj.map((a) => a.length);
  const queue = [];
  for (let i = 0; i < n; i++) {
    if (degree[i] === 1) queue.push(i);
  }
  // 每轮整层剥叶子，直到剩余节点数 ≤ 2
  let remaining = n;
  while (remaining > 2) {
    const layerSize = queue.length;
    remaining -= layerSize;
    for (let i = 0; i < layerSize; i++) {
      const leaf = queue.shift();
      for (const nb of adj[leaf]) {
        degree[nb]--;
        if (degree[nb] === 1) queue.push(nb);
      }
    }
  }
  // 此时队列中剩余 1 或 2 个节点，即所有最小高度树的根
  return queue;
};

// 验证
console.log(findMinHeightTrees(4, [[1, 0], [1, 2], [1, 3]]));
// 输出: [1]

console.log(findMinHeightTrees(6, [[0, 3], [1, 3], [2, 3], [4, 3], [5, 4]]));
// 输出: [3,4]
```

- **时间复杂度：** O(n)，每个节点和每条边最多被处理常数次
- **空间复杂度：** O(n)，邻接表与度数数组

## 补充

- 本算法本质是「多源 BFS / 拓扑排序」：把叶子当作入度为 0 的源点逐层剥离，与 [课程表（Course Schedule）](./course-schedule.md) 的拓扑排序思想相通，只是这里把方向从「入度」换成「度数」。
- 进阶：若把边权改成带权树，需要的是「最小半径点」，此时中心判定要改用直径端点，剥叶子法不再直接适用。
