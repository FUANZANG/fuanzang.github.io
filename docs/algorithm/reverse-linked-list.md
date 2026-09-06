# 反转链表（Reverse Linked List）

**难度：** Easy

## 题目描述

给你单链表的头节点 `head`，请你反转链表，并返回反转后的链表。

### 约束条件

- 链表中节点的数目范围是 `[0, 5000]`
- `-5000 <= Node.val <= 5000`

## 示例

**示例 1：**

```
输入：head = [1, 2, 3, 4, 5]
输出：[5, 4, 3, 2, 1]
```

**示例 2：**

```
输入：head = [1, 2]
输出：[2, 1]
```

**示例 3：**

```
输入：head = []
输出：[]
```

## 提示 / 解题思路

经典链表指针翻转问题。

- 维护三个指针：`prev`（前驱，初始为 `null`）、`curr`（当前，初始为 `head`）、`next`（临时保存后继）。
- 遍历链表时，将 `curr.next` 指向前驱 `prev`，然后将三个指针整体向后移动一步。
- 遍历结束时 `curr` 为 `null`，此时 `prev` 即为新的头节点。
- 也可用递归：先递归到末尾，回溯时逐个翻转指向。

## 解法

```javascript
/**
 * Definition for singly-linked list.
 */
function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

/**
 * @param {ListNode} head
 * @return {ListNode}
 */
const reverseList = (head) => {
  let prev = null;
  let curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
};

// 辅助：将数组转成链表
const arrayToList = (arr) => {
  let dummy = new ListNode(0);
  let curr = dummy;
  for (const v of arr) {
    curr.next = new ListNode(v);
    curr = curr.next;
  }
  return dummy.next;
};

// 辅助：将链表转成数组（便于 console.log 输出）
const listToArray = (head) => {
  const result = [];
  while (head) {
    result.push(head.val);
    head = head.next;
  }
  return result;
};

// 验证
console.log(listToArray(reverseList(arrayToList([1, 2, 3, 4, 5])))); // [5, 4, 3, 2, 1]
console.log(listToArray(reverseList(arrayToList([1, 2]))));          // [2, 1]
console.log(listToArray(reverseList(arrayToList([]))));              // []
```

- **时间复杂度：** O(n)
- **空间复杂度：** O(1)

## 补充

- 变形：递归实现，时间 O(n)，空间 O(n)（递归栈）。
- 相关题目：变形题「92. 反转链表 II」（指定区间翻转）、「25. K 个一组翻转链表」。