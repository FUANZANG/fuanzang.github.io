# 电话号码的字母组合（Letter Combinations of a Phone Number）

**难度：** Medium

## 题目描述

给定一个仅包含数字 `2-9` 的字符串 `digits`，按照电话按键上字母与数字的映射关系，返回该数字串能表示的所有可能的字母组合。答案可以按任意顺序返回。

电话按键的映射如下（与真实电话按键一致）：

- `2` → `abc`
- `3` → `def`
- `4` → `ghi`
- `5` → `jkl`
- `6` → `mno`
- `7` → `pqrs`
- `8` → `tuv`
- `9` → `wxyz`

注意：`1` 和 `0` 不映射到任何字母。

### 约束条件

- `0 <= digits.length <= 4`
- `digits[i]` 是范围 `['2', '9']` 内的一个数字字符

## 示例

```
输入：digits = "23"
输出：["ad","ae","af","bd","be","bf","cd","ce","cf"]
解释：按键 2 对应 abc，按键 3 对应 def。两个按键的所有两两组合共 3×3=9 种。
```

```
输入：digits = ""
输出：[]
解释：空串不产生任何组合。
```

```
输入：digits = "2"
输出：["a","b","c"]
解释：单个按键 2 对应 abc，共 3 种组合。
```

## 提示 / 解题思路

这是一个典型的「组合枚举」问题，最自然的做法是**回溯（DFS）**：

1. **映射表**：先用一个对象（或数组）把每个数字映射到对应的字母串。
2. **逐位选择**：从 `digits` 的第 0 位开始，依次决定当前位选哪个字母；每选一个字母，就递归处理下一位。
3. **终止条件**：当已经处理完 `digits` 的所有位（路径长度等于 `digits.length`）时，把当前拼出的字符串加入结果集。
4. **空串特判**：若 `digits` 为空，直接返回空数组。

要点：
- 结果总数等于各位字母个数的乘积（例如 `"23"` 是 3×3=9）。
- 用字符串拼接（`current + letter`）而不是数组 `push`，可以避免回溯时手动撤销状态，代码更简洁；因为字符串在 JavaScript 中是不可变的，每次递归拿到的是独立副本。
- 时间复杂度与答案数量同阶，即 `O(4^n · n)`，其中 `n` 是 `digits` 长度，最坏每位 4 个字母，且每次拼接开销为 `O(n)`。

## 解法

用一个映射表 + 回溯，逐位从数字对应的字母集合中取一个字符拼到当前串上，拼满 `digits.length` 位时收集结果；空输入直接返回空数组。

```javascript
/**
 * @param {string} digits
 * @return {string[]}
 */
const letterCombinations = (digits) => {
  if (digits.length === 0) return [];

  const map = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };

  const result = [];

  const backtrack = (index, current) => {
    // 已拼满所有按键，记录一条组合
    if (index === digits.length) {
      result.push(current);
      return;
    }
    const letters = map[digits[index]];
    for (const letter of letters) {
      backtrack(index + 1, current + letter);
    }
  };

  backtrack(0, '');
  return result;
}

// 验证
console.log(letterCombinations("23")); // ["ad","ae","af","bd","be","bf","cd","ce","cf"]
console.log(letterCombinations(""));   // []
console.log(letterCombinations("2"));  // ["a","b","c"]
```

- **时间复杂度：** O(4^n · n)，其中 n 为 `digits` 的长度；最坏每位 4 个字母，共 4^n 条组合，每条拼接与存入耗时 O(n)。
- **空间复杂度：** O(n)，递归调用栈深度最多 n（不含结果数组本身所占的 O(4^n · n) 输出空间）。

## 补充

- 相关题目：同属回溯/组合枚举的变形题「17. 组合总数（Combination Sum）」思路相近，可对比练习（本仓库尚未收录，可按 LeetCode slug `combination-sum` 单独建文件）。
- 进阶：若要求结果按字典序输出、或限制组合长度，只需在回溯时调整遍历顺序或终止条件即可，核心框架不变。
