# Plotly.js Contour 平滑处理原理分析

## 概述

本文档详细分析 Plotly.js 中 contour（等高线）绘制的平滑处理机制，包括平滑参数的定义、平滑算法原理，以及如何确保在 `lines` 模式和 `fill` 模式下线条与填充区域保持一致的机制。

## 1. 平滑参数定义

### 1.1 属性定义位置

平滑参数定义在 `src/traces/contour/attributes.js` 中，继承自 scatter 的 line 属性：

```javascript
line: {
    // ... 其他属性
    smoothing: extendFlat({}, scatterLineAttrs.smoothing, {
        description: [
            'Sets the amount of smoothing for the contour lines,',
            'where *0* corresponds to no smoothing.'
        ].join(' ')
    })
}
```

### 1.2 参数规格

| 属性 | 值 |
|------|-----|
| 类型 | `number` |
| 最小值 | `0` |
| 最大值 | `1.3` |
| 默认值 | `1` |
| 说明 | `0` 表示无平滑（相当于线性形状） |

### 1.3 参数传递

平滑参数通过 `empty_pathinfo.js` 传递给路径信息对象：

```javascript
// src/traces/contour/empty_pathinfo.js
pathinfo.push(Lib.extendFlat({
    level: ci,
    crossings: {},
    starts: [],
    edgepaths: [],
    paths: [],
    z: cd0.z,
    smoothing: cd0.trace.line.smoothing  // 平滑参数
}, basePathinfo));
```

## 2. 平滑算法原理

### 2.1 算法类型

Plotly.js 使用 **Centripetal Catmull-Rom 样条曲线** 进行平滑处理。这是一种广义的 Catmull-Rom 样条，参考论文：[http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf](http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf)

### 2.2 核心参数

```javascript
// src/components/drawing/index.js
var CatmullRomExp = 0.5;  // Centripetal Catmull-Rom 的指数
```

- `CatmullRomExp = 0.5` 表示 **Centripetal（向心）** Catmull-Rom 样条
- 这种变体能够避免曲线产生自相交和尖点，特别适合等高线平滑

### 2.3 切线计算函数

```javascript
function makeTangent(prevpt, thispt, nextpt, smoothness) {
    // 计算与前一点的方向向量
    var d1x = prevpt[0] - thispt[0];
    var d1y = prevpt[1] - thispt[1];

    // 计算与后一点的方向向量
    var d2x = nextpt[0] - thispt[0];
    var d2y = nextpt[1] - thispt[1];

    // 计算距离的指数幂（Centripetal 参数化）
    var d1a = Math.pow(d1x * d1x + d1y * d1y, CatmullRomExp / 2);
    var d2a = Math.pow(d2x * d2x + d2y * d2y, CatmullRomExp / 2);

    // 计算切线方向
    var numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
    var numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;

    // 计算分母（用于入切线和出切线）
    var denom1 = 3 * d2a * (d1a + d2a);  // 入切线分母
    var denom2 = 3 * d1a * (d1a + d2a);  // 出切线分母

    // 返回两个控制点：[入切线控制点, 出切线控制点]
    return [
        [roundX(thispt[0] + (denom1 && numx / denom1)),
         roundY(thispt[1] + (denom1 && numy / denom1))],
        [roundX(thispt[0] - (denom2 && numx / denom2)),
         roundY(thispt[1] - (denom2 && numy / denom2))]
    ];
}
```

### 2.4 开放路径平滑

用于边缘路径（`edgepaths`），即接触数据边界的等高线：

```javascript
drawing.smoothopen = function (pts, smoothness) {
    if (pts.length < 3) {
        return 'M' + pts.join('L');  // 少于3点直接连线
    }

    var path = 'M' + pts[0];
    var tangents = [];

    // 为每个内部点计算切线
    for (var i = 1; i < pts.length - 1; i++) {
        tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
    }

    // 起始段：二次贝塞尔曲线
    path += 'Q' + tangents[0][0] + ' ' + pts[1];

    // 中间段：三次贝塞尔曲线
    for (var i = 2; i < pts.length - 1; i++) {
        path += 'C' + tangents[i - 2][1] + ' ' + tangents[i - 1][0] + ' ' + pts[i];
    }

    // 结束段：二次贝塞尔曲线
    path += 'Q' + tangents[pts.length - 3][1] + ' ' + pts[pts.length - 1];

    return path;
};
```

### 2.5 闭合路径平滑

用于内部闭合路径（`paths`），即完全在数据内部的环形等高线：

```javascript
drawing.smoothclosed = function (pts, smoothness) {
    if (pts.length < 3) {
        return 'M' + pts.join('L') + 'Z';
    }

    var path = 'M' + pts[0];
    var pLast = pts.length - 1;

    // 计算所有点的切线（包括首尾点的循环处理）
    var tangents = [makeTangent(pts[pLast], pts[0], pts[1], smoothness)];
    for (var i = 1; i < pLast; i++) {
        tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
    }
    tangents.push(makeTangent(pts[pLast - 1], pts[pLast], pts[0], smoothness));

    // 所有段都使用三次贝塞尔曲线
    for (var i = 1; i <= pLast; i++) {
        path += 'C' + tangents[i - 1][1] + ' ' + tangents[i][0] + ' ' + pts[i];
    }

    // 闭合回到起点
    path += 'C' + tangents[pLast][1] + ' ' + tangents[0][0] + ' ' + pts[0] + 'Z';

    return path;
};
```

## 3. 线与填充一致性的实现原理

### 3.1 核心设计理念

Plotly.js 确保 `lines` 模式和 `fill` 模式一致性的关键在于：**平滑处理是在 SVG 路径生成阶段应用的，而非数据阶段**。

### 3.2 数据流架构

```
                    ┌─────────────────┐
                    │   原始数据 (z)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Marching Squares │  ← make_crossings.js
                    │   生成交叉点      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  find_all_paths  │  ← find_all_paths.js
                    │   生成路径点      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    pathinfo      │  ← 存储原始路径点
                    │  - edgepaths     │     (未经平滑)
                    │  - paths         │
                    │  - smoothing     │     平滑参数
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │    makeFills     │          │  makeLinesAndLabels │
    │  (填充绘制)       │          │    (线条绘制)        │
    └────────┬─────────┘          └────────┬───────────┘
             │                              │
             │                              │
             ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ Drawing.         │          │ Drawing.         │
    │ smoothopen()     │          │ smoothopen()     │
    │ smoothclosed()   │          │ smoothclosed()   │
    └────────┬─────────┘          └────────┬───────────┘
             │                              │
             └──────────────┬──────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  相同的平滑算法   │
                   │  相同的路径点     │
                   │  = 完美对齐      │
                   └─────────────────┘
```

### 3.3 填充路径生成（makeFills）

```javascript
// src/traces/contour/plot.js - joinAllPaths 函数
function joinAllPaths(pi, perimeter) {
    var fullpath = '';

    // ... 边界处理逻辑 ...

    while(startsleft.length) {
        // 使用 smoothopen 处理边缘路径
        addpath = Drawing.smoothopen(pi.edgepaths[i], pi.smoothing);
        fullpath += newloop ? addpath : addpath.replace(/^M/, 'L');
        // ... 连接逻辑 ...
    }

    // 处理内部闭合路径
    for(i = 0; i < pi.paths.length; i++) {
        // 使用 smoothclosed 处理闭合路径
        fullpath += Drawing.smoothclosed(pi.paths[i], pi.smoothing);
    }

    return fullpath;
}
```

### 3.4 线条路径生成（createLines）

```javascript
// src/traces/contour/plot.js - createLines 函数
exports.createLines = function(lineContainer, makeLines, pathinfo, isStatic) {
    var smoothing = pathinfo[0].smoothing;  // 获取相同的平滑参数

    // ... 创建 DOM 元素 ...

    // 开放线条
    var opencontourlines = linegroup.selectAll('path.openline')
        .data(function(d) { return d.pedgepaths || d.edgepaths; });

    opencontourlines.attr('d', function(d) {
        return Drawing.smoothopen(d, smoothing);  // 相同的平滑函数
    });

    // 闭合线条
    var closedcontourlines = linegroup.selectAll('path.closedline')
        .data(function(d) { return d.ppaths || d.paths; });

    closedcontourlines.attr('d', function(d) {
        return Drawing.smoothclosed(d, smoothing);  // 相同的平滑函数
    });

    return linegroup;
};
```

### 3.5 一致性保证机制

| 方面 | 填充 (Fill) | 线条 (Lines) | 一致性保证 |
|------|-------------|--------------|------------|
| 数据源 | `pathinfo.edgepaths`, `pathinfo.paths` | `pathinfo.edgepaths`, `pathinfo.paths` | ✅ 相同 |
| 平滑参数 | `pi.smoothing` | `pathinfo[0].smoothing` | ✅ 相同 |
| 开放路径平滑函数 | `Drawing.smoothopen()` | `Drawing.smoothopen()` | ✅ 相同 |
| 闭合路径平滑函数 | `Drawing.smoothclosed()` | `Drawing.smoothclosed()` | ✅ 相同 |
| SVG 路径生成时机 | 渲染阶段 | 渲染阶段 | ✅ 相同 |

## 4. 平滑算法数学原理

### 4.1 Centripetal Catmull-Rom 样条

Catmull-Rom 样条是一种插值样条，经过所有控制点。其一般形式为：

```
P(t) = 0.5 * [
    (2*P1) +
    (-P0 + P2)*t +
    (2*P0 - 5*P1 + 4*P2 - P3)*t² +
    (-P0 + 3*P1 - 3*P2 + P3)*t³
]
```

其中 P0, P1, P2, P3 是四个连续控制点。

### 4.2 参数化变体

| 类型 | 指数 α | 特点 |
|------|--------|------|
| Uniform | 0 | 最简单，但可能产生尖点和自相交 |
| **Centripetal** | **0.5** | **避免自相交，曲线更平滑** |
| Chordal | 1 | 曲线更"松散" |

Plotly.js 选择 α = 0.5（Centripetal），这是最适合等高线的变体。

### 4.3 贝塞尔曲线转换

Catmull-Rom 样条可以转换为三次贝塞尔曲线：

```
对于点 P_i，贝塞尔控制点为：
- 入控制点: P_i + (P_{i+1} - P_{i-1}) / 6 * tension
- 出控制点: P_i - (P_{i+1} - P_{i-1}) / 6 * tension
```

其中 `tension` 由 `smoothness` 参数和距离加权计算得出。

## 5. 实际应用示例

### 5.1 不同平滑值的效果

```javascript
// 无平滑（折线）
var trace1 = {
    type: 'contour',
    z: data,
    line: { smoothing: 0 }
};

// 默认平滑（推荐）
var trace2 = {
    type: 'contour',
    z: data,
    line: { smoothing: 1 }  // 默认值
};

// 最大平滑
var trace3 = {
    type: 'contour',
    z: data,
    line: { smoothing: 1.3 }
};
```

### 5.2 fill 模式与 lines 模式

```javascript
// fill 模式：填充区域
var traceFill = {
    type: 'contour',
    z: data,
    contours: {
        coloring: 'fill'
    },
    line: { smoothing: 1 }
};

// lines 模式：仅显示线条
var traceLines = {
    type: 'contour',
    z: data,
    contours: {
        coloring: 'lines'
    },
    line: { smoothing: 1 }
};
```

两种模式使用相同的平滑算法，确保视觉一致性。

## 6. 关键文件索引

| 文件 | 功能 |
|------|------|
| `src/traces/contour/attributes.js` | 定义 smoothing 属性 |
| `src/traces/contour/empty_pathinfo.js` | 将 smoothing 传递给路径信息 |
| `src/traces/contour/make_crossings.js` | Marching Squares 交点计算 |
| `src/traces/contour/find_all_paths.js` | 路径查找和点序列生成 |
| `src/traces/contour/plot.js` | 渲染逻辑，调用平滑函数 |
| `src/components/drawing/index.js` | smoothopen/smoothclosed 实现 |

## 7. 总结

Plotly.js 的 contour 平滑处理采用了以下设计：

1. **统一的数据源**：填充和线条使用相同的原始路径点数据
2. **统一的平滑参数**：同一 trace 共享同一个 smoothing 值
3. **统一的算法实现**：使用相同的 Catmull-Rom 样条函数
4. **延迟平滑策略**：在 SVG 路径生成时才应用平滑，而非预处理数据

这种设计确保了无论使用 `fill`、`lines` 还是 `heatmap` 模式，等高线的形状始终保持一致，视觉效果完美对齐。
