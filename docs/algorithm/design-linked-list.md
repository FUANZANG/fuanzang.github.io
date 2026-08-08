# 设计链表（Design Linked List）

**难度：** Medium

## 题目描述

请你设计并实现一个单向链表，支持以下操作：

1. `get(index)`：获取链表中第 `index` 个节点的值。如果索引无效，返回 `-1`。
2. `addAtHead(val)`：在链表的第一个节点之前插入一个值为 `val` 的节点。
3. `addAtTail(val)`：将一个值为 `val` 的节点追加到链表的末尾。
4. `addAtIndex(index, val)`：在索引 `index` 之前插入一个值为 `val` 的节点。如果 `index` 等于链表长度，则追加到末尾；如果 `index` 大于链表长度，则不插入任何节点。
5. `deleteAtIndex(index)`：如果索引有效，删除链表中第 `index` 个节点。

**注意：**
- 所有索引都是从 `0` 开始的。
- 你的链表需要支持单链表的基本操作，使用哨兵节点（dummy head）可以简化边界处理。

## 示例

**示例 1：**

```
输入:
["MyLinkedList", "addAtHead", "addAtTail", "addAtIndex", "get", "deleteAtIndex", "get"]
[[], [1], [3], [1, 2], [1], [1], [1]]

输出:
[null, null, null, null, 2, null, 1]

解释:
MyLinkedList myLinkedList = new MyLinkedList();
myLinkedList.addAtHead(1);    // 链表: 1 -> null
myLinkedList.addAtTail(3);    // 链表: 1 -> 3 -> null
myLinkedList.addAtIndex(1, 2); // 链表: 1 -> 2 -> 3 -> null
myLinkedList.get(1);          // 返回 2
myLinkedList.deleteAtIndex(1); // 链表变为: 1 -> 3 -> null
myLinkedList.get(1);          // 返回 3
```

**示例 2：**

```
输入:
["MyLinkedList", "addAtHead", "addAtIndex", "get"]
[[], [1], [3, 3], [2]]

输出:
[null, null, null, -1]

解释:
// index=3 大于链表长度，不执行插入
// get(2) 返回 -1，因为索引无效
```

## 提示 / 解题思路

1. **哨兵节点（Dummy Head）技巧**  
   创建一个值为 `0` 的哨兵头节点，它不存储实际数据。这样在 `addAtHead` 和任意位置插入时，不需要单独处理"空链表"或"头部插入"的边界情况，统一走同一个逻辑。

2. **遍历找前驱节点**  
   对于 `get(index)` 和 `addAtIndex(index, val)` / `deleteAtIndex(index)`，你需要定位到目标位置的前一个节点（前驱节点）。从哨兵节点开始遍历即可。

3. **插入操作的顺序**  
   在索引 `i` 处插入新节点 `newNode`，假设你已经找到了第 `i` 个节点 `prev`：
   - `newNode.next = prev.next`
   - `prev.next = newNode`
   注意先连后断，避免丢失后续链表。

4. **删除操作的顺序**  
   找到要删除节点的前驱 `prev` 后：
   - `prev.next = prev.next.next`
   同样要注意不要先断开再赋值。

5. **索引合法性检查**  
   - `get(index)`：`index < 0 || index >= size` 时返回 `-1`
   - `addAtIndex(index, val)`：`index > size` 时不插入；`index == size` 时等价于尾部插入
   - `deleteAtIndex(index)`：`index < 0 || index >= size` 时不操作

6. **维护链表长度**  
   用一个 `size` 变量记录当前链表元素个数，避免每次遍历时计算长度。

## 解法

用哨兵头节点（dummy head）统一边界，维护 `size`；插入/删除先定位前驱节点，注意先连后断。

```javascript
/**
 * @param {number} val
 * @param {ListNode} next
 */
const ListNode = function (val, next) {
  this.val = val === undefined ? 0 : val
  this.next = next === undefined ? null : next
}
const MyLinkedList = function () {
  this.head = new ListNode(0) // 哨兵
  this.size = 0
}
MyLinkedList.prototype.get = function (index) {
  if (index < 0 || index >= this.size) return -1
  let cur = this.head.next
  for (let i = 0; i < index; i++) cur = cur.next
  return cur.val
}
MyLinkedList.prototype.addAtHead = function (val) {
  this.head.next = new ListNode(val, this.head.next)
  this.size++
}
MyLinkedList.prototype.addAtTail = function (val) {
  let cur = this.head
  while (cur.next) cur = cur.next
  cur.next = new ListNode(val)
  this.size++
}
MyLinkedList.prototype.addAtIndex = function (index, val) {
  if (index > this.size) return
  if (index < 0) index = 0
  let cur = this.head
  for (let i = 0; i < index; i++) cur = cur.next
  cur.next = new ListNode(val, cur.next)
  this.size++
}
MyLinkedList.prototype.deleteAtIndex = function (index) {
  if (index < 0 || index >= this.size) return
  let cur = this.head
  for (let i = 0; i < index; i++) cur = cur.next
  cur.next = cur.next.next
  this.size--
}

// 验证
const ll1 = new MyLinkedList()
ll1.addAtHead(1)
ll1.addAtTail(3)
ll1.addAtIndex(1, 2)
console.log(ll1.get(1)) // 2
ll1.deleteAtIndex(1)
console.log(ll1.get(1)) // 3
const ll2 = new MyLinkedList()
ll2.addAtHead(1)
ll2.addAtIndex(3, 3)
console.log(ll2.get(2)) // -1
```

- **时间复杂度：** `get`/`addAtIndex`/`deleteAtIndex` 为 O(index)，`addAtHead` 为 O(1)，`addAtTail` 为 O(n)（无尾指针时）。
- **空间复杂度：** O(n)，存储 n 个节点。
