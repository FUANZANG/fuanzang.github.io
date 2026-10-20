# 单词接龙（Word Ladder）

**难度：** Hard

## 题目描述

给定两个单词（`beginWord` 和 `endWord`）以及一个字典 `wordList`，返回从 `beginWord` 到 `endWord` 的最短转换序列中的单词数目。如果不存在这样的转换序列，返回 `0`。

转换规则如下：

- 每次转换只能改变一个字母。
- 转换过程中的中间单词必须是字典 `wordList` 中的单词。
- `beginWord` 不需要在 `wordList` 中。

### 约束条件

- `1 <= beginWord.length <= 10`
- `endWord.length == beginWord.length`
- `1 <= wordList.length <= 5000`
- `wordList[i].length == beginWord.length`
- `beginWord`、`endWord` 和 `wordList[i]` 仅由小写英文字母组成
- `beginWord != endWord`
- `wordList` 中的所有单词互不相同

## 示例

**示例 1：**

```
输入：beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]
输出：5
解释：最短转换序列为 "hit" -> "hot" -> "dot" -> "dog" -> "cog"，共 5 个单词。
```

**示例 2：**

```
输入：beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]
输出：0
解释：endWord "cog" 不在字典中，无法完成转换。
```

## 提示 / 解题思路

本题是经典的 **广度优先搜索（BFS）** 问题。核心思路：

1. **预处理 — 构建通配符模式表**：对于每个单词，生成所有可能的"通配符模式"。例如 `"hot"` 可以生成 `"*ot"`、`"h*t"`、`"ho*"`。将相同模式的单词归为一组，这样在 BFS 时可以快速找到所有相邻单词（即只差一个字母的单词）。

2. **BFS 搜索最短路径**：从 `beginWord` 开始，逐层扩展。每一层代表转换序列增加一个单词。当第一次遇到 `endWord` 时，当前层数即为最短路径长度。

3. ** visited 集合**：避免重复访问同一单词，防止死循环和冗余计算。

**要点分析：**
- 为什么用 BFS 而不是 DFS？因为 BFS 天然保证第一次到达目标时路径最短，而 DFS 需要遍历所有路径才能确定最短。
- 模式匹配预处理将查找邻居的时间从 O(26 × L × N) 优化到 O(L)（L 为单词长度），大幅提升效率。
- 时间复杂度：O(N × L²)，其中 N 为 wordList 长度，L 为单词长度。空间复杂度：O(N × L²)。

## 解法

使用通配符模式预处理的 BFS，逐层扩展搜索最短转换序列。

```javascript
/**
 * @param {string} beginWord
 * @param {string} endWord
 * @param {string[]} wordList
 * @return {number}
 */
const ladderLength = (beginWord, endWord, wordList) => {
  if (!wordList.includes(endWord)) return 0;

  const L = beginWord.length;
  const patternMap = new Map();

  // 预处理：构建通配符模式到单词列表的映射
  for (const word of wordList) {
    for (let i = 0; i < L; i++) {
      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      patternMap.get(pattern).push(word);
    }
  }

  // BFS
  let queue = [beginWord];
  let level = 1;
  const visited = new Set();
  visited.add(beginWord);

  while (queue.length > 0) {
    const nextQueue = [];
    for (const word of queue) {
      if (word === endWord) return level;

      // 通过通配符模式查找所有相邻单词
      for (let i = 0; i < L; i++) {
        const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
        const neighbors = patternMap.get(pattern) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            nextQueue.push(neighbor);
          }
        }
      }
    }
    queue = nextQueue;
    level++;
  }

  return 0;
};

// 验证
console.log(ladderLength("hit", "cog", ["hot","dot","dog","lot","log","cog"])); // 5
console.log(ladderLength("hit", "cog", ["hot","dot","dog","lot","log"])); // 0
```

- **时间复杂度：** O(N × L²)，其中 N 为 wordList 长度，L 为单词长度。预处理 O(N × L)，BFS 每个单词访问一次、每次生成 L 个模式。
- **空间复杂度：** O(N × L²)，模式映射表存储所有模式及其对应单词列表。

## 补充

本题是 BFS 求最短路径的经典模板题，掌握后可迁移到许多场景：

- **双向 BFS 优化**：从 beginWord 和 endWord 同时开始 BFS，当两个搜索圈相遇时停止。可将时间复杂度从 O(b^d) 降到 O(b^(d/2))，其中 b 为分支因子，d 为最短路径深度。
- **相关题目**：[单词拆分](./word-break.md)（动态规划 vs BFS 的选择）、[单词搜索](./word-search.md)（网格上的 DFS/BFS）。
- **实际应用**：拼写纠错、基因序列变异分析、社交网络中的最短关系链。
