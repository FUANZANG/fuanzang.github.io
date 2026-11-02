# 最低加油次数（Minimum Number of Refueling Stops）

**难度：** Hard

## 题目描述

汽车从起点出发驶向目的地，该目的地位于出发位置东面 `target` 英里处。

沿途有加油站，用数组 `stations` 表示。其中 `stations[i] = [positioni, fueli]` 表示第 `i` 个加油站位于出发位置东面 `positioni` 英里处，并且有 `fueli` 升汽油。

假设汽车油箱的容量是无限的，其中最初有 `startFuel` 升燃料。它每行驶 1 英里就会用掉 1 升汽油。当汽车到达加油站时，它可能停下来加油，将所有汽油从加油站转移到汽车中。

为了到达目的地，汽车所必要的最低加油次数是多少？如果无法到达目的地，则返回 `-1`。

**注意：** 如果汽车到达加油站时剩余燃料为 0，它仍然可以在那里加油。如果汽车到达目的地时剩余燃料为 0，仍然认为它已经到达目的地。

### 约束条件

- `1 <= target, startFuel <= 10^9`
- `0 <= stations.length <= 500`
- `1 <= positioni < positioni+1 < target`
- `1 <= fueli <= 10^9`

## 示例

**示例 1**

```
输入：target = 1, startFuel = 1, stations = []
输出：0
解释：可以在不加油的情况下到达目的地。
```

**示例 2**

```
输入：target = 100, startFuel = 1, stations = [[10,100]]
输出：-1
解释：无法抵达目的地，甚至无法到达第一个加油站。
```

**示例 3**

```
输入：target = 100, startFuel = 10, stations = [[10,60],[20,30],[30,30],[60,40]]
输出：2
解释：
出发时有 10 升燃料。
开车来到距起点 10 英里处的加油站，消耗 10 升燃料。将汽油从 0 升加到 60 升。
然后，从 10 英里处的加油站开到 60 英里处的加油站（消耗 50 升燃料），
并将汽油从 10 升加到 50 升。然后开车抵达目的地。
沿途在两个加油站停靠，所以返回 2。
```

## 提示 / 解题思路

这是一道经典的**贪心 + 最大堆**题。朴素的做法（在每次加油时决定加哪一站）需要枚举，复杂度不可接受；正确的贪心是**懒加油**（lazy refueling）：

1. **不要"到了就加"**，而是继续开；只有当**燃料不够到达下一个位置**时，才回头在已经路过的加油站里选**油量最大的**那个补加一次。
2. 为什么贪心正确：在"必须加一次油"的约束下，选经过的站中油量最大的，能让剩余油量最多，为后续留下最大灵活性（exchange argument：任何可行方案中第一次加油不是最大站，都可以换成最大站而不使方案变差）。
3. 实现要点：
   - 按位置顺序遍历加油站（题目保证已按 `position` 升序）。
   - 把**已经到达**的加油站的 `fuel` 压入最大堆（数组小顶堆存负值模拟）。
   - 当 `fuel < pos`（当前油量到不了位置 `pos`）时，反复从堆顶取最大油量补加，直到 `fuel >= pos`；若堆空了仍不够，返回 `-1`。
   - 把目的地 `target` 视为一个虚拟加油站 `[target, 0]`，统一处理"最后一段路"。

```
伪代码：
fuel = startFuel, stops = 0, heap = []
for [pos, amount] in stations + [[target, 0]]:
    while fuel < pos:
        若 heap 为空 -> 返回 -1
        fuel += heap.popMax(); stops += 1
    heap.push(amount)
return stops
```

> 💡 **提示**：最大堆用数组实现即可，取 `heap[i]` 的逆序（存负值）配合小顶堆逻辑，或用比较函数手写。

## 解法

贪心（懒加油）+ 最大堆：按位置遍历，把已到达站的油量入堆；一旦油量不足以到达当前位置，就从堆中取出油量最大的加油站补加，直到能到达；堆空仍不足则返回 -1。目的地视为油量 0 的虚拟站统一处理。

```javascript
/**
 * @param {number} target
 * @param {number} startFuel
 * @param {number[][]} stations
 * @return {number}
 */
const minRefuelStops = (target, startFuel, stations) => {
  // 最大堆（数组存负值，按小顶堆逻辑维护）
  const heap = []
  const push = (v) => {
    heap.push(v)
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p] < heap[i]) {
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
      } else {
        break
      }
      i = p
    }
  }
  const popMax = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length > 0) {
      heap[0] = last
      let i = 0
      const n = heap.length
      while (true) {
        const l = 2 * i + 1
        const r = 2 * i + 2
        let s = i
        if (l < n && heap[l] < heap[s]) s = l
        if (r < n && heap[r] < heap[s]) s = r
        if (s === i) break
        ;[heap[s], heap[i]] = [heap[i], heap[s]]
        i = s
      }
    }
    return -top // 堆存的是负值，取回正数
  }

  // 目的地视为油量 0 的虚拟站
  const all = [...stations, [target, 0]]
  let fuel = startFuel
  let stops = 0
  for (const [pos, amount] of all) {
    // 燃料不足以到达 pos 时，回头在已路过的站里加最大油量的
    while (fuel < pos) {
      if (heap.length === 0) return -1
      fuel += popMax()
      stops++
    }
    push(-amount)
  }
  return stops
}

// 验证
console.log(minRefuelStops(1, 1, [])) // 0
console.log(minRefuelStops(100, 1, [[10, 100]])) // -1
console.log(minRefuelStops(100, 10, [[10, 60], [20, 30], [30, 30], [60, 40]])) // 2
```

- **时间复杂度：** O(n log n)，n 为加油站数量（500），每站至多入堆/出堆各一次
- **空间复杂度：** O(n)，堆最多存 n 个站的油量

## 补充

- **进阶挑战：** 把"加满整站油"改成"每次可加 1~amount 升任意量"，分析贪心是否仍然成立（提示：仍成立，且可进一步 O(n log n) 求解）。
- **相关题目：** [跳跃游戏](./jump-game.md)、[跳跃游戏 II](./jump-game-ii.md)、[零钱兑换](./coin-change.md)——都是"可达性/最优化"的贪心与动态规划对照；本题是最大堆贪心的标准模板题。
