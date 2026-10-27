# 合并 K 个升序链表（Merge k Sorted Lists）

**难度：** Hard

## 题目描述

给你 k 个**升序**排列的链表，请将它们合并为一个升序链表并返回。

### 约束条件

- lists.length == k
- 0 <= k <= 10^4
- 0 <= lists[i].length <= 500
- -10^4 <= lists[i][j] <= 10^4
- 每个 lists[i] 按 **升序** 排列
- 将所有列表中的节点数之和设计在 [0, 10^4] 范围内

## 示例

**示例 1：**

```
输入：lists = [[1,4,5],[1,3,4],[2,6]]
输出：[1,1,2,3,4,4,5,6]
解释：三条升序链表按升序合并后为 [1,1,2,3,4,4,5,6]
```

**示例 2：**

```
输入：lists = []
输出：[]
解释：没有链表，结果为空链表
```

## 提示 / 解题思路

1. **从两路归并推广到 k 路归并：** 合并两条链表时，每次比较两个头节点取小的即可（见已收录的「合并两个有序链表」）。但 k 条链表时不能两两硬比——每次要取的是 **k 个「各链表当前头」中的最小值**，然后该链表前进一步。
2. **关键抽象：k 路取最小 → 最小堆。** 「维护一个候选集合，反复取最小」正是最小堆（优先队列）的标准场景。把每条链表的头节点入堆；每次弹出全局最小的节点接到结果链表末尾；若弹出的节点还有后继，把后继节点入堆。
3. **实现要点：** JavaScript 标准库没有可直接使用的最小堆，需要自己基于数组实现「上浮 + 下沉」两个操作；堆中元素是**节点本身**（按 `val` 比较）。
4. **复杂度直觉：** 总共有 N 个节点，每个节点恰好入堆一次、出堆一次，堆大小不超过 k，单次堆操作 O(log k)，故总时间 O(N log k)。

## 解法

手写最小堆 + 哑节点：各链表头入堆，反复弹出最小节点接到结果链表，弹出的节点若有后继则让后继入堆。

```javascript
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *   this.val = (val===undefined ? 0 : val)
 *   this.next = (next===undefined ? null : next)
 * }
 */
function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
const mergeKLists = (lists) => {
  // 手写最小堆（按节点 val 比较，堆中元素即节点本身）
  const heap = [];

  const push = (node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].val <= heap[i].val) break;
      const t = heap[p];
      heap[p] = heap[i];
      heap[i] = t;
      i = p;
    }
  };

  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let m = i;
        if (l < heap.length && heap[l].val < heap[m].val) m = l;
        if (r < heap.length && heap[r].val < heap[m].val) m = r;
        if (m === i) break;
        const t = heap[m];
        heap[m] = heap[i];
        heap[i] = t;
        i = m;
      }
    }
    return top;
  };

  for (const head of lists) {
    if (head !== null) push(head);
  }

  const dummy = new ListNode(0);
  let cur = dummy;
  while (heap.length > 0) {
    const min = pop();
    cur.next = min;
    cur = cur.next;
    if (min.next !== null) push(min.next);
  }

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
// 示例 1：[[1,4,5],[1,3,4],[2,6]] → [1,1,2,3,4,4,5,6]
console.log(
  listToArray(
    mergeKLists([arrayToList([1, 4, 5]), arrayToList([1, 3, 4]), arrayToList([2, 6])])
  )
);

// 示例 2：[] → []
console.log(listToArray(mergeKLists([])));
```

- **时间复杂度：** O(N log k)，N 为所有链表节点总数，k 为链表条数；每个节点入堆、出堆各一次，单次堆操作 O(log k)。
- **空间复杂度：** O(k)，堆数组最多同时保存 k 个节点引用；结果复用原节点，无额外节点分配。

## 补充

- **进阶挑战（分治解法）：** 也可不用堆——对 lists 做折半切分，两两调用已收录的「合并两个有序链表」，自底向上归并，同样是 O(N log k) 时间，但省去了手写堆，代码更短。
- **相关题目：** 两路版本 [合并两个有序链表（Merge Two Sorted Lists）](./merge-two-sorted-lists.md)；同用「堆中取最小」思想的 [前 K 个高频元素（Top K Frequent Elements）](./top-k-frequent-elements.md)。
