# 至多包含 K 个不同字符的最长子串（Longest Substring with At Most K Distinct Characters）

**难度：** Medium

## 题目描述

给定一个字符串 `s` 和一个整数 `k`，请找出 `s` 中**最多包含 `k` 个不同字符**的最长子串的长度。

换句话说，你需要在字符串 `s` 中找到一个连续子串，该子串中不同的字符种类不能超过 `k`，并返回满足条件的最长子串的长度。

**函数签名：**

## 示例

**示例 1：**

```
输入：s = "eceba", k = 2
输出：3
解释：满足题目条件的最长子串是 "ece"，它恰好包含 2 个不同字符 ('e' 和 'c')，长度是 3。
```

**示例 2：**

```
输入：s = "aa", k = 1
输出：2
解释：最长的子串 "aa" 只包含 1 个不同字符 ('a')，长度是 2。
```

**示例 3：**

```
入力：s = "aa", k = 0
输出：0
解释：k = 0 意味着子串中不能包含任何字符，因此最长子串长度为 0。
```

## 提示 / 解题思路

<details>
<summary>💡 提示 1（基础思路 — 滑动窗口）</summary>

可以使用**滑动窗口**（双指针）的方法。维护一个窗口 `[left, right]`，并用一个哈希表（或 Map）记录窗口中每个字符的出现次数。

- 右指针 `right` 不断向右扩展，把新字符加入哈希表。
- 当哈希表中**不同字符的种类数超过 `k`** 时，说明当前窗口不满足条件，需要移动左指针 `left` 缩小窗口，直到窗口内的不同字符种类数回到 `k` 以下。
- 在每次窗口合法时，更新最大长度 `maxLen = max(maxLen, right - left + 1)`。

注意：窗口收缩的条件是哈希表中**键的数量**（不同字符种类）大于 `k`，而不是某个字符的计数为 0。

</details>

<details>
<summary>💡 提示 2（数据结构细节）</summary>

可以使用 JavaScript 的 `Map` 来存储字符 → 出现次数。

- `map.size` 直接给出当前窗口内不同字符的种类数，非常方便判断是否超过 `k`。
- 移动左指针时，递减对应字符的计数；如果计数变为 0，则从 `map` 中删除该键，从而保证 `map.size` 始终反映的是**实际存在**的不同字符数。

时间复杂度目标：O(n)，空间复杂度：O(k)（最多存储 k+1 个字符）。

</details>

<details>
<summary>💡 提示 3（边界情况）</summary>

- 当 `k == 0` 时，任何非空子串都不满足条件，直接返回 0。
- 当 `s` 为空字符串时，返回 0。
- 遍历结束后别忘记返回 `maxLen`，而不是窗口的最后长度。
- 注意窗口收缩的时机：是在**添加新字符后**、**更新答案前**判断是否需要收缩，因此答案更新一般放在**收缩完成之后**，保证每次记录的窗口都是合法的。

</details>

## 解法

用滑动窗口 `[left, right]` 配合 `Map` 记录窗口内字符频次；右指针扩张，当 `map.size > k` 时左指针收缩并在计数为 0 时删除键，保证 `map.size` 始终反映真实不同字符数，每次合法窗口更新最大长度。

```javascript
/**
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
const lengthOfLongestSubstringKDistinct = (s, k) => {
  if (k === 0) return 0
  const map = new Map()
  let left = 0,
    maxLen = 0
  for (let right = 0; right < s.length; right++) {
    map.set(s[right], (map.get(s[right]) || 0) + 1)
    while (map.size > k) {
      const c = s[left]
      map.set(c, map.get(c) - 1)
      if (map.get(c) === 0) map.delete(c)
      left++
    }
    maxLen = Math.max(maxLen, right - left + 1)
  }
  return maxLen
}

// 验证
console.log(lengthOfLongestSubstringKDistinct("eceba", 2)) // 3
console.log(lengthOfLongestSubstringKDistinct("aa", 1)) // 2
console.log(lengthOfLongestSubstringKDistinct("aa", 0)) // 0
```

- **时间复杂度：** O(n) — 每个字符最多被左右指针各访问一次。
- **空间复杂度：** O(k) — Map 最多存储 k+1 个字符。
