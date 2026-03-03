# Plotly.js 等值线 Null 数据处理与 connectgaps 机制

## 一、概述

在处理等值线数据时，经常会遇到缺失值（null、undefined、NaN）的情况。Plotly.js 提供了两种处理方式：
1. **connectgaps = false**：保留空白区域，等值线绕过缺失数据
2. **connectgaps = true**：通过插值填充缺失数据，生成连续的等值线

---

## 二、Null 数据的识别

### 2.1 寻找空白点

```javascript
// 源码位置: src/traces/heatmap/find_empties.js

module.exports = function findEmpties(z) {
    var empties = [];
    var neighborHash = {};
    var noNeighborList = [];

    for(i = 0; i < z.length; i++) {
        for(j = 0; j < rowLength; j++) {
            if(row[j] === undefined) {
                // 计算有效邻居数量
                neighborCount = (row[j - 1] !== undefined ? 1 : 0) +
                    (row[j + 1] !== undefined ? 1 : 0) +
                    (prevRow[j] !== undefined ? 1 : 0) +
                    (nextRow[j] !== undefined ? 1 : 0);

                if(neighborCount) {
                    // 边界点增加虚拟邻居
                    if(i === 0) neighborCount++;
                    if(j === 0) neighborCount++;
                    if(i === z.length - 1) neighborCount++;
                    if(j === row.length - 1) neighborCount++;

                    empties.push([i, j, neighborCount]);
                } else {
                    // 没有有效邻居的点
                    noNeighborList.push([i, j]);
                }
            }
        }
    }

    // 处理孤立的空白点（被其他空白点包围）
    while(noNeighborList.length) {
        // 迭代查找间接邻居
        // ...
    }

    // 按邻居数量降序排序（优先处理邻居多的点）
    return empties.sort(function(a, b) { return b[2] - a[2]; });
};
```

### 2.2 空白点数据结构

每个空白点用 `[i, j, neighborCount]` 表示：
- `i`: 行索引
- `j`: 列索引
- `neighborCount`: 有效邻居数量（用于确定插值顺序）

---

## 三、connectgaps = true 时的插值算法

### 3.1 泊松方程求解器

Plotly.js 使用**迭代泊松方程求解器**来填充缺失数据，这实际上就是**反复对邻居值取平均**：

```javascript
// 源码位置: src/traces/heatmap/interp2d.js

module.exports = function interp2d(z, emptyPoints) {
    var maxFractionalChange = 1;

    // 第一遍：给所有空白点一个初始值
    iterateInterp2d(z, emptyPoints);

    // 迭代直到收敛
    for(i = 0; i < 100 && maxFractionalChange > INTERPTHRESHOLD; i++) {
        maxFractionalChange = iterateInterp2d(z, emptyPoints,
            correctionOvershoot(maxFractionalChange));
    }

    return z;
};
```

### 3.2 单次迭代

```javascript
function iterateInterp2d(z, emptyPoints, overshoot) {
    var maxFractionalChange = 0;

    for(p = 0; p < emptyPoints.length; p++) {
        var thisPt = emptyPoints[p];
        var i = thisPt[0];
        var j = thisPt[1];
        var initialVal = z[i][j];
        var neighborSum = 0;
        var neighborCount = 0;

        // 收集四个方向的邻居值
        for(q = 0; q < 4; q++) {
            neighborShift = NEIGHBORSHIFTS[q]; // [[-1,0], [1,0], [0,-1], [0,1]]
            neighborRow = z[i + neighborShift[0]];
            if(!neighborRow) continue;
            neighborVal = neighborRow[j + neighborShift[1]];
            if(neighborVal !== undefined) {
                // 记录最小和最大邻居值
                if(neighborSum === 0) {
                    minNeighbor = maxNeighbor = neighborVal;
                } else {
                    minNeighbor = Math.min(minNeighbor, neighborVal);
                    maxNeighbor = Math.max(maxNeighbor, neighborVal);
                }
                neighborCount++;
                neighborSum += neighborVal;
            }
        }

        // 泊松方程插值：每个点等于邻居的平均值
        z[i][j] = neighborSum / neighborCount;

        // 使用过冲加速收敛
        if(initialVal !== undefined) {
            z[i][j] = (1 + overshoot) * z[i][j] - overshoot * initialVal;

            // 计算收敛指标
            if(maxNeighbor > minNeighbor) {
                maxFractionalChange = Math.max(maxFractionalChange,
                    Math.abs(z[i][j] - initialVal) / (maxNeighbor - minNeighbor));
            }
        }
    }

    return maxFractionalChange;
}
```

### 3.3 过冲系数

```javascript
function correctionOvershoot(maxFractionalChange) {
    // 开始时过冲较小，确保稳定
    // 收敛后增加过冲，加速收敛
    return 0.5 - 0.25 * Math.min(1, maxFractionalChange * 0.5);
}
```

### 3.4 插值流程图

```
原始数据（含 null）
        │
        ▼
┌─────────────────────────────────────┐
│ findEmpties(): 找到所有空白点       │
│ 按邻居数量排序（多→少）              │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 第一遍迭代：初始值填充              │
│ 每个空白点 = 邻居平均值             │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 迭代优化（最多 100 次）             │
│ - 重新计算每个空白点                │
│ - 使用过冲加速收敛                  │
│ - 检查收敛条件                      │
└─────────────────────────────────────┘
        │
        ▼
收敛后数据（无 null）
```

---

## 四、connectgaps = false 时的处理

### 4.1 数据掩码生成

当 `connectgaps = false` 时，需要生成一个掩码来确定哪些区域应该显示：

```javascript
// 源码位置: src/traces/contour/plot.js

function makeClipMask(cd0) {
    var empties = cd0.trace._emptypoints;
    var z = [];
    var m = cd0.z.length;
    var n = cd0.z[0].length;

    // 初始化掩码为 1（全部有数据）
    for(i = 0; i < n; i++) row.push(1);
    for(i = 0; i < m; i++) z.push(row.slice());

    // 标记空白点为 0
    for(i = 0; i < empties.length; i++) {
        emptyPoint = empties[i];
        z[emptyPoint[0]][emptyPoint[1]] = 0;
    }

    // 保存掩码用于悬停判断
    cd0.zmask = z;
    return z;
}
```

### 4.2 裁剪路径生成

使用 Marching Squares 算法在掩码数据上生成裁剪路径：

```javascript
// 源码位置: src/traces/contour/plot.js

function clipGaps(plotGroup, plotinfo, gd, cd0, perimeter) {
    var trace = cd0.trace;

    // 只有 connectgaps=false 时才创建裁剪
    var clipPath = clips.selectAll('#' + clipId)
        .data(trace.connectgaps ? [] : [0]);

    if(trace.connectgaps === false) {
        var clipPathInfo = {
            level: 0.9,           // 在有数据和无数据之间的边界
            crossings: {},
            starts: [],
            edgepaths: [],
            paths: [],
            xaxis: plotinfo.xaxis,
            yaxis: plotinfo.yaxis,
            x: cd0.x,
            y: cd0.y,
            z: makeClipMask(cd0), // 0=无数据, 1=有数据
            smoothing: 0
        };

        // 使用 Marching Squares 找到数据边界
        makeCrossings([clipPathInfo]);
        findAllPaths([clipPathInfo]);
        closeBoundaries([clipPathInfo], {type: 'levels'});

        // 生成裁剪路径
        var path = Lib.ensureSingle(clipPath, 'path', '');
        path.attr('d',
            (clipPathInfo.prefixBoundary ? 'M' + perimeter.join('L') + 'Z' : '') +
            joinAllPaths(clipPathInfo, perimeter)
        );
    }
}
```

### 4.3 裁剪边界计算

`level: 0.9` 的选择很关键：
- 如果设为 1.0，孤立的数据点会完全消失
- 0.9 意味着在有数据区域的边界稍内处裁剪

```
level = 0.9 的效果:
    ┌─────────────────────┐
    │ 1   1   1   1   1   │
    │ 1   1   1   0   1   │  ← 孤立点周围 0.9 边界会包含它
    │ 1   1   1   1   1   │
    │ 1   0   0   0   1   │  ← 连续空白区域会被裁剪
    │ 1   1   1   1   1   │
    └─────────────────────┘
```

---

## 五、数据清理流程

### 5.1 heatmap/calc.js 中的处理

```javascript
// 源码位置: src/traces/heatmap/calc.js

module.exports = function calc(gd, trace) {
    // ... 数据准备

    // 对于 contour 或 connectgaps=true 的情况
    if(!isHist && (isContour || trace.connectgaps)) {
        // 1. 找到所有空白点
        trace._emptypoints = findEmpties(z);

        // 2. 插值填充空白点
        interp2d(z, trace._emptypoints);
    }

    // ...
};
```

### 5.2 处理流程

```
输入 z 矩阵
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 判断条件                                                    │
│ isContour || trace.connectgaps ?                           │
└─────────────────────────────────────────────────────────────┘
      │
      ├── 否 ──→ 不处理，保留 null 值
      │
      └── 是 ──→
                │
                ▼
         ┌──────────────────┐
         │ findEmpties(z)   │ → 找到所有空白点
         └──────────────────┘
                │
                ▼
         ┌──────────────────┐
         │ interp2d(z, ...) │ → 泊松插值填充
         └──────────────────┘
                │
                ▼
         填充后的 z 矩阵
```

---

## 六、等值线在 null 边界的行为

### 6.1 connectgaps = false

等值线会在数据边界处停止：

```
数据区域:          等值线行为:
┌───────────┐      ┌───────────┐
│ 1 2 3 4 5 │      │ ────┬──── │
│ 2 3 4 5 6 │      │     │     │
│ 3 4 X 6 7 │  →   │ ────┼──── │  ← 等值线在 null 边界断开
│ 4 5 X 7 8 │      │     │     │
│ 5 6 7 8 9 │      │ ────┴──── │
└───────────┘      └───────────┘
    (X = null)
```

### 6.2 connectgaps = true

等值线会穿过插值区域：

```
数据区域:          插值后:            等值线:
┌───────────┐      ┌───────────┐      ┌───────────┐
│ 1 2 3 4 5 │      │ 1 2 3 4 5 │      │ ───────── │
│ 2 3 4 5 6 │      │ 2 3 4 5 6 │      │ ───────── │
│ 3 4 X 6 7 │  →   │ 3 4 5 6 7 │  →   │ ───────── │  ← 连续等值线
│ 4 5 X 7 8 │      │ 4 5 6 7 8 │      │ ───────── │
│ 5 6 7 8 9 │      │ 5 6 7 8 9 │      │ ───────── │
└───────────┘      └───────────┘      └───────────┘
```

---

## 七、相关配置属性

### 7.1 contour trace 属性

```javascript
{
    type: 'contour',
    z: [[...], [...], ...],    // 2D 数据数组

    // null 处理
    connectgaps: false,        // 是否连接空白区域

    // 其他相关属性
    zsmooth: false,            // 'fast' | 'best' | false
    autocontour: true,         // 自动计算等值线级别
    ncontours: 15,             // 等值线数量（autocontour=true 时）
}
```

### 7.2 heatmap trace 属性

```javascript
{
    type: 'heatmap',
    z: [[...], [...], ...],

    // null 处理
    connectgaps: false,

    // 插值平滑
    zsmooth: 'best',           // 对非均匀网格使用插值
}
```

---

## 八、特殊情况处理

### 8.1 完全孤立的空白点

当某个空白点完全没有有效邻居时，需要迭代查找间接邻居：

```javascript
// 源码位置: src/traces/heatmap/find_empties.js

while(noNeighborList.length) {
    newNeighborHash = {};
    foundNewNeighbors = false;

    for(p = noNeighborList.length - 1; p >= 0; p--) {
        thisPt = noNeighborList[p];
        i = thisPt[0];
        j = thisPt[1];

        // 查找是否有已被处理的邻居
        neighborCount = ((neighborHash[[i - 1, j]] || blank)[2] +
            (neighborHash[[i + 1, j]] || blank)[2] +
            (neighborHash[[i, j - 1]] || blank)[2] +
            (neighborHash[[i, j + 1]] || blank)[2]) / 20;

        if(neighborCount) {
            newNeighborHash[thisPt] = [i, j, neighborCount];
            noNeighborList.splice(p, 1);
            foundNewNeighbors = true;
        }
    }

    // 将新找到的点加入处理列表
    for(thisPt in newNeighborHash) {
        neighborHash[thisPt] = newNeighborHash[thisPt];
        empties.push(newNeighborHash[thisPt]);
    }
}
```

### 8.2 大面积空白区域

对于大面积空白区域，插值会从边缘向中心逐步进行：

```
迭代过程:
迭代 1:    迭代 2:    迭代 3:    ...
┌─────┐    ┌─────┐    ┌─────┐
│ 1 1 │    │ 1 1 │    │ 1 1 │
│ 1 X │    │ 1 1 │    │ 1 1 │
│ X X │ →  │ X X │ →  │ 1 X │ → ...
│ X X │    │ X X │    │ X X │
└─────┘    └─────┘    └─────┘
```

---

*文档生成时间: 2026-03-03*
