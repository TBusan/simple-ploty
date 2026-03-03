# Plotly.js Contour 交互事件与坐标轴更新原理

## 一、概述

Contour 等值线图的交互主要包括缩放（zoom）、平移（pan）、悬停（hover）等操作。这些交互不仅影响等值线的显示区域，还会触发坐标轴的自动更新、标签的重新计算和绘制。本文档详细阐述这些交互的实现原理。

---

## 二、交互系统架构

### 2.1 核心模块

| 模块 | 路径 | 功能 |
|------|------|------|
| `graph_interact.js` | `src/plots/cartesian/` | 初始化交互，创建拖拽元素 |
| `dragbox.js` | `src/plots/cartesian/` | 处理缩放和平移逻辑 |
| `dragelement.js` | `src/components/` | 通用拖拽元素基础设施 |
| `fx.js` | `src/components/` | 悬停效果和点击处理 |
| `axes.js` | `src/plots/cartesian/` | 坐标轴绘制和更新 |

### 2.2 交互初始化流程

```javascript
// 源码位置: src/plots/cartesian/graph_interact.js

exports.initInteractions = function initInteractions(gd) {
    var fullLayout = gd._fullLayout;

    // 静态图表不需要交互
    if(gd._context.staticPlot) {
        d3.select(gd).selectAll('.drag').remove();
        return;
    }

    // 遍历所有子图
    subplots.forEach(function(subplot) {
        var plotinfo = fullLayout._plots[subplot];
        var xa = plotinfo.xaxis;
        var ya = plotinfo.yaxis;

        // 创建主拖拽区域（用于缩放/平移/悬停）
        if(!plotinfo.mainplot) {
            var maindrag = makeDragBox(gd, plotinfo,
                xa._offset, ya._offset,
                xa._length, ya._length,
                'ns', 'ew');

            // 悬停事件
            maindrag.onmousemove = function(evt) {
                Fx.hover(gd, evt, subplot);
            };

            // 鼠标离开事件
            maindrag.onmouseout = function(evt) {
                if(gd._dragging) return;
                dragElement.unhover(gd, evt);
            };
        }
    });

    exports.updateFx(gd);
};
```

---

## 三、拖拽元素创建

### 3.1 makeDragBox 函数

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function makeDragBox(gd, plotinfo, x, y, w, h, ns, ew) {
    // ns: 'n' (北), 's' (南), 'ns' (南北同时)
    // ew: 'e' (东), 'w' (西), 'ew' (东西同时)

    var isMainDrag = (ns + ew === 'nsew');  // 主拖拽区域
    var singleEnd = (ns + ew).length === 1; // 单端拖拽

    // 获取关联的坐标轴
    var xa0 = plotinfo.xaxis;
    var ya0 = plotinfo.yaxis;
    var pw = xa0._length;  // 绑定宽度
    var ph = ya0._length;  // 绑定高度

    // 创建拖拽元素
    var cursor = getDragCursor(yActive + xActive, gd._fullLayout.dragmode, isMainDrag);
    var dragger = makeRectDragger(plotinfo, ns + ew + 'drag', cursor, x, y, w, h);

    // 初始化拖拽选项
    var dragOptions = {
        element: dragger,
        gd: gd,
        plotinfo: plotinfo
    };

    // 准备函数 - 在拖拽开始时调用
    dragOptions.prepFn = function(e, startX, startY) {
        // 根据拖拽模式选择处理方式
        if(dragModeNow === 'zoom') {
            dragOptions.moveFn = zoomMove;
            dragOptions.doneFn = zoomDone;
            zoomPrep(e, startX, startY);
        } else if(dragModeNow === 'pan') {
            dragOptions.moveFn = plotDrag;
            dragOptions.doneFn = dragTail;
        }
    };

    dragElement.init(dragOptions);
    return dragger;
}
```

### 3.2 拖拽区域类型

```
子图拖拽区域分布:

    ┌─────────────────────────────────────┐
    │  NW     ▲      N      ▲      NE     │
    │  ●──────┼─────────────┼──────●      │
    │         │             │             │
    │  ◄──────┼─────────────┼──────►      │
    │         │   Main      │             │
    │  W      │   Drag      │      E      │
    │  ◄──────┼─────────────┼──────►      │
    │         │             │             │
    │  ●──────┼─────────────┼──────●      │
    │  SW     ▼      S      ▼      SE     │
    └─────────────────────────────────────┘

    ● 角落拖拽点：对角缩放
    ▲ 垂直边缘：Y轴缩放
    ◄► 水平边缘：X轴缩放
    Main Drag：平移或框选缩放
```

---

## 四、缩放（Zoom）实现

### 4.1 框选缩放

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function zoomPrep(e, startX, startY) {
    // 记录起始位置
    x0 = startX - dragBBox.left;
    y0 = startY - dragBBox.top;

    // 初始化缩放框
    box = {l: x0, r: x0, w: 0, t: y0, b: y0, h: 0};
    zoomMode = 'xy';
    zoomDragged = false;

    // 创建缩放框视觉元素
    zb = makeZoombox(zoomlayer, lum, xs, ys, path0);
    corners = makeCorners(zoomlayer, xs, ys);
}

function zoomMove(dx0, dy0) {
    // 计算缩放框的新位置
    var x1 = Math.max(0, Math.min(pw, scaleX * dx0 + x0));
    var y1 = Math.max(0, Math.min(ph, scaleY * dy0 + y0));

    // 更新缩放框边界
    box.l = Math.min(x0, x1);
    box.r = Math.max(x0, x1);
    box.t = Math.min(y0, y1);
    box.b = Math.max(y0, y1);

    // 确定缩放模式（X-only, Y-only, 或 XY）
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);

    if(dy < Math.min(dx * 0.6, MINZOOM)) {
        zoomMode = 'x';  // 只缩放X轴
    } else if(dx < Math.min(dy * 0.6, MINZOOM)) {
        zoomMode = 'y';  // 只缩放Y轴
    } else {
        zoomMode = 'xy'; // 同时缩放
    }

    // 更新视觉元素
    updateZoombox(zb, corners, box, path0, dimmed, lum);

    // 计算坐标轴范围更新
    computeZoomUpdates();

    // 发出实时更新事件
    gd.emit('plotly_relayouting', updates);
}

function computeZoomUpdates() {
    updates = {};

    if(zoomMode === 'xy' || zoomMode === 'x') {
        zoomAxRanges(xaxes, box.l / pw, box.r / pw, updates, links.xaxes);
    }
    if(zoomMode === 'xy' || zoomMode === 'y') {
        zoomAxRanges(yaxes, (ph - box.b) / ph, (ph - box.t) / ph, updates, links.yaxes);
    }
}
```

### 4.2 滚轮缩放

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function zoomWheel(e) {
    // 计算缩放因子
    var wheelDelta = -e.deltaY;
    var zoom = Math.exp(-Math.min(Math.max(wheelDelta, -20), 20) / 200);

    // 计算鼠标位置（作为缩放中心）
    var gbb = mainplot.draglayer.select('.nsewdrag').node().getBoundingClientRect();
    var xfrac = (e.clientX - gbb.left) / gbb.width;
    var yfrac = (gbb.bottom - e.clientY) / gbb.height;

    // 对每个坐标轴进行缩放
    function zoomWheelOneAxis(ax, centerFraction, zoom) {
        if(ax.fixedrange) return;

        var axRange = Lib.simpleMap(ax.range, ax.r2l);
        var v0 = axRange[0] + (axRange[1] - axRange[0]) * centerFraction;

        function doZoom(v) {
            return ax.l2r(v0 + (v - v0) * zoom);
        }

        ax.range = axRange.map(doZoom);
    }

    // 应用缩放
    for(var i = 0; i < xaxes.length; i++) {
        zoomWheelOneAxis(xaxes[i], xfrac, zoom);
    }
    for(var i = 0; i < yaxes.length; i++) {
        zoomWheelOneAxis(yaxes[i], yfrac, zoom);
    }

    // 更新视图
    updateSubplots(scrollViewBox);
    ticksAndAnnotations();

    gd.emit('plotly_relayouting', updates);
}
```

### 4.3 缩放公式

```
以鼠标位置为中心的缩放:

原始范围: [rmin, rmax]
鼠标位置: centerFraction (0-1)
缩放因子: zoom

计算:
    rangeLength = rmax - rmin
    centerValue = rmin + rangeLength * centerFraction

    newRmin = centerValue + (rmin - centerValue) * zoom
    newRmax = centerValue + (rmax - centerValue) * zoom

图示:
    原始:    |--------●--------|
             rmin   center   rmax

    放大:    |----●----|
             rmin  center  rmax (缩小范围)

    缩小: |----------●----------|
          rmin      center      rmax (扩大范围)
```

---

## 五、平移（Pan）实现

### 5.1 平移逻辑

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function plotDrag(dx, dy) {
    dx = dx * scaleX;
    dy = dy * scaleY;

    // 处理主拖拽（整体平移）
    if(xActive === 'ew' || yActive === 'ns') {
        var spDx = xActive ? -dx : 0;
        var spDy = yActive ? -dy : 0;

        // 更新所有X轴
        if(xActive) {
            dragAxList(xaxes, dx);
            updateMatchedAxRange('x');
        }

        // 更新所有Y轴
        if(yActive) {
            dragAxList(yaxes, dy);
            updateMatchedAxRange('y');
        }

        // 更新视图
        updateSubplots([spDx, spDy, pw, ph]);
        ticksAndAnnotations();

        gd.emit('plotly_relayouting', updates);
        return;
    }

    // 处理边缘拖拽（单端缩放）
    // ...
}
```

### 5.2 坐标轴平移

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function dragAxList(axList, pixelDrag) {
    for(var i = 0; i < axList.length; i++) {
        var axi = axList[i];
        if(axi.fixedrange) continue;

        // 将像素距离转换为数据距离
        var dataDrag = pixelDrag / axi._length * (axi._rl[1] - axi._rl[0]);

        // 更新坐标轴范围
        axi.range = [
            axi.l2r(axi._rl[0] - dataDrag),
            axi.l2r(axi._rl[1] - dataDrag)
        ];
    }
}
```

---

## 六、坐标轴自动更新

### 6.1 ticksAndAnnotations 函数

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function ticksAndAnnotations() {
    var activeAxIds = [];

    // 收集需要更新的坐标轴
    if(editX) {
        pushActiveAxIds(xaxes);
        pushActiveAxIds(links.xaxes);
        pushActiveAxIds(matches.xaxes);
    }
    if(editY) {
        pushActiveAxIds(yaxes);
        pushActiveAxIds(links.yaxes);
        pushActiveAxIds(matches.yaxes);
    }

    updates = {};

    // 重绘每个活动坐标轴
    for(var i = 0; i < activeAxIds.length; i++) {
        var axId = activeAxIds[i];
        var ax = getFromId(gd, axId);

        // 重绘坐标轴（刻度、标签等）
        Axes.drawOne(gd, ax, {skipTitle: true});

        // 记录更新
        updates[ax._name + '.range[0]'] = ax.range[0];
        updates[ax._name + '.range[1]'] = ax.range[1];
    }

    // 重绘关联组件（注释、形状等）
    Axes.redrawComponents(gd, activeAxIds);
}
```

### 6.2 子图视图更新

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function updateSubplots(viewBox) {
    // viewBox: [x, y, width, height]

    var xScaleFactor = viewBox[2] / xa0._length;
    var yScaleFactor = viewBox[3] / ya0._length;

    for(var i = 0; i < subplots.length; i++) {
        var sp = plotinfos[subplots[i]];
        var xa = sp.xaxis;
        var ya = sp.yaxis;

        // 计算缩放和平移
        var clipDx = viewBox[0];
        var clipDy = viewBox[1];
        var plotDx = xa._offset - clipDx / xScaleFactor;
        var plotDy = ya._offset - clipDy / yScaleFactor;

        // 更新裁剪矩形
        sp.clipRect
            .call(Drawing.setTranslate, clipDx, clipDy)
            .call(Drawing.setScale, xScaleFactor, yScaleFactor);

        // 更新绑制层
        sp.plot
            .call(Drawing.setTranslate, plotDx, plotDy)
            .call(Drawing.setScale, 1 / xScaleFactor, 1 / yScaleFactor);

        // 更新数据点缩放（保持点大小不变）
        Drawing.setPointGroupScale(sp.zoomScalePts, xScaleFactor, yScaleFactor);
        Drawing.setTextPointsScale(sp.zoomScaleTxt, xScaleFactor, yScaleFactor);
    }
}
```

---

## 七、Contour 标签在交互中的变化

### 7.1 标签更新机制

当缩放或平移时，contour 标签会根据新的视图范围重新计算：

```
交互流程:

1. 用户拖拽/缩放
       │
       ▼
2. dragbox.js 更新坐标轴范围
       │
       ▼
3. dragTail() 触发 relayout
       │
       ▼
4. Plots.doRelayout() 清除旧内容
       │
       ▼
5. contour/plot.js 重新绘制等值线
       │
       ▼
6. makeLinesAndLabels() 创建新标签
       │
       ├── 计算新的路径信息
       ├── 评估标签位置
       └── 绘制标签文本
```

### 7.2 标签可见性变化

```javascript
// 标签在缩放时的行为:

// 1. 进入视图的标签会被添加
// 2. 离开视图的标签会被移除
// 3. 部分可见的标签可能被裁剪

// 标签位置重新计算:
// - 基于新的等值线路径
// - 使用相同的成本函数优化
// - 考虑新的边界约束
```

---

## 八、事件发射

### 8.1 交互事件

```javascript
// 拖拽过程中的实时事件
gd.emit('plotly_relayouting', updates);

// 拖拽完成事件
gd.emit('plotly_relayout', {
    'xaxis.range[0]': newRange[0],
    'xaxis.range[1]': newRange[1],
    'yaxis.range[0]': newRange[0],
    'yaxis.range[1]': newRange[1]
});

// 双击事件
gd.emit('plotly_doubleclick', null);
```

### 8.2 事件数据结构

```javascript
// plotly_relayouting 事件数据
{
    'xaxis.range[0]': 0,      // X轴起始值
    'xaxis.range[1]': 100,    // X轴结束值
    'yaxis.range[0]': -5,     // Y轴起始值
    'yaxis.range[1]': 5       // Y轴结束值
}

// 坐标轴范围变化示例
// 原始: [0, 100]
// 缩放后: [25, 75]  (放大2倍)
// 平移后: [10, 110] (向右平移10)
```

---

## 九、双击重置

### 9.1 双击行为

```javascript
// 源码位置: src/plots/cartesian/dragbox.js

function doubleClick() {
    var doubleClickConfig = gd._context.doubleClick;

    // 支持多种双击模式:
    // - 'reset': 重置到初始范围
    // - 'autosize': 自动调整范围
    // - 'reset+autosize': 先尝试重置，如已在初始范围则自动调整

    var axList = [];
    if(xActive) axList = axList.concat(xaxes);
    if(yActive) axList = axList.concat(yaxes);

    var attrs = {};

    if(doubleClickConfig === 'reset') {
        // 重置到初始范围
        for(var i = 0; i < axList.length; i++) {
            var ax = axList[i];
            if(!ax.fixedrange) {
                attrs[ax._name + '.range'] = [
                    ax._rangeInitial0,
                    ax._rangeInitial1
                ];
            }
        }
    } else if(doubleClickConfig === 'autosize') {
        // 自动调整范围
        for(var i = 0; i < axList.length; i++) {
            var ax = axList[i];
            if(!ax.fixedrange) {
                attrs[ax._name + '.autorange'] = true;
            }
        }
    }

    Registry.call('_guiRelayout', gd, attrs);
}
```

---

## 十、性能优化

### 10.1 延迟重绘

```javascript
// 滚轮缩放时的延迟重绘
var redrawTimer = null;
var REDRAWDELAY = constants.REDRAWDELAY;  // 通常 50-100ms

function zoomWheel(e) {
    clearTimeout(redrawTimer);

    // 立即更新视图（轻量级）
    updateSubplots(scrollViewBox);
    ticksAndAnnotations();

    // 延迟完整重绘
    redrawTimer = setTimeout(function() {
        scrollViewBox = [0, 0, pw, ph];
        dragTail();  // 完整重绘
    }, REDRAWDELAY);
}
```

### 10.2 SVG 变换优化

```javascript
// 使用 CSS transform 而非重新计算坐标
// 优点：
// 1. GPU 加速
// 2. 避免重新计算所有数据点
// 3. 流畅的动画效果

sp.clipRect.call(Drawing.setTranslate, clipDx, clipDy);
sp.plot.call(Drawing.setScale, 1 / xScaleFactor, 1 / yScaleFactor);
```

---

## 十一、完整交互流程图

```
用户操作
    │
    ├── 鼠标按下
    │       │
    │       └── prepFn() 准备拖拽
    │
    ├── 鼠标移动
    │       │
    │       ├── zoomMove() 或 plotDrag()
    │       │       │
    │       │       ├── 更新坐标轴范围
    │       │       ├── updateSubplots() 更新视图
    │       │       ├── ticksAndAnnotations() 更新刻度
    │       │       └── emit('plotly_relayouting')
    │       │
    │       └── 实时视觉反馈
    │
    ├── 鼠标释放
    │       │
    │       └── zoomDone() 或 dragTail()
    │               │
    │               ├── removeZoombox() 移除缩放框
    │               ├── updateSubplots() 重置视图框
    │               └── Registry.call('_guiRelayout')
    │                       │
    │                       └── 完整重绘图表
    │
    └── 双击
            │
            └── doubleClick()
                    │
                    ├── 'reset' → 恢复初始范围
                    ├── 'autosize' → 自动调整
                    └── Registry.call('_guiRelayout')
```

---

## 十二、与 Contour 的关联

### 12.1 Contour 特殊处理

Contour 图在交互时需要特殊考虑：

1. **等值线重计算**: 当视图范围变化时，可能需要重新计算等值线路径
2. **标签重定位**: 标签位置基于新的路径重新优化
3. **填充区域更新**: 填充颜色需要与新范围匹配

### 12.2 交互后的重绘流程

```
relayout 触发
    │
    ├── cleanPlot() 清除旧图形
    │
    ├── doCalcdata() 重新计算数据
    │       │
    │       └── contour/calc.js 更新等值线参数
    │
    └── doPlot() 重新绘制
            │
            ├── makeCrossings() 重新计算交叉点
            ├── findAllPaths() 重新追踪路径
            ├── makeFills() 重绘填充
            ├── makeLinesAndLabels() 重绘线条和标签
            └── clipGaps() 应用裁剪
```

---

*文档生成时间: 2026-03-03*
