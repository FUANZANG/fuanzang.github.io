# 任务调度器（Task Scheduler）

**难度：** Medium

## 题目描述

给定一个用字符数组 `tasks` 表示的 CPU 需要执行的任务列表，其中包含 A 到 Z 共 26 种不同类型任务，以及一个非负整数 `n` 表示两个**相同类型**任务之间的冷却间隔（即两个相同任务之间必须至少间隔 `n` 个单位时间）。每个任务执行耗时一个单位时间，执行期间 CPU 不能执行其他任务。在任意时刻 CPU 可以执行任务或保持空闲状态。

要求：返回 CPU 完成所有任务所需的最少总时间（执行时间 + 空闲时间）。

### 约束条件

- `1 <= tasks.length <= 10^4`
- `tasks[i]` 是大写英文字母 A-Z
- `0 <= n <= 100`

## 示例

### 示例 1

输入：tasks = ["A","A","A","B","B","B"], n = 2

输出：8

解释：一种可行的调度方案为：A → B → idle → A → B → idle → A → B。相同任务之间恰好间隔 2 个单位时间。

### 示例 2

输入：tasks = ["A","A","A","B","B","B"], n = 0

输出：6

解释：n = 0 意味着没有冷却限制，任务可以连续执行，只需 6 个单位时间完成全部任务。

### 示例 3

输入：tasks = ["A","A","A","A","A","A","B","C","D","E","F","G"], n = 2

输出：16

解释：一种可行的调度方案为：A → B → C → A → D → E → A → F → G → A → idle → idle → A → idle → idle → A。

## 提示 / 解题思路

1. **分析关键任务**：出现次数最多的任务决定了整个调度的下界。假设任务 X 出现了 `maxFreq` 次，那么至少需要 `(maxFreq - 1)` 个长度为 `n + 1` 的"块"（每个块以 X 开头，后面跟随 `n` 个冷却位置），再加上最后一段。

2. **多任务并列最高频**：如果有 `maxCount` 个任务都出现了 `maxFreq` 次，则这些任务在最后一段也需要占用位置。因此理论最短时间 = `(maxFreq - 1) * (n + 1) + maxCount`。

3. **任务填满冷却槽**：如果任务总数本身就足以填满所有冷却间隙（即不需要额外空闲），则答案就是 `tasks.length`。最终答案是 `max(理论最短时间, tasks.length)`。

4. **贪心直觉**：把最高频任务先排好，其余任务填充冷却间隙。若填不满就插入 idle，若能填满就无需 idle。

## 解法

通过统计任务频率，计算最高频任务的调度长度，再与任务总数取较大值得到答案。

```javascript
/**
 * @param {character[]} tasks
 * @param {integer} n
 * @return {integer}
 */
const leastInterval = (tasks, n) => {
  // 统计每种任务的出现频率
  const freq = new Array(26).fill(0);
  for (const t of tasks) {
    freq[t.charCodeAt(0) - 'A'.charCodeAt(0)]++;
  }

  // 找到最高频率
  let maxFreq = 0;
  for (const f of freq) {
    maxFreq = Math.max(maxFreq, f);
  }

  // 统计有多少个任务具有最高频率
  let maxCount = 0;
  for (const f of freq) {
    if (f === maxFreq) maxCount++;
  }

  // 理论最短时间：最高频任务排成框架 + 并列最高频任务收尾
  const partCount = maxFreq - 1;
  const partLength = n + 1;
  const emptySlots = partCount * partLength;
  const availableTasks = emptySlots + maxCount;

  // 取 max：若任务够多就不需要 idle
  return Math.max(tasks.length, availableTasks);
};

// 验证
console.log(leastInterval(["A","A","A","B","B","B"], 2)); // 期望: 8
console.log(leastInterval(["A","A","A","B","B","B"], 0)); // 期望: 6
console.log(leastInterval(["A","A","A","A","A","A","B","C","D","E","F","G"], 2)); // 期望: 16
```

- **时间复杂度：** O(N)，其中 N 为任务数量，遍历任务统计频率为 O(N)，后续 26 个字母的扫描为 O(26) = O(1)。
- **空间复杂度：** O(1)，固定大小的频率数组（26 个元素）。

## 补充

- 变形题：[767. 重构字符串（Reorganize String）](./reorganize-string.md) — 同样涉及字符重排与间隔约束，但只要求能否重排而非求最短时间。
- 进阶挑战：若要求输出一个具体的调度序列（而非仅求最短长度），可使用最大堆 + 等待队列的模拟法。
