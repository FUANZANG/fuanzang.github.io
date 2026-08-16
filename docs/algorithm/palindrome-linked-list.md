# 回文链表（Palindrome Linked List）

**难度：** Medium

> 版本：LeetCode 2.0 —— JavaScript 解法。

## 题目描述

给你一个单链表的头节点 `head`，判断链表是否是回文的。如果链表是回文的，则返回 `true`；否则返回 `false`。

回文链表即：链表从前向后和从后向前读都是相同的。

### 约束条件

- 链表的长度范围为 `[1, 10^5]`
- `0 <= Node.val <= 9`

## 示例

**示例 1：**

```
输入：head = [1,2,2,1]
输出：true
解释：链表从前向后和从后向前都是 [1,2,2,1]，是回文的。
```

**示例 2：**

```
输入：head = [1,2]
输出：false
解释：链表从前向后为 [1,2]，从后向前为 [2,1]，不是回文的。
```

## 提示 / 解题思路

**要点：** 如何在 O(1) 额外空间内判断回文？

1. **快慢指针找中点**：快指针每次走 2 步、慢指针每次走 1 步。当快指针到达末尾时，慢指针正好位于链表中点（奇数时为中间元素，偶数时为前半部分的最后一个元素）。

2. **反转后半部分**：从慢指针的 `next` 开始反转链表，得到后半部分的头节点。

3. **双指针比较**：用两个指针分别从链表头部和反转后的后半部分头部同时向后遍历，比较每一位上的数值。如果全部相同，则是回文。

4. **恢复链表（可选）**：题目只要求返回布尔值，反转后半部分的操作修改了原链表结构。在生产环境中通常会恢复链表以避免副作用。

## 解法

（一句话思路：快慢指针定位中点，反转后半部分链表，然后双指针比较前后两半。）

```javascript
/**
 * 链表节点定义
 * function ListNode(val, next) {
 *   this.val = (val === undefined ? 0 : val)
 *   this.next = (next === undefined ? null : next)
 * }
 */

/**
 * 反转链表，返回反转后的头节点
 * @param {ListNode|null} head
 * @return {ListNode|null}
 */
const reverseList = (head) => {
  let prev = null
  let curr = head
  while (curr !== null) {
    const next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }
  return prev
}

/**
 * @param {ListNode|null} head
 * @return {boolean}
 */
const isPalindrome = (head) => {
  if (head === null || head.next === null) return true

  // 1. 快慢指针找到前半部分的最后一个节点
  let slow = head
  let fast = head
  while (fast.next !== null && fast.next.next !== null) {
    slow = slow.next
    fast = fast.next.next
  }

  // 2. 反转后半部分链表
  const secondHalf = slow.next
  slow.next = null // 断开前后两部分（便于恢复）
  const reversedSecond = reverseList(secondHalf)

  // 3. 双指针比较前半部分和反转后的后半部分
  let p1 = head
  let p2 = reversedSecond
  let result = true
  while (p2 !== null) {
    if (p1.val !== p2.val) {
      result = false
      break
    }
    p1 = p1.next
    p2 = p2.next
  }

  // 4. 恢复链表（将后半部分接回原处）
  slow.next = reverseList(reversedSecond)

  return result
}

// 辅助：从数组构建链表
const createList = (arr) => {
  const dummy = new ListNode(0)
  let curr = dummy
  for (const val of arr) {
    curr.next = new ListNode(val)
    curr = curr.next
  }
  return dummy.next
}

function ListNode(val, next) {
  this.val = (val === undefined ? 0 : val)
  this.next = (next === undefined ? null : next)
}

// 验证
console.log(isPalindrome(createList([1, 2, 2, 1]))) // 期望输出：true
console.log(isPalindrome(createList([1, 2])))       // 期望输出：false
```

- **时间复杂度：** O(n) ———— 快慢指针遍历 O(n)，反转 O(n)，比较 O(n)，恢复 O(n)，总体为线性时间。
- **空间复杂度：** O(1) ———— 仅使用常数个指针变量。
