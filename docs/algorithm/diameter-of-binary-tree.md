# 二叉树的直径（Diameter of Binary Tree）

**难度：** Easy

## 题目描述

给你一棵二叉树的根节点，返回该树的**直径**。

二叉树的**直径**是指树中**任意两个节点之间**最长路径的**长度**。这条路径**可能经过也可能不经过**根节点 `root`。

两节点之间路径的**长度**由它们之间**边数**表示。

### 约束条件

- 树中节点数目在范围 `[1, 10^4]` 内。
- `-100 <= Node.val <= 100`。

## 示例

**示例 1：**

```
输入：root = [1,2,3,4,5]

    1
   / \
  2   3
 / \
4   5

输出：3
解释：3 ，取路径 [4,2,1,3] 或 [5,2,1,3] 的长度。
```

**示例 2：**

```
输入：root = [1,2]

  1
 /
2

输出：1
```

## 提示 / 解题思路

1. **逐节点枚举「拐弯点」而不是逐节点对枚举。** 任意一条最长路径必然在某个节点处「拐弯」——左侧最深 + 右侧最深。把每个节点都当作拐弯点考察一次，就覆盖了所有可能。
2. **经过节点 x 的最长路径长度 = 左子树最大深度 + 右子树最大深度。** 深度按边数计算，空节点深度为 0，叶节点深度为 1。
3. **后序 DFS 一次完成两件事。** 递归函数返回「以当前节点为根的子树最大深度」（`max(左深, 右深) + 1`），同时用 `左深 + 右深` 更新全局答案——因为路径可以拐弯在**任何**节点，所以全局最大值要在每个节点处都取一次。
4. **单节点树的直径为 0**（没有边），注意答案初值设为 `0` 即可，无需哨兵。

## 解法

后序 DFS：每个节点向上汇报子树最大深度，同时用「左深 + 右深」更新全局直径。

```javascript
/**
 * @param {TreeNode} root
 * @return {number}
 */
const diameterOfBinaryTree = (root) => {
  let ans = 0

  // 返回以 node 为根的子树的最大深度（按边数）
  const dfs = (node) => {
    if (node === null) return 0

    const left = dfs(node.left)
    const right = dfs(node.right)

    // 以当前节点为「拐弯点」，经过它的最长路径 = 左深 + 右深
    ans = Math.max(ans, left + right)

    // 只向父节点汇报较长的一侧
    return Math.max(left, right) + 1
  }

  dfs(root)
  return ans
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

// 示例 1：[1,2,3,4,5] → 3
console.log(diameterOfBinaryTree(buildTree([1, 2, 3, 4, 5]))) // 3

// 示例 2：[1,2] → 1
console.log(diameterOfBinaryTree(buildTree([1, 2]))) // 1

// 补充用例：单节点树直径为 0
console.log(diameterOfBinaryTree(buildTree([1]))) // 0

// 补充用例：右斜链 [1,null,2,null,3,null,4]，直径为 3
console.log(diameterOfBinaryTree(buildTree([1, null, 2, null, 3, null, 4]))) // 3
```

- **时间复杂度：** O(n)，每个节点恰好访问一次。
- **空间复杂度：** O(h)，递归调用栈深度为树高 `h`；最坏（斜链）为 O(n)。

## 补充

- **同型对比：** 与 [二叉树中的最大路径和](./binary-tree-maximum-path-sum.md) 都是「后序汇报 + 逐节点更新全局答案」的树形 DP；区别在于路径和汇报的是节点值之和（负贡献要归零剪枝），而直径汇报的是边数深度（无剪枝，恒非负）。
- **进阶挑战「N 叉树的直径」**：N 叉树的直径需要在每个节点取所有子树深度中**最大的两个**相加，枚举思路与二叉树完全一致（在「补充用例」右斜链上也能体会单边深度主导的情形）。
