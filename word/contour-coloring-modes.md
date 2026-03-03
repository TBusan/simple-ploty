# Plotly.js 等值线着色模式实现原理

## 一、概述

Plotly.js 的 contour 等值线支持四种着色模式（coloring）：`fill`、`heatmap`、`lines` 和 `none`。每种模式的实现原理不同，同时在保留 fill 与 lines 时，需要确保两者的颜色范围保持一致。

---

## 二、四种着色模式

### 2.1 模式定义

| 模式 | 说明 | 实现方式 |
|------|------|----------|
| `fill` | 填充等值线之间的区域 | SVG path 填充 |
| `heatmap` | 像热力图一样连续着色 | Canvas 图像 |
| `lines` | 只绘制彩色线条 | SVG path 描边 |
| `none` | 不着色（使用单一颜色） | SVG path 描边 |

### 2.2 配置方式

```javascript
{
    type: 'contour',
    z: [[...]],

    contours: {
        coloring: 'fill',     // 'fill' | 'heatmap' | 'lines' | 'none'
        showlines: true,      // 是否显示线条
        start: 0,             // 起始级别
        end: 10,              // 结束级别
        size: 1               // 间隔
    },

    line: {
        color: 'black',       // coloring='none' 时使用
        width: 1,
        dash: 'solid'
    },

    colorscale: 'Viridis'     // 色阶
}
```

---

## 三、实现架构

### 3.1 主绘制流程

```javascript
// 源码位置: src/traces/contour/plot.js

exports.plot = function plot(gd, plotinfo, cdcontours, contourLayer) {
    Lib.makeTraceGroups(contourLayer, cdcontours, 'contour').each(function(cd) {
        var plotGroup = d3.select(this);
        var cd0 = cd[0];
        var trace = cd0.trace;
        var contours = trace.contours;

        // 1. 创建路径信息
        var pathinfo = emptyPathinfo(contours, plotinfo, cd0);

        // 2. 如果是 heatmap 模式，使用 heatmap 绘制
        var heatmapColoringLayer = Lib.ensureSingle(plotGroup, 'g', 'heatmapcoloring');
        var cdheatmaps = [];
        if(contours.coloring === 'heatmap') {
            cdheatmaps = [cd];
        }
        heatmapPlot(gd, plotinfo, cdheatmaps, heatmapColoringLayer);

        // 3. Marching Squares 计算路径
        makeCrossings(pathinfo);
        findAllPaths(pathinfo);

        // 4. 绘制各层
        makeBackground(plotGroup, perimeter, contours);      // 背景
        makeFills(plotGroup, fillPathinfo, perimeter, contours);  // 填充
        makeLinesAndLabels(plotGroup, pathinfo, gd, cd0, contours);  // 线条和标签
        clipGaps(plotGroup, plotinfo, gd, cd0, perimeter);   // 裁剪
    });
};
```

### 3.2 层级结构

```
plotGroup (g.contour)
├── g.heatmapcoloring    (仅 heatmap 模式)
│   └── image            (Canvas 生成的图像)
├── g.contourbg          (背景填充)
│   └── path
├── g.contourfill        (填充区域)
│   └── path (多个)
├── g.contourlines       (线条)
│   └── g.contourlevel (多个)
│       ├── path.openline (开放路径)
│       └── path.closedline (闭合路径)
└── g.contourlabels      (标签)
    └── text (多个)
```

---

## 四、Fill 模式实现

### 4.1 填充原理

Fill 模式通过 SVG path 的填充规则（fill-rule: evenodd）来实现等值线之间的区域着色。

```javascript
// 源码位置: src/traces/contour/plot.js

function makeFills(plotgroup, pathinfo, perimeter, contours) {
    var hasFills = contours.coloring === 'fill' ||
                   (contours.type === 'constraint' && contours._operation !== '=');
    var boundaryPath = 'M' + perimeter.join('L') + 'Z';

    if(hasFills) {
        closeBoundaries(pathinfo, contours);
    }

    var fillgroup = Lib.ensureSingle(plotgroup, 'g', 'contourfill');

    var fillitems = fillgroup.selectAll('path').data(hasFills ? pathinfo : []);
    fillitems.each(function(pi) {
        // 关键：prefixBoundary 决定是否需要先填充整个边界
        var fullpath = (pi.prefixBoundary ? boundaryPath : '') +
            joinAllPaths(pi, perimeter);

        d3.select(this)
            .attr('d', fullpath)
            .style('stroke', 'none');
    });
}
```

### 4.2 填充路径构建

```
填充区域构建过程:

1. 原始等值线路径:
   ┌─────────────────────────┐
   │   ────── level 5 ─────  │
   │   │                  │  │
   │   │   ── level 3 ──  │  │
   │   │   │           │  │  │
   │   │   │   level1  │  │  │
   │   │   │           │  │  │
   │   │   └───────────┘  │  │
   │   │                  │  │
   │   └──────────────────┘  │
   └─────────────────────────┘

2. 每个 level 的填充路径:
   level 1: 整个边界 + level 3 路径（反向）
   level 3: level 3 路径 + level 5 路径（反向）
   level 5: level 5 路径 + ...

3. SVG 填充规则 (evenodd):
   - 路径包围的区域被填充
   - 嵌套的路径创建"孔洞"
```

### 4.3 颜色应用

```javascript
// 源码位置: src/traces/contour/style.js

if(colorFills) {
    var firstFill;

    c.selectAll('g.contourfill path')
        .style('fill', function(d) {
            if(firstFill === undefined) firstFill = d.level;
            // 关键：颜色对应 level + 0.5 * size (填充区域中心)
            return colorMap(d.level + 0.5 * cs);
        });

    if(firstFill === undefined) firstFill = start;

    // 背景颜色：第一个 level 之前的区域
    c.selectAll('g.contourbg path')
        .style('fill', colorMap(firstFill - 0.5 * cs));
}
```

### 4.4 填充颜色对应关系

```
z 值范围:
    zmin ───────────────────────────────────── zmax
    │        │     │     │     │     │        │
    ▼        ▼     ▼     ▼     ▼     ▼        ▼
    ├────────┼─────┼─────┼─────┼─────┼────────┤
    │  bg    │fill0│fill1│fill2│fill3│fill4   │
    │        │     │     │     │     │        │

颜色映射:
    bg:    colorMap(start - 0.5 * size)
    fill0: colorMap(start + 0.5 * size)
    fill1: colorMap(start + 1.5 * size)
    fill2: colorMap(start + 2.5 * size)
    ...
```

---

## 五、Heatmap 模式实现

### 5.1 原理

Heatmap 模式不使用等值线路径，而是直接将 z 矩阵渲染为图像。

```javascript
// 源码位置: src/traces/contour/plot.js

var heatmapColoringLayer = Lib.ensureSingle(plotGroup, 'g', 'heatmapcoloring');
var cdheatmaps = [];
if(contours.coloring === 'heatmap') {
    cdheatmaps = [cd];
}
heatmapPlot(gd, plotinfo, cdheatmaps, heatmapColoringLayer);
```

### 5.2 Heatmap 绘制

```javascript
// 源码位置: src/traces/heatmap/plot.js

module.exports = function(gd, plotinfo, cdheatmaps, heatmapLayer) {
    Lib.makeTraceGroups(heatmapLayer, cdheatmaps, 'hm').each(function(cd) {
        var isContour = Registry.traceIs(trace, 'contour');
        var zsmooth = isContour ? 'best' : trace.zsmooth;

        // 创建 Canvas
        var canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        var context = canvas.getContext('2d');

        // 颜色映射函数
        var sclFunc = makeColorScaleFuncFromTrace(trace, {
            noNumericCheck: true,
            returnArray: true
        });

        // 填充像素
        if(drawingMethod === 'smooth') {
            // 双线性插值
            for(j = 0; j < imageHeight; j++) {
                for(i = 0; i < imageWidth; i++, pxIndex += 4) {
                    c = interpColor(r0, r1, xinterpArray[i], yinterp);
                    putColor(pixels, pxIndex, c);
                }
            }
        }

        // 生成图像
        var image = plotGroup.selectAll('image').data(cd);
        image.attr({
            'xlink:href': canvas.toDataURL('image/png')
        });
    });
};
```

### 5.3 Heatmap 与 Fill 的区别

| 特性 | Heatmap | Fill |
|------|---------|------|
| 渲染方式 | Canvas 图像 | SVG path |
| 颜色连续性 | 完全连续 | 按级别分段 |
| 性能 | 适合大数据 | 适合少量级别 |
| 交互 | 较难 | 容易 |
| 缩放 | 可能模糊 | 矢量清晰 |

---

## 六、Lines 模式实现

### 6.1 线条创建

```javascript
// 源码位置: src/traces/contour/plot.js

function makeLinesAndLabels(plotgroup, pathinfo, gd, cd0, contours) {
    var lineContainer = Lib.ensureSingle(plotgroup, 'g', 'contourlines');
    var showLines = contours.showlines !== false;

    // 即使不显示线条，也可能需要创建（用于标签定位）
    var linegroup = exports.createLines(lineContainer, showLines || showLabels, pathinfo);
}

exports.createLines = function(lineContainer, makeLines, pathinfo, isStatic) {
    var linegroup = lineContainer.selectAll('g.contourlevel')
        .data(makeLines ? pathinfo : []);

    if(makeLines) {
        // 开放路径（从边界开始/结束）
        var opencontourlines = linegroup.selectAll('path.openline')
            .data(function(d) { return d.pedgepaths || d.edgepaths; });

        opencontourlines
            .attr('d', function(d) {
                return Drawing.smoothopen(d, smoothing);
            });

        // 闭合路径（完全在内部）
        var closedcontourlines = linegroup.selectAll('path.closedline')
            .data(function(d) { return d.ppaths || d.paths; });

        closedcontourlines
            .attr('d', function(d) {
                return Drawing.smoothclosed(d, smoothing);
            });
    }

    return linegroup;
};
```

### 6.2 线条颜色应用

```javascript
// 源码位置: src/traces/contour/style.js

var colorLines = !isConstraintType && contours.coloring === 'lines';
var colorMap = (colorLines || colorFills) ? makeColorMap(trace) : null;

c.selectAll('g.contourlevel').each(function(d) {
    d3.select(this).selectAll('path')
        .call(Drawing.lineGroupStyle,
            line.width,
            colorLines ? colorMap(d.level) : line.color,  // 关键：线条颜色
            line.dash);
});
```

---

## 七、None 模式

### 7.1 实现

当 `coloring: 'none'` 时，不使用色阶，而是使用 `line.color` 作为线条颜色：

```javascript
// coloring === 'none' 时
colorLines = false;  // 不使用色阶
colorFills = false;  // 不填充

// 线条颜色使用 line.color
Drawing.lineGroupStyle(path, line.width, line.color, line.dash);
```

---

## 八、Fill 与 Lines 同时保留时的范围一致性

### 8.1 问题

当同时显示 fill 和 lines 时，需要确保：
1. 填充颜色和线条颜色对应相同的值范围
2. 颜色条的刻度与两者都匹配

### 8.2 解决方案：共享颜色映射函数

```javascript
// 源码位置: src/traces/contour/style.js

var colorLines = !isConstraintType && contours.coloring === 'lines';
var colorFills = !isConstraintType && contours.coloring === 'fill';

// 关键：fill 和 lines 使用同一个 colorMap
var colorMap = (colorLines || colorFills) ? makeColorMap(trace) : null;

// 线条颜色
c.selectAll('g.contourlevel').each(function(d) {
    d3.select(this).selectAll('path')
        .call(Drawing.lineGroupStyle,
            line.width,
            colorLines ? colorMap(d.level) : line.color,
            line.dash);
});

// 填充颜色
if(colorFills) {
    c.selectAll('g.contourfill path')
        .style('fill', function(d) {
            // 填充颜色偏移半个间隔（区域中心）
            return colorMap(d.level + 0.5 * cs);
        });
}
```

### 8.3 makeColorMap 的关键实现

```javascript
// 源码位置: src/traces/contour/make_color_map.js

module.exports = function makeColorMap(trace) {
    var contours = trace.contours;
    var start = contours.start;
    var end = endPlus(contours);
    var cs = contours.size || 1;
    var nc = Math.floor((end - start) / cs) + 1;  // 等值线数量

    // 关键：extra 参数确保 fill 和 lines 使用一致的范围
    var extra = contours.coloring === 'lines' ? 0 : 1;

    // 色阶映射
    for(i = 0; i < len; i++) {
        si = scl[i];
        // 公式确保 fill 和 lines 映射到相同范围
        domain[i] = (si[0] * (nc + extra - 1) - (extra / 2)) * cs + start;
        range[i] = si[1];
    }

    // 扩展到 z 范围
    if(domain[0] > zmin0) {
        domain.unshift(zmin0);
        range.unshift(range[0]);
    }
    if(domain[domain.length - 1] < zmax0) {
        domain.push(zmax0);
        range.push(range[range.length - 1]);
    }

    return Colorscale.makeColorScaleFunc({domain: domain, range: range});
};
```

### 8.4 范围一致性图解

```
色阶范围:
    0 ────────────────────────────────────────── 1
    │                                           │
    ▼                                           ▼
    zmin ───────────────────────────────────── zmax

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

### 8.5 颜色条同步

```javascript
// 填充区域颜色
fillColor = colorMap(level + 0.5 * cs);  // 区域中心

// 线条颜色
lineColor = colorMap(level);              // 精确级别

// 颜色条刻度
colorbar.tick = [start, start+cs, start+2*cs, ...]  // 与线条级别对应
```

---

## 九、完整流程图

```
用户配置
    │
    ├── coloring: 'fill'
    │       │
    │       ├── makeColorMap() → 颜色映射函数
    │       ├── makeBackground() → 背景填充
    │       ├── makeFills() → SVG path 填充
    │       │       └── style: fill = colorMap(level + 0.5*cs)
    │       └── makeLines() → SVG path 描边（可选）
    │
    ├── coloring: 'heatmap'
    │       │
    │       ├── heatmapPlot() → Canvas 图像
    │       │       └── 双线性插值着色
    │       └── makeLines() → SVG path 描边（可选）
    │
    ├── coloring: 'lines'
    │       │
    │       ├── makeColorMap() → 颜色映射函数
    │       ├── makeFills() → 无填充
    │       └── makeLines() → SVG path 描边
    │               └── style: stroke = colorMap(level)
    │
    └── coloring: 'none'
            │
            ├── makeFills() → 无填充
            └── makeLines() → SVG path 描边
                    └── style: stroke = line.color
```

---

## 十、示例

### 10.1 仅填充

```javascript
{
    type: 'contour',
    z: [[...]],
    contours: {
        coloring: 'fill',
        showlines: false
    },
    colorscale: 'Viridis'
}
```

### 10.2 填充 + 线条

```javascript
{
    type: 'contour',
    z: [[...]],
    contours: {
        coloring: 'fill',
        showlines: true
    },
    line: {
        color: 'black',  // 线条颜色（覆盖色阶）
        width: 1
    },
    colorscale: 'Viridis'
}
```

### 10.3 热力图 + 线条

```javascript
{
    type: 'contour',
    z: [[...]],
    contours: {
        coloring: 'heatmap',
        showlines: true
    },
    line: {
        color: 'white',
        width: 0.5
    },
    colorscale: 'Hot'
}
```

### 10.4 仅线条（彩色）

```javascript
{
    type: 'contour',
    z: [[...]],
    contours: {
        coloring: 'lines'
    },
    line: {
        width: 2
    },
    colorscale: 'Rainbow'
}
```

---

## 十一、性能考虑

| 模式 | 渲染负载 | 内存使用 | 适用场景 |
|------|----------|----------|----------|
| `fill` | 中等 | 低 | 标准等值线图 |
| `heatmap` | 高 | 高 | 平滑渐变效果 |
| `lines` | 低 | 低 | 简洁线条图 |
| `none` | 最低 | 最低 | 单色图 |

**优化建议：**
1. 大数据量时优先使用 `lines` 或 `none`
2. 需要平滑效果时使用 `heatmap`
3. 同时显示 fill 和 lines 时，确保线条宽度较小

---

*文档生成时间: 2026-03-03*
