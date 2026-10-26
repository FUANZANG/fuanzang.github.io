# 对称二叉树（Symmetric Tree）

**难度：** Easy

## 题目描述

给你一个二叉树的根节点 `root`，检查它是否**轴对称**（即关于根节点所在的竖直轴镜像对称）。

所谓轴对称：把树沿根节点的竖直轴对折，左子树与右子树能够完全重合。

### 约束条件

- 树中节点数目在范围 `[1, 1000]` 内
- `-100 <= Node.val <= 100`

```javascript
function TreeNode(val, left, right) {
  this.val = (val === undefined ? 0 : val)
  this.left = (left === undefined ? null : left)
  this.right = (right === undefined ? null : right)
}
```

## 示例

**示例 1：**

```
输入：root = [1,2,2,3,4,4,3]

        1
       / \
      2   2
     / \ / \
    3  4 4  3

输出：true
解释：左子树与右子树互为镜像，整棵树关于根节点竖直轴对称。
```

**示例 2：**

```
输入：root = [1,2,2,null,3,null,3]

        1
       / \
      2   2
       \   \
        3   3

输出：false
解释：虽然两层子节点的值都是 2 和 3，但左子树的 3 在右孩子位置、右子树的 3 在左孩子位置，对折后无法重合，故不对称。
```

## 提示 / 解题思路

**判断两个节点是否互为镜像，就是本题的核心子问题。**

设 `isMirror(a, b)` 判断以 `a`、`b` 为根的两棵树是否互为镜像，按定义逐层对齐：

1. `a` 与 `b` 同时为 `null` → 空对空，镜像成立，返回 `true`；
2. 只有一个为 `null`（值不等 / 结构不同）→ 返回 `false`；
3. `a.val !== b.val` → 值对不上，返回 `false`；
4. 否则继续比较「交叉」的两对：`a` 的左子树 ↔ `b` 的右子树，`a` 的右子树 ↔ `b` 的左子树，只有两对都成立才返回 `true`。

于是 `isSymmetric(root)` 等价于 `isMirror(root.left, root.right)`。

**两种实现路线：**

- **递归（DFS）**：把上面的 `isMirror` 直接翻译成递归，代码最短。递归深度等于树高，最坏退化成链表时深度为 `n`。
- **迭代（BFS / 队列）**：用一个队列，每次取出两个节点做同样的「交叉比较」，再把 `(a.left, b.right)`、`(a.right, b.left)` 依次入队。空间是队列宽度，同样优于递归在极端形态下的栈占用。

**易错点：** 对称是「结构 + 值」的双重镜像，只比较同一层的值列表（像层序遍历那样只比每层是否回文）会在本例 2 这类形态下判错——必须交叉比较左右子树。

## 解法

递归把「镜像」拆成 `isMirror(a, b)` 子问题：结构对齐后值相等，再交叉比较 `a.left ↔ b.right` 与 `a.right ↔ b.left`。

```javascript
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
const isSymmetric = (root) => {
  // 判断以 a、b 为根的两棵树是否互为镜像
  const isMirror = (a, b) => {
    if (a === null && b === null) return true; // 空对空，成立
    if (a === null || b === null) return false; // 只有一个空，结构不对称
    if (a.val !== b.val) return false; // 值不相等，不对称
    // 交叉比较：a 的左 ↔ b 的右，a 的右 ↔ b 的左
    return isMirror(a.left, b.right) && isMirror(a.right, b.left);
  }

  if (root === null) return true;
  return isMirror(root.left, root.right);
}

// ── 构造示例用树 ──
const build = (arr) => {
  if (!arr.length) return null
  const root = new TreeNode(arr[0])
  const queue = [root]
  let i = 1
  while (i < arr.length) {
    const node = queue.shift()
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i])
      queue.push(node.left)
    }
    i++
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i])
      queue.push(node.right)
    }
    i++
  }
  return root
}

// ── 验证 ──
const t1 = build([1, 2, 2, 3, 4, 4, 3])
const t2 = build([1, 2, 2, null, 3, null, 3])
const t3 = build([1])
console.log(isSymmetric(t1)) // true（示例 1）
console.log(isSymmetric(t2)) // false（示例 2）
console.log(isSymmetric(t3)) // true（单节点必对称）
```

- **时间复杂度：** O(n)，每个节点最多被访问一次
- **空间复杂度：** O(n)，递归栈深度最坏为树高 O(n)（退化成链表时）

## 补充

**迭代写法（队列版）**，思路相同但把递归换成显式队列，避免极端形态下的调用栈过深：

```javascript
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
const isSymmetricIterative = (root) => {
  if (root === null) return true
  const queue = [root.left, root.right] // 每次取两个节点做交叉比较
  while (queue.length) {
    const a = queue.shift()
    const b = queue.shift()
    if (a === null && b === null) continue
    if (a === null || b === null) return false
    if (a.val !== b.val) return false
    queue.push(a.left, b.right, a.right, b.left)
  }
  return true
}
```

**相关题目：** 判断同一棵树本身的遍历特性可看「100. 相同的树」与「110. 平衡二叉树」；涉及节点值递归校验的二叉树题目可参考本项目的 [验证二叉搜索树](./validate-binary-search-tree.md)。
