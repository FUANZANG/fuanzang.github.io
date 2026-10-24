# 二叉树展开为链表（Flatten Binary Tree to Linked List）

**难度：** Medium

## 题目描述

给定二叉树的根节点 `root`，请你将它展开为一个「单链表」：

- 展开后的单链表应该使用**同一棵** `TreeNode`，其中 `right` 子指针指向链表中的下一个结点，而 `left` 子指针**始终为 `null`**。
- 展开后的单链表应该与二叉树的**先序遍历（前序遍历）顺序**相同。

注意：本题要求**原地**修改（in-place），即直接在原树上调整指针，而不是新建一棵链表。

### 约束条件

- 树中结点数在范围 `[0, 2000]` 内。
- `-100 <= Node.val <= 100`。
- **进阶：** 你能使用 `O(1)` 额外空间完成吗？

## 示例

**示例 1：**

```
输入：root = [1,2,5,3,4,null,6]

        1
       / \
      2   5
     / \   \
    3   4   6

输出：[1,null,2,null,3,null,4,null,5,null,6]

     1
      \
       2
        \
         3
          \
           4
            \
             5
              \
               6

解释：展开后的链表顺序正是先序遍历 1 → 2 → 3 → 4 → 5 → 6。
```

**示例 2：**

```
输入：root = []
输出：[]
解释：空树展开后仍为空。
```

**示例 3：**

```
输入：root = [0]
输出：[0]
解释：只有一个节点时，展开结果就是它本身（left 已为 null）。
```

## 提示 / 解题思路

1. **先看清目标形态**：展开结果 = 先序遍历序列，且每个节点的 `left` 全为 `null`，`right` 指向下一个节点。所以本质上是「按先序顺序，把节点用 `right` 指针串起来」。

2. **思路一：逆向前序（递归 + 全局 prev 指针，推荐）**
   - 正常先序是「根 → 左 → 右」，如果**倒着**做，顺序就变成「右 → 左 → 根」。
   - 用一个外部变量 `prev` 记录「上一个已经挂好的节点」。因为是逆序处理，当处理到当前节点 `root` 时，`root` 的整棵右子树和左子树其实**都还没被挂到 prev 上**——更准确地说：我们先递归右子树、再递归左子树，此时 `prev` 恰好指向的是「先序序列里 root 的下一个节点」。
   - 于是只需三步：`root.right = prev; root.left = null; prev = root`。
   - 要点：必须**先右后左**。如果先左后右，`prev` 指向的就是左子树的最后一个节点，链表顺序会错。
   - 每个节点只被访问一次，因此时间是真正的 O(n)。

3. **思路二：找左子树最右节点（迭代，O(1) 额外空间）**
   - 从根开始往下走：若当前节点有左孩子，就在左子树里一路往右找到**最右**的节点 `prev`（它是左子树先序的最后一个节点，也就是「右子树该接的位置」）。
   - 把 `prev.right` 接到当前节点的右子树上，再把整棵左子树搬到右边、`left` 置空，然后 `cur = cur.right` 继续。
   - 该写法不需要递归栈，符合进阶要求，但每次「一路往右找最右」在极端形态（如左斜树）下会被反复走长链，最坏时间是 O(n²)。

4. **易错点**：先序顺序不能搞反（先右后左 vs 先左后右）；以及不要忘了把 `left` 显式置为 `null`。

## 解法

逆向前序遍历（右 → 左 → 根）：用一个 `prev` 指针记住先序序列中的「下一个节点」，回溯时把当前节点的 `right` 接上 `prev`、`left` 置空。

```javascript
/**
 * @param {TreeNode} root
 * @return {void} 原地修改，不返回 anything
 */
let prev = null

const flatten = (root) => {
  if (root === null) return
  flatten(root.right) // 先处理右子树
  flatten(root.left) // 再处理左子树
  root.right = prev // 此时 prev 正是先序序列里 root 的后继
  root.left = null
  prev = root
}

// ===== 验证辅助 =====
const TreeNode = function (val, left, right) {
  this.val = val === undefined ? 0 : val
  this.left = left === undefined ? null : left
  this.right = right === undefined ? null : right
}

// 按 LeetCode 层序格式（null 表示空位）建二叉树
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

// 把拍平后的右链序列化成 LeetCode 输出格式：[val, null, val, null, ...]
const serialize = (root) => {
  const res = []
  let cur = root
  while (cur !== null) {
    res.push(cur.val, null)
    cur = cur.right
  }
  if (res.length) res.pop() // 去掉末尾多余的 null
  return res
}

// 校验所有节点的 left 都为 null
const allLeftNull = (root) => {
  let cur = root
  while (cur !== null) {
    if (cur.left !== null) return false
    cur = cur.right
  }
  return true
}

// ===== 示例验证 =====
// 示例 1：[1,2,5,3,4,null,6] → [1,null,2,null,3,null,4,null,5,null,6]
prev = null
flatten(buildTree([1, 2, 5, 3, 4, null, 6]))
console.log(serialize(prev)) // [1, null, 2, null, 3, null, 4, null, 5, null, 6]
console.log(allLeftNull(prev)) // true

// 示例 2：[] → []
prev = null
flatten(buildTree([]))
console.log(serialize(prev)) // []
console.log(allLeftNull(prev)) // true

// 示例 3：[0] → [0]
prev = null
flatten(buildTree([0]))
console.log(serialize(prev)) // [0]
console.log(allLeftNull(prev)) // true

// 补充用例：单支左斜树 [1,2,null,3,null,4] → [1,null,2,null,3,null,4]
prev = null
flatten(buildTree([1, 2, null, 3, null, 4]))
console.log(serialize(prev)) // [1, null, 2, null, 3, null, 4]
console.log(allLeftNull(prev)) // true
```

- **时间复杂度：** O(n)，每个节点恰好被访问一次，每层只做常数次指针赋值。
- **空间复杂度：** O(h)，`h` 为树高，即递归调用栈深度；最坏（单支树）为 O(n)，平均为 O(log n)。

## 补充

- **进阶（O(1) 额外空间）：** 把递归换成迭代，在左子树中找「最右节点」作为前驱，把右子树挂到它后面，再整体左子树右移、`left` 置空：

```javascript
const flattenIterative = (root) => {
  let cur = root
  while (cur !== null) {
    if (cur.left !== null) {
      // 左子树的最右节点 = 左子树先序的最后一个节点
      let prev = cur.left
      while (prev.right !== null) prev = prev.right
      prev.right = cur.right // 右子树接到它后面
      cur.right = cur.left // 左子树整体搬到右边
      cur.left = null
    }
    cur = cur.right
  }
}

// 验证：[1,2,5,3,4,null,6] → [1,null,2,null,3,null,4,null,5,null,6]
const TreeNode2 = function (val, left, right) {
  this.val = val === undefined ? 0 : val
  this.left = left === undefined ? null : left
  this.right = right === undefined ? null : right
}
const buildTree2 = (arr) => {
  if (!arr.length || arr[0] === null) return null
  const nodes = arr.map((v) => (v === null ? null : new TreeNode2(v)))
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
const serialize2 = (root) => {
  const res = []
  let cur = root
  while (cur !== null) {
    res.push(cur.val, null)
    cur = cur.right
  }
  if (res.length) res.pop()
  return res
}
const tree1 = buildTree2([1, 2, 5, 3, 4, null, 6])
flattenIterative(tree1)
console.log(serialize2(tree1)) // [1, null, 2, null, 3, null, 4, null, 5, null, 6]

const tree2 = buildTree2([1, 2, null, 3, null, 4])
flattenIterative(tree2)
console.log(serialize2(tree2)) // [1, null, 2, null, 3, null, 4]
```

  - 该迭代写法只用常数个指针变量，但「一路往右找最右」在极端形态下会被反复走长链，最坏时间 O(n²)；实际常数极小，多数数据下接近 O(n)。若要严格 O(n) 时间 + O(1) 空间，可用 Morris 线索化的思路改造。
- **相关题目：** 本题是「树 ↔ 链表」原地转换的经典代表，同源的还有 [复制带随机指针的链表（Copy List with Random Pointer）](./copy-list-with-random-pointer.md)（原地插入 + 拆分链表）与 [回文链表（Palindrome Linked List）](./palindrome-linked-list.md)（链表中点 + 反转后半段）。遍历顺序相关的变形题「[二叉树的锯齿形层序遍历（Binary Tree Zigzag Level Order Traversal）](./binary-tree-zigzag-level-order-traversal.md)」也值得一并练习。
