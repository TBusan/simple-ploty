name: implement-smoothing
description: Use when implementing Catmull-Rom spline smoothing for contour lines - ensures consistent smoothing between fill and lines
---

# 平滑处理实现技能

## 🎯 对应开发阶段

- **Phase 7**: 平滑处理

## 🚀 何时使用本技能

### 调用时机

在以下情况下，**必须先阅读本 Skill 文档**：

1. **创建文件时**:
   ```bash
   touch src/smoothing/CatmullRom.ts
   # → 停下！先阅读本 Skill
   ```

2. **实现以下功能时**:
   - Catmull-Rom 样条曲线
   - 开放路径平滑
   - 闭合路径平滑
   - 切线计算

3. **遇到以下问题时**:
   - Fill 和 Lines 边缘不对齐
   - 曲线产生自相交
   - 平滑效果不自然

### 如何使用

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 理解 Centripetal Catmull-Rom 参数化                      │
│    ↓                                                         │
│ 2. 复制/参考切线计算和路径平滑代码                           │
│    ↓                                                         │
│ 3. 创建 src/smoothing/CatmullRom.ts                          │
│    ↓                                                         │
│ 4. 确保 Fill 和 Lines 使用相同平滑函数                       │
│    ↓                                                         │
│ 5. 运行验收测试验证无自相交                                   │
└─────────────────────────────────────────────────────────────┘
```

## 触发条件

当需要实现等值线平滑处理时使用此技能。

## 算法说明

Plotly.js 使用 **Centripetal Catmull-Rom 样条曲线** 进行平滑处理，指数 α = 0.5。

### 为什么选择 Centripetal？

| 类型 | 指数 α | 特点 |
|------|--------|------|
| Uniform | 0 | 最简单，但可能产生尖点和自相交 |
| **Centripetal** | **0.5** | **避免自相交，曲线更平滑** |
| Chordal | 1 | 曲线更"松散" |

## 实现清单

### 1. 参数规格

| 属性 | 值 |
|------|-----|
| 类型 | `number` |
| 最小值 | `0` |
| 最大值 | `1.3` |
| 默认值 | `1` |
| 说明 | `0` 表示无平滑 |

### 2. 切线计算

```typescript
// src/smoothing/CatmullRom.ts

const CatmullRomExp = 0.5; // Centripetal 参数

/**
 * 计算 Catmull-Rom 样条的切线控制点
 */
export function makeTangent(
    prevpt: Point,
    thispt: Point,
    nextpt: Point,
    smoothness: number
): [Point, Point] {
    // 计算与前一点的方向向量
    const d1x = prevpt[0] - thispt[0];
    const d1y = prevpt[1] - thispt[1];

    // 计算与后一点的方向向量
    const d2x = nextpt[0] - thispt[0];
    const d2y = nextpt[1] - thispt[1];

    // 计算距离的指数幂（Centripetal 参数化）
    const d1a = Math.pow(d1x * d1x + d1y * d1y, CatmullRomExp / 2);
    const d2a = Math.pow(d2x * d2x + d2y * d2y, CatmullRomExp / 2);

    // 计算切线方向
    const numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
    const numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;

    // 计算分母
    const denom1 = 3 * d2a * (d1a + d2a);  // 入切线分母
    const denom2 = 3 * d1a * (d1a + d2a);  // 出切线分母

    // 返回两个控制点
    return [
        [thispt[0] + (denom1 && numx / denom1),
         thispt[1] + (denom1 && numy / denom1)],
        [thispt[0] - (denom2 && numx / denom2),
         thispt[1] - (denom2 && numy / denom2)]
    ];
}
```

### 3. 开放路径平滑

```typescript
/**
 * 平滑开放路径（边缘路径）
 */
export function smoothOpen(pts: Point[], smoothness: number): Point[] {
    if (pts.length < 3) {
        return pts; // 少于3点直接返回
    }

    const result: Point[] = [pts[0]];
    const tangents: [Point, Point][] = [];

    // 为每个内部点计算切线
    for (let i = 1; i < pts.length - 1; i++) {
        tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
    }

    // 起始段：二次贝塞尔曲线
    result.push(...quadraticBezier(pts[0], tangents[0][0], pts[1]));

    // 中间段：三次贝塞尔曲线
    for (let i = 2; i < pts.length - 1; i++) {
        const ctrl1 = tangents[i - 2][1];
        const ctrl2 = tangents[i - 1][0];
        result.push(...cubicBezier(pts[i - 1], ctrl1, ctrl2, pts[i]));
    }

    // 结束段：二次贝塞尔曲线
    const lastTangent = tangents[pts.length - 3][1];
    result.push(...quadraticBezier(pts[pts.length - 2], lastTangent, pts[pts.length - 1]));

    return result;
}
```

### 4. 闭合路径平滑

```typescript
/**
 * 平滑闭合路径（内部环形路径）
 */
export function smoothClosed(pts: Point[], smoothness: number): Point[] {
    if (pts.length < 3) {
        return pts;
    }

    const result: Point[] = [];
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
        const ctrl1 = tangents[i - 1][1];
        const ctrl2 = tangents[i][0];
        result.push(...cubicBezier(pts[i - 1], ctrl1, ctrl2, pts[i]));
    }

    // 闭合回到起点
    result.push(...cubicBezier(
        pts[pLast],
        tangents[pLast][1],
        tangents[0][0],
        pts[0]
    ));

    return result;
}
```

### 5. 一致性保证

```typescript
// 关键设计：平滑处理在渲染阶段应用，而非数据阶段

// src/rendering/FillRenderer.ts
export class FillRenderer {
    render(pathinfo: PathInfo[]): void {
        for (const pi of pathinfo) {
            // 使用相同的平滑函数
            const smoothedPaths = pi.edgepaths.map(p => smoothOpen(p, pi.smoothing));
            const smoothedClosed = pi.paths.map(p => smoothClosed(p, pi.smoothing));
            // ...
        }
    }
}

// src/rendering/LineRenderer.ts
export class LineRenderer {
    render(pathinfo: PathInfo[]): void {
        const smoothing = pathinfo[0].smoothing; // 相同参数

        for (const pi of pathinfo) {
            // 使用相同的平滑函数
            const smoothedPaths = pi.edgepaths.map(p => smoothOpen(p, smoothing));
            const smoothedClosed = pi.paths.map(p => smoothClosed(p, smoothing));
            // ...
        }
    }
}
```

## 验收测试

```typescript
// tests/smoothing.test.ts

describe('CatmullRom Smoothing', () => {
    test('no smoothing returns original points', () => {
        const pts = [[0, 0], [1, 1], [2, 0]];
        const result = smoothOpen(pts, 0);
        expect(result).toEqual(pts);
    });

    test('closed path returns to start', () => {
        const pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
        const result = smoothClosed(pts, 1);
        // 最后一点应该接近起点
        expect(distance(result[result.length - 1], pts[0])).toBeLessThan(0.01);
    });

    test('no self-intersection', () => {
        // Centripetal Catmull-Rom 不应该产生自相交
        const pts = [[0, 0], [1, 1], [0, 1], [1, 0]];
        const result = smoothClosed(pts, 1);
        expect(!hasSelfIntersection(result)).toBe(true);
    });

    test('fill and lines have same smoothing', () => {
        const pts = [[0, 0], [1, 1], [2, 0]];
        const fillResult = smoothOpen(pts, 1);
        const lineResult = smoothOpen(pts, 1);
        expect(fillResult).toEqual(lineResult);
    });
});
```

## 常见问题

### Q1: 为什么平滑参数最大是 1.3？

超过 1.3 可能产生过度平滑，导致曲线偏离原始数据点太远，甚至产生环。

### Q2: 如何避免自相交？

使用 Centripetal (α = 0.5) 参数化而不是 Uniform (α = 0)。

### Q3: Fill 和 Lines 如何保持边缘对齐？

1. 使用相同的数据源（原始路径点）
2. 使用相同的平滑参数
3. 使用相同的平滑函数
4. 在渲染阶段应用平滑，而非预处理

## 参考文档

- `contour-smoothing.md`
