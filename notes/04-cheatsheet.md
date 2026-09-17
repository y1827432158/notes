# 四、速查表

| 场景 | 写法 |
| --- | --- |
| 判存在 / 判重 | `unordered_set` + `count` |
| 计数（词频） | `unordered_map<K,int>` + `mp[x]++` |
| 两数之和 | 遍历中查 `target - x` |
| 稀疏图 | `unordered_map<int, vector<int>>` |
| 需要有序 | `set` / `map`，或 `vector` + `sort` + 二分 |
| 结构体按某字段排序 | `sort` + lambda 比较器，升序 `<` 降序 `>` |
| 范围小且是 int | `bool st[N]` 数组，比哈希更快 |
| 取二进制第 i 位 | `n >> i & 1` |
| 二进制中 1 的个数 | `__builtin_popcount(n)` |
| lowbit（消最低位的 1） | `n -= n & -n` |
| 判断 2 的幂 | `(n & -n) == n` |
