# 验证二叉搜索树（Validate Binary Search Tree）

**难度：** Medium

## 题目描述

给你一个二叉树的根节点 `root`，判断它是否是一个有效的**二叉搜索树**（BST）。

一个有效的二叉搜索树定义如下：

- 节点的**左子树**只包含**严格小于**当前节点的数。
- 节点的**右子树**只包含**严格大于**当前节点的数。
- 所有左子树和右子树自身也必须是二叉搜索树。

注意定义里的「**所有**」：约束不是针对父子两两之间，而是针对**整棵子树**——左子树里每一个节点都必须小于当前节点，右子树里每一个节点都必须大于当前节点。

### 约束条件

- 树中节点数目范围在 `[1, 10^4]` 内。
- `-2^31 <= Node.val <= 2^31 - 1`。

## 示例

**示例 1：**

```
输入：root = [2,1,3]

    2
   / \
  1   3

输出：true
解释：左子节点 1 < 2，右子节点 3 > 2，且左右子树都是 BST。
```

**示例 2：**

```
输入：root = [5,1,4,null,null,3,6]

      5
     / \
    1   4
       / \
      3   6

输出：false
解释：根节点是 5，但右子节点是 4，4 < 5，违反「右子树所有节点都必须大于根节点」。
```

## 提示 / 解题思路

1. **先别急着写「只比较父子」的版本。** 下面这棵树每一对父子都满足「左小右大」，但它不是 BST：

   ```
        5
       / \
      1   6
         / \
        3   7     ← 3 在 5 的右子树里，却比 5 小
   ```

   因为「右子树**所有**节点 > 根」，只比较父子会漏掉这种跨层违规。

2. **给每个节点带一个「取值范围」。** 递归时向下传递一个**开区间** `(min, max)`，表示当前节点的值必须严格落在这个区间内：

   - 根节点：`(-∞, +∞)`。
   - 进入**左**子树时，上界收紧为当前节点的值：`(min, node.val)`。
   - 进入**右**子树时，下界收紧为当前节点的值：`(node.val, max)`。
   - 任意节点只要满足 `val <= min` 或 `val >= max`，立刻返回 `false`。

   区间随着递归「一层层收窄」，每个节点的合法范围都来自**所有祖先**的约束，跨层违规自然被抓到。

3. **等号也要判错。** 定义要求「严格小于 / 严格大于」，所以 `val === min` 或 `val === max`（即出现重复值）也是非法的，必须用 `<=` / `>=` 判断。

4. **另一种等价视角（中序视角）：** BST 的**中序遍历**结果必然是一个**严格递增**序列。因此可以中序遍历、检查序列是否严格递增。递归写起来比区间法多存一个变量，但思路同样重要——见下方「补充」。

5. **边界：** 空节点返回 `true`（空树是合法 BST）；用 `Number.NEGATIVE_INFINITY` / `Number.POSITIVE_INFINITY` 作为初始上下界，比用 `-Infinity` 之外的哨兵值更稳妥。

## 解法

递归 + 上下界：给每个节点传一个开区间 `(min, max)`，向左走收紧上界、向右走收紧下界，值越界即返回 `false`。

```javascript
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
const isValidBST = (root) => {
  // 开区间 (min, max)：node.val 必须严格落在其中
  const check = (node, min, max) => {
    if (node === null) return true

    // 越界（含相等，因为要求严格小于 / 严格大于）→ 不是 BST
    if (node.val <= min || node.val >= max) return false

    // 向左：上界收紧为 node.val；向右：下界收紧为 node.val
    return check(node.left, min, node.val) && check(node.right, node.val, max)
  }

  return check(root, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
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

// 示例 1：[2,1,3] → true
console.log(isValidBST(buildTree([2, 1, 3]))) // true

// 示例 2：[5,1,4,null,null,3,6] → false
console.log(isValidBST(buildTree([5, 1, 4, null, null, 3, 6]))) // false

// 补充用例：每对父子都「左小右大」，但 3 在 5 的右子树里 → false（只比较父子会误判）
console.log(isValidBST(buildTree([5, 1, 6, null, null, 3, 7]))) // false

// 补充用例：出现重复值 → false（要求严格不等）
console.log(isValidBST(buildTree([1, 1]))) // false

// 补充用例：单节点 → true
console.log(isValidBST(buildTree([7]))) // true

// 补充用例：合法 BST → true
console.log(isValidBST(buildTree([5, 3, 8, 1, 4, 7, 9]))) // true
```

- **时间复杂度：** O(n)，每个节点最多访问一次，越界可提前剪枝。
- **空间复杂度：** O(h)，递归调用栈深度为树高 `h`；最坏（链状树）为 O(n)。

## 补充

- **中序解法（等价思路）：** 中序遍历二叉树，维护一个「上一个访问到的值」`prev`，一旦发现 `node.val <= prev` 就说明不是严格递增，返回 `false`。写成递归时用一个闭包变量即可；写成迭代（显式栈）空间同样是 O(h)；用 **Morris 遍历** 可以把空间压到 O(1)，代价是临时改动树结构（用完要还原）。
- **易错点回顾：** ① 只比较父子节点（漏掉跨层违规）；② 用 `<` / `>` 而非 `<=` / `>=`（漏掉重复值）；③ 用 `-Infinity` / `Infinity` 之外的哨兵值（本题 `Node.val` 可达 `2^31 - 1`，哨兵值选小了会误判）。
- **同源题目：** BST 的有序性也是很多题的关键，例如 [二叉树的最近公共祖先](./lowest-common-ancestor-of-a-binary-tree.md) 的 BST 版本「235. 二叉搜索树的最近公共祖先」就可以从根往下按 `val` 比较，不需要后序遍历。
