---
name: contour-marching-squares
description: 实现 Marching Squares 算法用于等值线生成
---

# Marching Squares 算法实现技能

## 触发条件

当需要实现等值线生成的 Marching Squares 算法时使用此技能。

## 实现步骤

### 步骤 1: 定义数据结构

```typescript
// src/types/types.ts

interface GridCell {
  x: number;      // 网格 x 索引
  y: number;      // 网格 y 索引
  corners: [number, number, number, number]; // [左上, 右上, 右下, 左下]
}

interface CrossingInfo {
  loc: string;          // "x,y" 格式的位置标识
  index: number;        // Marching Index (0-15 或鞍点编码)
  isSaddle: boolean;    // 是否为鞍点
}
```

### 步骤 2: 实现 Marching Index 计算

```typescript
// src/contour/marching-squares/MarchingSquares.ts

/**
 * 计算网格单元的 Marching Index
 * @param level 等值线级别
 * @param corners 四个角点的值 [左上, 右上, 右下, 左下]
 * @returns Marching Index (0-15) 或鞍点编码 (104, 208, 713, 1114)
 */
function getMarchingIndex(level: number, corners: [number, number, number, number]): number {
  // 位编码: 每个角点如果 <= level 则为 1，否则为 0
  const mi = (corners[0] > level ? 0 : 1) +   // 左上角 (位 0)
             (corners[1] > level ? 0 : 2) +   // 右上角 (位 1)
             (corners[2] > level ? 0 : 4) +   // 右下角 (位 2)
             (corners[3] > level ? 0 : 8);    // 左下角 (位 3)

  // 鞍点特殊处理
  if (mi === 5 || mi === 10) {
    const avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;
    if (level > avg) {
      // 两个峰之间的谷
      return mi === 5 ? 713 : 1114;
    } else {
      // 两个谷之间的峰
      return mi === 5 ? 104 : 208;
    }
  }

  return mi === 15 ? 0 : mi;
}
```

### 步骤 3: 定义常量

```typescript
// src/contour/marching-squares/constants.ts

export const BOTTOM_START = [1, 9, 13, 104, 713];
export const TOP_START = [4, 6, 7, 104, 713];
export const LEFT_START = [8, 12, 14, 208, 1114];
export const RIGHT_START = [2, 3, 11, 208, 1114];

// 每个索引对应的移动方向 [dx, dy]
export const NEW_DELTA: [number, number][] = [
  null,       // 0: 无穿越
  [-1, 0],    // 1: 向左
  [0, -1],    // 2: 向上
  [-1, 0],    // 3: 向左
  [1, 0],     // 4: 向右
  null,       // 5: 鞍点
  [0, -1],    // 6: 向上
  [-1, 0],    // 7: 向左
  [0, 1],     // 8: 向下
  [0, 1],     // 9: 向下
  null,       // 10: 鞍点
  [0, 1],     // 11: 向下
  [1, 0],     // 12: 向右
  [1, 0],     // 13: 向右
  [0, -1]     // 14: 向上
];

// 鞍点路径选择
export const CHOOSE_SADDLE: Record<number, [number, number]> = {
  104: [4, 1],    // dx/dy < 0 用 4, > 0 用 1
  208: [2, 8],
  713: [7, 13],
  1114: [11, 14]
};

// 鞍点剩余路径
export const SADDLE_REMAINDER: Record<number, number> = {
  1: 4, 2: 8, 4: 1, 7: 13, 8: 2, 11: 14, 13: 7, 14: 11
};
```

### 步骤 4: 实现穿越点计算

```typescript
// src/contour/marching-squares/MarchingSquares.ts

export class MarchingSquares {
  private z: number[][];
  private levels: number[];

  constructor(z: number[][], levels: number[]) {
    this.z = z;
    this.levels = levels;
  }

  /**
   * 计算所有级别的穿越点
   */
  computeCrossings(): Map<number, PathInfo> {
    const result = new Map<number, PathInfo>();
    const m = this.z.length;
    const n = this.z[0].length;

    for (const level of this.levels) {
      const pathInfo: PathInfo = {
        level,
        crossings: new Map<string, number>(),
        starts: [],
        edgePaths: [],
        paths: []
      };

      for (let yi = 0; yi < m - 1; yi++) {
        for (let xi = 0; xi < n - 1; xi++) {
          const corners: [number, number, number, number] = [
            this.z[yi][xi],       // 左上
            this.z[yi][xi + 1],   // 右上
            this.z[yi + 1][xi + 1], // 右下
            this.z[yi + 1][xi]    // 左下
          ];

          const mi = getMarchingIndex(level, corners);
          if (mi === 0) continue;

          const locStr = `${xi},${yi}`;
          pathInfo.crossings.set(locStr, mi);

          // 检查是否为边界起点
          if (this.isStart(mi, xi, yi, n - 1, m - 1)) {
            pathInfo.starts.push([xi, yi]);
          }
        }
      }

      result.set(level, pathInfo);
    }

    return result;
  }

  private isStart(mi: number, xi: number, yi: number, maxX: number, maxY: number): boolean {
    const starts: number[] = [];

    if (yi === 0) starts.push(...BOTTOM_START);
    if (yi === maxY) starts.push(...TOP_START);
    if (xi === 0) starts.push(...LEFT_START);
    if (xi === maxX) starts.push(...RIGHT_START);

    return starts.includes(mi);
  }
}
```

## 验收清单

- [ ] 16 种基本情况正确处理
- [ ] 鞍点消歧使用平均值法
- [ ] 边界起点正确识别
- [ ] 单元测试覆盖率 > 90%

## 测试用例

```typescript
describe('MarchingSquares', () => {
  test('case 0: all corners > level', () => {
    expect(getMarchingIndex(5, [10, 10, 10, 10])).toBe(0);
  });

  test('case 1: only top-left <= level', () => {
    expect(getMarchingIndex(5, [3, 10, 10, 10])).toBe(1);
  });

  test('saddle case 5: disambiguate by average', () => {
    // avg = 3, level = 2 < avg → 104
    expect(getMarchingIndex(2, [1, 5, 5, 1])).toBe(104);
    // avg = 3, level = 4 > avg → 713
    expect(getMarchingIndex(4, [1, 5, 5, 1])).toBe(713);
  });
});
```

## 参考资料

- [contour-marching-squares.md](../../word/contour-marching-squares.md)
- Wikipedia: Marching Squares
