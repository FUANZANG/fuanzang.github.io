# 两数相加（Add Two Numbers）

**难度：** Medium

## 题目描述

给你两个 **非空** 的链表，表示两个非负的整数。它们每位数字都是按照 **逆序** 的方式存储的，并且每个节点只能存储 **一位** 数字。

请你将两个数相加，并以相同的链表形式返回它们的和。

### 约束条件

- 每个链表中的节点数在范围 `[1, 100]` 内
- `0 <= Node.val <= 9`
- 题目数据保证列表表示的数字不含前导零（除了数字 `0` 本身）

## 示例

**示例 1：**

输入：`l1 = [2,4,3]`, `l2 = [5,6,4]`
输出：`[7,0,8]`
解释：`342 + 465 = 807`。

**示例 2：**

输入：`l1 = [0]`, `l2 = [0]`
输出：`[0]`

**示例 3：**

输入：`l1 = [9,9,9,9,9,9,9]`, `l2 = [9,9,9,9]`
输出：`[8,9,9,9,0,0,0,1]`

## 提示 / 解题思路

- 两个链表都是「逆序」存储的：个位在表头，因此直接同时从头遍历两条链表即可对齐「同数位」（个位对个位、十位对十位）。
- 用 `carry` 记录进位。每一位的本地和 = `l1.val + l2.val + carry`，当前位结果取 `sum % 10`，新的进位取 `Math.floor(sum / 10)`。
- 当 `l1`、`l2` 都走到末尾且 `carry` 为 `0` 时循环结束；若最后仍有进位，要再补一个节点（如 `9 + 9` 这种情况）。
- 用哨兵节点（dummy head）统一处理头节点，最后返回 `dummy.next`，避免对头节点做特殊判断。
- 只需遍历一次，时间与空间复杂度见下。

## 解法

用「逐位相加 + 进位」模拟小学竖式：双指针同时遍历两个链表，每位相加并处理进位，结果接到新链表上。

```javascript
function ListNode(val, next) {
  this.val = (val === undefined ? 0 : val)
  this.next = (next === undefined ? null : next)
}

/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
const addTwoNumbers = (l1, l2) => {
  const dummy = new ListNode(0)
  let cur = dummy
  let carry = 0
  while (l1 || l2 || carry) {
    const sum = (l1 ? l1.val : 0) + (l2 ? l2.val : 0) + carry
    carry = Math.floor(sum / 10)
    cur.next = new ListNode(sum % 10)
    cur = cur.next
    if (l1) l1 = l1.next
    if (l2) l2 = l2.next
  }
  return dummy.next
}

// 辅助：数组 -> 链表（题目输入为逆序数字）
const buildList = (arr) => {
  const dummy = new ListNode(0)
  let cur = dummy
  for (const v of arr) {
    cur.next = new ListNode(v)
    cur = cur.next
  }
  return dummy.next
}

// 辅助：链表 -> 数组，便于校验输出
const listToArray = (node) => {
  const res = []
  while (node) {
    res.push(node.val)
    node = node.next
  }
  return res
}

// 验证
console.log(listToArray(addTwoNumbers(buildList([2, 4, 3]), buildList([5, 6, 4])))) // [7, 0, 8]
console.log(listToArray(addTwoNumbers(buildList([0]), buildList([0])))) // [0]
console.log(listToArray(addTwoNumbers(buildList([9, 9, 9, 9, 9, 9, 9]), buildList([9, 9, 9, 9])))) // [8, 9, 9, 9, 0, 0, 0, 1]
```

- **时间复杂度：** O(max(m, n))，m、n 分别为两个链表长度，每个节点最多访问一次。
- **空间复杂度：** O(max(m, n))，结果链表长度最多为较长链表长度 + 1。

## 补充

进阶练习：若链表改为「正序」存储（高位在前），可先反转链表再按本解法相加，或借助栈。链表基础操作可参考本仓库 [设计链表](./design-linked-list.md)。
