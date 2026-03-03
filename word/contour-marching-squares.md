# Plotly.js 等值线 (Contour) 实现原理 - Marching Squares 算法

## 一、概述

Plotly.js 使用 **Marching Squares（移动正方形）算法** 来生成等值线。该算法通过遍历网格数据，在每个网格单元（2x2 点）上确定等值线的穿越情况，然后将这些穿越点连接成完整的等值线路径。

---

## 二、Marching Squares 算法基础

### 2.1 基本原理

Marching Squares 算法将二维标量场（z 值矩阵）转换为等值线。对于每个网格单元（由 4 个角点组成的正方形），算法：

1. 比较每个角点的值与等值线级别（level）
2. 根据角点值与 level 的关系生成一个 4 位索引
3. 根据索引确定等值线如何穿越该单元
4. 连接相邻单元的穿越点形成路径

### 2.2 索引计算

```javascript
// 源码位置: src/traces/contour/make_crossings.js

function getMarchingIndex(val, corners) {
    // corners 结构:
    // [[z[yi][xi], z[yi][xi+1]],      左上, 右上
    //  [z[yi+1][xi], z[yi+1][xi+1]]]  左下, 右下

    var mi = (corners[0][0] > val ? 0 : 1) +   // 左上角 (位 0)
             (corners[0][1] > val ? 0 : 2) +   // 右上角 (位 1)
             (corners[1][1] > val ? 0 : 4) +   // 右下角 (位 2)
             (corners[1][0] > val ? 0 : 8);    // 左下角 (位 3)

    // 鞍点特殊处理
    if(mi === 5 || mi === 10) {
        var avg = (corners[0][0] + corners[0][1] +
                   corners[1][0] + corners[1][1]) / 4;
        if(val > avg) return (mi === 5) ? 713 : 1114;
        return (mi === 5) ? 104 : 208;
    }
    return (mi === 15) ? 0 : mi;
}
```

### 2.3 16 种基本情况

Marching Squares 有 16 种基本情况（0-15），每个情况对应不同的穿越模式：

```
角点编号:
    1 --- 2
    |     |
    8 --- 4

索引计算:
mi = (c1 > level ? 0:1) + (c2 > level ? 0:2) + (c4 > level ? 0:4) + (c8 > level ? 0:8)
```

| 索引 | 二进制 | 含义 | 穿越方式 |
|------|--------|------|----------|
| 0 | 0000 | 全部 > level | 无穿越 |
| 1 | 0001 | 仅 c1 ≤ level | 上边→左边 |
| 2 | 0010 | 仅 c2 ≤ level | 上边→右边 |
| 3 | 0011 | c1,c2 ≤ level | 左边→右边 |
| 4 | 0100 | 仅 c4 ≤ level | 右边→下边 |
| 5 | 0101 | c1,c4 ≤ level | **鞍点** |
| 6 | 0110 | c2,c4 ≤ level | 上边→下边 |
| 7 | 0111 | c1,c2,c4 ≤ level | 上边→下边 |
| 8 | 1000 | 仅 c8 ≤ level | 左边→下边 |
| 9 | 1001 | c1,c8 ≤ level | 上边→下边 |
| 10 | 1010 | c2,c8 ≤ level | **鞍点** |
| 11 | 1011 | c1,c2,c8 ≤ level | 上边→下边 |
| 12 | 1100 | c4,c8 ≤ level | 左边→下边 |
| 13 | 1101 | c1,c4,c8 ≤ level | 左边→右边 |
| 14 | 1110 | c2,c4,c8 ≤ level | 右边→下边 |
| 15 | 1111 | 全部 ≤ level | 无穿越 |

---

## 三、鞍点（Saddle Point）处理

### 3.1 鞍点问题

当索引为 5 或 10 时，存在鞍点歧义问题。鞍点是指两个对角角点的值小于 level，而另外两个对角角点的值大于 level 的情况。

```
索引 5 的情况:           索引 10 的情况:
    0 --- 1                  1 --- 0
    |  \ /  |                |  / \  |
    |   X   |                |   X   |
    |  / \  |                |  \ /  |
    1 --- 0                  0 --- 1

(0 表示 > level, 1 表示 ≤ level)
```

### 3.2 Plotly.js 的解决方案

Plotly.js 通过计算四个角点的**平均值**来消除鞍点歧义：

```javascript
// 源码位置: src/traces/contour/make_crossings.js

if(mi === 5 || mi === 10) {
    var avg = (corners[0][0] + corners[0][1] +
               corners[1][0] + corners[1][1]) / 4;

    if(val > avg) {
        // 等值线值大于平均值：两个峰之间的谷
        return (mi === 5) ? 713 : 1114;
    } else {
        // 等值线值小于平均值：两个谷之间的峰
        return (mi === 5) ? 104 : 208;
    }
}
```

### 3.3 鞍点编码方案

Plotly.js 使用**组合编码**来表示鞍点的两种可能路径：

| 组合编码 | 组成 | 含义 |
|----------|------|------|
| 104 | 1 + 04 | 索引 1 和索引 4 的组合 |
| 208 | 2 + 08 | 索引 2 和索引 8 的组合 |
| 713 | 7 + 13 | 索引 7 和索引 13 的组合 |
| 1114 | 11 + 14 | 索引 11 和索引 14 的组合 |

### 3.4 鞍点路径选择

```javascript
// 源码位置: src/traces/contour/constants.js

CHOOSESADDLE: {
    104: [4, 1],    // dx/dy < 0 用索引 4, dx/dy > 0 用索引 1
    208: [2, 8],    // dx/dy < 0 用索引 2, dx/dy > 0 用索引 8
    713: [7, 13],   // dx/dy < 0 用索引 7, dx/dy > 0 用索引 13
    1114: [11, 14]  // dx/dy < 0 用索引 11, dx/dy > 0 用索引 14
},

SADDLEREMAINDER: {
    1: 4, 2: 8, 4: 1, 7: 13, 8: 2, 11: 14, 13: 7, 14: 11
}
```

在路径追踪过程中：

```javascript
// 源码位置: src/traces/contour/find_all_paths.js

if(mi > 20) {
    // 鞍点索引 > 20
    // 根据进入方向选择路径
    mi = constants.CHOOSESADDLE[mi][(marchStep[0] || marchStep[1]) < 0 ? 0 : 1];
    // 保存剩余路径供后续使用
    pi.crossings[locStr] = constants.SADDLEREMAINDER[mi];
} else {
    delete pi.crossings[locStr];
}
```

---

## 四、边界和角落处理

### 4.1 边界起点识别

等值线可能从网格边界开始（开放路径）或完全在网格内部（闭合路径）。算法需要识别边界起点：

```javascript
// 源码位置: src/traces/contour/constants.js

// 从底部边缘开始的索引
BOTTOMSTART: [1, 9, 13, 104, 713],
// 从顶部边缘开始的索引
TOPSTART: [4, 6, 7, 104, 713],
// 从左侧边缘开始的索引
LEFTSTART: [8, 12, 14, 208, 1114],
// 从右侧边缘开始的索引
RIGHTSTART: [2, 3, 11, 208, 1114]
```

### 4.2 四个角落的特殊处理

网格的四个角落（左上、右上、左下、右下）需要特别处理，因为它们只与一个相邻单元共享：

```javascript
// 源码位置: src/traces/contour/make_crossings.js

for(yi = 0; yi < m - 1; yi++) {
    ystartIndices = [];
    if(yi === 0) ystartIndices = ystartIndices.concat(constants.BOTTOMSTART);
    if(yi === m - 2) ystartIndices = ystartIndices.concat(constants.TOPSTART);

    for(xi = 0; xi < n - 1; xi++) {
        startIndices = ystartIndices.slice();
        if(xi === 0) startIndices = startIndices.concat(constants.LEFTSTART);
        if(xi === n - 2) startIndices = startIndices.concat(constants.RIGHTSTART);

        // ... 处理每个网格单元
    }
}
```

**角落位置对应关系：**

| 角落 | 位置 (yi, xi) | 特殊标记 |
|------|---------------|----------|
| 左下角 | (0, 0) | BOTTOMSTART + LEFTSTART |
| 右下角 | (0, n-2) | BOTTOMSTART + RIGHTSTART |
| 左上角 | (m-2, 0) | TOPSTART + LEFTSTART |
| 右上角 | (m-2, n-2) | TOPSTART + RIGHTSTART |

### 4.3 路径方向（NEWDELTA）

```javascript
// 源码位置: src/traces/contour/constants.js

NEWDELTA: [
    null,       // 0: 无穿越
    [-1, 0],    // 1: 向左
    [0, -1],    // 2: 向上
    [-1, 0],    // 3: 向左
    [1, 0],     // 4: 向右
    null,       // 5: 鞍点（特殊处理）
    [0, -1],    // 6: 向上
    [-1, 0],    // 7: 向左
    [0, 1],     // 8: 向下
    [0, 1],     // 9: 向下
    null,       // 10: 鞍点（特殊处理）
    [0, 1],     // 11: 向下
    [1, 0],     // 12: 向右
    [1, 0],     // 13: 向右
    [0, -1]     // 14: 向上
]
```

---

## 五、路径追踪算法

### 5.1 主流程

```javascript
// 源码位置: src/traces/contour/find_all_paths.js

function findAllPaths(pathinfo, xtol, ytol) {
    for(i = 0; i < pathinfo.length; i++) {
        pi = pathinfo[i];

        // 1. 首先处理边界起点
        for(j = 0; j < pi.starts.length; j++) {
            startLoc = pi.starts[j];
            makePath(pi, startLoc, 'edge', xtol, ytol);
        }

        // 2. 然后处理内部闭合路径
        cnt = 0;
        while(Object.keys(pi.crossings).length && cnt < 10000) {
            cnt++;
            startLoc = Object.keys(pi.crossings)[0].split(',').map(Number);
            makePath(pi, startLoc, undefined, xtol, ytol);
        }
    }
}
```

### 5.2 路径生成

```javascript
function makePath(pi, loc, edgeflag, xtol, ytol) {
    var locStr = loc.join(',');
    var mi = pi.crossings[locStr];
    var marchStep = getStartStep(mi, edgeflag, loc);

    // 获取起点（向后半步的插值点）
    var pts = [getInterpPx(pi, loc, [-marchStep[0], -marchStep[1]])];

    // 追踪路径
    for(cnt = 0; cnt < 10000; cnt++) {
        // 鞍点处理
        if(mi > 20) {
            mi = constants.CHOOSESADDLE[mi][(marchStep[0] || marchStep[1]) < 0 ? 0 : 1];
            pi.crossings[locStr] = constants.SADDLEREMAINDER[mi];
        } else {
            delete pi.crossings[locStr];
        }

        // 获取下一步方向
        marchStep = constants.NEWDELTA[mi];

        // 添加插值点
        pts.push(getInterpPx(pi, loc, marchStep));

        // 移动到下一个单元
        loc[0] += marchStep[0];
        loc[1] += marchStep[1];
        locStr = loc.join(',');

        // 检查是否完成
        var closedLoop = loc[0] === startLoc[0] && loc[1] === startLoc[1] &&
                marchStep[0] === startStep[0] && marchStep[1] === startStep[1];

        if((closedLoop) || (edgeflag && atEdge)) break;

        mi = pi.crossings[locStr];
    }

    // 处理闭合路径或边缘路径
    // ...
}
```

### 5.3 插值计算

```javascript
// 源码位置: src/traces/contour/find_all_paths.js

function getInterpPx(pi, loc, step) {
    var locx = loc[0] + Math.max(step[0], 0);
    var locy = loc[1] + Math.max(step[1], 0);
    var zxy = pi.z[locy][locx];
    var xa = pi.xaxis;
    var ya = pi.yaxis;

    if(step[1]) {
        // 水平边上的穿越
        var dx = (pi.level - zxy) / (pi.z[locy][locx + 1] - zxy);

        // 在线性空间插值，然后转换为像素
        var dxl = (dx !== 1 ? (1 - dx) * xa.c2l(pi.x[locx]) : 0) +
                  (dx !== 0 ? dx * xa.c2l(pi.x[locx + 1]) : 0);

        return [xa.c2p(xa.l2c(dxl), true),
                ya.c2p(pi.y[locy], true),
                locx + dx, locy];
    } else {
        // 垂直边上的穿越
        var dy = (pi.level - zxy) / (pi.z[locy + 1][locx] - zxy);
        var dyl = (dy !== 1 ? (1 - dy) * ya.c2l(pi.y[locy]) : 0) +
                  (dy !== 0 ? dy * ya.c2l(pi.y[locy + 1]) : 0);

        return [xa.c2p(pi.x[locx], true),
                ya.c2p(ya.l2c(dyl), true),
                locx, locy + dy];
    }
}
```

---

## 六、等值线级别确定

### 6.1 自动级别计算

```javascript
// 源码位置: src/traces/contour/set_contours.js

function setContours(trace, vals) {
    var contours = trace.contours;

    if(trace.autocontour) {
        var zmin = trace.zmin;
        var zmax = trace.zmax;

        if(trace.zauto || zmin === undefined) {
            zmin = Lib.aggNums(Math.min, null, vals);
        }
        if(trace.zauto || zmax === undefined) {
            zmax = Lib.aggNums(Math.max, null, vals);
        }

        // 使用类似坐标轴 tick 的算法计算级别
        var dummyAx = autoContours(zmin, zmax, trace.ncontours);
        contours.size = dummyAx.dtick;
        contours.start = Axes.tickFirst(dummyAx);

        dummyAx.range.reverse();
        contours.end = Axes.tickFirst(dummyAx);

        // 调整避免与边界重合
        if(contours.start === zmin) contours.start += contours.size;
        if(contours.end === zmax) contours.end -= contours.size;
    }
}
```

### 6.2 Pathinfo 结构

```javascript
// 源码位置: src/traces/contour/empty_pathinfo.js

function emptyPathinfo(contours, plotinfo, cd0) {
    var pathinfo = [];

    for(var ci = contours.start; ci < end; ci += cs) {
        pathinfo.push({
            level: ci,              // 当前等值线级别
            crossings: {},          // 穿越点映射
            starts: [],             // 边界起点
            edgepaths: [],          // 开放路径
            paths: [],              // 闭合路径
            z: cd0.z,               // z 值矩阵
            xaxis: plotinfo.xaxis,  // x 轴
            yaxis: plotinfo.yaxis,  // y 轴
            x: cd0.x,               // x 坐标数组
            y: cd0.y,               // y 坐标数组
            smoothing: cd0.trace.line.smoothing  // 平滑度
        });
    }

    return pathinfo;
}
```

---

## 七、算法流程总结

```
                    数据准备
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. heatmap/calc.js: 数据清理和坐标数组生成                    │
│    - 处理 null/undefined 值                                  │
│    - 生成边界数组                                            │
│    - 如果 connectgaps=true，进行插值                          │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. set_contours.js: 确定等值线级别                           │
│    - 自动或手动设置 start/end/size                           │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. empty_pathinfo.js: 为每个级别创建空 pathinfo              │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. make_crossings.js: 计算所有网格单元的 Marching Index      │
│    - 遍历所有 2x2 单元                                       │
│    - 计算穿越索引                                            │
│    - 识别边界起点                                            │
│    - 处理鞍点歧义                                            │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. find_all_paths.js: 追踪并连接等值线路径                   │
│    - 从边界起点开始追踪开放路径                               │
│    - 从内部穿越点开始追踪闭合路径                             │
│    - 处理鞍点的双路径                                        │
│    - 合并相邻边缘路径                                        │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. plot.js: 绑定等值线                                       │
│    - 绘制填充区域                                            │
│    - 绘制线条                                                │
│    - 添加标签                                                │
└─────────────────────────────────────────────────────────────┘
```

---

*文档生成时间: 2026-03-03*
