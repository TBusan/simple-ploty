# Plotly.js 等值线填充边界角落处理

## 一、问题描述

### 1.1 常规 Marching Squares 填充的角落问题

在标准的 Marching Squares 算法中，当使用 fill 模式填充等值线之间的区域时，**边界角落会出现折角问题**。这是因为：

1. Marching Squares 算法生成的等值线路径通常在数据边界处终止（开放路径）
2. 直接填充这些开放路径会导致角落区域无法正确闭合
3. 简单地连接端点会产生不自然的折角

```
问题示意 - 直接填充开放路径:

    ┌─────────────────────────────────┐
    │                                 │
    │     ╭───────────────╮           │
    │     │               │           │
    │     │    等值线     │           │
    │     │               │           │
    │     ╰───────────────╯           │
    │         ↑                       │
    │    端点直接连接                  │
    │    产生折角问题                  │
    └─────────────────────────────────┘

期望效果 - 沿边界正确闭合:

    ┌─────────────────────────────────┐
    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
    │ ░░░░╭───────────────╮░░░░░░░░░░ │
    │ ░░░░│               │░░░░░░░░░░ │
    │ ░░░░│    等值线     │░░░░░░░░░░ │
    │ ░░░░│               │░░░░░░░░░░ │
    │ ░░░░╰───────────────╯░░░░░░░░░░ │
    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
    └─────────────────────────────────┘
    填充区域沿着边界正确延伸
```

---

## 二、Plotly.js 的解决方案

### 2.1 整体策略

Plotly.js 通过以下机制解决角落填充问题：

1. **定义数据边界（Perimeter）**：明确数据的物理边界
2. **边缘路径追踪**：追踪所有到达边界的开放路径
3. **边界连接**：沿着边界（包括角落）连接开放路径的端点
4. **边界前缀**：当整个边界都需要填充时，添加完整的边界路径
5. **SVG evenodd 规则**：使用填充规则处理嵌套区域

### 2.2 核心数据结构

```javascript
// 源码位置: src/traces/contour/plot.js

// 定义数据边界（perimeter）
var leftedge = xa.c2p(x[0], true);
var rightedge = xa.c2p(x[x.length - 1], true);
var bottomedge = ya.c2p(y[0], true);
var topedge = ya.c2p(y[y.length - 1], true);

var perimeter = [
    [leftedge, topedge],      // 左上角
    [rightedge, topedge],     // 右上角
    [rightedge, bottomedge],  // 右下角
    [leftedge, bottomedge]    // 左下角
];
```

---

## 三、边界路径连接（joinAllPaths）

### 3.1 函数签名

```javascript
// 源码位置: src/traces/contour/plot.js

function joinAllPaths(pi, perimeter) {
    // pi: pathinfo 对象，包含该级别的所有路径信息
    // perimeter: 数据边界多边形的四个顶点

    var fullpath = '';
    var startsleft = pi.edgepaths.map(function(v, i) { return i; });

    // ... 连接逻辑
}
```

### 3.2 边界位置判断函数

```javascript
// 判断点是否在边界上的辅助函数
function istop(pt) { return Math.abs(pt[1] - perimeter[0][1]) < 0.01; }
function isbottom(pt) { return Math.abs(pt[1] - perimeter[2][1]) < 0.01; }
function isleft(pt) { return Math.abs(pt[0] - perimeter[0][0]) < 0.01; }
function isright(pt) { return Math.abs(pt[0] - perimeter[2][0]) < 0.01; }
```

### 3.3 角落连接逻辑

```javascript
// 源码位置: src/traces/contour/plot.js

while(startsleft.length) {
    // 添加当前边缘路径
    addpath = Drawing.smoothopen(pi.edgepaths[i], pi.smoothing);
    fullpath += newloop ? addpath : addpath.replace(/^M/, 'L');
    startsleft.splice(startsleft.indexOf(i), 1);

    // 获取当前路径的终点
    endpt = pi.edgepaths[i][pi.edgepaths[i].length - 1];
    nexti = -1;

    // 关键：沿着边界移动，经过角落
    for(cnt = 0; cnt < 4; cnt++) {
        if(istop(endpt) && !isright(endpt)) newendpt = perimeter[1]; // 右上角
        else if(isleft(endpt)) newendpt = perimeter[0];              // 左上角
        else if(isbottom(endpt)) newendpt = perimeter[3];            // 左下角
        else if(isright(endpt)) newendpt = perimeter[2];             // 右下角

        // 查找是否在路径上有新的起点
        for(possiblei = 0; possiblei < pi.edgepaths.length; possiblei++) {
            var ptNew = pi.edgepaths[possiblei][0];

            // 检查 ptNew 是否在 endpt 到 newendpt 的线段上
            if(Math.abs(endpt[0] - newendpt[0]) < 0.01) {
                // 垂直边
                if(Math.abs(endpt[0] - ptNew[0]) < 0.01 &&
                        (ptNew[1] - endpt[1]) * (newendpt[1] - ptNew[1]) >= 0) {
                    newendpt = ptNew;
                    nexti = possiblei;
                }
            } else if(Math.abs(endpt[1] - newendpt[1]) < 0.01) {
                // 水平边
                if(Math.abs(endpt[1] - ptNew[1]) < 0.01 &&
                        (ptNew[0] - endpt[0]) * (newendpt[0] - ptNew[0]) >= 0) {
                    newendpt = ptNew;
                    nexti = possiblei;
                }
            }
        }

        endpt = newendpt;

        // 如果找到了下一个路径，退出循环
        if(nexti >= 0) break;

        // 否则，添加边界线段（包括角落）
        fullpath += 'L' + newendpt;
    }
}
```

### 3.4 角落连接示意

```
边缘路径连接过程:

步骤 1: 路径 A 从左边进入，到上边离开
    ┌─────────────────────────────────┐
    │              ↑                  │
    │              │ A结束            │
    │     ╭────────╯                  │
    │     │                           │
    │     │  路径 A                   │
    └─────┘                           │
    ↑
    A开始

步骤 2: 沿边界移动到右上角
    ┌─────────────────────────────────┐
    │              ↑──────────────→ ● │  添加边界线段
    │              │ A结束            │  到右上角
    │     ╭────────╯                  │
    │     │                           │
    │     │  路径 A                   │
    └─────┘                           │

步骤 3: 如果上边有其他路径，连接它们
    ┌─────────────────────────────────┐
    │    ↑ 路径B    ↓ 路径C           │
    │    │          │                 │
    │    ╰──────────╯                 │
    │              │                  │
    │     ╭────────╯                  │
    │     │                           │
    └─────┘                           │

最终路径: A结束 → 沿上边 → B开始 → B结束 → 沿上边 → C开始 → C结束 → ...
```

---

## 四、边界前缀（prefixBoundary）

### 4.1 问题场景

当整个数据边界都需要被填充时（例如：等值线级别高于边界上所有值），需要在等值线路径前添加完整的边界路径。

```
需要 prefixBoundary 的情况:

    所有边界值 < level 时:

    ┌─────────────────────────────────┐
    │ ███████████████████████████████ │
    │ ███████████████████████████████ │
    │ ███████████████████████████████ │
    │ ███████████████████████████████ │
    │ ███████████████████████████████ │
    │ ███████████████████████████████ │
    │ ███████████████████████████████ │
    └─────────────────────────────────┘
    整个边界区域都需要填充
    需要先绘制完整的边界路径
```

### 4.2 prefixBoundary 判断逻辑

```javascript
// 源码位置: src/traces/contour/close_boundaries.js

module.exports = function(pathinfo, contours) {
    var pi0 = pathinfo[0];
    var z = pi0.z;

    switch(contours.type) {
        case 'levels':
            // 使用左上角和其相邻点的较小值
            var edgeVal2 = Math.min(z[0][0], z[0][1]);

            for(i = 0; i < pathinfo.length; i++) {
                var pi = pathinfo[i];

                // 如果没有边缘路径，且边界值高于当前级别
                // 则需要添加边界前缀
                pi.prefixBoundary = !pi.edgepaths.length &&
                    (edgeVal2 > pi.level || pi.starts.length && edgeVal2 === pi.level);
            }
            break;

        case 'constraint':
            // 约束等值线的边界处理
            // ...
            break;
    }
};
```

### 4.3 prefixBoundary 的使用

```javascript
// 源码位置: src/traces/contour/plot.js

function makeFills(plotgroup, pathinfo, perimeter, contours) {
    var boundaryPath = 'M' + perimeter.join('L') + 'Z';

    // ...

    fillitems.each(function(pi) {
        // 关键：如果需要边界前缀，先绘制完整边界
        var fullpath = (pi.prefixBoundary ? boundaryPath : '') +
            joinAllPaths(pi, perimeter);

        // ...
    });
}
```

---

## 五、SVG 填充规则（evenodd）

### 5.1 填充规则原理

Plotly.js 使用 SVG 的 `evenodd` 填充规则来处理嵌套的等值线区域：

```javascript
// SVG path 的 fill-rule 属性
// evenodd 规则：从任意点引出的射线，如果穿过路径奇数次则填充，偶数次则不填充
```

### 5.2 嵌套区域处理

```
evenodd 填充规则示意:

    外层路径: M 0,0 L 100,0 L 100,100 L 0,100 Z
    内层路径: M 25,25 L 75,25 L 75,75 L 25,75 Z

    ┌─────────────────────────────────┐
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░┌───────────────┐░░░░░░░░░│
    │░░░░░░░│               │░░░░░░░░░│
    │░░░░░░░│   不填充      │░░░░░░░░░│
    │░░░░░░░│   (偶数次)    │░░░░░░░░░│
    │░░░░░░░│               │░░░░░░░░░│
    │░░░░░░░└───────────────┘░░░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └─────────────────────────────────┘
    ░ = 填充区域 (奇数次穿越)
    空白 = 不填充区域 (偶数次穿越)
```

---

## 六、完整流程图

```
等值线填充的角落处理流程:

┌─────────────────────────────────────────────────────────────┐
│ 1. 定义数据边界 (perimeter)                                  │
│    - 计算四个角点的像素坐标                                   │
│    perimeter = [左上, 右上, 右下, 左下]                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Marching Squares 计算穿越点                               │
│    - 识别边界起点 (BOTTOMSTART, TOPSTART, etc.)             │
│    - 生成边缘路径 (edgepaths)                                │
│    - 生成内部路径 (paths)                                    │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. closeBoundaries: 判断是否需要边界前缀                     │
│    - 检查边界值与等值线级别的关系                             │
│    - 设置 pi.prefixBoundary                                  │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. joinAllPaths: 连接边缘路径                                │
│    - 遍历所有边缘路径                                        │
│    - 沿边界移动（包括角落）                                   │
│    - 添加边界线段连接端点                                    │
│    - 添加内部闭合路径                                        │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 构建完整填充路径                                          │
│    fullpath = (prefixBoundary ? boundaryPath : '') +        │
│               joinAllPaths(pi, perimeter)                   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. SVG 渲染                                                  │
│    - 使用 evenodd 填充规则                                   │
│    - 正确处理嵌套区域                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 七、具体示例

### 7.1 单条等值线的角落处理

```
场景：一条从左边进入、从上边离开的等值线

原始边缘路径:
    ┌─────────────────────────────────┐
    │                                 │
    │              ╭──                │
    │             ╱                   │
    │            ╱                    │
    │           ╱                     │
    │          ╱                      │
    │         ╱                       │
    └────────┘                        │

经过 joinAllPaths 后:
    ┌─────────────────────────────────┐
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← 添加上边到右上角
    │░░░░░░░░░░░░░░╭──░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░░░╱░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░╱░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░╱░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░╱░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░╱░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └────────┐← 添加左下角到起点的连接 │
    ↑       ░░░░░░░░░░░░░░░░░░░░░░░░░░│
    起点    └─────────────────────────┘
             ↑ 添加下边到左下角
```

### 7.2 多条边缘路径的连接

```
场景：两条等值线，一条在上边，一条在右边

原始边缘路径:
    ┌─────────────────────────────────┐
    │         ╭──╮                    │
    │        ╱    ╰──╮                │
    │       ╱         │               │
    │      ╱          │               │
    │     ╱           ╰──             │
    │    ╱                            │
    └───╯                             │
                                      │

连接后的填充路径:
    ┌─────────────────────────────────┐
    │░░░░░░░░╭──╮░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░╱░░░░╰──╮░░░░░░░░░░░░░░░░░░│
    │░░░░╱░░░░░░░░░░│░░░░░░░░░░░░░░░░░░│
    │░░░╱░░░░░░░░░░░│░░░░░░░░░░░░░░░░░░│
    │░░╱░░░░░░░░░░░░╰──░░░░░░░░░░░░░░░░│
    │░╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └╯░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    ↑░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    沿边界连接，形成完整的填充区域
```

---

## 八、边界方向规则

### 8.1 顺时针遍历

Plotly.js 在连接边界时遵循**顺时针方向**：

```
边界遍历方向:

        0 ───────────────→ 1
        │ 左上            右上
        │                    │
        ↑                    ↓
        │                    │
        │ 左下            右下
        3 ←─────────────── 2

perimeter = [0, 1, 2, 3] = [左上, 右上, 右下, 左下]
```

### 8.2 角落跳跃规则

```javascript
// 从终点到下一个角落的规则
if(istop(endpt) && !isright(endpt)) newendpt = perimeter[1]; // 上边 → 右上角
else if(isleft(endpt)) newendpt = perimeter[0];              // 左边 → 左上角
else if(isbottom(endpt)) newendpt = perimeter[3];            // 下边 → 左下角
else if(isright(endpt)) newendpt = perimeter[2];             // 右边 → 右下角
```

---

## 九、与常规实现的对比

### 9.1 常规实现的问题

```
常规 Marching Squares 填充:

问题1: 角落区域未填充
    ┌─────────────────────────────┐
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░╭──────────────╮░░░░░░░│
    │░░░░░░│              │    ??? │ ← 右上角未正确处理
    │░░░░░░│              │░░░░░░░│
    │░░░░░░╰──────────────╯░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └─────────────────────────────┘

问题2: 简单连接产生折角
    ┌─────────────────────────────┐
    │                             │
    │     ╭──────────────╮        │
    │     │              │        │
    │     │              │        │
    │     ╰──────────────╯        │
    │         \     /              │ ← 直线连接产生折角
    │          \   /               │
    └─────────────────────────────┘
```

### 9.2 Plotly.js 的解决方案

```
Plotly.js 的处理:

1. 沿边界连接（包括角落）:
    ┌─────────────────────────────┐
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░╭──────────────╮░░░░░░░│
    │░░░░░░│              │░░░░░░░│ ← 沿边界填充到角落
    │░░░░░░│              │░░░░░░░│
    │░░░░░░╰──────────────╯░░░░░░░│
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └─────────────────────────────┘

2. 多条路径的正确连接:
    ┌─────────────────────────────┐
    │░░░░░░░░░░╭──╮░░░░░░░░░░░░░░░│
    │░░░░░░░░╱░░░░╰─╮░░░░░░░░░░░░░│
    │░░░░░░╱░░░░░░░░░│░░░░░░░░░░░░░│
    │░░░░╱░░░░░░░░░░░╰──╮░░░░░░░░░░│
    │░░░╱░░░░░░░░░░░░░░░░╰──╮░░░░░░│
    │░░╱░░░░░░░░░░░░░░░░░░░░░╰──░░░│
    │░╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └╯░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    路径沿边界顺时针连接，包括角落
```

---

## 十、代码示例

### 10.1 完整的填充路径生成

```javascript
// 源码位置: src/traces/contour/plot.js

function makeFills(plotgroup, pathinfo, perimeter, contours) {
    var hasFills = contours.coloring === 'fill';
    var boundaryPath = 'M' + perimeter.join('L') + 'Z';

    // 1. 关闭边界（设置 prefixBoundary）
    if(hasFills) {
        closeBoundaries(pathinfo, contours);
    }

    var fillgroup = Lib.ensureSingle(plotgroup, 'g', 'contourfill');

    var fillitems = fillgroup.selectAll('path').data(hasFills ? pathinfo : []);

    fillitems.each(function(pi) {
        // 2. 构建完整路径
        //    - 如果需要，先添加边界路径
        //    - 然后添加连接后的等值线路径
        var fullpath = (pi.prefixBoundary ? boundaryPath : '') +
            joinAllPaths(pi, perimeter);

        if(!fullpath) {
            d3.select(this).remove();
        } else {
            d3.select(this)
                .attr('d', fullpath)
                .style('stroke', 'none');
        }
    });
}
```

### 10.2 背景填充

```javascript
// 源码位置: src/traces/contour/plot.js

function makeBackground(plotgroup, perimeter, contours) {
    var bggroup = Lib.ensureSingle(plotgroup, 'g', 'contourbg');

    // 背景是整个数据区域
    var bgfill = bggroup.selectAll('path')
        .data(contours.coloring === 'fill' ? [0] : []);

    bgfill.enter().append('path');
    bgfill.exit().remove();

    // 使用 perimeter 定义边界
    bgfill
        .attr('d', 'M' + perimeter.join('L') + 'Z')
        .style('stroke', 'none');
}
```

---

## 十一、总结

Plotly.js 解决 Marching Squares 边界角落填充问题的关键策略：

| 策略 | 描述 | 解决的问题 |
|------|------|-----------|
| **Perimeter 定义** | 明确数据的物理边界 | 提供边界参考 |
| **边界起点识别** | 识别从边界开始的路径 | 正确追踪开放路径 |
| **joinAllPaths** | 沿边界连接开放路径端点 | 避免折角，正确闭合 |
| **prefixBoundary** | 添加完整边界前缀 | 处理全边界填充情况 |
| **evenodd 规则** | SVG 填充规则 | 正确处理嵌套区域 |

这些策略共同确保了等值线填充在边界角落处的行为正确、视觉自然。

---

*文档生成时间: 2026-03-03*
