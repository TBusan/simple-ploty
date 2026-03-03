---
name: contour-smoothing
description: 实现等值线路径平滑处理（Centripetal Catmull-Rom 样条）
---

# 等值线平滑处理技能

## 触发条件

当需要实现等值线的平滑处理功能时使用，确保填充模式和线条模式保持视觉一致性。

## 实现步骤

### 步骤 1: 定义平滑参数

```typescript
// src/contour/ContourOption.ts

export interface LineOption {
  color?: string;
  width?: number;
  dash?: number[];
  smoothing?: number;  // 0-1.3, 默认 1
}

export const DEFAULT_LINE_OPTION: LineOption = {
  color: '#444',
  width: 1,
  dash: [],
  smoothing: 1
};
```

### 步骤 2: 实现切线计算函数

```typescript
// src/contour/line/Smoothing.ts

import { Point } from '@/types/types';

// Centripetal Catmull-Rom 指数
const CATMULL_ROM_EXP = 0.5;

/**
 * 计算点的入切线和出切线控制点
 *
 * @param prevPt 前一个点
 * @param thisPt 当前点
 * @param nextPt 后一个点
 * @param smoothness 平滑度 (0-1.3)
 * @returns [入切线控制点, 出切线控制点]
 */
export function makeTangent(
  prevPt: Point,
  thisPt: Point,
  nextPt: Point,
  smoothness: number
): [Point, Point] {
  // 计算与前一点的方向向量
  const d1x = prevPt.x - thisPt.x;
  const d1y = prevPt.y - thisPt.y;

  // 计算与后一点的方向向量
  const d2x = nextPt.x - thisPt.x;
  const d2y = nextPt.y - thisPt.y;

  // Centripetal 参数化：计算距离的指数幂
  const d1a = Math.pow(d1x * d1x + d1y * d1y, CATMULL_ROM_EXP / 2);
  const d2a = Math.pow(d2x * d2x + d2y * d2y, CATMULL_ROM_EXP / 2);

  // 计算切线方向
  const numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
  const numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;

  // 入切线和出切线分母
  const denom1 = 3 * d2a * (d1a + d2a);  // 入切线
  const denom2 = 3 * d1a * (d1a + d2a);  // 出切线

  // 返回两个控制点
  return [
    {
      x: thisPt.x + (denom1 && numx / denom1),
      y: thisPt.y + (denom1 && numy / denom1)
    },
    {
      x: thisPt.x - (denom2 && numx / denom2),
      y: thisPt.y - (denom2 && numy / denom2)
    }
  ];
}
```

### 步骤 3: 实现开放路径平滑

```typescript
// src/contour/line/Smoothing.ts

/**
 * 平滑开放路径（边缘路径）
 *
 * 用于处理接触数据边界的等高线。
 * 路径不闭合，起点和终点在边界上。
 *
 * @param pts 路径点数组
 * @param smoothness 平滑度 (0-1.3)
 * @returns SVG 路径字符串
 */
export function smoothOpen(pts: Point[], smoothness: number): string {
  // 少于3个点直接连线
  if (pts.length < 3) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L');
  }

  // 无平滑时返回折线
  if (smoothness === 0) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L');
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  const tangents: [Point, Point][] = [];

  // 为每个内部点计算切线
  for (let i = 1; i < pts.length - 1; i++) {
    tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
  }

  // 起始段：二次贝塞尔曲线
  path += `Q${tangents[0][0].x},${tangents[0][0].y} ${pts[1].x},${pts[1].y}`;

  // 中间段：三次贝塞尔曲线
  for (let i = 2; i < pts.length - 1; i++) {
    const tPrev = tangents[i - 2];
    const tCurr = tangents[i - 1];
    path += `C${tPrev[1].x},${tPrev[1].y} ${tCurr[0].x},${tCurr[0].y} ${pts[i].x},${pts[i].y}`;
  }

  // 结束段：二次贝塞尔曲线
  const lastIdx = pts.length - 1;
  path += `Q${tangents[lastIdx - 2][1].x},${tangents[lastIdx - 2][1].y} ${pts[lastIdx].x},${pts[lastIdx].y}`;

  return path;
}
```

### 步骤 4: 实现闭合路径平滑

```typescript
// src/contour/line/Smoothing.ts

/**
 * 平滑闭合路径（内部路径）
 *
 * 用于处理完全在数据内部的环形等高线。
 * 路径闭合，首尾相连。
 *
 * @param pts 路径点数组
 * @param smoothness 平滑度 (0-1.3)
 * @returns SVG 路径字符串
 */
export function smoothClosed(pts: Point[], smoothness: number): string {
  // 少于3个点直接连线闭合
  if (pts.length < 3) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
  }

  // 无平滑时返回折线闭合
  if (smoothness === 0) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  const pLast = pts.length - 1;

  // 计算所有点的切线（包括首尾点的循环处理）
  const tangents: [Point, Point][] = [
    makeTangent(pts[pLast], pts[0], pts[1], smoothness)
  ];

  for (let i = 1; i < pLast; i++) {
    tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
  }

  tangents.push(makeTangent(pts[pLast - 1], pts[pLast], pts[0], smoothness));

  // 所有段都使用三次贝塞尔曲线
  for (let i = 1; i <= pLast; i++) {
    const tPrev = tangents[i - 1];
    const tCurr = tangents[i];
    path += `C${tPrev[1].x},${tPrev[1].y} ${tCurr[0].x},${tCurr[0].y} ${pts[i].x},${pts[i].y}`;
  }

  // 闭合回到起点
  path += `C${tangents[pLast][1].x},${tangents[pLast][1].y} ` +
          `${tangents[0][0].x},${tangents[0][0].y} ` +
          `${pts[0].x},${pts[0].y}Z`;

  return path;
}
```

### 步骤 5: 创建路径信息存储平滑参数

```typescript
// src/contour/marching-squares/MarchingSquares.ts

export interface PathInfo {
  level: number;
  crossings: Map<string, Point>;
  starts: Point[];
  edgePaths: Point[][];  // 原始边缘路径点（未平滑）
  paths: Point[][];      // 原始内部路径点（未平滑）
  smoothing: number;     // 平滑参数
}

// 在创建 pathinfo 时传递 smoothing 参数
export function createPathInfo(level: number, smoothing: number): PathInfo {
  return {
    level,
    crossings: new Map(),
    starts: [],
    edgePaths: [],
    paths: [],
    smoothing
  };
}
```

### 步骤 6: 填充渲染中使用平滑

```typescript
// src/contour/fill/FillRenderer.ts

import { smoothOpen, smoothClosed } from '../line/Smoothing';

export class FillRenderer {
  /**
   * 渲染填充区域
   * 在生成 SVG 路径时应用平滑
   */
  renderFill(pathInfo: PathInfo[]): zrender.Path[] {
    const paths: zrender.Path[] = [];

    for (const pi of pathInfo) {
      let fullPath = '';

      // 处理边缘路径（使用相同的平滑函数）
      for (const edgePath of pi.edgePaths) {
        fullPath += smoothOpen(edgePath, pi.smoothing);
      }

      // 处理内部闭合路径（使用相同的平滑函数）
      for (const path of pi.paths) {
        fullPath += smoothClosed(path, pi.smoothing);
      }

      // 创建 ZRender Path 元素
      const fillPath = new zrender.Path({
        shape: {
          pathData: fullPath
        },
        style: {
          fill: this.getColorForLevel(pi.level)
        }
      });

      paths.push(fillPath);
    }

    return paths;
  }
}
```

### 步骤 7: 线条渲染中使用平滑

```typescript
// src/contour/line/LineRenderer.ts

import { smoothOpen, smoothClosed } from './Smoothing';

export class LineRenderer {
  /**
   * 渲染等值线条
   * 使用与填充相同的平滑函数确保一致性
   */
  renderLines(pathInfo: PathInfo[], lineOption: LineOption): zrender.Path[] {
    const lines: zrender.Path[] = [];
    const smoothing = pathInfo[0]?.smoothing ?? 1;

    for (const pi of pathInfo) {
      // 渲染边缘线条
      for (const edgePath of pi.edgePaths) {
        const linePath = new zrender.Path({
          shape: {
            pathData: smoothOpen(edgePath, smoothing)  // 相同的平滑函数
          },
          style: {
            stroke: lineOption.color,
            lineWidth: lineOption.width,
            lineDash: lineOption.dash,
            fill: 'none'
          }
        });
        lines.push(linePath);
      }

      // 渲染闭合线条
      for (const path of pi.paths) {
        const linePath = new zrender.Path({
          shape: {
            pathData: smoothClosed(path, smoothing)  // 相同的平滑函数
          },
          style: {
            stroke: lineOption.color,
            lineWidth: lineOption.width,
            lineDash: lineOption.dash,
            fill: 'none'
          }
        });
        lines.push(linePath);
      }
    }

    return lines;
  }
}
```

## 一致性保证机制

### 核心设计理念

**平滑处理在渲染阶段应用，而非数据预处理阶段。**

| 方面 | 填充 (Fill) | 线条 (Lines) | 一致性保证 |
|------|-------------|--------------|------------|
| 数据源 | `pathInfo.edgePaths`, `pathInfo.paths` | `pathInfo.edgePaths`, `pathInfo.paths` | ✅ 相同 |
| 平滑参数 | `pi.smoothing` | `pathInfo[0].smoothing` | ✅ 相同 |
| 开放路径平滑 | `smoothOpen()` | `smoothOpen()` | ✅ 相同 |
| 闭合路径平滑 | `smoothClosed()` | `smoothClosed()` | ✅ 相同 |
| 应用时机 | 渲染阶段 | 渲染阶段 | ✅ 相同 |

### 数据流架构

```
                    ┌─────────────────┐
                    │   原始路径点      │
                    │  (未经平滑)       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │    填充渲染       │          │    线条渲染       │
    │  smoothOpen()    │          │  smoothOpen()    │
    │  smoothClosed()  │          │  smoothClosed()  │
    └────────┬─────────┘          └────────┬──────────┘
             │                              │
             └──────────────┬──────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  相同的平滑算法   │
                   │  = 完美对齐      │
                   └─────────────────┘
```

## 验收清单

- [ ] `makeTangent()` 函数实现正确
- [ ] `smoothOpen()` 处理开放路径
- [ ] `smoothClosed()` 处理闭合路径
- [ ] 平滑参数 0 产生折线
- [ ] 平滑参数 1 产生平滑曲线
- [ ] 填充和线条使用相同平滑函数
- [ ] 填充区域与线条完美对齐
- [ ] 无自相交问题
- [ ] 单元测试通过

## 测试用例

```typescript
// test/smoothing.test.ts

import { makeTangent, smoothOpen, smoothClosed } from '@/contour/line/Smoothing';

describe('Smoothing', () => {
  describe('makeTangent', () => {
    test('should calculate tangent control points', () => {
      const prev = { x: 0, y: 0 };
      const curr = { x: 1, y: 1 };
      const next = { x: 2, y: 0 };

      const [inTangent, outTangent] = makeTangent(prev, curr, next, 1);

      // 入切线应在 curr 点附近
      expect(inTangent.x).toBeCloseTo(1, 0);
      expect(inTangent.y).toBeGreaterThan(1);

      // 出切线应在 curr 点附近
      expect(outTangent.x).toBeCloseTo(1, 0);
      expect(outTangent.y).toBeGreaterThan(1);
    });

    test('should return zero offset for smoothness 0', () => {
      const prev = { x: 0, y: 0 };
      const curr = { x: 1, y: 1 };
      const next = { x: 2, y: 0 };

      const [inTangent, outTangent] = makeTangent(prev, curr, next, 0);

      expect(inTangent.x).toBe(1);
      expect(inTangent.y).toBe(1);
      expect(outTangent.x).toBe(1);
      expect(outTangent.y).toBe(1);
    });
  });

  describe('smoothOpen', () => {
    test('should return polyline for less than 3 points', () => {
      const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      const path = smoothOpen(pts, 1);

      expect(path).toBe('M0,0L1,1');
    });

    test('should return polyline for smoothness 0', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothOpen(pts, 0);

      expect(path).toBe('M0,0L1,1L2,0');
    });

    test('should return bezier path for smoothness > 0', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ];
      const path = smoothOpen(pts, 1);

      expect(path).toContain('M');
      expect(path).toContain('Q');  // 二次贝塞尔
      expect(path).toContain('C');  // 三次贝塞尔
    });
  });

  describe('smoothClosed', () => {
    test('should return closed polyline for less than 3 points', () => {
      const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      const path = smoothClosed(pts, 1);

      expect(path).toBe('M0,0L1,1Z');
    });

    test('should end with Z for closed path', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothClosed(pts, 1);

      expect(path.endsWith('Z')).toBe(true);
    });
  });

  describe('Consistency', () => {
    test('fill and lines should use same smoothing', () => {
      // 确保填充和线条使用相同的平滑函数
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];

      const fillPath = smoothClosed(pts, 1);
      const linePath = smoothClosed(pts, 1);

      // 两者应该是相同的
      expect(fillPath).toBe(linePath);
    });
  });
});
```

## 参考资料

- [contour-smoothing.md](../../word/contour-smoothing.md) - Plotly.js 平滑处理原理分析
- [Centripetal Catmull-Rom 论文](http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf)
