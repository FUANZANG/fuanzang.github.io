# 组合总和（Combination Sum）

**难度：** Medium

## 题目描述

给你一个无重复元素的整数数组 `candidates` 和一个目标整数 `target`，找出 `candidate` 中可以使数字和为目标数 `target` 的所有不同组合，并以列表形式返回。你可以按任意顺序返回这些组合。

`candidates` 中的同一个数字可以无限制重复被选取。如果至少一个数字的被选数量不同，则两种组合是不同的。

### 约束条件

- `1 <= candidates.length <= 30`
- `2 <= candidates[i] <= 40`
- `candidates` 的所有元素互不相同
- `1 <= target <= 40`

## 示例

```
输入：candidates = [2,3,6,7], target = 7
输出：[[2,2,3],[7]]
解释：
2 + 2 + 3 = 7
7 = 7
```

```
输入：candidates = [2,3,5], target = 8
输出：[[2,2,2,2],[2,3,3],[3,5]]
解释：
2 + 2 + 2 + 2 = 8
2 + 3 + 3 = 8
3 + 5 = 8
```

## 提示 / 解题思路

这是一个经典的组合求和问题，核心方法是**回溯（深度优先搜索）**：

1. **排序剪枝**：先对 `candidates` 排序，当当前和超过 `target` 时直接剪枝返回，避免无效搜索。
2. **DFS 搜索**：每个数字可以重复选（仍从当前下标开始），也可以跳过（从下一个下标开始）。
3. **递归边界**：当 `currentSum === target` 时记录结果；当 `currentSum > target` 时剪枝。
4. **路径记录**：用一个数组 `path` 记录当前组合，回溯时撤销选择（`pop`）。

伪代码思路：
```
dfs(start, currentSum):
  if currentSum == target: 记录 path 副本，返回
  if currentSum > target: 剪枝，返回
  for i from start to len(candidates):
    选择 candidates[i]
    dfs(i, currentSum + candidates[i])  // i 不是 i+1，允许重复
    撤销选择（pop）
```

## 解法

回溯法，排序后剪枝，递归时从当前下标开始（允许同一元素重复使用）。

```javascript
/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
const combinationSum = (candidates, target) => {
  const result = [];
  candidates.sort((a, b) => a - b);

  const dfs = (start, currentSum, path) => {
    if (currentSum === target) {
      result.push([...path]);
      return;
    }
    if (currentSum > target) {
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      const num = candidates[i];
      if (currentSum + num > target) break; // 剪枝：已排序，后续更大无需遍历
      path.push(num);
      dfs(i, currentSum + num, path); // 从 i 开始（允许重复）
      path.pop(); // 回溯
    }
  };

  dfs(0, 0, []);
  return result;
};

// 验证
console.log(combinationSum([2, 3, 6, 7], 7)); // [[2,2,3],[7]]
console.log(combinationSum([2, 3, 5], 8)); // [[2,2,2,2],[2,3,3],[3,5]]
console.log(combinationSum([2], 1)); // []
console.log(combinationSum([1], 1)); // [[1]]
console.log(combinationSum([1], 2)); // [[1,1]]
```

- **时间复杂度：** O(S)，其中 S 为所有可行解的长度之和。最坏情况下需遍历所有组合，上界与 target 和 candidates 最小值相关。
- **空间复杂度：** O(target/min(candidates))，递归栈深度取决于目标值与最小候选数的比值。

## 进阶挑战

如果题目改为「每个数字在每个组合中只能使用一次」（即 LeetCode 40. 组合总和 II），你只需在递归调用时将 `dfs(i, ...)` 改为 `dfs(i + 1, ...)`，并在同一层跳过重复元素（排序后 `if (i > start && candidates[i] === candidates[i-1]) continue`）。
