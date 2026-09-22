# 复制带随机指针的链表（Copy List with Random Pointer）

**难度：** Medium

## 题目描述

给你一个长度为 `n` 的链表，每个节点包含一个额外增加的随机指针 `random` ，该指针可以指向链表中的任意节点或空节点。

构造这个链表的 **深拷贝**。 深拷贝应该正好由 `n` 个 **全新** 节点组成，其中每个新节点的值都设为其对应的原节点的值。新节点的 `next` 指针和 `random` 指针也都应指向复制链表中的节点，并使原链表和复制链表中的这些指针能够表示相同的链表状态。**复制链表中的指针都不应指向原链表中的节点**。

例如，如果原链表中有 `X` 和 `Y` 两个节点，其中 `X.random --> Y` 。那么在复制链表中对应的两个节点 `x` 和 `y` ，同样有 `x.random --> y` 。

返回复制链表的头节点。

用一个由 `n` 个节点组成的链表来表示输入/输出中的链表。每个节点用一个 `[val, random_index]` 表示：

- `val`：一个表示 `Node.val` 的整数。
- `random_index`：随机指针指向的节点索引（范围从 `0` 到 `n-1`）；如果不指向任何节点，则为 `null` 。

你的代码 **只** 接受原链表的头节点 `head` 作为传入参数。

### 约束条件

- `0 <= n <= 1000`
- `-10^4 <= Node.val <= 10^4`
- `Node.random` 为 `null` 或指向链表中的某个节点。

## 示例

**示例 1：**

```
输入：head = [[7,null],[13,0],[11,4],[10,2],[1,0]]
输出：[[7,null],[13,0],[11,4],[10,2],[1,0]]
解释：
- 节点 7 的 val=7，random=null
- 节点 13 的 val=13，random 指向索引 0 的节点（即 7）
- 节点 11 的 val=11，random 指向索引 4 的节点（即 1）
- 节点 10 的 val=10，random 指向索引 2 的节点（即 11）
- 节点 1 的 val=1，random 指向索引 0 的节点（即 7）
```

**示例 2：**

```
输入：head = [[1,1],[2,1]]
输出：[[1,1],[2,1]]
```

**示例 3：**

```
输入：head = [[3,null],[3,0],[3,null]]
输出：[[3,null],[3,0],[3,null]]
```

## 提示 / 解题思路

**思路：三次遍历，O(1) 额外空间**

1. **第一次遍历**：在每个原节点之后插入一个复制节点。例如原链表 `A->B->C` 变为 `A->A'->B->B'->C->C'`。
2. **第二次遍历**：设置复制节点的 `random` 指针。对于每个原节点 `curr`，其复制节点 `curr.next` 的 `random` 应为 `curr.random.next`（如果 `curr.random` 存在）。
3. **第三次遍历**：将交织在一起的原链表和复制链表分离，恢复原链表并提取出复制链表。

这种方法不需要额外的哈希表，空间复杂度为 O(1)。

## 解法

三次遍历法：先插入复制节点，再设置 random 指针，最后分离链表。

```javascript
function Node(val, next, random) {
  this.val = val;
  this.next = next;
  this.random = random;
}

/**
 * @param {Node} head
 * @return {Node}
 */
const copyRandomList = (head) => {
  if (!head) return null;

  // 第一次遍历：在每个原节点后插入复制节点
  let curr = head;
  while (curr) {
    const copy = new Node(curr.val, curr.next, null);
    curr.next = copy;
    curr = copy.next;
  }

  // 第二次遍历：设置复制节点的 random 指针
  curr = head;
  while (curr) {
    if (curr.random) {
      curr.next.random = curr.random.next;
    }
    curr = curr.next.next;
  }

  // 第三次遍历：分离原链表和复制链表
  const newHead = head.next;
  curr = head;
  while (curr) {
    const copy = curr.next;
    curr.next = copy.next;
    if (copy.next) {
      copy.next = copy.next.next;
    }
    curr = curr.next;
  }

  return newHead;
};

// 辅助函数：从数组创建链表
const createList = (arr) => {
  if (!arr || arr.length === 0) return null;
  const nodes = arr.map(([val]) => new Node(val, null, null));
  for (let i = 0; i < arr.length; i++) {
    if (i < arr.length - 1) nodes[i].next = nodes[i + 1];
    const randomIndex = arr[i][1];
    if (randomIndex !== null) nodes[i].random = nodes[randomIndex];
  }
  return nodes[0];
};

// 辅助函数：将链表转回数组
const listToArray = (head) => {
  if (!head) return [];
  const nodes = [];
  const nodeToIndex = new Map();
  let curr = head;
  let index = 0;
  while (curr) {
    nodes.push(curr);
    nodeToIndex.set(curr, index);
    curr = curr.next;
    index++;
  }
  return nodes.map(node => [
    node.val,
    node.random ? nodeToIndex.get(node.random) : null
  ]);
};

// 验证
console.log(listToArray(copyRandomList(createList([[7, null], [13, 0], [11, 4], [10, 2], [1, 0]]))));
// [[7,null],[13,0],[11,4],[10,2],[1,0]]

console.log(listToArray(copyRandomList(createList([[1, 1], [2, 1]]))));
// [[1,1],[2,1]]

console.log(listToArray(copyRandomList(createList([[3, null], [3, 0], [3, null]]))));
// [[3,null],[3,0],[3,null]]

console.log(listToArray(copyRandomList(null)));
// []
```

- **时间复杂度：** O(n)，三次遍历，每次遍历链表一次。
- **空间复杂度：** O(1)，不使用额外哈希表（不计入返回值占用的空间）。

## 补充

- 如果允许使用额外空间，也可以用哈希表（Map）建立原节点到复制节点的映射，两次遍历完成，思路更直观。
- 相关题目：148. 排序链表（链表操作）、[146. LRU 缓存](./lru-cache.md)（哈希表 + 链表）。
