# 三、题目与套路

## 3.1 两数之和（剑指 Offer 57）

**思路**：边遍历边查补数 `target - x` 是否出现过。

```cpp
vector<int> findNumbersWithSum(vector<int>& nums, int target) {
    unordered_set<int> S;
    for (auto x : nums) {
        if (S.count(target - x)) return {x, target - x};
        S.insert(x);
    }
    return {};          // 别忘了！缺 return 是未定义行为
}
```

- 时间 O(n)，空间 O(n)；暴力双重循环是 O(n^2)
- 返回结果**不保证有序**（题目要求升序需 swap）
- **不保证乘积最小**，要这个性质得用双指针（前提：数组已排序，O(1) 空间）
