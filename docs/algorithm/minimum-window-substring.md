# 最小覆盖子串（Minimum Window Substring）

**难度：** Hard

## 题目描述

给定两个字符串 `s` 和 `t`，返回 `s` 中满足条件的最小子串，使得 `t` 中所有字符（包括重复字符）都被包含在这个子串中。如果不存在这样的子串，则返回空字符串 `""`。

题目保证：答案是唯一的。

### 约束条件

- `m == s.length`、`n == t.length`
- `1 <= m, n <= 10^5`
- `s` 和 `t` 由大小写英文字母组成

## 示例

```
输入：s = "ADOBECODEBANC", t = "ABC"
输出："BANC"
解释：最小覆盖子串 "BANC" 包含来自字符串 t 的 'A'、'B' 和 'C'。

输入：s = "a", t = "a"
输出："a"
解释：整个字符串 s 就是最小覆盖子串。

输入：s = "a", t = "aa"
输出：""
解释：t 中有两个 'a'，而 s 中最多只能提供一个 'a'，因此无法覆盖。
```

## 提示 / 解题思路

这是经典的**滑动窗口**问题。核心思想是用两个指针 `left` / `right` 维护一个窗口，不断向右扩展右边界以「聚集」字符；一旦窗口内已经包含 `t` 中全部所需字符，就尝试向右收缩左边界以找到更短的合法子串。

关键数据结构：

- `need`：记录 `t` 中每个字符需要的出现次数。
- `window`：记录当前窗口内每个字符出现的次数。
- `formed`：记录当前窗口中「满足要求」（即出现次数达到 `need` 对应的次数）的字符种类数。当 `formed === need.size` 时，当前窗口就是一个合法覆盖子串。

过程：

1. 先用 `need` 统计 `t` 的字符频率，`required = need.size` 表示需要满足的字符种类数。
2. `right` 向右扫描 `s`，把字符加入 `window`；当某字符的窗口次数刚好命中 `need` 所需次数时，`formed++`。
3. 当 `formed === required`（窗口合法）时，记录当前最小子串起点与长度，然后尽可能收缩 `left`（窗口左端字符移出），更新 `minLen`，直至窗口不再合法。
4. 重复直到 `right` 扫完 `s`。

```javascript
// 伪代码骨架
// need = 统计 t 中字符频率
// window = 当前窗口字符频率
// formed = 窗口中达到 need 要求的字符种类数
// while right < s.length:
//   把 s[right] 加入 window，若命中 need 则 formed++
//   while formed === required:  // 窗口合法
//     记录最小窗口 (start, len)
//     移出 s[left]，若窗口次数低于 need 则 formed--，left++
```

## 解法

用滑动窗口 + 两个频率表动态追踪「合法覆盖」状态，扩展右边界收集字符、收缩左边界逼近最小值。

```javascript
/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
const minWindow = (s, t) => {
  if (s.length < t.length) return "";

  const need = new Map();
  for (const ch of t) {
    need.set(ch, (need.get(ch) || 0) + 1);
  }

  const required = need.size; // 需要满足的字符种类数
  let formed = 0;            // 当前窗口中已满足 need 要求的字符种类数
  const window = new Map();

  let left = 0;
  let minLen = Infinity;
  let minStart = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);

    // 某字符的窗口出现次数刚好达到 need 要求，说明该字符已被覆盖
    if (need.has(ch) && window.get(ch) === need.get(ch)) {
      formed++;
    }

    // 窗口合法则尽可能收缩左边界，寻找更短的覆盖子串
    while (formed === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }

      const leftCh = s[left];
      window.set(leftCh, window.get(leftCh) - 1);
      if (need.has(leftCh) && window.get(leftCh) < need.get(leftCh)) {
        formed--;
      }
      left++;
    }
  }

  return minLen === Infinity ? "" : s.slice(minStart, minStart + minLen);
};

// 验证
console.log(minWindow("ADOBECODEBANC", "ABC")); // 期望输出: "BANC"
console.log(minWindow("a", "a"));               // 期望输出: "a"
console.log(minWindow("a", "aa"));              // 期望输出: ""
```

- **时间复杂度：** O(m + n)，其中 m 和 n 分别为 s 和 t 的长度；每个字符最多被 `right` 扫描一次、`left` 移动一次
- **空间复杂度：** O(m + n)，用于存储 `need`、`window` 频率表

## 补充

- **进阶：** 如果把字符集限制为固定字母表（如仅小写英文字母），可以把 `Map` 替换成定长数组 `int[128]`，省去哈希开销。
- **相关题目：** 「[最长无重复子串的长度](./longest-substring-without-repeating-characters.md)」、「[字符串的排列](./permutation-in-string.md)」同样使用滑动窗口框架，但判定条件不同。
