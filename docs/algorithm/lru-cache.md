# LRU 缓存（LRU Cache）

**难度：** Medium

## 题目描述

请你设计并实现一个满足 LRU (最近最少使用) 缓存约束的数据结构。

实现 `LRUCache` 类：

- `LRUCache(int capacity)` — 以正整数作为容量 `capacity` 初始化 LRU 缓存。
- `int get(int key)` — 如果关键字 `key` 存在于缓存中，则返回关键字的值，否则返回 `-1`。
- `void put(int key, int value)` — 如果关键字 `key` 已经存在，则变更其数据值 `value`；如果不存在，则向缓存中插入该组 `key-value`。如果插入操作导致关键字数量超过 `capacity`，则应该逐出最久未使用的关键字。

**要求：** `get` 和 `put` 必须以 O(1) 的平均时间复杂度运行。

### 约束条件

- `1 <= capacity <= 3000`
- `0 <= key <= 10^4`
- `0 <= value <= 10^5`
- 最多调用 `2 * 10^5` 次 `get` 和 `put`

## 示例

```
输入：
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]

输出：
[null, null, null, 1, null, -1, null, -1, 3, 4]

解释：
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // 缓存是 {1=1}
lRUCache.put(2, 2); // 缓存是 {1=1, 2=2}
lRUCache.get(1);    // 返回 1
lRUCache.put(3, 3); // 移除 key 2，缓存是 {1=1, 3=3}
lRUCache.get(2);    // 返回 -1 (未找到)
lRUCache.put(4, 4); // 移除 key 1，缓存是 {4=4, 3=3}
lRUCache.get(1);    // 返回 -1 (未找到)
lRUCache.get(3);    // 返回 3
lRUCache.get(4);    // 返回 4
```

## 提示 / 解题思路

核心思想：**哈希表 + 双向链表**。

- **哈希表**提供 O(1) 的 key 查找能力。
- **双向链表**维护访问顺序：链表头部是最近使用的节点，尾部是最久未使用的节点。

操作分析：

1. **`get(key)`**：哈希表查找，若存在则将节点移到链表头部，返回值；否则返回 `-1`。
2. **`put(key, value)`**：
   - key 已存在：更新 value，将节点移到头部。
   - key 不存在：创建新节点插入头部；若容量超限，删除尾部节点（最久未使用）并在哈希表中移除。

使用**伪头节点和伪尾节点**可以简化边界处理，避免对空链表的特殊判断。

## 解法

使用双向链表维护访问顺序，哈希表实现 O(1) 查找。

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
    // 伪头节点和伪尾节点，简化边界处理
    this.head = { prev: null, next: null };
    this.tail = { prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this._moveToHead(node);
    return node.value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this._moveToHead(node);
    } else {
      const node = { key, value, prev: null, next: null };
      this.cache.set(key, node);
      this._addToHead(node);
      if (this.cache.size > this.capacity) {
        const removed = this._removeTail();
        this.cache.delete(removed.key);
      }
    }
  }

  _addToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }

  _removeTail() {
    const node = this.tail.prev;
    this._removeNode(node);
    return node;
  }
}

// 验证
const lRUCache = new LRUCache(2);
lRUCache.put(1, 1);
lRUCache.put(2, 2);
console.log(lRUCache.get(1));    // 1
lRUCache.put(3, 3);
console.log(lRUCache.get(2));    // -1
lRUCache.put(4, 4);
console.log(lRUCache.get(1));    // -1
console.log(lRUCache.get(3));    // 3
console.log(lRUCache.get(4));    // 4
```

- **时间复杂度：** O(1) 每次 `get` 和 `put` 操作
- **空间复杂度：** O(capacity)，哈希表和链表最多存储 capacity + 2 个节点

## 补充

- 进阶挑战：尝试在不使用内置 LinkedHashMap 的情况下，仅用基础数据结构实现。
- 相关题目：[设计链表](./design-linked-list.md)（双向链表基础练习）。
