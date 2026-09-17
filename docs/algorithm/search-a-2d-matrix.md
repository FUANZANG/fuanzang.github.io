# 搜索二维矩阵（Search a 2D Matrix）

**难度：** Medium

## 题目描述

编写一个高效的算法来判断 `m x n` 矩阵中，是否存在一个目标值。该矩阵具有如下特性：

- 每行中的整数从左到右按升序排列。
- 每行的第一个整数大于前一行的最后一个整数。

### 约束条件

- `m == matrix.length`
- `n == matrix[i].length`
- `1 <= m, n <= 100`
- `-10^4 <= matrix[i][j], target <= 10^4`

## 示例

```
输入：matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
输出：true
```

```
输入：matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13
输出：false
```

## 提示 / 解题思路

由于矩阵整体有序（逐行递增且下一行首元素大于上一行末元素），可以将二维矩阵视为一个一维有序数组进行二分搜索。

**核心思路：**
1. 将二维坐标 `(row, col)` 映射到一维索引 `index`：`row = Math.floor(index / n)`，`col = index % n`
2. 在 `[0, m * n - 1]` 范围内进行标准二分搜索
3. 每次取中点，映射回二维坐标获取对应元素，与目标值比较
4. 根据比较结果收缩搜索区间

这种方法避免了逐行/逐列扫描，充分利用了矩阵的全局有序性。

## 解法

将二维矩阵视为一维有序数组，使用二分搜索定位目标值。

```javascript
/**
 * @param {number[][]} matrix
 * @param {number} target
 * @return {boolean}
 */
const searchMatrix = (matrix, target) => {
  const m = matrix.length;
  const n = matrix[0].length;
  let left = 0;
  let right = m * n - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const row = Math.floor(mid / n);
    const col = mid % n;
    const val = matrix[row][col];

    if (val === target) return true;
    if (val < target) left = mid + 1;
    else right = mid - 1;
  }

  return false;
};

// 验证
const matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]];
console.log(searchMatrix(matrix, 3));   // true
console.log(searchMatrix(matrix, 13));  // false
console.log(searchMatrix(matrix, 60));  // true（边界：最后一个元素）
console.log(searchMatrix(matrix, 1));   // true（边界：第一个元素）
console.log(searchMatrix([[1]], 2));    // false（最小矩阵）
```

- **时间复杂度：** O(log(m×n))，二分搜索的总步数
- **空间复杂度：** O(1)，仅使用常数额外变量
