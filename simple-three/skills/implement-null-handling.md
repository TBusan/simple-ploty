name: implement-null-handling
description: Use when implementing null data handling with connectgaps option and Poisson interpolation
---

# 空值处理实现技能

## 触发条件

当需要处理等值线数据中的 null/undefined/NaN 值时使用此技能。

## 处理模式

| connectgaps | 行为 |
|-------------|------|
| `true` | 使用泊松插值填充缺失数据，生成连续等值线 |
| `false` | 保留空白区域，等值线绕过缺失数据 |

## 实现清单

### 1. 空白点检测

```typescript
// src/utils/NullHandler.ts

interface EmptyPoint {
    i: number;          // 行索引
    j: number;          // 列索引
    neighborCount: number; // 有效邻居数量
}

/**
 * 找到所有空白点
 */
export function findEmpties(z: (number | null)[][]): EmptyPoint[] {
    const empties: EmptyPoint[] = [];
    const noNeighborList: [number, number][] = [];

    for (let i = 0; i < z.length; i++) {
        for (let j = 0; j < z[i].length; j++) {
            if (z[i][j] === null || z[i][j] === undefined || isNaN(z[i][j])) {
                // 计算有效邻居数量
                let neighborCount = 0;
                if (z[i]?.[j - 1] !== undefined) neighborCount++;
                if (z[i]?.[j + 1] !== undefined) neighborCount++;
                if (z[i - 1]?.[j] !== undefined) neighborCount++;
                if (z[i + 1]?.[j] !== undefined) neighborCount++;

                if (neighborCount > 0) {
                    // 边界点增加虚拟邻居
                    if (i === 0) neighborCount++;
                    if (j === 0) neighborCount++;
                    if (i === z.length - 1) neighborCount++;
                    if (j === z[i].length - 1) neighborCount++;

                    empties.push({ i, j, neighborCount });
                } else {
                    noNeighborList.push([i, j]);
                }
            }
        }
    }

    // 处理完全孤立的空白点（迭代查找间接邻居）
    while (noNeighborList.length > 0) {
        // ... 迭代查找逻辑
    }

    // 按邻居数量降序排序（优先处理邻居多的点）
    return empties.sort((a, b) => b.neighborCount - a.neighborCount);
}
```

### 2. 泊松插值

```typescript
// src/utils/Interpolation.ts

const INTERPTHRESHOLD = 0.001;
const MAX_ITERATIONS = 100;

/**
 * 泊松方程插值填充
 */
export function interp2d(z: (number | null)[][], emptyPoints: EmptyPoint[]): number[][] {
    let maxFractionalChange = 1;

    // 第一遍：给所有空白点一个初始值
    iterateInterp2d(z, emptyPoints, 0);

    // 迭代直到收敛
    for (let i = 0; i < MAX_ITERATIONS && maxFractionalChange > INTERPTHRESHOLD; i++) {
        maxFractionalChange = iterateInterp2d(
            z,
            emptyPoints,
            correctionOvershoot(maxFractionalChange)
        );
    }

    return z as number[][];
}

/**
 * 单次迭代
 */
function iterateInterp2d(
    z: (number | null)[][],
    emptyPoints: EmptyPoint[],
    overshoot: number
): number {
    let maxFractionalChange = 0;

    for (const pt of emptyPoints) {
        const { i, j } = pt;
        const initialVal = z[i][j];
        let neighborSum = 0;
        let neighborCount = 0;
        let minNeighbor = Infinity;
        let maxNeighbor = -Infinity;

        // 收集四个方向的邻居值
        const neighbors = [
            z[i - 1]?.[j],
            z[i + 1]?.[j],
            z[i]?.[j - 1],
            z[i]?.[j + 1]
        ];

        for (const val of neighbors) {
            if (val !== undefined && val !== null) {
                minNeighbor = Math.min(minNeighbor, val);
                maxNeighbor = Math.max(maxNeighbor, val);
                neighborSum += val;
                neighborCount++;
            }
        }

        // 泊松方程插值：每个点等于邻居的平均值
        z[i][j] = neighborSum / neighborCount;

        // 使用过冲加速收敛
        if (initialVal !== null && initialVal !== undefined) {
            z[i][j] = (1 + overshoot) * z[i][j]! - overshoot * initialVal;

            // 计算收敛指标
            if (maxNeighbor > minNeighbor) {
                maxFractionalChange = Math.max(
                    maxFractionalChange,
                    Math.abs(z[i][j]! - initialVal) / (maxNeighbor - minNeighbor)
                );
            }
        }
    }

    return maxFractionalChange;
}

/**
 * 过冲系数
 */
function correctionOvershoot(maxFractionalChange: number): number {
    return 0.5 - 0.25 * Math.min(1, maxFractionalChange * 0.5);
}
```

### 3. 裁剪路径生成

```typescript
// src/utils/ClipGenerator.ts

/**
 * 为 connectgaps=false 生成裁剪路径
 */
export function makeClipMask(cd0: ContourData): number[][] {
    const empties = cd0.trace._emptypoints;
    const m = cd0.z.length;
    const n = cd0.z[0].length;

    // 初始化掩码为 1（全部有数据）
    const mask: number[][] = [];
    for (let i = 0; i < m; i++) {
        mask.push(new Array(n).fill(1));
    }

    // 标记空白点为 0
    for (const pt of empties) {
        mask[pt.i][pt.j] = 0;
    }

    return mask;
}

/**
 * 生成裁剪路径信息
 */
export function generateClipPathInfo(
    cd0: ContourData,
    xaxis: Axis,
    yaxis: Axis
): PathInfo {
    return {
        level: 0.9,  // 在有数据和无数据之间的边界
        crossings: {},
        starts: [],
        edgepaths: [],
        paths: [],
        xaxis,
        yaxis,
        x: cd0.x,
        y: cd0.y,
        z: makeClipMask(cd0),
        smoothing: 0
    };
}
```

### 4. 处理流程

```
输入 z 矩阵（含 null）
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 判断条件                                                    │
│ isContour || trace.connectgaps ?                           │
└─────────────────────────────────────────────────────────────┘
        │
        ├── 否 ──→ 不处理，保留 null 值
        │
        └── 是 ──→
                  │
                  ▼
           ┌──────────────────┐
           │ findEmpties(z)   │ → 找到所有空白点
           └──────────────────┘
                  │
                  ▼
           ┌──────────────────┐
           │ interp2d(z, ...) │ → 泊松插值填充
           └──────────────────┘
                  │
                  ▼
           填充后的 z 矩阵
```

### 5. 等值线在 null 边界的行为

```
connectgaps = false:
数据区域:          等值线行为:
┌───────────┐      ┌───────────┐
│ 1 2 3 4 5 │      │ ────┬──── │
│ 2 3 4 5 6 │      │     │     │
│ 3 4 X 6 7 │  →   │ ────┼──── │  ← 等值线在 null 边界断开
│ 4 5 X 7 8 │      │     │     │
│ 5 6 7 8 9 │      │ ────┴──── │
└───────────┘      └───────────┘
    (X = null)

connectgaps = true:
数据区域:          插值后:            等值线:
┌───────────┐      ┌───────────┐      ┌───────────┐
│ 1 2 3 4 5 │      │ 1 2 3 4 5 │      │ ───────── │
│ 2 3 4 5 6 │      │ 2 3 4 5 6 │      │ ───────── │
│ 3 4 X 6 7 │  →   │ 3 4 5 6 7 │  →   │ ───────── │  ← 连续等值线
│ 4 5 X 7 8 │      │ 4 5 6 7 8 │      │ ───────── │
│ 5 6 7 8 9 │      │ 5 6 7 8 9 │      │ ───────── │
└───────────┘      └───────────┘      └───────────┘
```

## 验收测试

```typescript
// tests/null-handling.test.ts

describe('NullHandler', () => {
    test('finds all empty points', () => {
        const z = [[1, null, 3], [null, null, 4], [5, 6, 7]];
        const empties = findEmpties(z);
        expect(empties.length).toBe(3);
    });

    test('interpolation converges', () => {
        const z = [[1, null, 3], [null, null, null], [5, null, 7]];
        const empties = findEmpties(z);
        interp2d(z, empties);

        // 检查所有 null 都被填充
        for (const row of z) {
            for (const val of row) {
                expect(val).not.toBeNull();
            }
        }
    });

    test('interpolated values are within range', () => {
        const z = [[1, null, 3], [null, null, null], [5, null, 7]];
        const empties = findEmpties(z);
        interp2d(z, empties);

        // 插值应该在最小和最大值之间
        for (const row of z) {
            for (const val of row as number[]) {
                expect(val).toBeGreaterThanOrEqual(1);
                expect(val).toBeLessThanOrEqual(7);
            }
        }
    });

    test('clip mask identifies null regions', () => {
        const cd0 = {
            z: [[1, null, 3], [null, null, 4]],
            trace: { _emptypoints: [{ i: 0, j: 1 }, { i: 1, j: 0 }, { i: 1, j: 1 }] }
        };
        const mask = makeClipMask(cd0);
        expect(mask[0][1]).toBe(0);
        expect(mask[0][0]).toBe(1);
    });
});
```

## 常见问题

### Q1: 为什么使用泊松方程而不是简单插值？

泊松方程确保平滑过渡，避免在边界处产生不自然的跳跃。

### Q2: 为什么 level 设为 0.9 而不是 1.0？

设为 1.0 会使孤立的数据点完全消失，0.9 意味着在有数据区域的边界稍内处裁剪。

### Q3: 迭代次数限制是多少？

最多 100 次迭代，通常在收敛阈值 (0.001) 达到前就会停止。

## 参考文档

- `contour-null-data-handling.md`
