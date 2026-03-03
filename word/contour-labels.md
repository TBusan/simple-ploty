# Plotly.js 等值线标签放置算法

## 一、概述

等值线标签（contour labels）是在等值线上显示数值标注的功能。Plotly.js 使用**成本函数优化算法**来确定标签的最佳位置，避免标签重叠、边缘截断等问题。

---

## 二、标签系统配置

### 2.1 相关属性

```javascript
{
    type: 'contour',
    contours: {
        // 显示标签
        showlabels: true,

        // 标签字体
        labelfont: {
            family: 'Arial',
            size: 12,
            color: 'black'
        },

        // 标签格式
        labelformat: '.1f'  // 数字格式字符串
    }
}
```

### 2.2 常量配置

```javascript
// 源码位置: src/traces/contour/constants.js

module.exports = {
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

---

## 三、标签绘制流程

### 3.1 主流程

```javascript
// 源码位置: src/traces/contour/plot.js

function makeLinesAndLabels(plotgroup, pathinfo, gd, cd0, contours) {
    var showLabels = contours.showlabels;
    var showLines = contours.showlines !== false;

    // 即使不显示线条，也需要创建线条元素来定位标签
    var linegroup = exports.createLines(lineContainer, showLines || showLabels, pathinfo);

    if(showLabels) {
        var labelData = [];
        var labelClipPathData = [];

        // 格式化函数
        var contourFormat = exports.labelFormatter(gd, cd0);

        // 计算显示边界
        var bounds = calculateBounds(pathinfo, cd0);

        // 遍历每条等值线
        linegroup.each(function(d) {
            var textOpts = exports.calcTextOpts(d.level, contourFormat, dummyText, gd);

            d3.select(this).selectAll('path').each(function() {
                var path = this;

                // 获取可见路径段
                var pathBounds = Lib.getVisibleSegment(path, bounds, textOpts.height / 2);
                if(!pathBounds) return;

                // 检查路径长度是否足够
                if(pathBounds.len < (textOpts.width + textOpts.height) * constants.LABELMIN) return;

                // 计算最大标签数
                var maxLabels = Math.min(
                    Math.ceil(pathBounds.len / normLength),
                    constants.LABELMAX
                );

                // 寻找最佳位置并添加标签
                for(var i = 0; i < maxLabels; i++) {
                    var loc = exports.findBestTextLocation(path, pathBounds, textOpts, labelData, bounds);
                    if(!loc) break;
                    exports.addLabelData(loc, textOpts, labelData, labelClipPathData);
                }
            });
        });

        // 绘制标签
        exports.drawLabels(labelGroup, labelData, gd, lineClip, labelClipPathData);
    }
}
```

---

## 四、标签格式化

### 4.1 格式化器生成

```javascript
// 源码位置: src/traces/contour/plot.js

exports.labelFormatter = function(gd, cd0) {
    var trace = cd0.trace;
    var contours = trace.contours;

    var formatAxis = {
        type: 'linear',
        _id: 'ycontour',
        showexponent: 'all',
        exponentformat: 'B'
    };

    // 使用自定义格式或从 colorbar 获取
    if(contours.labelformat) {
        formatAxis.tickformat = contours.labelformat;
        setConvert(formatAxis, fullLayout);
    } else {
        // 从 colorbar 轴获取格式
        var cOpts = Colorscale.extractOpts(trace);
        if(cOpts && cOpts.colorbar && cOpts.colorbar._axis) {
            formatAxis = cOpts.colorbar._axis;
        } else {
            // 使用等值线范围
            formatAxis.range = [contours.start, contours.end];
            formatAxis.nticks = (contours.end - contours.start) / contours.size;
            setConvert(formatAxis, fullLayout);
            Axes.prepTicks(formatAxis);
        }
    }

    return function(v) { return Axes.tickText(formatAxis, v).text; };
};
```

### 4.2 文本选项计算

```javascript
exports.calcTextOpts = function(level, contourFormat, dummyText, gd) {
    var text = contourFormat(level);

    // 使用隐藏的文本元素测量尺寸
    dummyText.text(text)
        .call(svgTextUtils.convertToTspans, gd);

    var el = dummyText.node();
    var bBox = Drawing.bBox(el, true);

    return {
        text: text,
        width: bBox.width,
        height: bBox.height,
        fontSize: +(el.style['font-size'].replace('px', '')),
        level: level,
        dy: (bBox.top + bBox.bottom) / 2
    };
};
```

---

## 五、位置优化算法

### 5.1 搜索最佳位置

```javascript
// 源码位置: src/traces/contour/plot.js

exports.findBestTextLocation = function(path, pathBounds, textOpts, labelData, plotBounds) {
    var textWidth = textOpts.width;
    var cost = Infinity;
    var loc;

    // 确定搜索范围
    var p0, dp, pMax, pMin;
    if(pathBounds.isClosed) {
        // 闭合路径：从路径中间开始
        dp = pathBounds.len / costConstants.INITIALSEARCHPOINTS;
        p0 = pathBounds.min + dp / 2;
        pMax = pathBounds.max;
    } else {
        // 开放路径：留出标签宽度的边距
        dp = (pathBounds.len - textWidth) / (costConstants.INITIALSEARCHPOINTS + 1);
        p0 = pathBounds.min + dp + textWidth / 2;
        pMax = pathBounds.max - (dp + textWidth) / 2;
    }

    // 多次迭代搜索
    for(var j = 0; j < costConstants.ITERATIONS; j++) {
        for(var p = p0; p < pMax; p += dp) {
            var newLocation = Lib.getTextLocation(path, pathBounds.total, p, textWidth);
            var newCost = locationCost(newLocation, textOpts, labelData, plotBounds);

            if(newCost < cost) {
                cost = newCost;
                loc = newLocation;
                pMin = p;
            }
        }

        // 成本太高，放弃
        if(cost > costConstants.MAXCOST * 2) break;

        // 二分搜索：缩小搜索范围
        if(j) dp /= 2;
        p0 = pMin - dp / 2;
        pMax = p0 + dp * 1.5;
    }

    // 只有成本低于阈值才返回位置
    if(cost <= costConstants.MAXCOST) return loc;
};
```

### 5.2 成本函数

成本函数由三部分组成：边缘接近惩罚、角度偏离惩罚、邻近标签惩罚。

```javascript
function locationCost(loc, textOpts, labelData, bounds) {
    var halfWidth = textOpts.width / 2;
    var halfHeight = textOpts.height / 2;
    var x = loc.x;
    var y = loc.y;
    var theta = loc.theta;

    var dx = Math.cos(theta) * halfWidth;
    var dy = Math.sin(theta) * halfWidth;

    // 1. 边缘接近成本
    var normX = ((x > bounds.center) ? (bounds.right - x) : (x - bounds.left)) /
        (dx + Math.abs(Math.sin(theta) * halfHeight));
    var normY = ((y > bounds.middle) ? (bounds.bottom - y) : (y - bounds.top)) /
        (Math.abs(dy) + Math.cos(theta) * halfHeight);

    // 太靠近边缘，成本无限大
    if(normX < 1 || normY < 1) return Infinity;

    var cost = costConstants.EDGECOST * (1 / (normX - 1) + 1 / (normY - 1));

    // 2. 角度偏离成本（越水平越好）
    cost += costConstants.ANGLECOST * theta * theta;

    // 3. 邻近标签成本
    var x1 = x - dx;
    var y1 = y - dy;
    var x2 = x + dx;
    var y2 = y + dy;

    for(var i = 0; i < labelData.length; i++) {
        var labeli = labelData[i];
        var dxd = Math.cos(labeli.theta) * labeli.width / 2;
        var dyd = Math.sin(labeli.theta) * labeli.width / 2;

        // 计算两个标签线段之间的距离
        var dist = Lib.segmentDistance(
            x1, y1, x2, y2,
            labeli.x - dxd, labeli.y - dyd,
            labeli.x + dxd, labeli.y + dyd
        ) * 2 / (textOpts.height + labeli.height);

        // 同级别标签需要更大距离
        var sameLevel = labeli.level === textOpts.level;
        var distOffset = sameLevel ? costConstants.SAMELEVELDISTANCE : 1;

        // 太近则成本无限
        if(dist <= distOffset) return Infinity;

        // 距离惩罚
        var distFactor = costConstants.NEIGHBORCOST *
            (sameLevel ? costConstants.SAMELEVELFACTOR : 1);
        cost += distFactor / (dist - distOffset);
    }

    return cost;
}
```

### 5.3 成本函数图解

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

---

## 六、标签数据生成

### 6.1 添加标签数据

```javascript
exports.addLabelData = function(loc, textOpts, labelData, labelClipPathData) {
    var fontSize = textOpts.fontSize;
    var w = textOpts.width + fontSize / 3;
    var h = Math.max(0, textOpts.height - fontSize / 3);

    var x = loc.x;
    var y = loc.y;
    var theta = loc.theta;

    var sin = Math.sin(theta);
    var cos = Math.cos(theta);

    // 旋转函数
    var rotateXY = function(dx, dy) {
        return [
            x + dx * cos - dy * sin,
            y + dx * sin + dy * cos
        ];
    };

    // 计算旋转后的边界框顶点
    var bBoxPts = [
        rotateXY(-w / 2, -h / 2),
        rotateXY(-w / 2, h / 2),
        rotateXY(w / 2, h / 2),
        rotateXY(w / 2, -h / 2)
    ];

    // 添加标签数据
    labelData.push({
        text: textOpts.text,
        x: x,
        y: y,
        dy: textOpts.dy,
        theta: theta,
        level: textOpts.level,
        width: w,
        height: h
    });

    // 添加裁剪路径数据
    labelClipPathData.push(bBoxPts);
};
```

### 6.2 绘制标签

```javascript
exports.drawLabels = function(labelGroup, labelData, gd, lineClip, labelClipPathData) {
    var labels = labelGroup.selectAll('text')
        .data(labelData, function(d) {
            return d.text + ',' + d.x + ',' + d.y + ',' + d.theta;
        });

    labels.exit().remove();

    labels.enter().append('text')
        .attr({
            'data-notex': 1,
            'text-anchor': 'middle'
        })
        .each(function(d) {
            // 调整垂直位置
            var x = d.x + Math.sin(d.theta) * d.dy;
            var y = d.y - Math.cos(d.theta) * d.dy;

            d3.select(this)
                .text(d.text)
                .attr({
                    x: x,
                    y: y,
                    transform: 'rotate(' + (180 * d.theta / Math.PI) + ' ' + x + ' ' + y + ')'
                })
                .call(svgTextUtils.convertToTspans, gd);
        });

    // 创建线条裁剪路径（让标签处线条不显示）
    if(labelClipPathData) {
        var clipPath = '';
        for(var i = 0; i < labelClipPathData.length; i++) {
            clipPath += 'M' + labelClipPathData[i].join('L') + 'Z';
        }

        var lineClipPath = Lib.ensureSingle(lineClip, 'path', '');
        lineClipPath.attr('d', clipPath);
    }
};
```

---

## 七、标签数量控制

### 7.1 标准长度计算

```javascript
var plotDiagonal = Math.sqrt(xLen * xLen + yLen * yLen);

// 标准路径长度（用于确定标签间隔）
var normLength = constants.LABELDISTANCE * plotDiagonal /
    Math.max(1, pathinfo.length / constants.LABELINCREASE);
```

### 7.2 最大标签数

```javascript
var maxLabels = Math.min(
    Math.ceil(pathBounds.len / normLength),
    constants.LABELMAX  // 最多 10 个
);
```

### 7.3 最小路径长度

```javascript
// 路径长度必须至少是标签长度的 3 倍
if(pathBounds.len < (textOpts.width + textOpts.height) * constants.LABELMIN) return;
```

---

## 八、线条裁剪

### 8.1 裁剪原理

为了让标签可读，需要在标签位置裁剪掉等值线：

```javascript
// 创建裁剪路径
if(clipLinesForLabels) {
    var clipId = 'clipline' + uid;

    lineClip = clips.selectAll('#' + clipId)
        .data([0]);

    lineClip.enter().append('clipPath')
        .classed('contourlineclip', true)
        .attr('id', clipId);

    Drawing.setClipUrl(lineContainer, clipId, gd);
}
```

### 8.2 裁剪效果

```
无裁剪:
─────────────15─────────────

有裁剪:
────────────   15   ────────────
              ↑标签位置，线条被裁剪
```

---

## 九、完整流程图

```
用户数据
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. 创建等值线路径 (Marching Squares)                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 创建标签格式化器                                         │
│    - 使用 labelformat 或从 colorbar 获取                    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 遍历每条等值线                                           │
│    for each path in paths:                                  │
│        a. 计算可见路径段                                    │
│        b. 检查路径长度                                      │
│        c. 计算最大标签数                                    │
│        d. 搜索最佳位置                                      │
│        e. 添加标签数据                                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 绘制标签                                                 │
│    - 创建 SVG text 元素                                     │
│    - 应用旋转和位置                                         │
│    - 创建线条裁剪路径                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 十、优化技巧

### 10.1 避免重叠

1. **成本函数惩罚**：邻近标签有高成本
2. **同级别额外惩罚**：同一等值线级别的标签需要更大间距
3. **无限成本**：太近的标签直接拒绝

### 10.2 边缘处理

1. **边界检测**：计算标签是否在可视范围内
2. **边缘惩罚**：接近边缘的位置有高成本
3. **完全截断**：超出边界的位置成本无限

### 10.3 角度优化

1. **水平偏好**：越接近水平角度成本越低
2. **路径跟随**：标签角度与路径切线一致
3. **可读性**：避免过于倾斜的标签

---

*文档生成时间: 2026-03-03*
