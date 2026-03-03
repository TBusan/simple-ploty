---
name: contour-coloring-modes
description: 实现等值线四种着色模式 (fill, heatmap, lines, none)
---

# 着色模式实现技能

## 触发条件

当需要实现等值线的填充、热力图、线条、无着色模式时使用。

## 四种模式概述

| 模式 | 实现方式 | 特点 |
|------|---------|------|
| `fill` | SVG path 填充 | 按级别分段着色 |
| `heatmap` | 渐变填充 | 完全连续的颜色 |
| `lines` | SVG path 描边 | 彩色等值线 |
| `none` | SVG path 描边 | 单色线条 |

## 实现步骤

### 步骤 1: 定义颜色映射

```typescript
// src/contour/fill/ColorMapper.ts

export interface ColorScale {
  offset: number;   // 0-1
  color: string;    // 颜色值
}

export class ColorMapper {
  private colorScale: ColorScale[];
  private domain: [number, number];

  constructor(colorScale: ColorScale[], domain: [number, number]) {
    this.colorScale = colorScale;
    this.domain = domain;
  }

  /**
   * 将值映射到颜色
   */
  map(value: number): string {
    const [min, max] = this.domain;
    const t = (value - min) / (max - min);

    // 找到相邻的两个色阶点
    let lower = this.colorScale[0];
    let upper = this.colorScale[this.colorScale.length - 1];

    for (let i = 0; i < this.colorScale.length - 1; i++) {
      if (t >= this.colorScale[i].offset && t <= this.colorScale[i + 1].offset) {
        lower = this.colorScale[i];
        upper = this.colorScale[i + 1];
        break;
      }
    }

    // 线性插值
    const range = upper.offset - lower.offset;
    const factor = range > 0 ? (t - lower.offset) / range : 0;

    return this.interpolateColor(lower.color, upper.color, factor);
  }

  private interpolateColor(c1: string, c2: string, t: number): string {
    const rgb1 = this.parseColor(c1);
    const rgb2 = this.parseColor(c2);
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private parseColor(color: string): { r: number; g: number; b: number } {
    // 解析颜色字符串
    const match = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (match) {
      return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
      };
    }
    return { r: 0, g: 0, b: 0 };
  }
}
```

### 步骤 2: 实现 makeColorMap

```typescript
// src/contour/fill/ColorMapper.ts

export class ColorMapper {
  /**
   * 为等值线创建颜色映射
   * 关键：确保 fill 和 lines 模式范围一致
   */
  static makeContourColorMap(
    colorScale: ColorScale[],
    levels: { start: number; end: number; size: number },
    coloring: 'fill' | 'lines',
    zRange: [number, number]
  ): ColorMapper {
    const { start, end, size } = levels;
    const nc = Math.floor((end - start) / size) + 1;

    // extra 参数确保范围一致性
    // fill 模式: extra = 1
    // lines 模式: extra = 0
    const extra = coloring === 'lines' ? 0 : 1;

    // 构建映射域
    const domain: number[] = [];
    const colors: string[] = [];

    for (let i = 0; i < colorScale.length; i++) {
      const si = colorScale[i];
      // 关键公式
      domain.push((si.offset * (nc + extra - 1) - extra / 2) * size + start);
      colors.push(si.color);
    }

    // 扩展到 z 范围
    if (domain[0] > zRange[0]) {
      domain.unshift(zRange[0]);
      colors.unshift(colors[0]);
    }
    if (domain[domain.length - 1] < zRange[1]) {
      domain.push(zRange[1]);
      colors.push(colors[colors.length - 1]);
    }

    return new ColorMapper(
      domain.map((d, i) => ({ offset: d, color: colors[i] })),
      zRange
    );
  }
}
```

### 步骤 3: 实现 Fill 模式

```typescript
// src/contour/fill/FillRenderer.ts

export class FillRenderer {
  /**
   * 渲染填充模式
   */
  render(
    zrender: typeof import('zrender'),
    group: zrender.Group,
    pathInfo: PathInfo[],
    perimeter: Perimeter,
    colorMapper: ColorMapper,
    contourSize: number
  ): void {
    // 绘制背景（第一个 level 之前的区域）
    const bgColor = colorMapper.map(pathInfo[0].level - contourSize / 2);
    const bgPath = new zrender.Path({
      shape: {
        pathData: BoundaryHandler.boundaryPath(perimeter)
      },
      style: {
        fill: bgColor,
        stroke: null
      }
    });
    group.add(bgPath);

    // 绘制每个级别的填充
    for (const pi of pathInfo) {
      const fillPath = BoundaryHandler.buildFillPath(pi, perimeter, z);
      if (!fillPath) continue;

      // 填充颜色对应 level + 0.5 * size（区域中心）
      const fillColor = colorMapper.map(pi.level + contourSize / 2);

      const path = new zrender.Path({
        shape: { pathData: fillPath },
        style: {
          fill: fillColor,
          stroke: null
        },
        zlevel: 1
      });
      group.add(path);
    }
  }
}
```

### 步骤 4: 实现 Heatmap 模式

```typescript
// src/contour/fill/FillRenderer.ts

export class FillRenderer {
  /**
   * 渲染热力图模式
   * 使用 Canvas 生成渐变图像
   */
  renderHeatmap(
    zrender: typeof import('zrender'),
    group: zrender.Group,
    data: GridData,
    colorMapper: ColorMapper,
    width: number,
    height: number
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);

    // 填充像素
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        // 双线性插值获取值
        const value = this.bilinearInterpolate(data, i / width, j / height);
        const color = colorMapper.map(value);
        const rgb = this.parseColor(color);

        const idx = (j * width + i) * 4;
        imageData.data[idx] = rgb.r;
        imageData.data[idx + 1] = rgb.g;
        imageData.data[idx + 2] = rgb.b;
        imageData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 创建图像元素
    const image = new zrender.Image({
      style: {
        image: canvas.toDataURL('image/png'),
        x: 0,
        y: 0,
        width,
        height
      }
    });
    group.add(image);
  }

  private bilinearInterpolate(data: GridData, x: number, y: number): number {
    // 双线性插值实现
    const { z, x: xArr, y: yArr } = data;
    const xi = x * (xArr.length - 1);
    const yi = y * (yArr.length - 1);
    const x0 = Math.floor(xi);
    const y0 = Math.floor(yi);
    const x1 = Math.min(x0 + 1, xArr.length - 1);
    const y1 = Math.min(y0 + 1, yArr.length - 1);
    const xf = xi - x0;
    const yf = yi - y0;

    const v00 = z[y0][x0];
    const v10 = z[y0][x1];
    const v01 = z[y1][x0];
    const v11 = z[y1][x1];

    const v0 = v00 + (v10 - v00) * xf;
    const v1 = v01 + (v11 - v01) * xf;

    return v0 + (v1 - v0) * yf;
  }
}
```

### 步骤 5: 实现 Lines 模式

```typescript
// src/contour/line/LineRenderer.ts

export class LineRenderer {
  /**
   * 渲染线条模式
   */
  render(
    zrender: typeof import('zrender'),
    group: zrender.Group,
    pathInfo: PathInfo[],
    colorMapper: ColorMapper | null,
    lineStyle: LineStyle
  ): void {
    for (const pi of pathInfo) {
      // 线条颜色
      const getColor = colorMapper
        ? () => colorMapper.map(pi.level)
        : () => lineStyle.color || '#000';

      // 绘制边缘路径
      for (const edgePath of pi.edgePaths) {
        const path = new zrender.Path({
          shape: {
            pathData: this.pointsToPath(edgePath, false)
          },
          style: {
            fill: null,
            stroke: getColor(),
            lineWidth: lineStyle.width || 1,
            lineDash: lineStyle.dash || null
          }
        });
        group.add(path);
      }

      // 绘制闭合路径
      for (const closedPath of pi.paths) {
        const path = new zrender.Path({
          shape: {
            pathData: this.pointsToPath(closedPath, true)
          },
          style: {
            fill: null,
            stroke: getColor(),
            lineWidth: lineStyle.width || 1,
            lineDash: lineStyle.dash || null
          }
        });
        group.add(path);
      }
    }
  }

  private pointsToPath(points: Point[], closed: boolean): string {
    if (points.length < 2) return '';

    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += `L${points[i].x},${points[i].y}`;
    }
    if (closed) d += 'Z';

    return d;
  }
}
```

## 验收清单

- [ ] fill 模式正确渲染
- [ ] heatmap 模式双线性插值正确
- [ ] lines 模式颜色映射正确
- [ ] none 模式使用单色
- [ ] fill + lines 范围一致

## 参考资料

- [contour-coloring-modes.md](../../word/contour-coloring-modes.md)
- [contour-coloring.md](../../word/contour-coloring.md)
