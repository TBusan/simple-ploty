name: implement-labels
description: Use when implementing contour labels with cost function optimization for placement
---

# 标签系统实现技能

## 🎯 对应开发阶段

- **Phase 8**: 标签系统

## 🚀 何时使用本技能

### 调用时机

在以下情况下，**必须先阅读本 Skill 文档**：

1. **创建文件时**:
   ```bash
   touch src/rendering/LabelRenderer.ts
   # → 停下！先阅读本 Skill
   ```

2. **实现以下功能时**:
   - 标签位置优化算法
   - 成本函数计算
   - 标签格式化
   - 标签数量控制

3. **遇到以下问题时**:
   - 标签重叠
   - 标签太靠近边缘
   - 标签角度不合适
   - 标签数量过多或过少

### 如何使用

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 理解成本函数的三个组成部分                                │
│    ↓                                                         │
│ 2. 复制/参考位置优化搜索算法                                 │
│    ↓                                                         │
│ 3. 创建 src/rendering/LabelRenderer.ts                       │
│    ↓                                                         │
│ 4. 实现标签裁剪（线条在标签处断开）                          │
│    ↓                                                         │
│ 5. 运行验收测试验证无重叠                                    │
└─────────────────────────────────────────────────────────────┘
```

## 触发条件

当需要实现等值线标签时使用此技能。

## 配置选项

```typescript
interface LabelOptions {
    showlabels: boolean;
    labelfont: {
        family: string;
        size: number;
        color: string;
    };
    labelformat: string; // e.g., '.1f'
}
```

## 实现清单

### 1. 常量配置

```typescript
// src/rendering/LabelConstants.ts

export const LABEL_CONSTANTS = {
    // 每条等值线的标准长度（相对于对角线）
    LABELDISTANCE: 2,

    // 超过此数量的等值线后，增加标签密度
    LABELINCREASE: 10,

    // 最小路径长度（相对于标签长度）才显示标签
    LABELMIN: 3,

    // 单条等值线上最多标签数
    LABELMAX: 10,

    // 标签位置优化器参数
    LABELOPTIMIZER: {
        EDGECOST: 1,           // 边缘接近惩罚权重
        ANGLECOST: 1,          // 角度偏离惩罚权重
        NEIGHBORCOST: 5,       // 邻近标签惩罚权重
        SAMELEVELFACTOR: 10,   // 同级别标签额外惩罚因子
        SAMELEVELDISTANCE: 5,  // 同级别标签最小距离
        MAXCOST: 100,          // 最大允许成本
        INITIALSEARCHPOINTS: 10, // 初始搜索点数
        ITERATIONS: 5          // 二分搜索迭代次数
    }
};
```

### 2. 成本函数

```typescript
// src/rendering/LabelOptimizer.ts

/**
 * 计算标签位置的成本
 */
export function locationCost(
    loc: LabelLocation,
    textOpts: TextOptions,
    labelData: LabelData[],
    bounds: Bounds
): number {
    const { x, y, theta } = loc;
    const halfWidth = textOpts.width / 2;
    const halfHeight = textOpts.height / 2;

    const dx = Math.cos(theta) * halfWidth;
    const dy = Math.sin(theta) * halfWidth;

    // 1. 边缘接近成本
    const normX = ((x > bounds.center) ? (bounds.right - x) : (x - bounds.left)) /
        (dx + Math.abs(Math.sin(theta) * halfHeight));
    const normY = ((y > bounds.middle) ? (bounds.bottom - y) : (y - bounds.top)) /
        (Math.abs(dy) + Math.cos(theta) * halfHeight);

    // 太靠近边缘，成本无限大
    if (normX < 1 || normY < 1) return Infinity;

    let cost = LABEL_CONSTANTS.LABELOPTIMIZER.EDGECOST *
        (1 / (normX - 1) + 1 / (normY - 1));

    // 2. 角度偏离成本（越水平越好）
    cost += LABEL_CONSTANTS.LABELOPTIMIZER.ANGLECOST * theta * theta;

    // 3. 邻近标签成本
    const x1 = x - dx;
    const y1 = y - dy;
    const x2 = x + dx;
    const y2 = y + dy;

    for (const label of labelData) {
        const dxd = Math.cos(label.theta) * label.width / 2;
        const dyd = Math.sin(label.theta) * label.width / 2;

        // 计算两个标签线段之间的距离
        const dist = segmentDistance(
            x1, y1, x2, y2,
            label.x - dxd, label.y - dyd,
            label.x + dxd, label.y + dyd
        ) * 2 / (textOpts.height + label.height);

        // 同级别标签需要更大距离
        const sameLevel = label.level === textOpts.level;
        const distOffset = sameLevel ?
            LABEL_CONSTANTS.LABELOPTIMIZER.SAMELEVELDISTANCE : 1;

        // 太近则成本无限
        if (dist <= distOffset) return Infinity;

        // 距离惩罚
        const distFactor = LABEL_CONSTANTS.LABELOPTIMIZER.NEIGHBORCOST *
            (sameLevel ? LABEL_CONSTANTS.LABELOPTIMIZER.SAMELEVELFACTOR : 1);
        cost += distFactor / (dist - distOffset);
    }

    return cost;
}
```

### 3. 位置优化搜索

```typescript
// src/rendering/LabelOptimizer.ts

/**
 * 搜索最佳标签位置
 */
export function findBestTextLocation(
    path: Path,
    pathBounds: PathBounds,
    textOpts: TextOptions,
    labelData: LabelData[],
    plotBounds: Bounds
): LabelLocation | null {
    const { INITIALSEARCHPOINTS, ITERATIONS, MAXCOST } =
        LABEL_CONSTANTS.LABELOPTIMIZER;

    let cost = Infinity;
    let loc: LabelLocation | null = null;

    // 确定搜索范围
    let p0: number, dp: number, pMax: number, pMin = 0;

    if (pathBounds.isClosed) {
        // 闭合路径：从路径中间开始
        dp = pathBounds.len / INITIALSEARCHPOINTS;
        p0 = pathBounds.min + dp / 2;
        pMax = pathBounds.max;
    } else {
        // 开放路径：留出标签宽度的边距
        dp = (pathBounds.len - textOpts.width) / (INITIALSEARCHPOINTS + 1);
        p0 = pathBounds.min + dp + textOpts.width / 2;
        pMax = pathBounds.max - (dp + textOpts.width) / 2;
    }

    // 多次迭代搜索
    for (let j = 0; j < ITERATIONS; j++) {
        for (let p = p0; p < pMax; p += dp) {
            const newLocation = getTextLocation(path, pathBounds.total, p, textOpts.width);
            const newCost = locationCost(newLocation, textOpts, labelData, plotBounds);

            if (newCost < cost) {
                cost = newCost;
                loc = newLocation;
                pMin = p;
            }
        }

        // 成本太高，放弃
        if (cost > MAXCOST * 2) break;

        // 二分搜索：缩小搜索范围
        if (j) dp /= 2;
        p0 = pMin - dp / 2;
        pMax = p0 + dp * 1.5;
    }

    // 只有成本低于阈值才返回位置
    if (cost <= MAXCOST) return loc;
    return null;
}
```

### 4. 成本函数图解

```
成本 = 边缘成本 + 角度成本 + 邻居成本

1. 边缘成本: 越靠近边缘，成本越高
   ┌────────────────────────────────┐
   │ ████                           │  ← 高成本区域
   │     ┌──────────────────┐       │
   │     │                  │       │  ← 低成本区域
   │     │       ●          │       │     最佳位置
   │     │                  │       │
   │     └──────────────────┘       │
   │                           ████ │  ← 高成本区域
   └────────────────────────────────┘

2. 角度成本: 越接近水平，成本越低
   ╱╱╱╱  高成本           低成本  ──────
   ╱╱╱╱  ↗ θ=45°                  θ=0°

3. 邻居成本: 越接近已有标签，成本越高
   ─────●─────●─────●─────
        │     │     │
       高    低     高
```

### 5. 标签数量控制

```typescript
// 计算标准长度
const plotDiagonal = Math.sqrt(xLen * xLen + yLen * yLen);
const normLength = LABEL_CONSTANTS.LABELDISTANCE * plotDiagonal /
    Math.max(1, pathinfo.length / LABEL_CONSTANTS.LABELINCREASE);

// 最大标签数
const maxLabels = Math.min(
    Math.ceil(pathBounds.len / normLength),
    LABEL_CONSTANTS.LABELMAX  // 最多 10 个
);

// 最小路径长度检查
if (pathBounds.len < (textOpts.width + textOpts.height) * LABEL_CONSTANTS.LABELMIN) {
    return; // 路径太短，不显示标签
}
```

## 验收测试

```typescript
// tests/labels.test.ts

describe('LabelOptimizer', () => {
    test('labels avoid edges', () => {
        const bounds = { left: 0, right: 100, top: 0, bottom: 100 };
        const loc = { x: 5, y: 50, theta: 0 };
        const cost = locationCost(loc, textOpts, [], bounds);
        expect(cost).toBe(Infinity); // 太靠近边缘
    });

    test('labels avoid overlap', () => {
        const existingLabels = [{ x: 50, y: 50, theta: 0, width: 20, height: 10 }];
        const newLoc = { x: 55, y: 50, theta: 0 };
        const cost = locationCost(newLoc, textOpts, existingLabels, bounds);
        expect(cost).toBe(Infinity); // 重叠
    });

    test('prefers horizontal orientation', () => {
        const horizontalCost = locationCost({ x: 50, y: 50, theta: 0 }, ...);
        const angledCost = locationCost({ x: 50, y: 50, theta: Math.PI / 4 }, ...);
        expect(horizontalCost).toBeLessThan(angledCost);
    });
});
```

## 常见问题

### Q1: 如何避免标签重叠？

通过成本函数的邻居成本分量，当标签距离小于阈值时返回无限大成本。

### Q2: 为什么同级别标签需要更大距离？

同一等值线级别的标签通常包含相同的文本，过于接近会造成视觉混乱。

### Q3: 标签数量如何控制？

通过 `LABELMAX` 限制单条等值线最多 10 个标签，同时根据等值线长度和数量动态调整标签密度。

## 参考文档

- `contour-labels.md`
