# 三数之和

**难度：** Medium

## 题目描述

给你一个包含 n 个整数的数组 `nums`，判断 `nums` 中是否存在三个元素 a，b，c ，使得 a + b + c = 0 ？请你找出所有和为 0 且不重复的三元组。

**注意：**答案中不可以包含重复的三元组。

## 示例

**示例 1：**

```
输入：nums = [-1, 0, 1, 2, -1, -4]
输出：[[-1, -1, 2], [-1, 0, 1]]
解释：
nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0
nums[1] + nums[2] + nums[3] = 0 + 1 + (-1) = 0
```

**示例 2：**

```
输入：nums = []
输出：[]
```

**示例 3：**

```
输入：nums = [0]
输出：[]
```

## 提示 / 解题思路

在查看答案之前，建议先自己思考！以下是几个引导性问题：

1. **暴力解法**：如果使用三层循环枚举所有三元组，时间复杂度是多少？（O(n³)）如何优化？

2. **排序的作用**：如果先将数组排序，会带来哪些便利？
   - 便于跳过重复元素
   - 可以使用「双指针」技巧

3. **固定一个数，转化问题**：
   - 假设我们固定了第一个数 `nums[i]`，那么问题就转化为：在剩下的数组中找到两个数，使它们的和等于 `-nums[i]`。
   - 这就是经典的「两数之和」变种——**有序数组的两数之和**。

4. **双指针法**：
   - 对于有序数组，找两数之和可以用左右两个指针向中间移动。
   - 如果当前和小于目标值，左指针右移增大和；
   - 如果当前和大于目标值，右指针左移减小和；
   - 如果相等，记录结果并继续移动。

5. **去重是关键！**：
   - 外层循环：当 `nums[i] === nums[i-1]` 时跳过（避免重复的三元组）
   - 找到答案后：`left++` 和 `right--` 时也要检查是否重复

6. **边界情况**：
   - 数组长度小于 3 时直接返回空数组
   - 排序后最小数都大于 0，不可能有解，可以提前终止

## 解法

排序后固定一个数 `nums[i]`，将问题转化为在其右侧用双指针找两数之和等于 `-nums[i]`；同时跳过重复值去重。

```javascript
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
const threeSum = (nums) => {
  nums.sort((a, b) => a - b)
  const res = []
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue
    if (nums[i] > 0) break
    let left = i + 1,
      right = nums.length - 1
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right]
      if (sum === 0) {
        res.push([nums[i], nums[left], nums[right]])
        while (left < right && nums[left] === nums[left + 1]) left++
        while (left < right && nums[right] === nums[right - 1]) right--
        left++
        right--
      } else if (sum < 0) {
        left++
      } else {
        right--
      }
    }
  }
  return res
}

// 验证
console.log(JSON.stringify(threeSum([-1, 0, 1, 2, -1, -4]))) // [[-1,-1,2],[-1,0,1]]
console.log(JSON.stringify(threeSum([]))) // []
console.log(JSON.stringify(threeSum([0]))) // []
```

- **时间复杂度：** O(n²)
- **空间复杂度：** O(1)（忽略返回结果；排序栈空间 O(log n)）
