# 二叉树的锯齿形层序遍历（Binary Tree Zigzag Level Order Traversal）

**难度：** Medium

## 题目描述

给你二叉树的根节点 `root`，返回其节点值的**锯齿形层序遍历**（先从左往右，下一层再从右往左，以此类推，层与层之间交替进行）。

也就是说，普通层序遍历的结果是逐层从左到右输出，而本题要求**奇数层（0-indexed 的第 1、3、5… 层）整体反转**，形成「之」字形。

### 约束条件

- 树中节点数目在范围 `[0, 2000]` 内。
- `-100 <= Node.val <= 100`。

## 示例

**示例 1：**

```
输入：root = [3,9,20,null,null,15,7]
        3
       / \
      9  20
        /  \
       15   7

输出：[[3],[20,9],[15,7]]
解释：
  第 0 层（从左到右）：[3]
  第 1 层（从右到左）：[20, 9]
  第 2 层（从左到右）：[15, 7]
```

**示例 2：**

```
输入：root = [1]

输出：[[1]]
解释：只有一个节点，只有一层，无需反转。
```

**示例 3：**

```
输入：root = []

输出：[]
解释：空树返回空数组。
```

## 提示 / 解题思路

1. **问题拆解 = 层序遍历 + 层号奇偶控制方向。** 骨架就是最普通的 BFS 层序遍历：每轮先固定本层节点数 `size`，弹出本层全部节点、把它们的左右孩子入队。锯齿形只是在此基础上多了一个「本层要不要反转」的判断，不改变遍历本身。

2. **用一个布尔量 `leftToRight` 记录方向。**
   - 初始为 `true`：第 0 层从左到右。
   - 每收集完一层后翻转它：`leftToRight = !leftToRight`。
   - 当 `leftToRight === false` 时，把本层结果 `reverse()` 后再推入答案。

3. **反转的是「本层的结果数组」，不是入队顺序。** 这是最常见的错误写法：不要试图在奇数层把子节点「先右后左」入队。因为那样会破坏下一层从左到右的相对次序，导致再下一层结果错乱。正确做法是**始终按左、右顺序入队**，只在每一层输出时决定要不要反转。

4. **关于双端队列（Deque）写法：** 奇数层改为「头部插入」（`unshift`）也能避免 `reverse()`。但 JavaScript 原生数组没有真正的双端队列，`unshift` 是 O(n) 操作，整体反而更慢。本题节点数 ≤ 2000，直接用 `reverse()` 更简洁，且每层反转的累计代价仍是 O(n)。

5. **复杂度分析：** 每个节点恰好入队、出队一次；每层最多被整体反转一次，所有层的元素总数为 n，故总时间 O(n)。额外空间来自队列（最宽的一层）和答案数组。

## 解法

BFS 层序遍历，每层收集完节点值后，按层号奇偶决定是否 `reverse()`，交替方向即为锯齿形。

```javascript
/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
const zigzagLevelOrder = (root) => {
  const res = []
  if (root === null) return res

  const queue = [root]
  let leftToRight = true

  while (queue.length > 0) {
    // 先固定本层节点数，避免下一层节点混入本层统计
    const size = queue.length
    const level = []

    for (let i = 0; i < size; i++) {
      const node = queue.shift()
      level.push(node.val)
      // 入队顺序始终保持「先左后右」，方向控制放在输出阶段
      if (node.left !== null) queue.push(node.left)
      if (node.right !== null) queue.push(node.right)
    }

    // 奇数层（leftToRight 为 false）需要从右往左输出
    if (!leftToRight) level.reverse()
    res.push(level)
    leftToRight = !leftToRight
  }

  return res
}

// 验证（TreeNode + 层序建树辅助）
const TreeNode = function (val, left, right) {
  this.val = val === undefined ? 0 : val
  this.left = left === undefined ? null : left
  this.right = right === undefined ? null : right
}
const buildTree = (arr) => {
  if (!arr.length || arr[0] === null) return null
  const nodes = arr.map((v) => (v === null ? null : new TreeNode(v)))
  let i = 0
  let j = 1
  while (i < nodes.length && j < nodes.length) {
    const node = nodes[i]
    if (node) {
      if (j < nodes.length) node.left = nodes[j++]
      if (j < nodes.length) node.right = nodes[j++]
    }
    i++
  }
  return nodes[0]
}

// 示例 1：[3,9,20,null,null,15,7] → [[3],[20,9],[15,7]]
console.log(zigzagLevelOrder(buildTree([3, 9, 20, null, null, 15, 7]))) // [ [ 3 ], [ 20, 9 ], [ 15, 7 ] ]

// 示例 2：[1] → [[1]]
console.log(zigzagLevelOrder(buildTree([1]))) // [ [ 1 ] ]

// 示例 3：[] → []
console.log(zigzagLevelOrder(buildTree([]))) // []

// 补充用例：三层满二叉树 [1,2,3,4,5,6,7] → [[1],[3,2],[4,5,6,7]]
console.log(zigzagLevelOrder(buildTree([1, 2, 3, 4, 5, 6, 7]))) // [ [ 1 ], [ 3, 2 ], [ 4, 5, 6, 7 ] ]
```

- **时间复杂度：** O(n)，每个节点入队、出队各一次；每层至多整体反转一次，所有层的元素总数为 n。
- **空间复杂度：** O(w)，`w` 为树的最大宽度（队列最多同时保存一层节点）；最坏（完全二叉树）为 O(n)。答案数组本身不计入额外空间。

## 补充

- **进阶挑战：** 如果题目改成「每 `k` 层换向一次」，只需把 `leftToRight` 的翻转条件从「每层」改成「每 `k` 层」（例如 `if (depth % k === k - 1) reverse`），骨架完全不变。
- **变体对比：** 本题只影响**输出顺序**，不改变遍历过程；而「二叉树的右视图」只取每层最后一个节点，是同一种 BFS 骨架的另一个切面。相关题目见 [二叉树的层序遍历 II（Binary Tree Level Order Traversal II）](./binary-tree-level-order-traversal-ii.md) 与 [二叉树的右视图（Binary Tree Right Side View）](./binary-tree-right-side-view.md)。
