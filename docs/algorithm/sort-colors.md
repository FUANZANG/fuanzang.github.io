# 颜色分类（Sort Colors）

**难度：** Medium

## 题目描述

给定一个包含红色、白色和蓝色、共 `n` 个元素的数组 `nums`，原地对它们进行排序，使得相同颜色的元素相邻，并按照红色、白色、蓝色顺序排列。

我们使用整数 `0`、`1` 和 `2` 分别表示红色、白色和蓝色。

必须在不使用库内置的 sort 函数的情况下解决这个问题。

### 约束条件

- `n == nums.length`
- `1 <= n <= 300`
- `nums[i]` 为 `0`、`1` 或 `2`

**进阶：** 你能想出一个仅使用常数空间的一趟扫描算法吗？

## 示例

### 示例 1

```
输入：nums = [2,0,2,1,1,0]
输出：[0,0,1,1,2,2]
解释：红色 (0) 最先，其次是白色 (1)，最后是蓝色 (2)。
```

### 示例 2

```
输入：nums = [2,0,1]
输出：[0,1,2]
```

## 提示 / 解题思路

这是经典的 **荷兰国旗问题（Dutch National Flag Problem）**，由 Edsger Dijkstra 提出。

**核心思路：三指针（一趟扫描）**

维护三个区域：
- `[0, left)` → 全是 0（红色）
- `[left, mid)` → 全是 1（白色）
- `(right, n-1]` → 全是 2（蓝色）
- `[mid, right]` → 待处理区域

使用三个指针 `left`、`mid`、`right`，初始值分别为 `0`、`0`、`n - 1`。当 `mid <= right` 时循环：

1. 若 `nums[mid] === 0`：交换 `nums[left]` 与 `nums[mid]`，`left++`、`mid++`
2. 若 `nums[mid] === 1`：无需交换，`mid++`
3. 若 `nums[mid] === 2`：交换 `nums[mid]` 与 `nums[right]`，`right--`（`mid` 不动，因为换过来的数还未检查）

这样一趟扫描即可完成排序，空间复杂度 O(1)。

## 解法

三指针（left / mid / right）一趟扫描，将 0 交换到左侧、2 交换到右侧，1 自然居中。

```javascript
/**
 * @param {number[]} nums
 * @return {void} 原地修改，不返回
 */
const sortColors = (nums) => {
  let left = 0;
  let mid = 0;
  let right = nums.length - 1;

  while (mid <= right) {
    if (nums[mid] === 0) {
      [nums[left], nums[mid]] = [nums[mid], nums[left]];
      left++;
      mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {
      [nums[mid], nums[right]] = [nums[right], nums[mid]];
      right--;
    }
  }
};

// 验证
const arr1 = [2, 0, 2, 1, 1, 0];
sortColors(arr1);
console.log(arr1); // [0, 0, 1, 1, 2, 2]

const arr2 = [2, 0, 1];
sortColors(arr2);
console.log(arr2); // [0, 1, 2]
```

- **时间复杂度：** O(n) —— 仅一趟扫描
- **空间复杂度：** O(1) —— 原地排序，仅使用三个指针变量

## 补充

该算法体现了「分区的思想」—— 在遍历过程中维护不变量，通过交换将元素归入正确区域。类似的分区技巧也用于快速排序的 partition 步骤，以及 `[2,0,1]` 这种只有少数几类的分类排序场景。
