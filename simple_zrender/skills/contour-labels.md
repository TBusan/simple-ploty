---
name: contour-labels
description: 实现等值线标签放置算法
---

# 标签放置技能

## 触发条件

当需要实现等值线标签的智能放置时使用。

## 实现步骤

### 步骤 1: 定义标签配置

```typescript
// src/contour/label/LabelPlacer.ts

export interface LabelOption {
  show: boolean;
  font: string;
  fontSize: number;
  color: string;
  format?: (value: number) => string;
}

export interface LabelPosition {
  x: number;
  y: number;
  rotation: number;
  text: string;
  level: number;
}
```

### 步骤 2: 实现成本函数

```typescript
// src/contour/label/CostFunction.ts

export class CostFunction {
  private bounds: BoundingBox;
  private existingLabels: LabelPosition[];
  private constants = {
    EDGE_COST: 1,
    ANGLE_COST: 1,
    NEIGHBOR_COST: 5,
    SAME_LEVEL_FACTOR: 10,
    SAME_LEVEL_DISTANCE: 5,
    MAX_COST: 100
  };

  constructor(bounds: BoundingBox, existingLabels: LabelPosition[] = []) {
    this.bounds = bounds;
    this.existingLabels = existingLabels;
  }

  /**
   * 计算标签位置的成本
   */
  calculate(loc: LabelPosition, labelHeight: number, labelWidth: number): number {
    const { x, y, rotation } = loc;
    const halfWidth = labelWidth / 2;
    const halfHeight = labelHeight / 2;

    const dx = Math.cos(rotation) * halfWidth;
    const dy = Math.sin(rotation) * halfWidth;

    // 1. 边缘成本
    const normX = (x > this.bounds.centerX
      ? this.bounds.right - x
      : x - this.bounds.left) / (dx + Math.abs(Math.sin(rotation) * halfHeight));
    const normY = (y > this.bounds.centerY
      ? this.bounds.bottom - y
      : y - this.bounds.top) / (Math.abs(dy) + Math.cos(rotation) * halfHeight);

    if (normX < 1 || normY < 1) return Infinity;

    let cost = this.constants.EDGE_COST * (1 / (normX - 1) + 1 / (normY - 1));

    // 2. 角度成本（偏向水平）
    cost += this.constants.ANGLE_COST * rotation * rotation;

    // 3. 邻居成本
    const x1 = x - dx, y1 = y - dy;
    const x2 = x + dx, y2 = y + dy;

    for (const existing of this.existingLabels) {
      const dxd = Math.cos(existing.rotation) * existing.width / 2;
      const dyd = Math.sin(existing.rotation) * existing.width / 2;

      const dist = this.segmentDistance(
        x1, y1, x2, y2,
        existing.x - dxd, existing.y - dyd,
        existing.x + dxd, existing.y + dyd
      ) * 2 / (labelHeight + existing.height);

      const sameLevel = existing.level === loc.level;
      const distOffset = sameLevel ? this.constants.SAME_LEVEL_DISTANCE : 1;

      if (dist <= distOffset) return Infinity;

      const distFactor = this.constants.NEIGHBOR_COST *
        (sameLevel ? this.constants.SAME_LEVEL_FACTOR : 1);

      cost += distFactor / (dist - distOffset);
    }

    return cost;
  }

  private segmentDistance(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): number {
    // 计算两条线段之间的最短距离
    // 简化实现，实际需要完整算法
    const d1 = this.pointToSegmentDistance(x1, y1, x3, y3, x4, y4);
    const d2 = this.pointToSegmentDistance(x2, y2, x3, y3, x4, y4);
    const d3 = this.pointToSegmentDistance(x3, y3, x1, y1, x2, y2);
    const d4 = this.pointToSegmentDistance(x4, y4, x1, y1, x2, y2);
    return Math.min(d1, d2, d3, d4);
  }

  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number, x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
  }
}
```

### 步骤 3: 实现标签放置

```typescript
// src/contour/label/LabelPlacer.ts

export class LabelPlacer {
  private constants = {
    INITIAL_SEARCH_POINTS: 10,
    ITERATIONS: 5,
    LABEL_DISTANCE: 2,
    LABEL_MIN: 3,
    LABEL_MAX: 10
  };

  /**
   * 为路径寻找最佳标签位置
   */
  findBestLocation(
    path: Point[],
    textWidth: number,
    textHeight: number,
    costFunction: CostFunction,
    isClosed: boolean
  ): LabelPosition | null {
    const pathLength = this.calculatePathLength(path);

    let bestLoc: LabelPosition | null = null;
    let bestCost = Infinity;

    // 初始搜索参数
    let p0: number, pMax: number, dp: number;
    if (isClosed) {
      dp = pathLength / this.constants.INITIAL_SEARCH_POINTS;
      p0 = dp / 2;
      pMax = pathLength;
    } else {
      dp = (pathLength - textWidth) / (this.constants.INITIAL_SEARCH_POINTS + 1);
      p0 = dp + textWidth / 2;
      pMax = pathLength - (dp + textWidth) / 2;
    }

    // 迭代搜索
    for (let iter = 0; iter < this.constants.ITERATIONS; iter++) {
      for (let p = p0; p < pMax; p += dp) {
        const loc = this.getLocationAt(path, p, textWidth);
        if (!loc) continue;

        const cost = costFunction.calculate(loc, textHeight, textWidth);
        if (cost < bestCost) {
          bestCost = cost;
          bestLoc = loc;
        }
      }

      if (bestCost > this.constants.MAX_COST * 2) break;

      // 缩小搜索范围
      if (bestLoc) {
        dp /= 2;
        const bestP = this.getPositionOnPath(path, bestLoc);
        p0 = bestP - dp / 2;
        pMax = bestP + dp * 1.5;
      }
    }

    return bestCost <= this.constants.MAX_COST ? bestLoc : null;
  }

  /**
   * 获取路径上指定位置的坐标和角度
   */
  private getLocationAt(
    path: Point[],
    position: number,
    textWidth: number
  ): LabelPosition | null {
    // 获取路径在 position 处的点和切线角度
    const { point, angle } = this.getPointAndAngle(path, position);
    if (!point) return null;

    return {
      x: point.x,
      y: point.y,
      rotation: angle,
      text: '',
      level: 0
    };
  }

  private calculatePathLength(path: Point[]): number {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private getPointAndAngle(
    path: Point[],
    position: number
  ): { point: Point; angle: number } | null {
    let accumulated = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segmentLength >= position) {
        const t = (position - accumulated) / segmentLength;
        return {
          point: {
            x: path[i - 1].x + dx * t,
            y: path[i - 1].y + dy * t
          },
          angle: Math.atan2(dy, dx)
        };
      }
      accumulated += segmentLength;
    }
    return null;
  }

  private getPositionOnPath(path: Point[], loc: LabelPosition): number {
    let minDist = Infinity;
    let bestPos = 0;
    let accumulated = 0;

    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      // 检查线段上的最近点
      const t = Math.max(0, Math.min(1,
        ((loc.x - path[i - 1].x) * dx + (loc.y - path[i - 1].y) * dy) /
        (dx * dx + dy * dy)
      ));
      const nearestX = path[i - 1].x + t * dx;
      const nearestY = path[i - 1].y + t * dy;
      const dist = Math.sqrt((loc.x - nearestX) ** 2 + (loc.y - nearestY) ** 2);

      if (dist < minDist) {
        minDist = dist;
        bestPos = accumulated + t * segmentLength;
      }

      accumulated += segmentLength;
    }

    return bestPos;
  }
}
```

### 步骤 4: 渲染标签

```typescript
// src/contour/label/LabelPlacer.ts

export class LabelRenderer {
  render(
    zrender: typeof import('zrender'),
    group: zrender.Group,
    labels: LabelPosition[],
    option: LabelOption
  ): void {
    for (const label of labels) {
      const text = new zrender.Text({
        style: {
          text: label.text,
          font: option.font,
          fill: option.color,
          textAlign: 'center',
          textVerticalAlign: 'middle'
        },
        position: [label.x, label.y],
        rotation: label.rotation,
        zlevel: 10
      });
      group.add(text);
    }
  }
}
```

## 验收清单

- [ ] 成本函数正确计算
- [ ] 标签避免边缘
- [ ] 标签偏向水平
- [ ] 标签避免重叠
- [ ] 同级别标签保持距离

## 参考资料

- [contour-labels.md](../../word/contour-labels.md)
