# 盛最多水的容器（Container With Most Water）

**难度：** Medium

## 题目描述

给定一个非负整数数组 `height`，其中每个元素 `height[i]` 代表第 `i` 处柱子的高度，每个柱子的宽度之间相隔为 `1`。

从数组中任意选出两个柱子，它们与 x 轴共同构成的一个容器。请问**该容器可以容纳的水量最大是多少**？

容器的容量计算公式为：

```
容量 = 两根柱子之间的距离 × min(左柱高度, 右柱高度)
```

用公式表示：

```
Area = min(height[i], height[j]) × (j - i)
```

**函数签名：**

## 示例

**示例 1：**

```
输入：height = [1,8,6,2,6,4,8,3,7]
输出：49
解释：选取第 2 根柱子（height[1] = 8）和最后一根柱子（height[8] = 7）时，
     距离为 8 - 1 = 7，高度为 min(8, 7) = 7，
     容量 = 7 × 7 = 49，为最大面积。
```

**示例 2：**

```
输入：height = [1,1]
输出：1
解释：只有两根柱子，距离为 1，高度为 min(1,1) = 1，容量 = 1 × 1 = 1。
```

## 提示 / 解题思路

<details>
<summary>💡 提示 1（暴力思路 — 双重循环）</summary>

最直观的思路是：枚举每一对柱子 `(i, j)`，计算它们组成的容器容量，并记录最大值。

```js
let maxArea = 0;
for (let i = 0; i < height.length - 1; i++) {
  for (let j = i + 1; j < height.length; j++) {
    const area = Math.min(height[i], height[j]) * (j - i);
    maxArea = Math.max(maxArea, area);
  }
}
```

时间复杂度为 **O(n^2)**，当 `n` 达到 `10^5` 时会超时（约 `10^10` 次运算）。我们需要更高效的算法。

</details>

<details>
<summary>💡 提示 2（关键观察 — 贪心思想）</summary>

容量由 **宽** `(j - i)` 和 **高** `min(height[i], height[j])` 共同决定。

关键洞见：

> **如果我们移动**较**短**柱子的指针，那么**宽度变小**，但还有可能获得更大的面积 —— 这要求新的柱子比原来更高，从而提高短板的高度。
> **而如果我们移动**较**长**柱子的指针，宽度同样减小，但短板（较短那根）保持不变，面积必然**减小**。

因此，正确的策略是：**每次都移动指向较短柱子的指针**，这样我们保留了有希望获得更大面积的可能性。

</details>

<details>
<summary>💡 提示 3（双指针实现细节）</summary>

```js
let left = 0;
let right = height.length - 1;
let max = 0;

while (left < right) {
  const width = right - left;
  const area = Math.min(height[left], height[right]) * width;
  max = Math.max(max, area);

  // 移动较短的那根柱子
  if (height[left] < height[right]) {
    left++;
  } else {
    right--;
  }
}
```

- **为什么这个贪心可以保证找到最优解？**
  假设最优解是柱子 `(i, j)`。双指针从 `(0, n-1)` 开始，每次移动较短的一边。
  任意时刻，**所有被跳过的柱子对** `(l, r)` 都有：它们的宽度小于当前宽度，且短板高度 ≤ 当前短板高度（因为我们跳过的是较短柱子）。因此这些被跳过的对的面积**不可能**超过当前所见到的最大值。换句话说，**最优解会被双指针遍历到**。

- **时间复杂度：O(n)** — 每个指针最多遍历 `n` 个元素。
- **空间复杂度：O(1)** — 仅使用常数额外空间。

</details>

> 📌 思考题：如果题目改为“返回**这两个柱子的下标**”，你会如何修改代码？

## 解法

左右指针分别指向数组首尾，容量由「宽度 × 短板高度」决定；每次计算当前面积后，移动**较短**的那根柱子的指针（移动长板只会让宽高都减小、面积必然变小，而移动短板仍有可能遇到更高的柱子获得更大面积），直到两指针相遇。

```javascript
/**
 * @param {number[]} height
 * @return {number}
 */
const maxArea = (height) => {
  let left = 0,
    right = height.length - 1,
    max = 0
  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left)
    max = Math.max(max, area)
    if (height[left] < height[right]) left++
    else right--
  }
  return max
}

// 验证
console.log(maxArea([1, 8, 6, 2, 6, 4, 8, 3, 7])) // 49
console.log(maxArea([1, 1])) // 1
```

- **时间复杂度：** O(n) — 每个指针最多遍历一遍。
- **空间复杂度：** O(1) — 仅用常数额外空间。
