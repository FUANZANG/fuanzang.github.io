# 删除链表中的节点（Delete Node in a Linked List）

**难度：** Easy

## 题目描述

请编写一个程序，要求删除链表中**给定值的节点**（被删除的节点不是最后一个节点）。由于没有直接访问链表头部的指针，函数只接收指向被删除节点本身的指针。

即：函数 `deleteNode(node)` 中，`node` 表示需要被删除的那个节点本身（而不是它的值）。

### 约束条件

- 节点值在链表里不一定是唯一的。
- 被删除的节点一定存在于链表中，且**不是最后一个节点**。
- 所有操作必须在 O(1) 时间内完成。
- 链表节点数在 `1 ~ 10^4` 之间。

## 示例

```
输入：head = [4,5,1,9], node = 5
（即 5 对应的节点）
输出：[4,1,9]
解释：调用函数后，被删除的节点是 5。
       剩余节点保持原相对顺序。
```

```
输入：head = [4,5,1,9], node = 1
输出：[4,5,9]
解释：调用函数后，被删除的节点是 1。
```

## 提示 / 解题思路

**核心观察：** 我们拿不到被删节点的前驱（`prev`），所以无法直接修改 `prev.next`。但我们可以"欺骗"链表：

1. 把被删节点**下一个节点的值**拷贝到当前节点上（`node.val = node.next.val`）。
2. 把当前节点的 `next` 指向下下个节点（`node.next = node.next.next`），绕开原 next。

结果：原节点在逻辑上"消失"了，取而代之的是原 next 节点的值。这就是题目允许"被删节点不是最后一个"的原因——否则 `node.next` 为 `null`，无法拷贝。

**伪代码思路：**

```
node.val = node.next.val
node.next = node.next.next
```

时间 O(1)，空间 O(1)。

## 解法

直接复制后继节点的值到当前节点，再把当前节点的 `next` 跳过后继节点即可。

```javascript
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *   this.val = val;
 *   this.next = next;
 * }
 *
 * @param {ListNode} node - 需要删除的节点（不是最后一个节点）
 */
const deleteNode = (node) => {
  node.val = node.next.val;
  node.next = node.next.next;
};

// 辅助函数：构建链表（用于验证）
function buildList(vals) {
  const head = new ListNode(vals[0]);
  let cur = head;
  for (let i = 1; i < vals.length; i++) {
    cur.next = new ListNode(vals[i]);
    cur = cur.next;
  }
  return head;
}

// 辅助函数：输出链表所有值
function dumpList(head) {
  const arr = [];
  let cur = head;
  while (cur) {
    arr.push(cur.val);
    cur = cur.next;
  }
  return arr;
}

// 验证示例 1：删除值为 5 的节点
const list1 = buildList([4, 5, 1, 9]);
const node1 = list1.next; // 指向值 5 的节点
deleteNode(node1);
console.log(dumpList(list1)); // [4, 1, 9]

// 验证示例 2：删除值为 1 的节点
const list2 = buildList([4, 5, 1, 9]);
const node2 = list2.next.next; // 指向值 1 的节点
deleteNode(node2);
console.log(dumpList(list2)); // [4, 5, 9]
```

- **时间复杂度：** O(1)
- **空间复杂度：** O(1)

## 补充

进阶思考：为什么题目限制"被删节点不是最后一个节点"？因为最后没有 `next` 可拷贝，若允许删除尾节点就必须访问前驱——而这需要额外的 O(n) 遍历，违背 O(1) 要求。

相关题目：

- [反转链表](./reverse-linked-list.md)
