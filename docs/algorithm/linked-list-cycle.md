# 环形链表（Linked List Cycle）

**难度：** Easy

## 题目描述

给你一个链表的头节点 `head`，判断链表中是否有环。

如果链表中有某个节点，可以通过连续跟踪 `next` 指针再次到达，则链表中存在环。为了表示给定链表中的环，评测系统内部使用整数 `pos` 来表示链表尾连接到链表中的位置（索引从 `0` 开始）。注意：`pos` 不作为参数进行传递，仅仅是为了标识链表的实际情况。

- 如果链表中存在环，则返回 `true`。
- 否则，返回 `false`。

### 约束条件

- 链表中节点的数目范围是 `[0, 10^4]`
- `-10^5 <= Node.val <= 10^5`
- `pos` 为 `-1` 或者链表中的一个有效索引
- **进阶：** 你能用 `O(1)`（即常量）内存解决此问题吗？

## 示例

```
示例 1：
输入：head = [3, 2, 0, -4], pos = 1
输出：true
解释：链表中有一个环，其尾部连接到第二个节点（索引 1 的节点）。

示例 2：
输入：head = [1, 2], pos = 0
输出：true
解释：链表中有一个环，其尾部连接到第一个节点。

示例 3：
输入：head = [1], pos = -1
输出：false
解释：链表中没有环。
```

## 提示 / 解题思路

**思路一：哈希表。** 从头遍历链表，用一个 `Set` 记录访问过的节点。每走到一个节点就先查表：若已出现过，说明回到了旧节点，存在环；否则把它存进表继续走，直到 `null` 为止。时间 `O(n)`，但需要 `O(n)` 额外空间。

**思路二：快慢指针（Floyd 判圈算法）。** 用两个指针同时从头部出发，慢指针每次走 1 步，快指针每次走 2 步：

- 如果链表无环，快指针会先到达 `null`，循环自然结束，返回 `false`；
- 如果链表有环，快指针会先进入环并在环内不断兜圈，由于快指针相对慢指针每轮追近 1 步，两者最终必然在环内相遇。

> 关键点：判断循环终止的条件是 `fast !== null && fast.next !== null`，因为快指针一次要跳两步，必须保证 `fast.next` 存在。
>
> 伪代码：

```
slow = head, fast = head
while fast 存在且 fast.next 存在:
    slow = slow.next
    fast = fast.next.next
    若 slow === fast: 返回 true
返回 false
```

快慢指针解法只需两个变量，空间为 `O(1)`，正是进阶要求的最优解。

## 解法

**快慢指针：** 慢指针每步走 1 格、快指针每步走 2 格，若有环二者必在环内相遇，无环则快指针先到链尾。

```javascript
/**
 * Definition for singly-linked list.
 */
function ListNode(val) {
  this.val = val
  this.next = null
}

/**
 * @param {ListNode} head
 * @return {boolean}
 */
const hasCycle = (head) => {
  let slow = head
  let fast = head
  while (fast !== null && fast.next !== null) {
    slow = slow.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}

// 辅助：按数组构建链表，pos 为环入口索引（-1 表示无环）
const buildList = (values, pos) => {
  if (values.length === 0) return null
  const nodes = values.map((v) => new ListNode(v))
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].next = nodes[i + 1]
  }
  if (pos >= 0) nodes[nodes.length - 1].next = nodes[pos]
  return nodes[0]
}

// 验证
console.log(hasCycle(buildList([3, 2, 0, -4], 1))) // true
console.log(hasCycle(buildList([1, 2], 0))) // true
console.log(hasCycle(buildList([1], -1))) // false
```

- **时间复杂度：** O(n)
- **空间复杂度：** O(1)

## 补充

- 进阶挑战：**142. 环形链表 II（Linked List Cycle II）** —— 不仅判断有无环，还要返回入环的第一个节点。做法是相遇后让一个指针回到头部，两指针同速前进，再次相遇处即为环入口。
- 变形题：**287. 寻找重复数（Find the Duplicate Number）** 可以把数组下标与元素值视作链表指针，套用同样的判圈思想在 `O(1)` 空间内求解，见 [寻找重复数字](./find-the-duplicate-number.md)。
