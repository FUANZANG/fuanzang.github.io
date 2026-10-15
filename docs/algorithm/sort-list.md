# 排序链表（Sort List）

**难度：** Medium

## 题目描述

给你链表的头结点 `head`，请将其按升序排列并返回排序后的链表。

### 约束条件

- 链表中节点的数目在范围 `[0, 5 * 10^4]` 内
- `-10^5 <= Node.val <= 10^5`

## 示例

**示例 1：**

```
输入：head = [4,2,1,3]
输出：[1,2,3,4]
```

**示例 2：**

```
输入：head = [-1,5,3,4,0]
输出：[-1,0,3,4,5]
```

**示例 3：**

```
输入：head = []
输出：[]
```

## 提示 / 解题思路

**核心思路：归并排序（Merge Sort）**

1. **拆分**：用快慢指针找到链表中点，将链表从中间断成两半，递归处理左右两部分。
2. **合并**：将两个有序链表合并为一个有序链表（同「合并两个有序链表」的迭代写法）。

要点：
- 快慢指针找中点：慢指针每次走一步，快指针每次走两步，当快指针到尾时慢指针正好在中点。
- 记得在拆分处 `slow.next = null` 断开链表，否则递归不会终止。
- 合并阶段用虚拟头节点简化指针操作。

## 解法

自顶向下归并排序：快慢指针找中点 → 递归拆分 → 合并有序链表。

```javascript
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */

/**
 * @param {ListNode} head
 * @return {ListNode}
 */
const sortList = (head) => {
  if (!head || !head.next) return head;

  // 快慢指针找中点
  let slow = head;
  let fast = head.next;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  const mid = slow.next;
  slow.next = null; // 断开为两条链表

  let left = sortList(head);
  let right = sortList(mid);

  // 合并两个有序链表
  const dummy = new ListNode(0);
  let curr = dummy;
  while (left && right) {
    if (left.val <= right.val) {
      curr.next = left;
      left = left.next;
    } else {
      curr.next = right;
      right = right.next;
    }
    curr = curr.next;
  }
  curr.next = left || right;
  return dummy.next;
};

// 验证
function ListNode(val, next) {
  this.val = (val === undefined ? 0 : val);
  this.next = (next === undefined ? null : next);
}
function createList(arr) {
  if (!arr.length) return null;
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) {
    cur.next = new ListNode(v);
    cur = cur.next;
  }
  return dummy.next;
}
function listToArray(head) {
  const res = [];
  while (head) { res.push(head.val); head = head.next; }
  return res;
}

console.log(listToArray(sortList(createList([4, 2, 1, 3])))); // [1,2,3,4]
console.log(listToArray(sortList(createList([-1, 5, 3, 4, 0])))); // [-1,0,3,4,5]
console.log(listToArray(sortList(createList([])))); // []
```

- **时间复杂度：** O(n log n)
- **空间复杂度：** O(log n)（递归栈深度）
