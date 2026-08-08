# 二叉树的层序遍历 II（自底向上）

**难度：** Medium

## 题目描述

给定一个二叉树，返回其节点值的**自底向上的层序遍历**。（即按从叶子节点所在层到根节点所在的层，逐层从左到右遍历。）

## 示例

**示例 1：**

```
输入：
        3
       / \
      9  20
        /  \
       15   7

输出：[[15, 7], [9, 20], [3]]
```

**示例 2：**

```
输入：
      1

输出：[[1]]
```

**示例 3：**

```
输入：空树

输出：[]
```

## 提示 / 解题思路

1. **回顾层序遍历：** 你熟悉的 BFS（广度优先搜索）可以用队列来实现。每次将当前层的节点出队，并将其子节点入队。

2. **关键区别：** 本题要求"自底向上"，而标准 BFS 是"自顶向下"。想一想，层序遍历的结果本身是一个二维数组，每一层一个子数组。**自底向上**只是将这个二维数组整体翻转一下即可。

3. **两种实现方向：**
   - **方案 A（推荐）：** 先做正常的 BFS 层序遍历，得到从上到下的结果，最后对整个结果数组调用 `.reverse()`。
   - **方案 B：** 在 BFS 过程中，用 `unshift` 而不是 `push` 把每层结果插入到最前面（注意性能差异）。

4. **边界情况：** 别忘了处理空树的情况（根节点为 `null`）。

## 解法

标准层序遍历（BFS）后，将结果二维数组整体 `reverse()` 即可实现自底向上。

```javascript
/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
const levelOrderBottom = (root) => {
  if (!root) return []
  const result = []
  const queue = [root]
  while (queue.length) {
    const level = []
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const node = queue.shift()
      level.push(node.val)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    result.push(level)
  }
  return result.reverse()
}

// 验证（TreeNode + 层序建树辅助）
const TreeNode = function (val, left, right) {
  this.val = val === undefined ? 0 : val
  this.left = left === undefined ? null : left
  this.right = right === undefined ? null : right
}
const buildTree = (arr) => {
  if (!arr.length) return null
  const nodes = arr.map((v) => (v === null ? null : new TreeNode(v)))
  let i = 0,
    j = 1
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
console.log(
  JSON.stringify(levelOrderBottom(buildTree([3, 9, 20, null, null, 15, 7]))),
) // [[15,7],[9,20],[3]]
console.log(JSON.stringify(levelOrderBottom(buildTree([1])))) // [[1]]
console.log(JSON.stringify(levelOrderBottom(buildTree([])))) // []
console.log(JSON.stringify(levelOrderBottom(buildTree([1, 2, 3, 4, 5, 6, 7])))) // [[4,5,6,7],[2,3],[1]]
```

- **时间复杂度：** O(n)，每个节点入队出队各一次。
- **空间复杂度：** O(n)，队列与结果数组开销（最坏情况满层约 n/2 个节点在队列中）。
