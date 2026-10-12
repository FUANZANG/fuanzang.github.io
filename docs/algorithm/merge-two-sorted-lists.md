# 合并两个有序链表（Merge Two Sorted Lists）

**难度：** Easy

## 题目描述

将两个升序链表合并为一个新的升序链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。

### 约束条件

- 两个链表的节点数目范围是 [0, 50]
- -100 <= Node.val <= 100
- l1 和 l2 均按 非递减顺序 排列

## 示例

**示例 1：**
输入：l1 = [1,2,4], l2 = [1,3,4]
输出：[1,1,2,3,4,4]
解释：[1,2,4] 和 [1,3,4] 按升序合并后为 [1,1,2,3,4,4]

**示例 2：**
输入：l1 = [], l2 = []
输出：[]

**示例 3：**
输入：l1 = [], l2 = [0]
输出：[0]

## 提示 / 解题思路

- 使用**哑节点（dummy node）**技巧可以避免对头节点的特殊处理，简化代码。
- 维护一个 `prev` 指针指向当前已合并链表的末尾，依次比较两个链表当前节点值，将较小的接到 `prev.next`，然后前进对应链表的指针。
- 当其中一个链表遍历完后，将另一个链表剩余部分直接接上。
- 也可用递归法：每次取较小节点作为头，递归合并剩余部分。

## 解法

哑节点 + 迭代，逐一比较拼接。

```javascript
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */

/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
const mergeTwoLists = (l1, l2) => {
  const dummy = new ListNode(-1);
  let prev = dummy;

  while (l1 && l2) {
    if (l1.val <= l2.val) {
      prev.next = l1;
      l1 = l1.next;
    } else {
      prev.next = l2;
      l2 = l2.next;
    }
    prev = prev.next;
  }

  prev.next = l1 !== null ? l1 : l2;

  return dummy.next;
};

// 辅助函数：将数组转为链表
function arrayToList(arr) {
  if (!arr.length) return null;
  let head = new ListNode(arr[0]);
  let cur = head;
  for (let i = 1; i < arr.length; i++) {
    cur.next = new ListNode(arr[i]);
    cur = cur.next;
  }
  return head;
}

// 辅助函数：将链表转为数组（便于打印验证）
function listToArray(head) {
  const res = [];
  let cur = head;
  while (cur) {
    res.push(cur.val);
    cur = cur.next;
  }
  return res;
}

// 验证
console.log(listToArray(mergeTwoLists(arrayToList([1, 2, 4]), arrayToList([1, 3, 4])))); // [1, 1, 2, 3, 4, 4]
console.log(listToArray(mergeTwoLists(arrayToList([]), arrayToList([])));              // []
console.log(listToArray(mergeTwoLists(arrayToList([]), arrayToList([0]))));             // [0]
```

- **时间复杂度：** O(m + n)，其中 m 和 n 分别是两个链表的长度。
- **空间复杂度：** O(1)，只使用了常数额外空间（哑节点 + 指针）。

## 补充

- 递归法更简洁：`l1.next = mergeTwoLists(l1.next, l2)`，但空间复杂度 O(m+n)（调用栈）。
- 相关题目：合并 K 个有序链表（Merge k Sorted Lists）——进阶挑战，可用优先队列或分治。
