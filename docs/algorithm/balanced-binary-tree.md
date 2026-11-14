# 平衡二叉树（Balanced Binary Tree）

**难度：** Easy

## 题目描述

给你一个二叉树的根节点 `root`，判断它是否**平衡**二叉树。

本题中，一棵**高度平衡**的二叉树定义为：左右子树高度差不超过 1 的二叉树，且其左右子树本身也必须是平衡二叉树（即对**每一个**节点都满足该条件）。

### 约束条件

- 树中节点数目在范围 `[0, 5000]` 内
- `-10^4 <= Node.val <= 10^4`

## 示例

**示例 1：**

输入：

```
root = [3,9,20,null,null,15,7]
```

输出：

```
true
```

解释：

```
      3
     / \
    9   20
       / \
      15   7
```

每个节点的左右子树高度差都不超过 1，因此是平衡二叉树。

**示例 2：**

输入：

```
root = [1,2,2,3,3,null,null,4,4]
```

输出：

```
false
```

解释：

```
        1
       / \
      2   2
     / \
    3   3
   / \
  4   4
```

节点 `1` 的左子树高度为 3、右子树高度为 1，高度差为 2，超过 1，因此不平衡。

## 提示 / 解题思路

- **定义陷阱**：「平衡」不是只看根节点，而是**每个节点**的左右子树高度差都要 ≤ 1。只检查根会漏掉深层的不平衡。
- **朴素做法（自顶向下）**：对每个节点分别求左右子树高度再判断，递归检查所有子树。求高度会重复访问子树，最坏 O(n²)（例如一条链）。
- **最优做法（自底向上，一次遍历 O(n)）**：写一个 `height(node)`，后序遍历时同时「算高度 + 判平衡」。
  - 空节点高度记为 0；
  - 先递归求左、右子树高度 `l`、`r`；
  - 若 `l` 或 `r` 为 `-1`（表示子树已不平衡），或 `|l - r| > 1`，则返回 `-1` 作为「不平衡」的哨兵；
  - 否则返回 `max(l, r) + 1`。
  - 最终 `height(root) !== -1` 即为平衡。
- 关键点：用一个特殊返回值（`-1`）同时承载「高度」和「是否平衡」两种信息，避免重复遍历。

## 解法

后序遍历自底向上求高度，发现高度差 > 1 或子树已失衡就用 `-1` 哨兵提前剪枝，单次 O(n) 完成判断。

```javascript
function TreeNode(val, left = null, right = null) {
  this.val = val;
  this.left = left;
  this.right = right;
}

// 把 LeetCode 层序数组（null 表示空节点）还原成二叉树，便于本地验证
const buildTree = (arr) => {
  if (arr.length === 0) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
};

/**
 * @param {TreeNode} root
 * @return {boolean}
 */
const isBalanced = (root) => {
  // 返回子树高度；子树不平衡时返回 -1 作为哨兵
  const height = (node) => {
    if (!node) return 0;
    const left = height(node.left);
    if (left === -1) return -1;
    const right = height(node.right);
    if (right === -1) return -1;
    if (Math.abs(left - right) > 1) return -1;
    return Math.max(left, right) + 1;
  };
  return height(root) !== -1;
};

// 验证（与题目示例一致）
console.log(isBalanced(buildTree([3, 9, 20, null, null, 15, 7])));          // true
console.log(isBalanced(buildTree([1, 2, 2, 3, 3, null, null, 4, 4])));     // false
console.log(isBalanced(buildTree([])));                                     // true
```

- **时间复杂度：** O(n)，每个节点访问一次
- **空间复杂度：** O(n)，递归栈深度最坏为 n（退化为链）

## 补充

- 哨兵 `-1` 的技巧同样适用于「543. 二叉树的直径（Diameter of Binary Tree）」——在求高度的同时更新最大直径。
- 相关题目：「104. 二叉树的最大深度（Maximum Depth of Binary Tree）」是本题的高度计算基础；「112. 路径总和（Path Sum）」同样是后序 / 递归的经典应用。
- 进阶思考：如果要求**边遍历边输出第一个导致不平衡的节点**，可以扩展 `height` 的返回值，把「高度、是否平衡、问题节点」三者一并带回。
