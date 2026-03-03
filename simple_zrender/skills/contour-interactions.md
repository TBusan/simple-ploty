---
name: contour-interactions
description: 实现等值线交互（缩放、平移、悬停）
---

# 等值线交互技能

## 触发条件

当需要实现等值线的缩放、平移、悬停等交互功能时使用。

## 实现步骤

### 步骤 1: 定义交互配置

```typescript
// src/contour/interaction/InteractionHandler.ts

export interface InteractionOption {
  zoom: boolean;
  pan: boolean;
  hover: boolean;
  doubleClickReset: boolean;
  zoomSpeed: number;
}

export interface ViewRange {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
```

### 步骤 2: 实现缩放处理

```typescript
// src/contour/interaction/ZoomHandler.ts

export class ZoomHandler {
  private zrender: typeof import('zrender');
  private chart: zrender.ZRenderType;
  private contourGroup: zrender.Group;
  private option: InteractionOption;
  private viewRange: ViewRange;
  private originalRange: ViewRange;

  constructor(
    zrender: typeof import('zrender'),
    chart: zrender.ZRenderType,
    contourGroup: zrender.Group,
    initialRange: ViewRange,
    option: InteractionOption
  ) {
    this.zrender = zrender;
    this.chart = chart;
    this.contourGroup = contourGroup;
    this.viewRange = { ...initialRange };
    this.originalRange = { ...initialRange };
    this.option = option;

    this.init();
  }

  private init(): void {
    // 鼠标滚轮缩放
    this.chart.on('mousewheel', (e: any) => {
      if (!this.option.zoom) return;

      e.event.preventDefault();

      const wheelDelta = e.wheelDelta;
      const zoom = Math.exp(-Math.min(Math.max(wheelDelta, -20), 20) / 200);

      // 计算鼠标位置作为缩放中心
      const rect = this.chart.painter.getBoundingRect();
      const xFrac = (e.offsetX - rect.x) / rect.width;
      const yFrac = 1 - (e.offsetY - rect.y) / rect.height;

      // 缩放 X 轴
      this.zoomAxis('x', xFrac, zoom);

      // 缩放 Y 轴
      this.zoomAxis('y', yFrac, zoom);

      // 触发重绘
      this.emitRangeChange();
    });

    // 框选缩放
    this.initBoxZoom();
  }

  /**
   * 缩放单个轴
   */
  private zoomAxis(axis: 'x' | 'y', centerFraction: number, zoom: number): void {
    const minKey = axis === 'x' ? 'xMin' : 'yMin';
    const maxKey = axis === 'x' ? 'xMax' : 'yMax';

    const min = this.viewRange[minKey];
    const max = this.viewRange[maxKey];
    const range = max - min;

    const center = min + range * centerFraction;
    const newMin = center + (min - center) * zoom;
    const newMax = center + (max - center) * zoom;

    this.viewRange[minKey] = newMin;
    this.viewRange[maxKey] = newMax;
  }

  private initBoxZoom(): void {
    let isDragging = false;
    let startPoint: { x: number; y: number } | null = null;
    let zoomRect: zrender.Rect | null = null;

    this.chart.on('mousedown', (e: any) => {
      if (!this.option.zoom || e.event.shiftKey) return;
      isDragging = true;
      startPoint = { x: e.offsetX, y: e.offsetY };
    });

    this.chart.on('mousemove', (e: any) => {
      if (!isDragging || !startPoint) return;

      const x = Math.min(startPoint.x, e.offsetX);
      const y = Math.min(startPoint.y, e.offsetY);
      const width = Math.abs(e.offsetX - startPoint.x);
      const height = Math.abs(e.offsetY - startPoint.y);

      if (!zoomRect) {
        zoomRect = new this.zrender.Rect({
          shape: { x, y, width, height },
          style: {
            fill: 'rgba(0,0,0,0.1)',
            stroke: '#333',
            lineWidth: 1,
            lineDash: [4, 4]
          },
          zlevel: 100
        });
        this.contourGroup.add(zoomRect);
      } else {
        zoomRect.attr({
          shape: { x, y, width, height }
        });
      }
    });

    this.chart.on('mouseup', (e: any) => {
      if (!isDragging) return;
      isDragging = false;

      if (zoomRect && startPoint) {
        const rect = this.chart.painter.getBoundingRect();

        // 计算新的范围
        const xFrac1 = (Math.min(startPoint.x, e.offsetX) - rect.x) / rect.width;
        const xFrac2 = (Math.max(startPoint.x, e.offsetX) - rect.x) / rect.width;
        const yFrac1 = 1 - (Math.max(startPoint.y, e.offsetY) - rect.y) / rect.height;
        const yFrac2 = 1 - (Math.min(startPoint.y, e.offsetY) - rect.y) / rect.height;

        const xRange = this.originalRange.xMax - this.originalRange.xMin;
        const yRange = this.originalRange.yMax - this.originalRange.yMin;

        this.viewRange.xMin = this.originalRange.xMin + xFrac1 * xRange;
        this.viewRange.xMax = this.originalRange.xMin + xFrac2 * xRange;
        this.viewRange.yMin = this.originalRange.yMin + yFrac1 * yRange;
        this.viewRange.yMax = this.originalRange.yMin + yFrac2 * yRange;

        this.contourGroup.remove(zoomRect);
        zoomRect = null;

        this.emitRangeChange();
      }

      startPoint = null;
    });
  }

  private emitRangeChange(): void {
    this.chart.trigger('rangeChange', this.viewRange);
  }

  getViewRange(): ViewRange {
    return { ...this.viewRange };
  }

  reset(): void {
    this.viewRange = { ...this.originalRange };
    this.emitRangeChange();
  }
}
```

### 步骤 3: 实现平移处理

```typescript
// src/contour/interaction/PanHandler.ts

export class PanHandler {
  private chart: zrender.ZRenderType;
  private viewRange: ViewRange;
  private originalRange: ViewRange;
  private isDragging = false;
  private lastPoint: { x: number; y: number } | null = null;

  constructor(
    chart: zrender.ZRenderType,
    initialRange: ViewRange
  ) {
    this.chart = chart;
    this.viewRange = { ...initialRange };
    this.originalRange = { ...initialRange };

    this.init();
  }

  private init(): void {
    this.chart.on('mousedown', (e: any) => {
      if (!e.event.shiftKey && !e.event.ctrlKey) return;
      this.isDragging = true;
      this.lastPoint = { x: e.offsetX, y: e.offsetY };

      // 设置拖拽光标
      document.body.style.cursor = 'move';
    });

    this.chart.on('mousemove', (e: any) => {
      if (!this.isDragging || !this.lastPoint) return;

      const rect = this.chart.painter.getBoundingRect();
      const dx = e.offsetX - this.lastPoint.x;
      const dy = e.offsetY - this.lastPoint.y;

      // 转换为数据单位
      const xRange = this.viewRange.xMax - this.viewRange.xMin;
      const yRange = this.viewRange.yMax - this.viewRange.yMin;

      const dataDx = -dx / rect.width * xRange;
      const dataDy = dy / rect.height * yRange;

      this.viewRange.xMin += dataDx;
      this.viewRange.xMax += dataDx;
      this.viewRange.yMin += dataDy;
      this.viewRange.yMax += dataDy;

      this.lastPoint = { x: e.offsetX, y: e.offsetY };

      this.chart.trigger('rangeChange', this.viewRange);
    });

    this.chart.on('mouseup', () => {
      this.isDragging = false;
      this.lastPoint = null;
      document.body.style.cursor = '';
    });

    this.chart.on('mouseleave', () => {
      this.isDragging = false;
      this.lastPoint = null;
      document.body.style.cursor = '';
    });
  }

  getViewRange(): ViewRange {
    return { ...this.viewRange };
  }
}
```

### 步骤 4: 实现悬停处理

```typescript
// src/contour/interaction/HoverHandler.ts

export class HoverHandler {
  private chart: zrender.ZRenderType;
  private contourGroup: zrender.Group;
  private tooltip: HTMLDivElement | null = null;

  constructor(
    chart: zrender.ZRenderType,
    contourGroup: zrender.Group
  ) {
    this.chart = chart;
    this.contourGroup = contourGroup;
    this.init();
  }

  private init(): void {
    // 创建 tooltip 元素
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position: absolute;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(this.tooltip);

    this.chart.on('mousemove', (e: any) => {
      const hit = this.findContourAtPoint(e.offsetX, e.offsetY);
      if (hit) {
        this.showTooltip(e.event.clientX, e.event.clientY, hit);
        this.chart.trigger('hover', hit);
      } else {
        this.hideTooltip();
      }
    });

    this.chart.on('mouseout', () => {
      this.hideTooltip();
    });
  }

  private findContourAtPoint(x: number, y: number): { level: number; x: number; y: number; z: number } | null {
    // 遍历等值线路径，找到最近点
    // 简化实现：使用 ZRender 的元素拾取
    const elements = this.chart.handler.getHoverElement(x, y);
    // ... 实现具体的拾取逻辑
    return null;
  }

  private showTooltip(x: number, y: number, data: { level: number; x: number; y: number; z: number }): void {
    if (!this.tooltip) return;

    this.tooltip.innerHTML = `
      <div>X: ${data.x.toFixed(2)}</div>
      <div>Y: ${data.y.toFixed(2)}</div>
      <div>Z: ${data.z.toFixed(2)}</div>
      <div>Level: ${data.level.toFixed(2)}</div>
    `;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${x + 10}px`;
    this.tooltip.style.top = `${y + 10}px`;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  destroy(): void {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
```

### 步骤 5: 双击重置

```typescript
// src/contour/interaction/InteractionHandler.ts

export class InteractionHandler {
  private zoomHandler: ZoomHandler;
  private panHandler: PanHandler;
  private hoverHandler: HoverHandler;

  constructor(
    zrender: typeof import('zrender'),
    chart: zrender.ZRenderType,
    contourGroup: zrender.Group,
    initialRange: ViewRange,
    option: InteractionOption
  ) {
    this.zoomHandler = new ZoomHandler(zrender, chart, contourGroup, initialRange, option);
    this.panHandler = new PanHandler(chart, initialRange);
    this.hoverHandler = new HoverHandler(chart, contourGroup);

    // 双击重置
    if (option.doubleClickReset) {
      let lastClick = 0;
      chart.on('click', () => {
        const now = Date.now();
        if (now - lastClick < 300) {
          this.reset();
        }
        lastClick = now;
      });
    }
  }

  reset(): void {
    this.zoomHandler.reset();
  }

  getViewRange(): ViewRange {
    return this.zoomHandler.getViewRange();
  }
}
```

## 验收清单

- [ ] 滚轮缩放正确
- [ ] 框选缩放正确
- [ ] 平移功能正常
- [ ] 悬停提示正常
- [ ] 双击重置正常
- [ ] 坐标轴范围同步更新

## 参考资料

- [contour-interactions.md](../../word/contour-interactions.md)
