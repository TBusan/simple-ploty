name: implement-coloring-modes
description: Use when implementing contour coloring modes (fill, heatmap, lines, none) - ensures consistent color mapping between fill and lines
---

# 着色模式实现技能

## 🎯 对应开发阶段

- **Phase 5**: 着色模式实现
- **Phase 6**: 颜色映射与色阶

## 🚀 何时使用本技能

### 调用时机

在以下情况下，**必须先阅读本 Skill 文档**：

1. **创建文件时**:
   ```bash
   # 当你开始创建以下文件时
   touch src/rendering/FillRenderer.ts
   touch src/rendering/LineRenderer.ts
   touch src/rendering/HeatmapRenderer.ts
   touch src/coloring/ColorMap.ts
   # → 停下！先阅读本 Skill
   ```

2. **实现以下功能时**:
   - 填充模式 (coloring: 'fill')
   - 热力图模式 (coloring: 'heatmap')
   - 线条模式 (coloring: 'lines')
   - 无着色模式 (coloring: 'none')
   - 颜色映射函数

3. **遇到以下问题时**:
   - Fill 和 Lines 颜色不一致
   - 颜色条与等值线不匹配
   - 不确定如何实现双线性插值

### 如何使用

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 确定你要实现的着色模式                                    │
│    ↓                                                         │
│ 2. 阅读对应模式的实现部分                                    │
│    ↓                                                         │
│ 3. 参考"颜色一致性"部分确保正确                              │
│    ↓                                                         │
│ 4. 运行验收测试验证实现                                      │
└─────────────────────────────────────────────────────────────┘
```

## 触发条件

当需要实现等值线的着色模式时使用此技能。

## 四种着色模式

| 模式 | 说明 | 实现方式 |
|------|------|----------|
| `fill` | 填充等值线之间的区域 | Shape 填充 |
| `heatmap` | 像热力图一样连续着色 | Canvas 纹理 |
| `lines` | 只绘制彩色线条 | Line 材质 |
| `none` | 不着色（使用单一颜色） | Line 材质 |

## 实现清单

### 1. 颜色映射函数

```typescript
// src/coloring/ColorMap.ts

export function makeColorMap(trace: ContourTrace): (value: number) => Color {
    const contours = trace.contours;
    const start = contours.start;
    const end = endPlus(contours);
    const cs = contours.size || 1;
    const nc = Math.floor((end - start) / cs) + 1;

    // 关键：extra 参数确保 fill 和 lines 使用一致的范围
    const extra = contours.coloring === 'lines' ? 0 : 1;

    const domain: number[] = [];
    const range: Color[] = [];

    for (let i = 0; i < len; i++) {
        const si = colorscale[i];
        // 公式确保 fill 和 lines 映射到相同范围
        domain[i] = (si[0] * (nc + extra - 1) - (extra / 2)) * cs + start;
        range[i] = si[1];
    }

    // 扩展到 z 范围
    if (domain[0] > zmin0) {
        domain.unshift(zmin0);
        range.unshift(range[0]);
    }
    if (domain[domain.length - 1] < zmax0) {
        domain.push(zmax0);
        range.push(range[range.length - 1]);
    }

    return createColorScaleFunc({ domain, range });
}
```

### 2. Fill 模式

```typescript
// src/rendering/FillRenderer.ts

export class FillRenderer {
    render(pathinfo: PathInfo[], colorMap: ColorMap): void {
        for (const pi of pathinfo) {
            // 填充颜色偏移半个间隔（区域中心）
            const color = colorMap(pi.level + 0.5 * cs);

            // 创建 Three.js Shape
            const shape = this.createShape(pi);
            const geometry = new ShapeGeometry(shape);
            const material = new MeshBasicMaterial({
                color,
                side: DoubleSide
            });

            this.meshes.push(new Mesh(geometry, material));
        }
    }
}
```

### 3. Heatmap 模式

```typescript
// src/rendering/HeatmapRenderer.ts

export class HeatmapRenderer {
    render(z: number[][], colorMap: ColorMap): void {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(this.width, this.height);
        const pixels = imageData.data;

        // 双线性插值
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                const value = this.interpolateValue(z, i, j);
                const color = colorMap(value);

                const pxIndex = (j * this.width + i) * 4;
                pixels[pxIndex] = color.r * 255;
                pixels[pxIndex + 1] = color.g * 255;
                pixels[pxIndex + 2] = color.b * 255;
                pixels[pxIndex + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // 创建 Three.js 纹理
        const texture = new CanvasTexture(canvas);
        // ...
    }
}
```

### 4. Lines 模式

```typescript
// src/rendering/LineRenderer.ts

export class LineRenderer {
    render(pathinfo: PathInfo[], colorMap: ColorMap | null, lineColor: Color): void {
        for (const pi of pathinfo) {
            // 线条颜色精确对应 level
            const color = colorMap ? colorMap(pi.level) : lineColor;

            // 创建 Three.js 线条
            const points = this.createPoints(pi);
            const geometry = new BufferGeometry().setFromPoints(points);
            const material = new LineBasicMaterial({ color });

            this.lines.push(new Line(geometry, material));
        }
    }
}
```

### 5. 范围一致性

```
Lines 模式 (extra=0):
    domain[0] = (0 * nc - 0) * cs + start = start
    domain[n] = (1 * nc - 0) * cs + start = end

Fill 模式 (extra=1):
    domain[0] = (0 * nc - 0.5) * cs + start = start - 0.5*cs
    domain[n] = (1 * nc - 0.5) * cs + start = end + 0.5*cs

结果:
    - Lines: 颜色映射到 [start, end]
    - Fill: 颜色映射到 [start - 0.5*cs, end + 0.5*cs]
    - 两者在 [start, end] 范围内完全一致！
```

### 6. 验收测试

```typescript
// tests/coloring-modes.test.ts

describe('ColoringModes', () => {
    test('fill color is centered between levels', () => {
        const trace = createTrace({
            contours: { start: 0, end: 10, size: 2, coloring: 'fill' }
        });
        const colorMap = makeColorMap(trace);

        // 填充颜色应该是 level + 0.5 * size
        const level = 4;
        const fillColor = colorMap(level + 1); // 4 + 0.5 * 2 = 5
    });

    test('lines color matches exact level', () => {
        const trace = createTrace({
            contours: { start: 0, end: 10, size: 2, coloring: 'lines' }
        });
        const colorMap = makeColorMap(trace);

        const level = 4;
        const lineColor = colorMap(level);
    });

    test('fill and lines share same color range', () => {
        const fillTrace = createTrace({ contours: { coloring: 'fill' } });
        const linesTrace = createTrace({ contours: { coloring: 'lines' } });

        const fillColorMap = makeColorMap(fillTrace);
        const lineColorMap = makeColorMap(linesTrace);

        // 在相同 level 上颜色应该一致
        const level = 5;
        expect(fillColorMap(level)).toEqual(lineColorMap(level));
    });
});
```

## 常见问题

### Q1: 为什么 Fill 颜色要偏移半个间隔？

因为填充区域位于两个相邻等值线之间，使用中心值可以更准确地表示该区域的颜色。

### Q2: Heatmap 模式为什么使用 Canvas？

Three.js 直接渲染大量颜色渐变效率较低，使用 Canvas 预渲染后作为纹理更高效。

### Q3: 如何同时显示 Fill 和 Lines？

```typescript
const contour = new Contour(scene, {
    contours: {
        coloring: 'fill',
        showlines: true
    },
    line: {
        color: 'black', // 覆盖色阶颜色
        width: 1
    }
});
```

## 参考文档

- `contour-coloring-modes.md`
- `contour-coloring.md`
