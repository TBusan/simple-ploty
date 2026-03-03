---
name: colorbar-implementation
description: 实现等值线颜色条 (ColorBar)
---

# ColorBar 实现技能

## 触发条件

当需要实现等值线的颜色条组件时使用。

## 实现步骤

### 步骤 1: 定义 ColorBar 配置

```typescript
// src/contour/colorbar/ColorBar.ts

export interface ColorBarOption {
  show: boolean;
  title: {
    text: string;
    side: 'top' | 'right' | 'bottom';
    font: string;
  };
  orientation: 'v' | 'h';
  x: number;
  y: number;
  xanchor: 'left' | 'center' | 'right';
  yanchor: 'top' | 'middle' | 'bottom';
  len: number;
  lenmode: 'fraction' | 'pixels';
  thickness: number;
  thicknessmode: 'fraction' | 'pixels';
  ticks: 'outside' | 'inside' | '';
  ticklen: number;
  tickwidth: number;
  tickcolor: string;
  showticklabels: boolean;
  tickfont: { size: number; color: string };
  tickformat: string;
  nticks: number;
  outlinecolor: string;
  outlinewidth: number;
  bordercolor: string;
  borderwidth: number;
  bgcolor: string;
}
```

### 步骤 2: 实现模拟坐标轴

```typescript
// src/contour/colorbar/ColorBarAxis.ts

export class ColorBarAxis {
  private range: [number, number];
  private length: number;
  private tickMode: 'auto' | 'linear' | 'array';
  private tick0: number | null;
  private dtick: number | null;
  private nticks: number;

  constructor(range: [number, number], length: number, option: Partial<ColorBarOption>) {
    this.range = range;
    this.length = length;
    this.tickMode = 'auto';
    this.tick0 = null;
    this.dtick = null;
    this.nticks = option.nticks || 5;
  }

  /**
   * 计算刻度位置
   */
  calcTicks(): TickValue[] {
    const [min, max] = this.range;

    if (this.tickMode === 'auto') {
      // 自动计算刻度
      const tickCount = Math.min(this.nticks, Math.max(4, this.length / 50));
      const approxInterval = (max - min) / tickCount;

      // 使用 1, 2, 5 的倍数
      const magnitude = Math.pow(10, Math.floor(Math.log10(approxInterval)));
      const normalized = approxInterval / magnitude;

      let interval: number;
      if (normalized < 1.5) interval = magnitude;
      else if (normalized < 3) interval = 2 * magnitude;
      else if (normalized < 7) interval = 5 * magnitude;
      else interval = 10 * magnitude;

      this.dtick = interval;
      this.tick0 = Math.ceil(min / interval) * interval;
    }

    const ticks: TickValue[] = [];
    const tick0 = this.tick0 ?? this.range[0];
    const dtick = this.dtick ?? (this.range[1] - this.range[0]) / 5;

    for (let v = tick0; v <= max; v += dtick) {
      if (v >= min) {
        ticks.push({
          value: v,
          position: this.valueToPixel(v),
          label: this.formatTick(v)
        });
      }
    }

    return ticks;
  }

  /**
   * 值到像素位置
   */
  valueToPixel(value: number): number {
    const [min, max] = this.range;
    return (value - min) / (max - min) * this.length;
  }

  /**
   * 像素位置到值
   */
  pixelToValue(pixel: number): number {
    const [min, max] = this.range;
    return min + pixel / this.length * (max - min);
  }

  private formatTick(value: number): string {
    if (Math.abs(value) < 0.0001 || Math.abs(value) >= 10000) {
      return value.toExponential(1);
    }
    return value.toFixed(Math.max(0, -Math.floor(Math.log10(this.dtick || 1))));
  }
}
```

### 步骤 3: 计算填充级别

```typescript
// src/contour/colorbar/ColorBar.ts

export class ColorBar {
  /**
   * 计算颜色条的填充级别
   */
  calcLevels(
    zRange: [number, number],
    contourLevels: { start: number; end: number; size: number } | null,
    useGradient: boolean
  ): { fill: number[]; line: number[] } {
    const lineLevels: number[] = [];
    const fillLevels: number[] = [];

    if (useGradient) {
      // 渐变模式：单个填充
      fillLevels.push(0);
    } else if (contourLevels) {
      const { start, end, size } = contourLevels;
      const margin = size / 100;
      const zr0 = 1.001 * zRange[0] - 0.001 * zRange[1];
      const zr1 = 1.001 * zRange[1] - 0.001 * zRange[0];

      // 线条级别
      for (let l = start; l <= end + margin; l += size) {
        if (l > zr0 && l < zr1) {
          lineLevels.push(l);
        }
      }

      // 填充级别（偏移半个间隔）
      for (let l = start - size / 2; l <= end + size / 2 + margin; l += size) {
        if (l > zRange[0] && l < zRange[1]) {
          fillLevels.push(l);
        }
      }
    }

    return { fill: fillLevels, line: lineLevels };
  }
}
```

### 步骤 4: 绑制 ColorBar

```typescript
// src/contour/colorbar/ColorBar.ts

export class ColorBarRenderer {
  render(
    zrender: typeof import('zrender'),
    container: zrender.Group,
    option: ColorBarOption,
    colorMapper: ColorMapper,
    zRange: [number, number],
    plotSize: { width: number; height: number }
  ): void {
    const isVertical = option.orientation === 'v';

    // 计算尺寸
    const thickness = option.thicknessmode === 'fraction'
      ? option.thickness * (isVertical ? plotSize.width : plotSize.height)
      : option.thickness;
    const len = option.lenmode === 'fraction'
      ? option.len * (isVertical ? plotSize.height : plotSize.width)
      : option.len;

    // 计算位置
    const x = option.x * plotSize.width;
    const y = (1 - option.y) * plotSize.height;

    const group = new zrender.Group();

    // 1. 绑制背景
    const bg = new zrender.Rect({
      shape: {
        x: x - thickness / 2 - option.borderwidth,
        y: y,
        width: thickness + option.borderwidth * 2,
        height: len
      },
      style: {
        fill: option.bgcolor,
        stroke: option.bordercolor,
        lineWidth: option.borderwidth
      }
    });
    group.add(bg);

    // 2. 绑制填充矩形
    const axis = new ColorBarAxis(zRange, len, option);
    const levels = this.calcLevels(zRange, null, true);
    const ticks = axis.calcTicks();

    for (let i = 0; i < ticks.length - 1; i++) {
      const tick0 = ticks[i];
      const tick1 = ticks[i + 1];
      const midValue = (tick0.value + tick1.value) / 2;
      const color = colorMapper.map(midValue);

      const rect = new zrender.Rect({
        shape: {
          x: x - thickness / 2,
          y: y + tick0.position,
          width: thickness,
          height: tick1.position - tick0.position
        },
        style: {
          fill: color
        }
      });
      group.add(rect);
    }

    // 3. 绑制轮廓
    const outline = new zrender.Rect({
      shape: {
        x: x - thickness / 2,
        y: y,
        width: thickness,
        height: len
      },
      style: {
        fill: null,
        stroke: option.outlinecolor,
        lineWidth: option.outlinewidth
      }
    });
    group.add(outline);

    // 4. 绑制刻度
    for (const tick of ticks) {
      const tickY = y + tick.position;

      // 刻度线
      const line = new zrender.Line({
        shape: {
          x1: x + thickness / 2,
          y1: tickY,
          x2: x + thickness / 2 + (option.ticks === 'outside' ? option.ticklen : -option.ticklen),
          y2: tickY
        },
        style: {
          stroke: option.tickcolor,
          lineWidth: option.tickwidth
        }
      });
      group.add(line);

      // 刻度标签
      if (option.showticklabels) {
        const label = new zrender.Text({
          style: {
            text: tick.label,
            font: `${option.tickfont.size}px sans-serif`,
            fill: option.tickfont.color,
            textAlign: 'left',
            textVerticalAlign: 'middle'
          },
          position: [x + thickness / 2 + option.ticklen + 5, tickY]
        });
        group.add(label);
      }
    }

    // 5. 绑制标题
    const title = new zrender.Text({
      style: {
        text: option.title.text,
        font: option.title.font,
        fill: '#333',
        textAlign: 'center'
      },
      position: [x + thickness / 2 + option.ticklen + 30, y + len / 2],
      rotation: option.title.side === 'right' ? -Math.PI / 2 : 0
    });
    group.add(title);

    container.add(group);
  }
}
```

## 验收清单

- [ ] 垂直/水平方向正确
- [ ] 刻度自动计算
- [ ] 填充颜色正确映射
- [ ] 标题位置正确
- [ ] 边距自动调整

## 参考资料

- [colorbar-implementation.md](../../word/colorbar-implementation.md)
