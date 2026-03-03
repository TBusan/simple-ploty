name: implement-marching-squares
description: Use when implementing the Marching Squares algorithm for contour generation - covers the 16 basic cases, saddle point handling, and path tracing
---

# Marching Squares 算法实现技能

## 🎯 对应开发阶段

- **Phase 2**: Marching Squares 核心算法
- **Phase 3**: 路径追踪算法

## 🚀 何时使用本技能

### 调用时机

在以下情况下，**必须先阅读本 Skill 文档**：

1. **创建文件时**:
   ```bash
   # 当你开始创建以下文件时
   touch src/algorithms/MarchingSquares.ts
   touch src/algorithms/constants.ts
   # → 停下！先阅读本 Skill
   ```

2. **实现以下函数时**:
   - `getMarchingIndex()` - 索引计算
   - `handleSaddlePoint()` - 鞍点处理
   - 边界起点识别

3. **编写测试时**:
   - Marching Squares 相关单元测试
   - 鞍点处理测试

### 如何使用

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 阅读"实现清单"部分                                        │
│    ↓                                                         │
│ 2. 复制/参考"关键代码"中的实现                               │
│    ↓                                                         │
│ 3. 创建对应的文件和函数                                      │
│    ↓                                                         │
│ 4. 运行"验收测试"中的测试用例                                │
│    ↓                                                         │
│ 5. 检查"常见问题"避免错误                                    │
└─────────────────────────────────────────────────────────────┘
```

## 触发条件

当需要实现 Marching Squares 算法来生成等值线时使用此技能。

## 实现清单

### 1. 索引计算

```typescript
// src/algorithms/MarchingSquares.ts

/**
 * 计算 Marching Squares 索引
 * @param level 等值线级别
 * @param corners 2x2 角点值 [[左上, 右上], [左下, 右下]]
 * @returns 0-15 的索引，或鞍点的组合编码
 */
export function getMarchingIndex(level: number, corners: number[][]): number {
    const mi = (corners[0][0] > level ? 0 : 1) +   // 左上角 (位 0)
               (corners[0][1] > level ? 0 : 2) +   // 右上角 (位 1)
               (corners[1][1] > level ? 0 : 4) +   // 右下角 (位 2)
               (corners[1][0] > level ? 0 : 8);    // 左下角 (位 3)

    // 鞍点特殊处理
    if (mi === 5 || mi === 10) {
        const avg = (corners[0][0] + corners[0][1] +
                     corners[1][0] + corners[1][1]) / 4;
        if (level > avg) {
            return (mi === 5) ? 713 : 1114;
        }
        return (mi === 5) ? 104 : 208;
    }

    return (mi === 15) ? 0 : mi;
}
```

### 2. 16 种基本情况

| 索引 | 二进制 | 含义 | 穿越方式 |
|------|--------|------|----------|
| 0 | 0000 | 全部 > level | 无穿越 |
| 1 | 0001 | 仅 c1 ≤ level | 上边→左边 |
| 2 | 0010 | 仅 c2 ≤ level | 上边→右边 |
| 3 | 0011 | c1,c2 ≤ level | 左边→右边 |
| 4 | 0100 | 仅 c4 ≤ level | 右边→下边 |
| 5 | 0101 | c1,c4 ≤ level | **鞍点** |
| 6 | 0110 | c2,c4 ≤ level | 上边→下边 |
| 7 | 0111 | c1,c2,c4 ≤ level | 上边→下边 |
| 8 | 1000 | 仅 c8 ≤ level | 左边→下边 |
| 9 | 1001 | c1,c8 ≤ level | 上边→下边 |
| 10 | 1010 | c2,c8 ≤ level | **鞍点** |
| 11 | 1011 | c1,c2,c8 ≤ level | 上边→下边 |
| 12 | 1100 | c4,c8 ≤ level | 左边→下边 |
| 13 | 1101 | c1,c4,c8 ≤ level | 左边→右边 |
| 14 | 1110 | c2,c4,c8 ≤ level | 右边→下边 |
| 15 | 1111 | 全部 ≤ level | 无穿越 |

### 3. 鞍点编码方案

| 组合编码 | 组成 | 含义 |
|----------|------|------|
| 104 | 1 + 04 | 索引 1 和索引 4 的组合 |
| 208 | 2 + 08 | 索引 2 和索引 8 的组合 |
| 713 | 7 + 13 | 索引 7 和索引 13 的组合 |
| 1114 | 11 + 14 | 索引 11 和索引 14 的组合 |

### 4. 边界起点常量

```typescript
// src/algorithms/constants.ts

export const BOTTOMSTART = [1, 9, 13, 104, 713];
export const TOPSTART = [4, 6, 7, 104, 713];
export const LEFTSTART = [8, 12, 14, 208, 1114];
export const RIGHTSTART = [2, 3, 11, 208, 1114];

export const NEWDELTA: [number, number][] = [
    null,       // 0: 无穿越
    [-1, 0],    // 1: 向左
    [0, -1],    // 2: 向上
    [-1, 0],    // 3: 向左
    [1, 0],     // 4: 向右
    null,       // 5: 鞍点（特殊处理）
    [0, -1],    // 6: 向上
    [-1, 0],    // 7: 向左
    [0, 1],     // 8: 向下
    [0, 1],     // 9: 向下
    null,       // 10: 鞍点（特殊处理）
    [0, 1],     // 11: 向下
    [1, 0],     // 12: 向右
    [1, 0],     // 13: 向右
    [0, -1]     // 14: 向上
];
```

### 5. 验收测试

```typescript
// tests/marching-squares.test.ts

describe('MarchingSquares', () => {
    test('case 0: all above level', () => {
        const corners = [[5, 5], [5, 5]];
        expect(getMarchingIndex(3, corners)).toBe(0);
    });

    test('case 15: all below level', () => {
        const corners = [[1, 1], [1, 1]];
        expect(getMarchingIndex(3, corners)).toBe(0); // 15 -> 0
    });

    test('case 1: only top-left below', () => {
        const corners = [[2, 5], [5, 5]];
        expect(getMarchingIndex(3, corners)).toBe(1);
    });

    test('saddle point 5', () => {
        const corners = [[2, 5], [5, 2]];
        expect(getMarchingIndex(3, corners)).toBe(104); // or 713
    });

    test('saddle point 10', () => {
        const corners = [[5, 2], [2, 5]];
        expect(getMarchingIndex(3, corners)).toBe(208); // or 1114
    });
});
```

## 常见问题

### Q1: 鞍点如何选择路径？

鞍点有两个可能的穿越方向。选择取决于进入方向：
- 如果 dx/dy < 0，使用第一个选项
- 如果 dx/dy > 0，使用第二个选项

### Q2: 边界起点如何识别？

在网格边界上的单元需要检查其索引是否在对应的 START 数组中：
- 第一行 (yi = 0): 检查 BOTTOMSTART
- 最后一行 (yi = m-2): 检查 TOPSTART
- 第一列 (xi = 0): 检查 LEFTSTART
- 最后一列 (xi = n-2): 检查 RIGHTSTART

## 参考文档

- `contour-marching-squares.md`
