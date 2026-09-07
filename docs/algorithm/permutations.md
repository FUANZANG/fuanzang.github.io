# 全排列（Permutations）

**难度：** Medium

## 题目描述

给定一个不含重复数字的数组 `nums`，返回其所有可能的全排列。你可以按任意顺序返回答案。

### 约束条件

- `1 <= nums.length <= 6`
- `-10 <= nums[i] <= 10`
- `nums` 中的所有整数互不相同

## 示例

```
输入：nums = [1,2,3]
输出：[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
解释：数组 [1,2,3] 共有 6 种全排列方式。
```

```
输入：nums = [0,1]
输出：[[0,1],[1,0]]
```

## 提示 / 解题思路

使用**回溯法**（Backtracking）：

1. 维护一个 `path` 记录当前排列路径，一个 `used` 布尔数组标记哪些数字已被使用。
2. 每一层递归，遍历所有数字，跳过已使用的，将未使用的加入路径并标记为已使用，然后递归下一层。
3. 当路径长度等于数组长度时，说明找到了一个完整排列，将其副本加入结果集。
4. 回溯：撤销选择（弹出路径末尾、重置 used 标记），尝试其他分支。

核心思想是「选择 → 探索 → 撤销」的回溯模板，遍历解空间树的所有叶子节点。

## 解法

回溯法遍历解空间树，used 数组去重，path 收集路径，到达叶子时记录结果。

```javascript
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
const permute = (nums) => {
  const result = [];
  const used = new Array(nums.length).fill(false);
  const path = [];

  const backtrack = () => {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;

      used[i] = true;
      path.push(nums[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  };

  backtrack();
  return result;
};

// 验证
console.log(permute([1, 2, 3]));
// 输出: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
console.log(permute([0, 1]));
// 输出: [[0,1],[1,0]]
```

- **时间复杂度：** O(n × n!)，其中 n 为数组长度。共有 n! 个排列，每个排列需要 O(n) 时间复制到结果中。
- **空间复杂度：** O(n)，递归栈深度 + used 数组 + path 的空间（不计结果存储空间）。

## 补充

- 若数组含重复数字，需先排序再剪枝（跳过同一层中相同的未使用元素），即 [47. 全排列 II](https://leetcode.cn/problems/permutations-ii/)。
- 回溯法的「选择-探索-撤销」模板是解决排列/组合/子集类问题的通用框架，同类题有「[子集](./subsets.md)」「[电话号码的字母组合](./letter-combinations-of-a-phone-number.md)」。
