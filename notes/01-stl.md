# 一、C++ STL 常用工具

## 1.1 哈希表 unordered_set / unordered_map

- 平均 O(1) 增删查，**无序**；要排序/前驱后继用 set / map（O(log n)）
- 选型：范围小 → 直接开数组；键是字符串/大范围 → `unordered_*`

```cpp
unordered_set<int> S;
unordered_map<string, int> mp;

S.insert(x);  S.erase(x);  S.count(x);  S.find(x);  S.size();  S.clear();
mp[k] = v;    mp.count(k); mp.find(k);  mp.erase(k);
for (auto& [k, v] : mp) ...          // 结构化绑定（C++17）
```

**易错点**

- `mp[key]` 键不存在会**自动插入默认值**，只查询要用 `count` / `find` / `at`
- 出题人可构造数据卡哈希 → 退化成 O(n) TLE，需自定义随机哈希

```cpp
struct custom_hash {
    static uint64_t splitmix64(uint64_t x) {
        x += 0x9e3779b97f4a7c15;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
        x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
        return x ^ (x >> 31);
    }
    size_t operator()(uint64_t x) const {
        static const uint64_t R = chrono::steady_clock::now().time_since_epoch().count();
        return splitmix64(x + R);
    }
};
unordered_set<int, custom_hash> S;   // 第二个模板参数传哈希
mp.reserve(n);                       // 预留空间，避免反复 rehash
```

## 1.2 count 函数

- 语义：统计等于 key 的元素个数（为 multiset 设计的统一接口）
- 唯一键容器（set / map / unordered_*）上**只能是 0 或 1** → 即存在性检查
- 复杂度：unordered 平均 O(1)，set 为 O(log n)

```cpp
if (S.count(x)) ...        // x 在不在
```

| 函数 | 返回 | 用途 |
| --- | --- | --- |
| `count(x)` | 0 / 1 | 判断存在，最简洁 |
| `find(x)` | 迭代器 | 还要拿到元素本身 |
| `contains(x)` | bool | C++20，语义最直白 |

**易错点**

- 返回类型是无符号整数，别和负数比较
- map 的 count 检查的是**键**，不是值
- multiset 上返回真实重复个数，别当布尔用

## 1.3 auto 关键字

- 编译期类型推导，零运行时代价；**必须有初始值**
- 会**脱掉引用和 const**，想保留要自己写 `&` / `const`

```cpp
auto a = 5;                     // int
auto it = v.begin();            // vector<int>::iterator
const int ci = 10;
auto x1 = ci;                   // int（const 没了）
auto& x2 = ci;                  // const int&（写 & 才保留）
auto add(int a, int b) { return a + b; }      // C++14 返回值推导
auto cmp = [](auto a, auto b) { return a > b; };  // C++14 泛型 lambda
```

**范围 for 三种写法**

| 写法 | 拷贝 | 可修改 | 场景 |
| --- | --- | --- | --- |
| `auto x` | 是 | 否 | 小类型（int、char） |
| `auto& x` | 否 | 是 | 要改元素 |
| `const auto& x` | 否 | 否 | 大对象遍历标准写法 |

**陷阱**

```cpp
auto n = v.size();     // size_t 无符号，和 int 比较有警告
auto x = vb[0];        // vector<bool> 返回代理类，不是 bool&
auto r = f();          // 类型被藏起来，需跳看签名
```

- 用不用：迭代器/嵌套模板类型 → 用；`int`、`bool` 等类型本身就是信息 → 写清楚

## 1.4 结构体数组排序 sort + lambda

- 比较器返回「`x` 应该排在 `y` 前面」是否为真：**升序写 `<`，降序写 `>`**
- 复杂度 O(n log n)，比较器被调用约 n log n 次

```cpp
struct Node { int id, score; };
vector<Node> a(n);

sort(a.begin(), a.end(), [](const Node& x, const Node& y) {
    return x.score < y.score;      // 按 score 升序；降序把 < 换成 >
});
```

**多关键字**：先按 score 降序，score 相同再按 id 升序

```cpp
sort(a.begin(), a.end(), [](const Node& x, const Node& y) {
    if (x.score != y.score) return x.score > y.score;   // 第一关键字
    return x.id < y.id;                                 // 第二关键字，方向可不同
});
```

```cpp
// 所有关键字同方向时，tie 更短
sort(a.begin(), a.end(), [](const Node& x, const Node& y) {
    return tie(x.score, x.id) > tie(y.score, y.id);
});
```

| 场景 | 写法 |
| --- | --- |
| C 数组 | `sort(a, a + n, cmp)` |
| 重载 `operator<` | 结构体内写 `bool operator<(const Node& o) const`，只有全局唯一定义时才用 |
| 相等元素保持原顺序 | `stable_sort` |
| pair 天然字典序 | `vector<pair<int,int>>` 直接 `sort`，`rbegin/rend` 逆序 |

**易错点**

- **别写 `<=`**：必须严格弱序，`return x.score <= y.score;` 是 UB，`sort` 可能越界崩溃（不是排错，是随机崩）
- 参数用 `const Node&`，按值传会拷贝 n log n 次
- 不需要捕获外部变量就写 `[]`，别写 `[&]`
- 比较器里别做重活（开根号、查哈希表等）
