# Plotly.js ColorBar 实现原理

## 一、概述

ColorBar（颜色条）是等值线图、热力图等图表中用于显示数据值与颜色对应关系的组件。它本质上是一个模拟的坐标轴系统，通过颜色渐变或离散色块来表示数据范围。

---

## 二、ColorBar 结构

### 2.1 SVG 层级结构

```
g.colorbar (容器)
├── rect.cbbg           (背景矩形)
├── g.cbfills           (填充层)
│   └── rect.cbfill (多个)  (颜色填充矩形)
├── g.cblines           (线条层)
│   └── path.cbline (多个) (等值线)
├── g.cbaxis.crisp      (坐标轴层)
│   ├── g.tick          (刻度组)
│   └── text            (标签文本)
├── g.cbtitleunshift    (标题容器)
│   └── g.cbtitle       (标题)
└── rect.cboutline      (轮廓矩形)
```

### 2.2 核心组件

```javascript
// 源码位置: src/components/colorbar/draw.js

function draw(gd) {
    var colorBars = fullLayout._infolayer
        .selectAll('g.' + cn.colorbar)
        .data(makeColorBarData(gd), function(opts) { return opts._id; });

    colorBars.enter().append('g')
        .attr('class', function(opts) { return opts._id; })
        .classed(cn.colorbar, true);

    colorBars.each(function(opts) {
        var g = d3.select(this);

        // 确保必要的子元素存在
        Lib.ensureSingle(g, 'rect', cn.cbbg);      // 背景
        Lib.ensureSingle(g, 'g', cn.cbfills);      // 填充
        Lib.ensureSingle(g, 'g', cn.cblines);      // 线条
        Lib.ensureSingle(g, 'g', cn.cbaxis);       // 坐标轴
        Lib.ensureSingle(g, 'g', cn.cbtitleunshift); // 标题
        Lib.ensureSingle(g, 'rect', cn.cboutline); // 轮廓

        // 绑制颜色条
        drawColorBar(g, opts, gd);

        // 支持位置编辑
        if(gd._context.edits.colorbarPosition) {
            makeEditable(g, opts, gd);
        }
    });

    colorBars.exit().remove();
}
```

---

## 三、数据收集

### 3.1 makeColorBarData 函数

```javascript
// 源码位置: src/components/colorbar/draw.js

function makeColorBarData(gd) {
    var fullLayout = gd._fullLayout;
    var calcdata = gd.calcdata;
    var out = [];

    // 遍历所有 trace
    for(var i = 0; i < calcdata.length; i++) {
        var cd = calcdata[i];
        var trace = cd[0].trace;

        if(trace.visible === true && trace._module.colorbar) {
            var cbOpts = trace._module.colorbar;

            // 初始化选项
            opts = initOpts(cont.colorbar);
            opts._id = 'cb' + trace.uid;
            opts._traceIndex = trace.index;
            opts._propPrefix = 'colorbar.';

            // 计算颜色映射
            calcOpts();

            out.push(opts);
        }
    }

    // 处理颜色轴（如 colorscale）
    for(var k in fullLayout._colorAxes) {
        cont = fullLayout[k];

        if(cont.showscale) {
            opts = initOpts(cont.colorbar);
            opts._id = 'cb' + k;
            // ...
            out.push(opts);
        }
    }

    return out;
}
```

### 3.2 初始化选项

```javascript
function initOpts(opts) {
    return extendFlat(opts, {
        // 填充颜色函数 (d3 scale) 或字符串
        _fillcolor: null,

        // 线条属性
        _line: {
            color: null,  // 颜色函数或颜色值
            width: null,
            dash: null
        },

        // 等值线级别
        _levels: {
            start: null,
            end: null,
            size: null
        },

        // 填充级别（独立于线条级别）
        _filllevels: null,

        // 渐变填充（连续色阶）
        _fillgradient: null,

        // 数据范围
        _zrange: null
    });
}
```

---

## 四、模拟坐标轴系统

### 4.1 mockColorBarAxis 函数

ColorBar 使用一个模拟的坐标轴对象来处理刻度和标签：

```javascript
// 源码位置: src/components/colorbar/draw.js

function mockColorBarAxis(gd, opts, zrange) {
    var isVertical = opts.orientation === 'v';

    // 输入属性（从 colorbar 配置）
    var cbAxisIn = {
        type: 'linear',
        range: zrange,                  // 数据范围
        tickmode: opts.tickmode,        // 刻度模式
        nticks: opts.nticks,           // 刻度数量
        tick0: opts.tick0,             // 起始刻度
        dtick: opts.dtick,             // 刻度间隔
        tickvals: opts.tickvals,       // 指定刻度值
        ticktext: opts.ticktext,       // 刻度文本
        ticks: opts.ticks,             // 刻度样式
        ticklen: opts.ticklen,         // 刻度长度
        tickwidth: opts.tickwidth,     // 刻度宽度
        tickcolor: opts.tickcolor,     // 刻度颜色
        showticklabels: opts.showticklabels,
        tickfont: opts.tickfont,       // 刻度字体
        tickformat: opts.tickformat,   // 刻度格式
        title: opts.title,             // 标题
        showline: true,
        anchor: 'free',
        side: isVertical ? 'right' : 'bottom',
        position: 1
    };

    // 输出轴对象
    var letter = isVertical ? 'y' : 'x';
    var cbAxisOut = {
        type: 'linear',
        _id: letter + opts._id
    };

    // 应用轴默认值
    handleAxisDefaults(cbAxisIn, cbAxisOut, coerce, axisOptions, fullLayout);
    handleAxisPositionDefaults(cbAxisIn, cbAxisOut, coerce, axisOptions);

    return cbAxisOut;
}
```

### 4.2 坐标轴属性映射

```
ColorBar 配置          →  模拟坐标轴属性
─────────────────────────────────────────
orientation: 'v'       →  side: 'right', _id: 'y...'
orientation: 'h'       →  side: 'bottom', _id: 'x...'
zrange                 →  range
tickmode/nticks        →  tickmode/nticks
tickformat             →  tickformat
title                  →  title
```

---

## 五、位置计算

### 5.1 尺寸计算

```javascript
// 源码位置: src/components/colorbar/draw.js

function drawColorBar(g, opts, gd) {
    var isVertical = opts.orientation === 'v';
    var gs = fullLayout._size;

    // 计算像素尺寸
    var thickPx = Math.round(thickness * (
        thicknessmode === 'fraction' ? (isVertical ? gs.w : gs.h) : 1
    ));
    var lenPx = Math.round(len * (
        lenmode === 'fraction' ? (isVertical ? gs.h : gs.w) : 1
    ));

    // 计算分数值
    var thickFrac = thickPx / (isVertical ? gs.w : gs.h);
    var lenFrac = lenPx / (isVertical ? gs.h : gs.w);

    // 计算锚点比例
    var xRatio = {center: 0.5, right: 1}[xanchor] || 0;
    var yRatio = {top: 1, middle: 0.5}[yanchor] || 0;

    // 计算位置
    var uFrac = isVertical ?
        optsX - xRatio * thickFrac :
        optsY - yRatio * thickFrac;

    var vFrac = isVertical ?
        optsY - yRatio * lenFrac :
        optsX - xRatio * lenFrac;
}
```

### 5.2 位置计算示例

```
垂直 ColorBar (orientation: 'v'):

    ┌────────────────────────────────┐
    │                                │
    │        ┌───┐                   │
    │        │ ▲ │ ← thickness       │
    │        │ │ │                   │
    │        │ │ │                   │
    │        │ │ │ ← len             │
    │        │ │ │                   │
    │        │ ▼ │                   │
    │        └───┘                   │
    │            ↑                   │
    │           x                    │
    │                                │
    └────────────────────────────────┘

水平 ColorBar (orientation: 'h'):

    ┌────────────────────────────────┐
    │                                │
    │                                │
    │  ┌───────────────────────────┐ │
    │  │ ←───────── len ─────────→ │ │
    │  └───────────────────────────┘ │
    │              ↑                 │
    │          thickness             │
    │              y                 │
    └────────────────────────────────┘
```

---

## 六、填充绘制

### 6.1 级别计算

```javascript
// 源码位置: src/components/colorbar/draw.js

function calcLevels(gd, opts, zrange) {
    var levelsIn = opts._levels;
    var lineLevels = [];
    var fillLevels = [];

    var l0 = levelsIn.end + levelsIn.size / 100;
    var ls = levelsIn.size;
    var zr0 = (1.001 * zrange[0] - 0.001 * zrange[1]);
    var zr1 = (1.001 * zrange[1] - 0.001 * zrange[0]);

    // 计算线条级别
    for(var i = 0; i < 1e5; i++) {
        var l = levelsIn.start + i * ls;
        if(ls > 0 ? (l >= l0) : (l <= l0)) break;
        if(l > zr0 && l < zr1) lineLevels.push(l);
    }

    // 计算填充级别
    if(opts._fillgradient) {
        // 渐变模式：单个矩形
        fillLevels = [0];
    } else if(typeof opts._fillcolor === 'function') {
        // 函数模式：基于填充级别
        var fillLevelsIn = opts._filllevels;

        if(fillLevelsIn) {
            // 使用独立的填充级别
            for(var i = 0; i < 1e5; i++) {
                var l = fillLevelsIn.start + i * fillLevelsIn.size;
                if(l > zrange[0] && l < zrange[1]) fillLevels.push(l);
            }
        } else {
            // 从线条级别派生
            fillLevels = lineLevels.map(function(v) {
                return v - levelsIn.size / 2;
            });
            fillLevels.push(fillLevels[fillLevels.length - 1] + levelsIn.size);
        }
    }

    return {line: lineLevels, fill: fillLevels};
}
```

### 6.2 填充矩形绘制

```javascript
// 源码位置: src/components/colorbar/draw.js

var fills = g.select('.' + cn.cbfills)
    .selectAll('rect.' + cn.cbfill)
    .data(fillLevels);

fills.enter().append('rect')
    .classed(cn.cbfill, true);

fills.each(function(d, i) {
    // 计算每个填充矩形的 Y 位置
    var z = [
        (i === 0) ? zrange[0] : (fillLevels[i] + fillLevels[i - 1]) / 2,
        (i === fillLevels.length - 1) ? zrange[1] : (fillLevels[i] + fillLevels[i + 1]) / 2
    ]
    .map(ax.c2p)  // 数据坐标转像素坐标
    .map(Math.round);

    var fillEl = d3.select(this)
        .attr(isVertical ? 'x' : 'y', uPx)
        .attr(isVertical ? 'y' : 'x', d3.min(z))
        .attr(isVertical ? 'width' : 'height', Math.max(thickPx, 2))
        .attr(isVertical ? 'height' : 'width', Math.max(d3.max(z) - d3.min(z), 2));

    if(opts._fillgradient) {
        // 渐变填充
        Drawing.gradient(fillEl, gd, opts._id,
            isVertical ? 'vertical' : 'horizontalreversed',
            opts._fillgradient, 'fill');
    } else {
        // 离散颜色填充
        var colorString = fillColormap(d).replace('e-', '');
        fillEl.attr('fill', tinycolor(colorString).toHexString());
    }
});
```

### 6.3 填充区域示意

```
离散填充 (fillLevels):

    ┌─────────┐
    │ ███████ │ ← level 4 (最高值)
    ├─────────┤
    │ ▓▓▓▓▓▓▓ │ ← level 3
    ├─────────┤
    │ ▒▒▒▒▒▒▒ │ ← level 2
    ├─────────┤
    │ ░░░░░░░ │ ← level 1
    ├─────────┤
    │         │ ← level 0 (最低值)
    └─────────┘

渐变填充 (_fillgradient):

    ┌─────────┐
    │░▒▓█████│ ← 连续颜色渐变
    │░▒▓█████│
    │░▒▓█████│
    │░▒▓█████│
    │░▒▓█████│
    └─────────┘
```

---

## 七、线条绘制

### 7.1 等值线绘制

```javascript
// 源码位置: src/components/colorbar/draw.js

var lines = g.select('.' + cn.cblines)
    .selectAll('path.' + cn.cbline)
    .data(line.color && line.width ? lineLevels : []);

lines.enter().append('path')
    .classed(cn.cbline, true);

lines.each(function(d) {
    var a = uPx;
    var b = (Math.round(ax.c2p(d)) + (line.width / 2) % 1);

    // 绘制水平或垂直线
    d3.select(this)
        .attr('d', 'M' +
            (isVertical ? a + ',' + b : b + ',' + a) +
            (isVertical ? 'h' : 'v') +
            thickPx
        )
        .call(Drawing.lineGroupStyle, line.width, lineColormap(d), line.dash);
});
```

### 7.2 线条位置计算

```
垂直 ColorBar 中的线条:

    ┌─────────┐
    │ ███████ │
    ├─────────┤ ← line at level 4
    │ ▓▓▓▓▓▓▓ │
    ├─────────┤ ← line at level 3
    │ ▒▒▒▒▒▒▒ │
    ├─────────┤ ← line at level 2
    │ ░░░░░░░ │
    └─────────┘

线条路径: M x, y h thickness
         (移动到起点，水平绘制)
```

---

## 八、刻度和标签

### 8.1 刻度计算

```javascript
// 源码位置: src/components/colorbar/draw.js

// 特殊处理：当有线条时，自动调整刻度
if(line.color && opts.tickmode === 'auto') {
    ax.tickmode = 'linear';
    ax.tick0 = levelsIn.start;
    var dtick = levelsIn.size;

    // 避免太多刻度
    var autoNtick = Lib.constrain(lenPx / 50, 4, 15) + 1;
    var dtFactor = (zrange[1] - zrange[0]) / ((opts.nticks || autoNtick) * dtick);

    if(dtFactor > 1) {
        var dtexp = Math.pow(10, Math.floor(Math.log(dtFactor) / Math.LN10));
        dtick *= dtexp * Lib.roundUp(dtFactor / dtexp, [2, 5, 10]);

        // 如果等值线是整数倍，重置 tick0
        if((Math.abs(levelsIn.start) / levelsIn.size + 1e-6) % 1 < 2e-6) {
            ax.tick0 = 0;
        }
    }
    ax.dtick = dtick;
}
```

### 8.2 刻度绘制

```javascript
// 源码位置: src/components/colorbar/draw.js

// 清除旧刻度
axLayer.selectAll('g.' + ax._id + 'tick,path').remove();

// 计算刻度位置
var shift = uPx + thickPx +
    (outlinewidth || 0) / 2 - (opts.ticks === 'outside' ? 1 : 0);

var vals = Axes.calcTicks(ax);
var tickSign = Axes.getTickSigns(ax)[2];

// 绘制刻度线
Axes.drawTicks(gd, ax, {
    vals: ax.ticks === 'inside' ? Axes.clipEnds(ax, vals) : vals,
    layer: axLayer,
    path: Axes.makeTickPath(ax, shift, tickSign),
    transFn: Axes.makeTransTickFn(ax)
});

// 绘制标签
return Axes.drawLabels(gd, ax, {
    vals: vals,
    layer: axLayer,
    transFn: Axes.makeTransTickLabelFn(ax),
    labelFns: Axes.makeLabelFns(ax, shift)
});
```

---

## 九、标题处理

### 9.1 标题位置

```javascript
// 源码位置: src/components/colorbar/draw.js

function drawCbTitle() {
    var pos = ax.position || 0;
    var mid = ax._offset + ax._length / 2;

    if(titleSide === 'right') {
        // 垂直 ColorBar 右侧标题
        y = mid;
        x = gs.l + posW * pos + 10 + titleFontSize * (
            ax.showticklabels ? 1 : 0.5
        );
    } else if(titleSide === 'top') {
        // 垂直 ColorBar 顶部标题
        x = mid;
        y = gs.t + posH * pos + 10 - thickPx - LINE_SPACING * titleFontSize * nlines;
    } else if(titleSide === 'bottom') {
        // 垂直/水平 ColorBar 底部标题
        x = mid;
        y = gs.t + posH * pos + 10 + tickLabelHeight + tickLength;
    }

    drawTitle((isVertical ? 'h' : 'v') + ax._id + 'title', {
        avoid: {
            selection: d3.select(gd).selectAll('g.' + ax._id + 'tick'),
            side: titleSide,
            maxShift: isVertical ? fullLayout.width : fullLayout.height
        },
        attributes: {x: x, y: y, 'text-anchor': 'middle'},
        transform: {rotate: isVertical ? -90 : 0, offset: 0}
    });
}
```

### 9.2 标题位置选项

```
垂直 ColorBar 标题位置:

    titleSide: 'top'
    ┌─────────────────────┐
    │    Title Text       │
    ├─────────┤
    │ ███████ │ titleSide: 'right'
    │ ▓▓▓▓▓▓▓ │ → Title
    │ ▒▒▒▒▒▒▒ │
    │ ░░░░░░░ │
    └─────────┘

水平 ColorBar 标题位置:

    titleSide: 'top'
         Title Text
    ┌─────────────────────┐
    │ ░░▒▒▓▓████████████ │
    └─────────────────────┘
         titleSide: 'bottom'
         Title Text
```

---

## 十、边距自动调整

### 10.1 autoMargin 调用

```javascript
// 源码位置: src/components/colorbar/draw.js

function positionCB() {
    // ... 计算尺寸 ...

    var marginOpts = {};
    var lFrac = FROM_TL[xanchor];
    var rFrac = FROM_BR[xanchor];
    var tFrac = FROM_TL[yanchor];
    var bFrac = FROM_BR[yanchor];

    if(isVertical) {
        if(lenmode === 'pixels') {
            marginOpts.y = optsY;
            marginOpts.t = lenPx * tFrac;
            marginOpts.b = lenPx * bFrac;
        } else {
            marginOpts.yt = optsY + len * tFrac;
            marginOpts.yb = optsY - len * bFrac;
        }

        if(thicknessmode === 'pixels') {
            marginOpts.x = optsX;
            marginOpts.l = outerThickness * lFrac;
            marginOpts.r = outerThickness * rFrac;
        } else {
            marginOpts.xl = optsX - thickness * lFrac;
            marginOpts.xr = optsX + thickness * rFrac;
        }
    }

    if(isPaperX && isPaperY) {
        Plots.autoMargin(gd, opts._id, marginOpts);
    }
}
```

### 10.2 边距计算示意

```
ColorBar 对图表边距的影响:

    ┌────────────────────────────────────────┐
    │          ↑ marginOpts.t                │
    │          │                             │
    │    ┌─────┴─────┐     ←─ marginOpts.r   │
    │    │           │         (ColorBar宽度)│
    │    │   图表    │   ┌─┐                 │
    │    │   区域    │   │C│                 │
    │    │           │   │o│                 │
    │    │           │   │l│                 │
    │    │           │   │o│                 │
    │    │           │   │r│                 │
    │    │           │   │B│                 │
    │    │           │   │a│                 │
    │    │           │   │r│                 │
    │    └───────────┘   └─┘                 │
    │          │                             │
    │          ↓ marginOpts.b                │
    └────────────────────────────────────────┘
```

---

## 十一、可编辑功能

### 11.1 makeEditable 函数

```javascript
// 源码位置: src/components/colorbar/draw.js

function makeEditable(g, opts, gd) {
    var isVertical = opts.orientation === 'v';
    var t0, xf, yf;

    dragElement.init({
        element: g.node(),
        gd: gd,
        prepFn: function() {
            t0 = g.attr('transform');
            setCursor(g);
        },
        moveFn: function(dx, dy) {
            // 更新视觉位置
            g.attr('transform', t0 + strTranslate(dx, dy));

            // 计算新的分数位置
            xf = dragElement.align(
                (isVertical ? opts._uFrac : opts._vFrac) + (dx / gs.w),
                isVertical ? opts._thickFrac : opts._lenFrac,
                0, 1, opts.xanchor
            );
            yf = dragElement.align(
                (isVertical ? opts._vFrac : (1 - opts._uFrac)) - (dy / gs.h),
                isVertical ? opts._lenFrac : opts._thickFrac,
                0, 1, opts.yanchor
            );

            setCursor(g, dragElement.getCursor(xf, yf, opts.xanchor, opts.yanchor));
        },
        doneFn: function() {
            setCursor(g);

            if(xf !== undefined && yf !== undefined) {
                var update = {};
                update[opts._propPrefix + 'x'] = xf;
                update[opts._propPrefix + 'y'] = yf;

                if(opts._traceIndex !== undefined) {
                    Registry.call('_guiRestyle', gd, update, opts._traceIndex);
                } else {
                    Registry.call('_guiRelayout', gd, update);
                }
            }
        }
    });
}
```

---

## 十二、完整绘制流程

```
draw() 入口
    │
    ├── makeColorBarData()
    │       │
    │       ├── 遍历 calcdata 收集 trace colorbar
    │       └── 收集 color axes colorbar
    │
    ├── 对每个 colorbar:
    │       │
    │       ├── drawColorBar()
    │       │       │
    │       │       ├── 计算尺寸和位置
    │       │       │
    │       │       ├── mockColorBarAxis() 创建模拟轴
    │       │       │
    │       │       ├── drawDummyTitle() 绘制标题(确定尺寸)
    │       │       │
    │       │       ├── drawAxis()
    │       │       │       │
    │       │       │       ├── 绘制填充矩形
    │       │       │       ├── 绘制线条
    │       │       │       ├── 绘制刻度
    │       │       │       └── 绘制标签
    │       │       │
    │       │       ├── drawCbTitle() 绘制最终标题
    │       │       │
    │       │       └── positionCB() 定位和边距
    │       │
    │       └── makeEditable() (可选)
    │
    └── 退出时调用 autoMargin 清理
```

---

## 十三、与 Contour 的关联

### 13.1 Contour 中的 ColorBar 配置

```javascript
// Contour trace 中的 colorbar 配置
{
    type: 'contour',
    z: [[...]],
    colorscale: 'Viridis',

    colorbar: {
        title: {text: 'Value'},
        titleside: 'right',
        ticks: 'outside',
        ticklen: 5,
        tickwidth: 1,
        tickcolor: '#000',
        showticklabels: true,
        tickfont: {size: 12},
        tickformat: '.1f',
        len: 1,
        lenmode: 'fraction',
        x: 1.02,
        y: 0.5,
        xanchor: 'left',
        yanchor: 'middle',
        thickness: 30,
        thicknessmode: 'pixels',
        outlinecolor: '#000',
        outlinewidth: 1,
        bordercolor: '#000',
        borderwidth: 0,
        bgcolor: 'rgba(0,0,0,0)'
    }
}
```

### 13.2 颜色范围同步

ColorBar 的颜色范围与 contour 的 z 值范围同步：

```javascript
// 源码位置: src/components/colorbar/draw.js

function calcOpts() {
    if(typeof cbOpt.calc === 'function') {
        cbOpt.calc(gd, trace, opts);
    } else {
        // 使用 colorscale 和数据范围
        opts._fillgradient = cont.reversescale ?
            flipScale(cont.colorscale) :
            cont.colorscale;
        opts._zrange = [cont[cbOpt.min], cont[cbOpt.max]];
    }
}
```

---

## 十四、示例

### 14.1 基本垂直 ColorBar

```javascript
{
    type: 'contour',
    z: [[...]],
    colorbar: {
        title: 'Temperature (°C)',
        titleside: 'right',
        len: 0.8,
        x: 1.1
    }
}
```

### 14.2 水平 ColorBar

```javascript
{
    type: 'heatmap',
    z: [[...]],
    colorbar: {
        orientation: 'h',
        title: {text: 'Value', side: 'top'},
        y: -0.2,
        len: 0.8
    }
}
```

### 14.3 自定义刻度

```javascript
{
    type: 'contour',
    z: [[...]],
    colorbar: {
        tickmode: 'array',
        tickvals: [0, 25, 50, 75, 100],
        ticktext: ['Min', 'Q1', 'Median', 'Q3', 'Max'],
        tickfont: {size: 14, color: 'blue'}
    }
}
```

---

*文档生成时间: 2026-03-03*
