# 二叉树中的最大路径和（Binary Tree Maximum Path Sum）

**难度：** Hard

## 题目描述

二叉树中的**路径**可以被定义为**两个节点之间**的序列，路径上的每个节点与下一个节点之间必须存在一条**边**（即父子连接）。路径至少包含**一个节点**，且**不必须经过根节点**。

路径的**路径和**就是路径上各节点值的总和。

给定二叉树的根节点 `root`，计算并返回该二叉树中所有**非空**路径里**最大的路径和**。

### 约束条件

- 树中节点数目范围在 `[1, 3 * 10^4]` 内。
- `-1000 <= Node.val <= 1000`。

## 示例

**示例 1：**

```
输入：root = [1,2,3]

    1
   / \
  2   3

输出：6
解释：最优路径是 2 -> 1 -> 3，路径和为 2 + 1 + 3 = 6。
```

**示例 2：**

```
输入：root = [-10,9,20,null,null,15,7]

       -10
       /  \
      9   20
         /  \
        15   7

输出：42
解释：最优路径是 15 -> 20 -> 7，路径和为 15 + 20 + 7 = 42。
```

## 提示 / 解题思路

1. **路径可以在任意节点「拐弯」。** 一条路径最多在某个节点同时使用它的左右子各一条，即路径呈「∧」形（或「∨」形）。枚举所有路径是行不通的，必须借助递归**逐节点计算并向上汇报**。

2. **区分两种「以节点为起点的贡献」：**
   - **能向上汇报的**：从当前节点出发、只往**一侧**延伸的最大路径和（只能选左或右中较大的那一条，不能同时走两边，否则会形成「分叉」，路径就不再是一条简单路径了）。
   - **只在当前节点产生、不向上汇报的**：当前节点同时挂上左右两侧得到的「拐弯」路径和。它只用来更新全局答案，**不能**作为返回值往上传。

3. **负值剪枝。** 向上汇报时，如果某侧子树的贡献为负，不如「不接」它——用 `Math.max(0, childSum)` 把负贡献归零。这样全负树也能正确返回「最大的那个单节点」。

4. **全局答案要在「拐弯」处更新。** 每次访问节点时，用 `node.val + left + right` 更新全局最大值；返回给父节点的是 `node.val + Math.max(left, right)`。

5. **基准与初值。** 空节点返回 `0`；全局答案初值设为 `-Infinity`（或一个足够小的哨兵），以兼容全负树的情形。

## 解法

后序递归：每个节点向上只汇报「单侧」最大贡献，同时在节点处用「左右两侧 + 自身」更新全局最大路径和。

```javascript
/**
 * @param {TreeNode} root
 * @return {number}
 */
const maxPathSum = (root) => {
  // 全局最大路径和（初始 -Infinity，兼容全负树）
  let ans = -Infinity

  // 返回「以 node 为下端、只往一侧延伸」的最大路径和
  const dfs = (node) => {
    if (node === null) return 0

    // 负贡献不如不接，直接按 0 处理
    const left = Math.max(0, dfs(node.left))
    const right = Math.max(0, dfs(node.right))

    // 在当前节点「拐弯」：左右两侧 + 自身，更新全局答案
    ans = Math.max(ans, node.val + left + right)

    // 只允许挑较大的一侧继续往上延伸
    return node.val + Math.max(left, right)
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

// 示例 1：[1,2,3] → 6
console.log(maxPathSum(buildTree([1, 2, 3]))) // 6

// 示例 2：[-10,9,20,null,null,15,7] → 42
console.log(maxPathSum(buildTree([-10, 9, 20, null, null, 15, 7]))) // 42

// 补充用例：全负树，答案为最大的单节点 -1
console.log(maxPathSum(buildTree([-2, -5, -1]))) // -1

// 补充用例：单节点
console.log(maxPathSum(buildTree([-1]))) // -1
```

- **时间复杂度：** O(n)，每个节点最多访问一次。
- **空间复杂度：** O(h)，递归调用栈深度为树高 `h`；最坏（链状树）为 O(n)。

## 补充

- **与「最大子数组和」的对比：** 两者都是「把负贡献归零再取最优」，区别在于路径是树上的一条简单路径（可在某节点拐弯），不能形成分叉，所以向上汇报时只能选一侧。
- **进阶（记忆化 / 迭代）：** 本题递归已是最优；若想省栈可用显式栈做后序遍历，思路不变。
- **同源题目：** 二叉树上「自顶向下传约束 + 后序汇总」的模式，也见于 [验证二叉搜索树](./validate-binary-search-tree.md)（传开区间上下界）与 [二叉树的最近公共祖先](./lowest-common-ancestor-of-a-binary-tree.md)（后序回溯）。
