# 五、速查表

| 场景 | 写法 |
| --- | --- |
| 判存在 / 判重 | `unordered_set` + `count` |
| 计数（词频） | `unordered_map<K,int>` + `mp[x]++` |
| 两数之和 | 遍历中查 `target - x` |
| 稀疏图 | `unordered_map<int, vector<int>>` |
| 需要有序 | `set` / `map`，或 `vector` + `sort` + 二分 |
| 结构体按某字段排序 | `sort` + lambda 比较器，升序 `<` 降序 `>` |
| 手写快排的分界点 | 基准取左端 `q[l]` 用 `j` 分，取右端 `q[r]` 用 `i` 分 |
| 求第 k 小 / 前 k 小 | 快速选择（平均 O(n)），或直接 `nth_element` |
| 大数组开在全局 | `const int N = 1e5 + 10; int q[N];` |
| 范围小且是 int | `bool st[N]` 数组，比哈希更快 |
| 取二进制第 i 位 | `n >> i & 1` |
| 二进制中 1 的个数 | `__builtin_popcount(n)` |
| lowbit（消最低位的 1） | `n -= n & -n` |
| 判断 2 的幂 | `(n & -n) == n` |
| 去重且有序 | `set`，insert 时自动排序去重 |
| 数字 ↔ 字符串 | `to_string(n)` / `stringstream` |
| 按空格切分字符串 | `istringstream` + `while (iss >> w)` |
| 输出保留 k 位小数 | `cout << fixed << setprecision(k)` |
| 删掉所有等于 x 的元素 | `v.erase(remove(v.begin(), v.end(), x), v.end())` |
| 找不到的判断 | `s.find(c) != string::npos`（不是 -1） |
| 万能头文件 | `#include <bits/stdc++.h>`（比赛可用，项目里别用） |
