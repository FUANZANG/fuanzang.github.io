# 实现 Trie (前缀树)（Implement Trie (Prefix Tree)）

**难度：** Medium

## 题目描述

Trie（发音类似 "try"）又称前缀树或字典树，是一种用于高效存储和检索字符串键的树形数据结构。实现 `Trie` 类，包含以下方法：

- `Trie()` 初始化前缀树对象。
- `void insert(string word)` 向前缀树中插入字符串 `word`。
- `boolean search(string word)` 如果字符串 `word` 在前缀树中，返回 `true`；否则，返回 `false`。
- `boolean startsWith(string prefix)` 如果之前已经插入的字符串 `word` 的前缀之一与 `prefix` 相同，返回 `true`；否则，返回 `false`。

### 约束条件

- `1 <= word.length, prefix.length <= 2000`
- `word` 和 `prefix` 仅由小写英文字母组成。
- 最多调用 `insert`、`search` 和 `startsWith` 总计 3 × 10⁴ 次。

## 示例

```
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // 返回 true
trie.search("app");     // 返回 false
trie.startsWith("app"); // 返回 true
trie.insert("app");
trie.search("app");     // 返回 true
```

解释：第一个 `search("app")` 返回 `false`，因为当时 "app" 尚未完整插入。插入 "app" 后再次搜索，返回 `true`。

## 提示 / 解题思路

Trie 的核心思想是用边来表示字符，从根节点到某一节点的路径即为某个字符串的前缀。每个节点需要维护：

1. **子节点映射**：`children`，键为字符（`'a'` ~ `'z'`），值为对应的子节点。
2. **是否为单词结尾**：`isEnd` 布尔标记，用于区分前缀和完整单词（如 "app" 是 "apple" 的前缀，但 "app" 本身不一定是一个已插入的单词）。

插入操作：逐字符遍历，若某字符不存在于子节点则新建节点，最后标记 `isEnd = true`。

查找操作：逐字符遍历，若中途字符缺失则返回 `false`；遍历结束后还需检查 `isEnd` 是否为 `true`（与 `startsWith` 的区别在于是否要求完整单词）。

前缀操作：与查找类似，但不检查 `isEnd`，只要路径存在即返回 `true`。

## 解法

使用对象作为子节点哈希表，`isEnd` 标记单词结尾，三个操作均为 O(m) 时间（m 为字符串长度）。

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) {
        node.children[ch] = new TrieNode();
      }
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  search(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) return false;
      node = node.children[ch];
    }
    return node.isEnd;
  }

  startsWith(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children[ch]) return false;
      node = node.children[ch];
    }
    return true;
  }
}

// 验证
const trie = new Trie();
trie.insert("apple");
console.log(trie.search("apple"));   // true
console.log(trie.search("app"));     // false
console.log(trie.startsWith("app")); // true
trie.insert("app");
console.log(trie.search("app"));     // true
```

- **时间复杂度：** 三个操作均为 O(m)，m 为字符串长度。
- **空间复杂度：** 最坏情况 O(n × m)，n 为插入单词数，m 为单词平均长度（共享前缀可节省空间）。

## 补充

Trie 是字符串检索领域的基础数据结构，常见延伸包括：

- **212. 单词搜索 II**：在二维网格中用 Trie 加速多模式匹配。
- **421. 数组中两个数的最大异或值**：二进制 Trie 求最大异或。
- **648. 单词替换**：用 Trie 实现最短根替换。

若需要处理 Unicode 或大量字符集，可将 `children` 对象替换为 `Map` 或固定大小数组（26 个小写字母时用 `Array(26)` 更快）。
