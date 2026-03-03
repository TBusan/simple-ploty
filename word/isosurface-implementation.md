# Plotly.js 等值面 (Isosurface) 实现原理

## 一、概述

等值面（Isosurface）是三维空间中所有具有相同值的点组成的曲面。与等值线（2D）不同，等值面是 3D 空间中的 2D 曲面。Plotly.js 使用 **Marching Cubes** 算法的变体来生成等值面。

---

## 二、等值面与等值线的对比

| 特性 | 等值线 (Contour) | 等值面 (Isosurface) |
|------|------------------|---------------------|
| 维度 | 2D 数据 | 3D 数据 |
| 结果 | 1D 曲线 | 2D 曲面 |
| 算法 | Marching Squares | Marching Cubes |
| 网格单元 | 正方形 (4 角点) | 立方体 (8 角点) |
| 基本情况 | 16 种 | 256 种 |
| 渲染 | SVG 路径 | WebGL 三角形网格 |

---

## 三、数据结构

### 3.1 输入数据

```javascript
{
    type: 'isosurface',
    x: [x0, x1, x2, ...],      // x 坐标数组
    y: [y0, y1, y2, ...],      // y 坐标数组
    z: [z0, z1, z2, ...],      // z 坐标数组
    value: [v0, v1, v2, ...],  // 标量值数组

    // 等值面参数
    isomin: 0,                  // 最小等值
    isomax: 10,                 // 最大等值

    // 表面设置
    surface: {
        show: true,
        fill: 1,                // 填充比例 (0-1)
        pattern: 'all',         // 'all', 'odd', 'even'
        count: 1                // 等值面数量
    },

    // 空间框架
    spaceframe: {
        show: false,
        fill: 1
    },

    // 切片
    slices: {
        x: { show: false, locations: [], fill: 1 },
        y: { show: false, locations: [], fill: 1 },
        z: { show: false, locations: [], fill: 1 }
    },

    // 端盖
    caps: {
        x: { show: true, fill: 1 },
        y: { show: true, fill: 1 },
        z: { show: true, fill: 1 }
    }
}
```

### 3.2 网格化处理

```javascript
// 源码位置: src/traces/isosurface/calc.js

module.exports = function calc(gd, trace) {
    trace._len = Math.min(
        trace.x.length,
        trace.y.length,
        trace.z.length,
        trace.value.length
    );

    // 过滤数据
    trace._x = filter(trace.x, trace._len);
    trace._y = filter(trace.y, trace._len);
    trace._z = filter(trace.z, trace._len);
    trace._value = filter(trace.value, trace._len);

    // 处理网格
    var grid = processGrid(trace);
    trace._gridFill = grid.fill;     // 网格填充类型
    trace._Xs = grid.Xs;             // 唯一 x 值
    trace._Ys = grid.Ys;             // 唯一 y 值
    trace._Zs = grid.Zs;             // 唯一 z 值

    // 计算值范围
    var min = Infinity, max = -Infinity;
    for(var i = 0; i < trace._len; i++) {
        var v = trace._value[i];
        min = Math.min(min, v);
        max = Math.max(max, v);
    }

    trace._minValues = min;
    trace._maxValues = max;
    trace._vMin = (trace.isomin === undefined) ? min : trace.isomin;
    trace._vMax = (trace.isomax === undefined) ? max : trace.isomax;
};
```

---

## 四、网格生成算法

### 4.1 立方体分解

Plotly.js 将每个网格单元分解为 5 个四面体来处理：

```javascript
// 源码位置: src/traces/isosurface/convert.js

function addCube(style, p000, p001, p010, p011, p100, p101, p110, p111, min, max) {
    var result = false;

    if(drawingSurface) {
        // 5 种四面体分解模式
        if(styleIncludes(style, 'A')) {
            result = tryCreateTetra(null, [p000, p001, p010, p100], min, max) || result;
        }
        if(styleIncludes(style, 'B')) {
            result = tryCreateTetra(null, [p001, p010, p011, p111], min, max) || result;
        }
        if(styleIncludes(style, 'C')) {
            result = tryCreateTetra(null, [p001, p100, p101, p111], min, max) || result;
        }
        if(styleIncludes(style, 'D')) {
            result = tryCreateTetra(null, [p010, p100, p110, p111], min, max) || result;
        }
        if(styleIncludes(style, 'E')) {
            result = tryCreateTetra(null, [p001, p010, p100, p111], min, max) || result;
        }
    }

    return result;
}
```

### 4.2 四面体顶点

```
立方体顶点编号:
      011 ─────── 111
       /│         /│
      / │        / │
    001 ─────── 101 │
     │  │       │   │
     │  010 ────│── 110
     │ /        │ /
     │/         │/
    000 ─────── 100

5 种四面体分解:
A: 000-001-010-100 (左下后)
B: 001-010-011-111 (左上)
C: 001-100-101-111 (右前)
D: 010-100-110-111 (右后)
E: 001-010-100-111 (中心)
```

### 4.3 四面体等值面

```javascript
function tryCreateTetra(style, abcd, min, max) {
    var xyzv = getXYZV(abcd);  // 获取 4 个顶点的坐标和值

    // 检查每个顶点是否在范围内
    var ok = [
        inRange(xyzv[0][3], min, max),
        inRange(xyzv[1][3], min, max),
        inRange(xyzv[2][3], min, max),
        inRange(xyzv[3][3], min, max)
    ];

    // 全部在范围外
    if(!ok[0] && !ok[1] && !ok[2] && !ok[3]) {
        return false;
    }

    // 全部在范围内 - 绘制整个四面体
    if(ok[0] && ok[1] && ok[2] && ok[3]) {
        if(drawingSpaceframe) {
            drawTetra(style, xyzv, abcd);
        }
        return true;
    }

    // 部分在范围内 - 需要插值
    // ... 处理各种穿越情况
}
```

---

## 五、等值面插值

### 5.1 交点计算

当等值面穿过四面体边时，需要计算交点：

```javascript
function calcIntersection(pointOut, pointIn, min, max) {
    var value = pointOut[3];

    if(value < min) value = min;
    if(value > max) value = max;

    // 计算插值比例
    var ratio = (pointOut[3] - value) / (pointOut[3] - pointIn[3] + 0.000000001);

    // 线性插值
    var result = [];
    for(var s = 0; s < 4; s++) {
        result[s] = (1 - ratio) * pointOut[s] + ratio * pointIn[s];
    }
    return result;
}
```

### 5.2 三角形生成

```javascript
function drawTri(style, xyzv, abc) {
    // xyzv: 3 个顶点的 [x, y, z, value]
    // abc: 顶点索引（用于共享顶点）

    var pnts = [];
    for(var i = 0; i < 3; i++) {
        var x = xyzv[i][0];
        var y = xyzv[i][1];
        var z = xyzv[i][2];
        var v = xyzv[i][3];

        // 查找是否有已存在的顶点
        var id = (abc[i] > -1) ? abc[i] : findVertexId(x, y, z);
        if(id > -1) {
            pnts[i] = id;
        } else {
            pnts[i] = addVertex(x, y, z, mapValue(style, v));
        }
    }

    addFace(pnts[0], pnts[1], pnts[2]);
}
```

---

## 六、网格构建

### 6.1 顶点和面数据

```javascript
function generateIsoMeshes(data) {
    // 初始化
    data._meshI = [];  // 三角形顶点索引 I
    data._meshJ = [];  // 三角形顶点索引 J
    data._meshK = [];  // 三角形顶点索引 K

    // ...

    function addVertex(x, y, z, v) {
        allXs.push(x);
        allYs.push(y);
        allZs.push(z);
        allVs.push(v);  // 强度值（用于着色）
        numVertices++;
        return numVertices - 1;
    }

    function addFace(a, b, c) {
        data._meshI.push(a);
        data._meshJ.push(b);
        data._meshK.push(c);
        numFaces++;
        return numFaces - 1;
    }

    // ...

    // 最终输出
    data._meshX = allXs;          // 顶点 x 坐标
    data._meshY = allYs;          // 顶点 y 坐标
    data._meshZ = allZs;          // 顶点 z 坐标
    data._meshIntensity = allVs;  // 顶点强度
}
```

### 6.2 网格索引计算

```javascript
var GRID_TYPES = ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx'];

var getIndex = function(i, j, k) {
    switch(filled) {
        case 5: // 'zyx'
            return k + depth * j + depth * height * i;
        case 4: // 'zxy'
            return k + depth * i + depth * width * j;
        case 3: // 'yzx'
            return j + height * k + height * depth * i;
        case 2: // 'yxz'
            return j + height * i + height * width * k;
        case 1: // 'xzy'
            return i + width * k + width * depth * j;
        default: // 'xyz'
            return i + width * j + width * height * k;
    }
};
```

---

## 七、切片和端盖

### 7.1 2D 切片

在指定位置创建 2D 切片：

```javascript
function draw2dX(style, items, min, max, previousResult) {
    var result = [];
    for(var q = 0; q < items.length; q++) {
        var i = items[q];  // x 索引
        for(var k = 1; k < depth; k++) {
            for(var j = 1; j < height; j++) {
                result.push(
                    begin2dCell(style,
                        getIndex(i, j - 1, k - 1),
                        getIndex(i, j - 1, k),
                        getIndex(i, j, k - 1),
                        getIndex(i, j, k),
                        min, max,
                        (i + j + k) % 2,
                        previousResult && previousResult[n] ? previousResult[n] : []
                    )
                );
            }
        }
    }
    return result;
}
```

### 7.2 端盖

在数据边界创建端盖：

```javascript
// X 方向端盖
if(cap.show && cap.fill) {
    setFill(cap.fill);
    draw2dX(style, [0, width - 1], min, max, previousResult);
}

// Y 方向端盖
if(cap.show && cap.fill) {
    draw2dY(style, [0, height - 1], min, max, previousResult);
}

// Z 方向端盖
if(cap.show && cap.fill) {
    draw2dZ(style, [0, depth - 1], min, max, previousResult);
}
```

---

## 八、WebGL 渲染

### 8.1 更新网格

```javascript
// 源码位置: src/traces/isosurface/convert.js

proto.update = function(data) {
    var scene = this.scene;
    var layout = scene.fullSceneLayout;

    this.data = generateIsoMeshes(data);

    // 转换为场景坐标
    function toDataCoords(axis, coord, scale, calendar) {
        return coord.map(function(x) {
            return axis.d2l(x, 0, calendar) * scale;
        });
    }

    var positions = zip3(
        toDataCoords(layout.xaxis, data._meshX, scene.dataScale[0], data.xcalendar),
        toDataCoords(layout.yaxis, data._meshY, scene.dataScale[1], data.ycalendar),
        toDataCoords(layout.zaxis, data._meshZ, scene.dataScale[2], data.zcalendar)
    );

    var cells = zip3(data._meshI, data._meshJ, data._meshK);

    var config = {
        positions: positions,
        cells: cells,
        lightPosition: [data.lightposition.x, data.lightposition.y, data.lightposition.z],
        ambient: data.lighting.ambient,
        diffuse: data.lighting.diffuse,
        specular: data.lighting.specular,
        roughness: data.lighting.roughness,
        fresnel: data.lighting.fresnel,
        opacity: data.opacity,
        contourEnable: data.contour.show,
        contourColor: str2RgbaArray(data.contour.color).slice(0, 3),
        contourWidth: data.contour.width,
        useFacetNormals: data.flatshading
    };

    // 设置颜色映射
    var cOpts = extractOpts(data);
    config.vertexIntensity = data._meshIntensity;
    config.vertexIntensityBounds = [cOpts.min, cOpts.max];
    config.colormap = parseColorScale(data);

    this.mesh.update(config);
};
```

### 8.2 使用 gl-mesh3d

```javascript
var createMesh = require('../../../stackgl_modules').gl_mesh3d;

function createIsosurfaceTrace(scene, data) {
    var gl = scene.glplot.gl;
    var mesh = createMesh({gl: gl});
    var result = new IsosurfaceTrace(scene, mesh, data.uid);

    mesh._trace = result;
    result.update(data);
    scene.glplot.add(mesh);
    return result;
}
```

---

## 九、等值面与等值线的关系

### 9.1 算法对比

| 特性 | Marching Squares | Marching Cubes |
|------|------------------|----------------|
| 维度 | 2D | 3D |
| 单元 | 正方形 (4 点) | 立方体 (8 点) |
| 索引数 | 16 | 256 |
| 输出 | 线段 | 三角形 |
| 鞍点 | 2 种 | 多种复杂情况 |

### 9.2 Plotly.js 的简化策略

由于标准 Marching Cubes 有 256 种情况，Plotly.js 使用**四面体分解**简化问题：

1. 将立方体分解为 5 个四面体
2. 每个四面体只有 16 种情况（类似 Marching Squares）
3. 最终输出三角形而非曲面片

```
立方体 → 5 个四面体 → 每个 16 种情况 → 三角形输出

优势:
- 简化实现
- 保证流形
- 易于处理复杂情况
```

---

## 十、完整流程

```
3D 标量场数据
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. calc.js: 数据处理                                        │
│    - 过滤无效数据                                           │
│    - 建立网格索引                                           │
│    - 计算值范围                                             │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. convert.js: 生成等值面                                   │
│    - 遍历所有网格单元                                       │
│    - 将立方体分解为四面体                                   │
│    - 判断等值面穿越情况                                     │
│    - 计算插值点                                             │
│    - 生成三角形                                             │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. WebGL 渲染                                               │
│    - 转换坐标到场景空间                                     │
│    - 设置光照参数                                           │
│    - 设置颜色映射                                           │
│    - 绑定到 gl-mesh3d                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 十一、示例

### 11.1 基本等值面

```javascript
var data = [{
    type: 'isosurface',
    x: [0, 0, 0, 0, 1, 1, 1, 1],
    y: [0, 0, 1, 1, 0, 0, 1, 1],
    z: [0, 1, 0, 1, 0, 1, 0, 1],
    value: [0, 1, 2, 3, 4, 5, 6, 7],
    isomin: 2,
    isomax: 6
}];

Plotly.newPlot('myDiv', data);
```

### 11.2 多等值面

```javascript
var data = [{
    type: 'isosurface',
    // ... 数据
    surface: {
        show: true,
        count: 3,      // 3 个等值面
        fill: 0.8
    }
}];
```

### 11.3 带切片

```javascript
var data = [{
    type: 'isosurface',
    // ... 数据
    slices: {
        x: { show: true, locations: [0.5] },
        y: { show: true, locations: [0.5] },
        z: { show: true, locations: [0.5] }
    }
}];
```

---

*文档生成时间: 2026-03-03*
