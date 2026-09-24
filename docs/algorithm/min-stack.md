# 最小栈（Min Stack）

**难度：** Medium

## 题目描述

设计一个支持 `push`、`pop`、`top` 操作，并能在**常数时间**内检索到最小元素的栈。

实现 `MinStack` 类：

- `MinStack()` 初始化堆栈对象。
- `void push(int val)` 将元素 val 推入堆栈。
- `void pop()` 删除堆栈顶部的元素。
- `int top()` 获取堆栈顶部的元素。
- `int getMin()` 获取堆栈中的最小元素。

### 约束条件

- `-2^31 <= val <= 2^31 - 1`
- `pop`、`top` 和 `getMin` 操作总是在**非空栈**上调用。
- 最多调用 `push`、`pop`、`top` 和 `getMin` 共 `3 * 10^4` 次。

## 示例

**示例 1：**

```
输入：
["MinStack","push","push","push","getMin","pop","top","getMin"]
[[],[-2],[0],[-3],[],[],[],[]]

输出：
[null,null,null,null,-3,null,0,-2]

解释：
MinStack minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
minStack.getMin(); // 返回 -3
minStack.pop();
minStack.top();    // 返回 0
minStack.getMin(); // 返回 -2
```

## 提示 / 解题思路

- 核心难点：`getMin` 需要 O(1)，但普通栈只暴露栈顶。
- 思路：使用**辅助栈**（同步记录当前最小值）。每次 `push` 时，将 `val` 与辅助栈栈顶的较小值一起压入辅助栈；`pop` 时两栈同步弹出。这样辅助栈栈顶始终是全体元素的最小值。
- 也可只用**单栈**：压入 `val` 与当前最小值的差值，通过比较恢复最小值（更省空间，但需处理溢出，面试中辅助栈更直观）。

## 解法

使用辅助栈同步维护当前最小值，使 `getMin` 达到 O(1)。

```javascript
/**
 * 最小栈：辅助栈同步记录当前最小值
 */
function MinStack() {
  this.stack = [];
  this.minStack = [];
}

/**
 * @param {number} val
 * @return {void}
 */
MinStack.prototype.push = function (val) {
  this.stack.push(val);
  const curMin = this.minStack.length === 0
    ? val
    : Math.min(val, this.minStack[this.minStack.length - 1]);
  this.minStack.push(curMin);
};

/**
 * @return {void}
 */
MinStack.prototype.pop = function () {
  this.stack.pop();
  this.minStack.pop();
};

/**
 * @return {number}
 */
MinStack.prototype.top = function () {
  return this.stack[this.stack.length - 1];
};

/**
 * @return {number}
 */
MinStack.prototype.getMin = function () {
  return this.minStack[this.minStack.length - 1];
};

// 验证示例 1
const minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
console.log(minStack.getMin()); // 期望输出: -3
minStack.pop();
console.log(minStack.top());    // 期望输出: 0
console.log(minStack.getMin()); // 期望输出: -2
```

- **时间复杂度：** 所有操作（`push` / `pop` / `top` / `getMin`）均为 O(1)
- **空间复杂度：** O(n)，辅助栈与主栈等长
