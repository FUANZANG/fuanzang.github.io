# 课程表（Course Schedule）

**难度：** Medium

## 题目描述

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses - 1`。

在选修某些课程之前需要一些先修课程。先修课程按数组 `prerequisites` 给出，其中 `prerequisites[i] = [ai, bi]` 表示如果要学习课程 `ai` 则**必须**先学习课程 `bi`。

例如，先修课程对 `[0, 1]` 表示：想要学习课程 `0`，你需要先完成课程 `1`。

请你判断是否可能完成所有课程的学习？如果可以，返回 `true`；否则，返回 `false`。

### 约束条件

- `1 <= numCourses <= 2000`
- `0 <= prerequisites.length <= 5000`
- `prerequisites[i].length == 2`
- `0 <= ai, bi < numCourses`
- `prerequisites[i]` 中的所有课程对**互不相同**

## 示例

```
输入：numCourses = 2, prerequisites = [[1,0]]
输出：true
解释：总共有 2 门课程。学习课程 1 之前，你需要完成课程 0。这是可能的。
```

```
输入：numCourses = 2, prerequisites = [[1,0],[0,1]]
输出：false
解释：总共有 2 门课程。学习课程 1 之前，你需要先完成课程 0；并且学习课程 0 之前，你还应先完成课程 1。这是不可能的。
```

## 提示 / 解题思路

把每门课看成一个节点，「先修关系」看成一条有向边 `bi -> ai`（先修课指向后继课）。那么：

- **能修完所有课程 ⟺ 这张有向图是有向无环图（DAG）**。只要存在环（如 `0 -> 1 -> 0`），环上的课程互相等待，永远无法开课。
- 所以问题等价于「判断有向图是否有环」，标准做法是**拓扑排序**。

BFS 版拓扑排序（Kahn 算法）思路：

1. 统计每个节点的**入度**（有多少门先修课还没学）。入度为 0 的课程就是当前可以直接开始学的。
2. 把所有入度为 0 的节点入队，逐个出队并计数（表示「学完了这门课」）。
3. 学完一门课后，它的所有后继课程入度减 1；某个后继课程入度减到 0，说明它的先修课全部学完，入队。
4. 最终如果出队计数等于 `numCourses`，说明全部课程都被排进了顺序里，无环返回 `true`；否则剩下的节点一定卡在环里，返回 `false`。

要点提醒：

- 建图方向别搞反。`[ai, bi]` 是「先 bi 后 ai」，所以边是 `bi -> ai`，入度加在 `ai` 上。
- 用数组当队列并配一个 `head` 指针遍历，避免 `shift()` 的 O(n) 搬移开销。
- 也可以用 DFS + 三色标记（未访问 / 访问中 / 已完成）判环，遇到「访问中」的节点即说明成环。

## 解法

建图统计入度，用 Kahn 算法做 BFS 拓扑排序，能出队的节点数等于课程总数则无环。

```javascript
/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
const canFinish = (numCourses, prerequisites) => {
  // graph[pre] = 学完 pre 后解锁的课程列表
  const graph = Array.from({ length: numCourses }, () => [])
  const inDegree = new Array(numCourses).fill(0)

  for (const [cur, pre] of prerequisites) {
    graph[pre].push(cur)
    inDegree[cur]++
  }

  // 入度为 0：没有先修课，可以直接学
  const queue = []
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i)
  }

  let learned = 0
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head]
    learned++
    for (const next of graph[node]) {
      if (--inDegree[next] === 0) queue.push(next)
    }
  }

  return learned === numCourses
}

// 验证
console.log(canFinish(2, [[1, 0]])) // true
console.log(canFinish(2, [[1, 0], [0, 1]])) // false
console.log(canFinish(5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]])) // true
console.log(canFinish(3, [[0, 1], [1, 2], [2, 0]])) // false
```

- **时间复杂度：** O(V + E)，V 为课程数 `numCourses`，E 为先修关系数；建图与拓扑遍历各扫描一遍所有点和边。
- **空间复杂度：** O(V + E)，邻接表存所有边，入度数组与队列各占 O(V)。

## 补充

- **DFS 三色标记法**：用 `state` 数组记录 `0 未访问 / 1 访问中 / 2 已完成`，从每个未访问节点出发深搜，若途中遇到状态为 `1` 的节点说明存在环。代码更短，但递归深度最坏为 O(V)，节点极多时要留意栈深度。

```javascript
/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
const canFinishDfs = (numCourses, prerequisites) => {
  const graph = Array.from({ length: numCourses }, () => [])
  for (const [cur, pre] of prerequisites) graph[pre].push(cur)

  const state = new Array(numCourses).fill(0)

  const hasCycle = (node) => {
    if (state[node] === 1) return true
    if (state[node] === 2) return false
    state[node] = 1
    for (const next of graph[node]) {
      if (hasCycle(next)) return true
    }
    state[node] = 2
    return false
  }

  for (let i = 0; i < numCourses; i++) {
    if (hasCycle(i)) return false
  }
  return true
}

// 验证
console.log(canFinishDfs(2, [[1, 0]])) // true
console.log(canFinishDfs(2, [[1, 0], [0, 1]])) // false
```

- 变形题「210. 课程表 II（Course Schedule II）」要求返回一种可行的学习顺序：把本题 Kahn 算法里的出队序列直接收集起来即是答案，若长度不足 `numCourses` 则返回空数组。
- 变形题「630. 课程表 III」换成贪心 + 最大堆，与拓扑排序无关，注意区分。
- 同属图遍历的入门题可参考 [number-of-islands](./number-of-islands.md)，那题是无向网格上的连通块计数，用 DFS/BFS 染色即可，不需要处理环。
