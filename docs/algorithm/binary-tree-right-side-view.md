# 二叉树的右视图（Binary Tree Right Side View）

**难度：** Medium

## 题目描述

给定一个二叉树的根节点 `root`，想象自己站在它的**右侧**，按照从顶部到底部的顺序，返回从右侧所能看到的节点值。

换句话说，对于树的每一层，返回该层**最右边**那个节点的值。

### 约束条件

- 二叉树的节点个数在范围 `[0, 100]` 内。
- `-100 <= Node.val <= 100`。

## 示例

**示例 1：**

```
输入：root = [1,2,3,null,5,null,4]
        1
       / \
      2   3
       \   \
        5   4

输出：[1,3,4]
解释：站在右侧看，第 1 层看到 1，第 2 层看到 3，第 3 层看到 4。
```

**示例 2：**

```
输入：root = [1,null,3]

    1
     \
      3

输出：[1,3]
解释：右侧视角下，每层只有最右的一个节点。
```

**示例 3：**

```
输入：root = []

输出：[]
解释：空树看不到任何节点。
```

## 提示 / 解题思路

1. **问题本质是「每层最右节点」：** 不要被「站在右边看」的描述绕进去——同一层里，右侧视线只会被该层最靠右的那个节点挡住，所以答案就是**每一层最后一个节点**的值。

2. **思路一：BFS（层序遍历，推荐）**
   - 用队列逐层处理：每轮先记录当前队列长度 `size`，这就是本层节点数。
   - 依次弹出本层全部节点，把它们的左右孩子入队。
   - 弹出**第 `size` 个**（也就是本层最后一个）节点时，把它的值加入答案。
   - 要点：`size` 必须在处理本层前就固定下来，否则新入队的下一层节点会污染本层计数。

3. **思路二：DFS（深度优先 + 层号）**
   - 先访问右子树再访问左子树，并携带当前深度 `depth`。
   - 用一个数组记录结果，当 `depth === 结果数组长度` 时说明这是该层第一次被访问到的节点——由于先走右边，它就是本层最右节点，直接推入结果。

4. **复杂度对比：** 两种做法都要访问每个节点一次，时间都是 O(n)；BFS 额外需要一个队列（最坏 O(n) 或按层宽），DFS 只需要递归栈 O(h)。此题规模很小（n ≤ 100），两者皆可。

## 解法

层序遍历（BFS）：逐层弹出节点，把每层最后一个节点的值收集起来，即为右侧视图。

```javascript
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
const rightSideView = (root) => {
  const res = []
  if (root === null) return res

  const queue = [root]
  while (queue.length > 0) {
    // 先固定本层节点数，避免下一层节点混入
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const node = queue.shift()
      // 本层最后一个节点就是从右侧能看到的节点
      if (i === size - 1) res.push(node.val)
      if (node.left !== null) queue.push(node.left)
      if (node.right !== null) queue.push(node.right)
    }
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

// 示例 1：[1,2,3,null,5,null,4] → [1,3,4]
console.log(rightSideView(buildTree([1, 2, 3, null, 5, null, 4]))) // [1, 3, 4]

// 示例 2：[1,null,3] → [1,3]
console.log(rightSideView(buildTree([1, null, 3]))) // [1, 3]

// 示例 3：[] → []
console.log(rightSideView(buildTree([]))) // []

// 补充用例：左子树比右子树深时，深处仍可能被看到
// [1,2,3,4] → [1,3,4]
console.log(rightSideView(buildTree([1, 2, 3, 4]))) // [1, 3, 4]
```

- **时间复杂度：** O(n)，每个节点入队、出队各一次。
- **空间复杂度：** O(w)，`w` 为树的最大宽度（队列最多同时保存一层节点）；最坏（完全二叉树）为 O(n)。

## 补充

- **进阶挑战：** 若要求返回**左视图**，只需在 BFS 里取每层第 0 个节点（`i === 0`），或 DFS 改为「先左后右」即可。
- **相关题目：** 变形题「199. 二叉树的右视图」常与层序遍历一起考察，本项目已收录 [二叉树的层序遍历 II（Binary Tree Level Order Traversal II）](./binary-tree-level-order-traversal-ii.md)，思路同源。
