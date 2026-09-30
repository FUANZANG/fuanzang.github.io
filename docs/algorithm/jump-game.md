# 跳跃游戏（Jump Game）

**难度：** Medium

## 题目描述

给定一个非负整数数组 `nums`，你最初位于数组的**第一个下标**。

数组中的每个元素代表你在该位置可以跳跃的最大长度。

判断你是否能够到达最后一个下标。

### 约束条件

- `1 <= nums.length <= 10^4`
- `0 <= nums[i] <= 10^5`

## 示例

**示例 1：**

输入：
```
nums = [2,3,1,1,4]
```
输出：
```
true
```
解释：
- 从下标 0 跳 1 步到 下标 1
- 从下标 1 跳 3 步到 最后一个下标 4
- 可以到达

**示例 2：**

输入：
```
nums = [3,2,1,0,4]
```
输出：
```
false
```
解释：
- 到达下标 3（值为 0）是不可能的，因为下标 3 处无法再前进
- 所以无法到达最后一个下标

## 提示 / 解题思路

**贪心法（推荐）**：

维护一个 `maxReach` 变量，表示从当前位置出发，最远能到达的下标。

遍历数组时：
- 若当前下标 `i` 已超过 `maxReach`，说明 `i` 不可达（被 0 截断），直接返回 `false`
- 否则更新 `maxReach = Math.max(maxReach, i + nums[i])`
- 若 `maxReach >= nums.length - 1`，提前返回 `true`

**关键洞察**：不需要真的跳跃，只需跟踪"最远可达范围"即可。

## 解法

贪心维护最远可达下标，遍历一次判断是否覆盖数组末尾。

```javascript
/**
 * @param {number[]} nums
 * @return {boolean}
 */
const canJump = (nums) => {
  let maxReach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) {
      return false;
    }
    maxReach = Math.max(maxReach, i + nums[i]);
    if (maxReach >= nums.length - 1) {
      return true;
    }
  }
  return true;
};

// 验证
console.log(canJump([2, 3, 1, 1, 4])); // true
console.log(canJump([3, 2, 1, 0, 4])); // false
```

- **时间复杂度：** O(n)
- **空间复杂度：** O(1)

## 补充

相关题目：

- [跳跃游戏 II](./jump-game-ii.md)——要求最少跳跃次数（贪心分层）
