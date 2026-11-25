# 二叉树的最大宽度（Maximum Width of Binary Tree）

**难度：** Medium

## 题目描述

给定一个二叉树的根节点 `root`，返回该树的**最大宽度**。

树的**最大宽度**是某一**层**的宽度在所有层中的最大值。一层的**宽度**定义为该层**最左**与**最右**非 `null` 节点之间的长度，且中间若存在本可出现在完全二叉树中、实际却为 `null` 的节点，这些 `null` 也计入长度。

**保证**答案在一个 **32 位**有符号整数范围内。

### 约束条件

- 树中节点数在范围 `[1, 3000]` 内。
- `-100 <= Node.val <= 100`。

## 示例

**示例 1：**

```
输入：root = [1,3,2,5,3,null,9]
        1
       / \
      3   2
     / \   \
    5   3   9

输出：4
解释：最大宽度出现在第 3 层，长度为 4（5, 3, null, 9）。
```

**示例 2：**

```
输入：root = [1,3,2,5,null,null,9,6,null,7]
输出：7
解释：最大宽度出现在第 4 层，长度为 7（6, null, null, null, null, null, 7）。
```

**示例 3：**

```
输入：root = [1,3,2,5]
输出：2
解释：最大宽度出现在第 2 层，长度为 2（3, 2）。
```

## 提示 / 解题思路

1. **核心：给每个节点一个「位置下标」。** 某一层宽度取决于该层最左、最右非 `null` 节点之间的下标跨度。若一个节点下标为 `i`，其左孩子下标为 `2i`、右孩子为 `2i + 1`（与完全二叉树的编号规则一致），这样即使中间出现 `null` 空洞，下标差也恰好代表「按完全二叉树补全后的宽度」。

2. **BFS 层序遍历（推荐）：**
   - 队列中存 `[node, index]`，根节点下标取 `1`。
   - 逐层处理：进入某一层时，队首元素的下标即该层**最左**非 `null` 节点下标，队尾元素即**最右**非 `null` 节点下标。
   - `width = rightIndex - leftIndex + 1`，对每一层取最大值。
   - 因为我们只把**真实存在**（非 `null`）的孩子入队，队列中每一层恰好就是该层从左到右的非 `null` 节点序列。

3. **防溢出：** 在退化（链状）树上，下标随深度按 `2^depth` 增长，深度可达 3000 时 `Number` 必然溢出。因此下标要用 `BigInt` 存储（字面量加 `n`，如 `idx * 2n`）。题目已保证答案（宽度）在 32 位内，取最大值前 `Number(...)` 转换是安全的。

4. **复杂度：** 每个节点入队、出队各一次，时间 O(n)；队列最多同时保存一层节点，空间 O(n)。

## 解法

BFS 层序遍历，按完全二叉树规则给节点编号（根为 `1`，左孩子 `2i`、右孩子 `2i+1`，下标用 `BigInt`），逐层取 `rightIndex - leftIndex + 1` 再求最大值。

```javascript
/**
 * @param {TreeNode} root
 * @return {number}
 */
const widthOfBinaryTree = (root) => {
  if (root === null) return 0

  const queue = [[root, 1n]]
  let head = 0
  let ans = 0
  while (head < queue.length) {
    const levelStart = head
    const levelEnd = queue.length
    const leftIndex = queue[head][1]
    for (let i = levelStart; i < levelEnd; i++) {
      const [node, idx] = queue[i]
      if (node.left !== null) queue.push([node.left, idx * 2n])
      if (node.right !== null) queue.push([node.right, idx * 2n + 1n])
    }
    const rightIndex = queue[levelEnd - 1][1]
    ans = Math.max(ans, Number(rightIndex - leftIndex + 1n))
    head = levelEnd
  }
  return ans
}

// 验证（TreeNode + 层序建树辅助）
const TreeNode = function (val, left, right) {
  this.val = val === undefined ? 0 : val
  this.left = left === undefined ? null : left
  this.right = right === undefined ? null : right
}
const buildTree = (arr) => {
  if (arr.length === 0 || arr[0] === null) return null
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

// 示例 1：[1,3,2,5,3,null,9] → 4
console.log(widthOfBinaryTree(buildTree([1, 3, 2, 5, 3, null, 9]))) // 4

// 示例 2：[1,3,2,5,null,null,9,6,null,7] → 7
console.log(widthOfBinaryTree(buildTree([1, 3, 2, 5, null, null, 9, 6, null, 7]))) // 7

// 示例 3：[1,3,2,5] → 2
console.log(widthOfBinaryTree(buildTree([1, 3, 2, 5]))) // 2
```

- **时间复杂度：** O(n)，每个节点入队、出队各一次。
- **空间复杂度：** O(n)，队列最多同时保存一层节点；最坏（完全二叉树）为 O(n)。

## 补充

- **进阶挑战：** 本题下标在退化（链状）树上按 `2^depth` 增长，`Number` 在深度约 30 后就会溢出。除上文用 `BigInt` 外，也可做「下标归一化」：每层先把最左非 `null` 节点的下标重置为 `0`，使下标只随该层宽度而非树深度增长，从而全程用 `Number`。
- **相关题目：** 本题本质是「层序遍历 + 下标编号」。本项目已收录 [二叉树的右视图（Binary Tree Right Side View）](./binary-tree-right-side-view.md)、[二叉树的锯齿形层序遍历（Binary Tree Zigzag Level Order Traversal）](./binary-tree-zigzag-level-order-traversal.md)；经典题「102. 二叉树的层序遍历」是本题的直接基础。
