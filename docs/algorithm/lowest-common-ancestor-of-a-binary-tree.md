# 二叉树的最近公共祖先（Lowest Common Ancestor of a Binary Tree）

**难度：** Medium

## 题目描述

给定一个二叉树，找到该树中两个指定节点 `p` 和 `q` 的**最近公共祖先**（LCA）。

最近公共祖先的定义为：对于有根树 T 的两个节点 `p`、`q`，最近公共祖先表示为一个节点 `x`，满足 `x` 是 `p`、`q` 的祖先且 `x` 的深度尽可能大（**一个节点也可以是它自己的祖先**）。

例如，节点 `5` 是节点 `6` 和 `4` 的最近公共祖先，因为 `5` 的子树里同时包含 `6` 和 `4`，且再往下就分开了。

### 约束条件

- 树中节点数目在范围 `[2, 10^5]` 内。
- `-10^9 <= Node.val <= 10^9`。
- 所有 `Node.val` **互不相同**。
- `p != q`。
- `p` 和 `q` 均存在于给定的二叉树中。

## 示例

**示例 1：**

```
输入：
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4

p = 5, q = 1

输出：3
解释：节点 5 和节点 1 的最近公共祖先是节点 3。
```

**示例 2：**

```
输入：同上二叉树，p = 5, q = 4

输出：5
解释：节点 5 和节点 4 的最近公共祖先是节点 5，因为根据定义最近公共祖先节点可以为节点本身。
```

**示例 3：**

```
输入：
      1
     /
    2

p = 1, q = 2

输出：1
```

## 提示 / 解题思路

1. **从「祖先」定义入手：** 一个节点 `x` 是 `p`、`q` 的公共祖先，当且仅当 `p`、`q` 分别出现在 `x` 的左子树、右子树中，或者其中一个就是 `x` 本身。

2. **递归「自底向上」收集信息：** 对任意节点 `root`，我们希望它的递归返回一个「信号」，告诉我们：**在 `root` 这棵子树里，是否找到了 `p` 或 `q`**（找到就返回那个节点，没找到返回 `null`）。

3. **分类讨论：**
   - 若 `root` 为 `null`，返回 `null`（没找到）。
   - 若 `root` 就是 `p` 或 `q`，直接返回 `root`（找到了其中一个，无需再往下找）。
   - 否则分别递归左右子树，得到 `left` 与 `right`：
     - `left` 和 `right` **都非空**：说明 `p`、`q` 一左一右分布在 `root` 两侧 → `root` 就是最近公共祖先。
     - 只有一边非空：`p`、`q` 都在那一侧（或只找到其中一个）→ 返回那一侧的结果。
     - 都为空：返回 `null`。

4. **为什么这是「最近」的：** 递归是自底向上返回的，第一次出现「左右都非空」的节点，必然是深度最大（最靠近 `p`、`q`）的公共祖先。若 `p` 是 `q` 的祖先，则遍历到 `p` 时立即返回 `p`，符合「节点可以是自己的祖先」的定义。

5. **边界情况：** 题目保证 `p != q` 且二者都存在于树中，因此无需额外校验；空树不必单独处理（递归到 `null` 自然返回）。

## 解法

自底向上递归：子树中若找到 `p` 或 `q` 就把它「冒泡」上去，某节点的左右子树都冒泡回非空值时，该节点即为最近公共祖先。

```javascript
/**
 * @param {TreeNode} root
 * @param {TreeNode} p
 * @param {TreeNode} q
 * @return {TreeNode}
 */
const lowestCommonAncestor = (root, p, q) => {
  // 递归出口：越过叶子，或当前节点就是 p / q
  if (root === null || root === p || root === q) return root

  // 分别到左右子树中寻找
  const left = lowestCommonAncestor(root.left, p, q)
  const right = lowestCommonAncestor(root.right, p, q)

  // 左右都找到了 → 当前节点就是最近公共祖先
  if (left !== null && right !== null) return root

  // 否则返回找到的那一侧（都没找到则为 null）
  return left !== null ? left : right
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
// 在树中按值查找节点
const findByVal = (node, val) => {
  if (node === null) return null
  if (node.val === val) return node
  return findByVal(node.left, val) || findByVal(node.right, val)
}

// 示例 1：p = 5, q = 1 → 3
const root1 = buildTree([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4])
console.log(lowestCommonAncestor(root1, findByVal(root1, 5), findByVal(root1, 1)).val) // 3

// 示例 2：p = 5, q = 4 → 5（祖先可以是自己）
const root2 = buildTree([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4])
console.log(lowestCommonAncestor(root2, findByVal(root2, 5), findByVal(root2, 4)).val) // 5

// 示例 3：p = 1, q = 2 → 1
const root3 = buildTree([1, 2])
console.log(lowestCommonAncestor(root3, findByVal(root3, 1), findByVal(root3, 2)).val) // 1

// 补充用例：p = 7, q = 4 → 2（同一子树内）
const root4 = buildTree([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4])
console.log(lowestCommonAncestor(root4, findByVal(root4, 7), findByVal(root4, 4)).val) // 2
```

- **时间复杂度：** O(n)，最坏情况下每个节点访问一次。
- **空间复杂度：** O(h)，递归调用栈深度为树高 `h`；最坏（链状树）为 O(n)。

## 补充

- **进阶挑战：** 如果树中的节点带父指针（LeetCode 上的变体「带父指针的最近公共祖先」），可以把问题转化为「两个链表求交点」——先让两节点走到同一深度，再同步向上走，首个相遇点即 LCA。
- **对比 BST 版本：** 二叉搜索树（BST）有大小关系可用，从根往下按 `val` 比较即可，无需后序遍历；本题的普通二叉树没有这个性质，所以要用自底向上的递归。
- **变形题「235. 二叉搜索树的最近公共祖先」** 与本题思路同源，但可利用 BST 有序性把空间优化到 O(1)。
