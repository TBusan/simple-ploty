# Plotly.js 等值线坐标轴与对数处理

## 一、概述

Plotly.js 的等值线（contour）支持多种坐标轴类型，包括线性（linear）、对数（log）、日期（date）和分类（category）。其中对数坐标轴的处理最为复杂，需要在插值和绘制时进行特殊处理。

---

## 二、坐标轴转换系统

### 2.1 五种数据表示

Plotly.js 使用五种数据表示形式之间的转换：

| 表示 | 名称 | 说明 |
|------|------|------|
| **d** | data | 原始输入数据格式 |
| **c** | calcdata | 计算数据，转换为数字 |
| **l** | linearized | 线性化数据（对数轴取 log） |
| **p** | pixel | 像素坐标 |
| **r** | range | 范围值（与 d 或 l 相同） |

### 2.2 转换函数

```javascript
// 源码位置: src/plots/cartesian/set_convert.js

// 对数转换
function toLog(v, clip) {
    if(v > 0) return Math.log(v) / Math.LN10;  // log10(v)

    else if(v <= 0 && clip && ax.range && ax.range.length === 2) {
        // 负值或零：裁剪到 LOG_CLIP 边界
        var r0 = ax.range[0];
        var r1 = ax.range[1];
        return 0.5 * (r0 + r1 - 2 * LOG_CLIP * Math.abs(r0 - r1));
    } else return BADNUM;
}

// 反对数转换
function fromLog(v) {
    return Math.pow(10, v);
}

// 根据轴类型设置转换函数
ax.c2l = (ax.type === 'log') ? toLog : ensureNumber;
ax.l2c = (ax.type === 'log') ? fromLog : ensureNumber;

ax.c2p = (ax.type === 'log') ?
    function(v, clip) { return l2p(toLog(v, clip)); } : l2p;
ax.p2c = (ax.type === 'log') ?
    function(px) { return fromLog(p2l(px)); } : p2l;
```

---

## 三、等值线中的对数坐标处理

### 3.1 插值在对数空间进行

在等值线的 Marching Squares 算法中，穿越点的计算**必须在线性化空间进行**：

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
        // 计算插值比例
        var dx = (pi.level - zxy) / (pi.z[locy][locx + 1] - zxy);

        // 在线性空间插值（关键！）
        var dxl =
            (dx !== 1 ? (1 - dx) * xa.c2l(pi.x[locx]) : 0) +
            (dx !== 0 ? dx * xa.c2l(pi.x[locx + 1]) : 0);

        // 转换回数据坐标，再转换为像素
        return [xa.c2p(xa.l2c(dxl), true),
            ya.c2p(pi.y[locy], true),
            locx + dx, locy];
    } else {
        // 垂直边上的穿越
        var dy = (pi.level - zxy) / (pi.z[locy + 1][locx] - zxy);
        var dyl =
            (dy !== 1 ? (1 - dy) * ya.c2l(pi.y[locy]) : 0) +
            (dy !== 0 ? dy * ya.c2l(pi.y[locy + 1]) : 0);

        return [xa.c2p(pi.x[locx], true),
            ya.c2p(ya.l2c(dyl), true),
            locx, locy + dy];
    }
}
```

### 3.2 为什么要在线性空间插值

```
假设 x 坐标为 [1, 10, 100]，在对数轴上显示

如果直接在数据空间插值（错误）:
  dx = 0.5 时，x = 1 + 0.5 * (10 - 1) = 5.5

如果在线性空间插值（正确）:
  log10(1) = 0, log10(10) = 1
  dx = 0.5 时，log10(x) = 0 + 0.5 * 1 = 0.5
  x = 10^0.5 ≈ 3.16

在对数轴上，这两个点的位置是不同的！
```

### 3.3 处理无效值

对数轴上的零或负值会产生 NaN。Plotly.js 通过特殊处理避免这个问题：

```javascript
var dxl =
    (dx !== 1 ? (1 - dx) * xa.c2l(pi.x[locx]) : 0) +
    (dx !== 0 ? dx * xa.c2l(pi.x[locx + 1]) : 0);
```

当 `dx = 0` 或 `dx = 1` 时，直接使用端点值，避免对无效值取对数。

---

## 四、对数轴的限制

### 4.1 zsmooth 限制

对于对数坐标轴，不能使用 `zsmooth: 'fast'`：

```javascript
// 源码位置: src/traces/heatmap/calc.js

trace._islinear = false;
if(xa.type === 'log' || ya.type === 'log') {
    if(zsmooth === 'fast') {
        noZsmooth('log axis found');
    }
}
```

### 4.2 LOG_CLIP 常量

对于负值或零，Plotly.js 使用 `LOG_CLIP` 来裁剪显示范围：

```javascript
// 源码位置: src/constants/numerical.js

LOG_CLIP = 0.1  // 在范围边界外 10% 的位置裁剪
```

---

## 五、边界数组生成

### 5.1 makeBoundArray

对于等值线，需要生成坐标边界的数组：

```javascript
// 源码位置: src/traces/heatmap/make_bound_array.js

function makeBoundArray(trace, arrayIn, v0, dv, len, ax) {
    var arrayOut = new Array(len + 1);
    var i;

    if(Array.isArray(arrayIn) && arrayIn.length > 0) {
        // 使用输入数组
        var inputLen = arrayIn.length;
        var centerpts = (inputLen === len);

        for(i = 0; i <= len; i++) {
            if(centerpts) {
                // 数据点在单元格中心
                arrayOut[i] = (i === 0) ? ax.c2l(arrayIn[0]) - 0.5 :
                    (i === len) ? ax.c2l(arrayIn[len - 1]) + 0.5 :
                    (ax.c2l(arrayIn[i - 1]) + ax.c2l(arrayIn[i])) / 2;
            } else {
                // 数据点在单元格边界
                arrayOut[i] = ax.c2l(arrayIn[Math.min(i, inputLen - 1)]);
            }
        }
    } else {
        // 使用 v0 和 dx 生成
        v0 = ax.c2l(v0) || 0;
        dv = dv || 1;

        for(i = 0; i <= len; i++) {
            arrayOut[i] = v0 + i * dv;
        }
    }

    // 转换回数据坐标
    for(i = 0; i <= len; i++) {
        arrayOut[i] = ax.l2c(arrayOut[i]);
    }

    return arrayOut;
}
```

### 5.2 对数轴上的边界计算

```
线性轴:
  数据点: [1, 2, 3]
  边界: [0.5, 1.5, 2.5, 3.5]

对数轴（正确处理）:
  数据点: [1, 10, 100]
  log 值: [0, 1, 2]
  log 边界: [-0.5, 0.5, 1.5, 2.5]
  数据边界: [0.316, 3.16, 31.6, 316]
```

---

## 六、坐标轴类型对等值线的影响

### 6.1 线性坐标轴

```javascript
// 转换函数
ax.d2l = cleanNumber;    // 数据 → 线性 = 数据本身
ax.l2d = ensureNumber;

// 插值直接在数据空间进行
interpolated = (1 - t) * x0 + t * x1;
```

### 6.2 对数坐标轴

```javascript
// 转换函数
ax.d2l = function(v, clip) { return toLog(cleanNumber(v), clip); };
ax.l2d = fromLog;

// 插值在对数空间进行
log_interpolated = (1 - t) * log(x0) + t * log(x1);
interpolated = 10^log_interpolated;
```

### 6.3 日期坐标轴

```javascript
// 转换函数
ax.d2l = dt2ms;    // 日期字符串 → 毫秒
ax.l2d = ms2dt;    // 毫秒 → 日期字符串

// 插值在毫秒空间进行
ms_interpolated = (1 - t) * ms0 + t * ms1;
```

### 6.4 分类坐标轴

```javascript
// 转换函数
ax.d2l = setCategoryIndex;    // 分类名 → 索引
ax.l2d = getCategoryName;     // 索引 → 分类名

// 插值在索引空间进行
index_interpolated = (1 - t) * index0 + t * index1;
```

---

## 七、等值线级别计算

### 7.1 自动级别

```javascript
// 源码位置: src/traces/contour/set_contours.js

function autoContours(start, end, ncontours) {
    var dummyAx = {
        type: 'linear',
        range: [start, end]
    };

    Axes.autoTicks(
        dummyAx,
        (end - start) / (ncontours || 15)
    );

    return dummyAx;
}
```

### 7.2 级别范围确定

等值线级别在 z 值的范围内选择，但会避开边界值：

```javascript
// 源码位置: src/traces/contour/set_contours.js

if(contours.start === zmin) contours.start += contours.size;
if(contours.end === zmax) contours.end -= contours.size;

// 处理 start > end 的边界情况
if(contours.start > contours.end) {
    contours.start = contours.end = (contours.start + contours.end) / 2;
}
```

---

## 八、像素坐标计算

### 8.1 线性映射

从线性化坐标到像素坐标的映射：

```javascript
// 源码位置: src/plots/cartesian/set_convert.js

function _l2p(v, m, b) {
    return d3.round(b + m * v, 2);
}

// m 和 b 的计算
ax.setScale = function(usePrivateRange) {
    var rl0 = ax.r2l(ax.range[0], calendar);
    var rl1 = ax.r2l(ax.range[1], calendar);

    if(isY) {
        ax._m = ax._length / (rl0 - rl1);
        ax._b = -ax._m * rl1;
    } else {
        ax._m = ax._length / (rl1 - rl0);
        ax._b = -ax._m * rl0;
    }
};
```

### 8.2 对数轴的像素映射

```
对于对数轴 range = [1, 1000]:
  rl0 = log10(1) = 0
  rl1 = log10(1000) = 3

像素位置:
  x = 1    → l = 0   → p = b + m * 0   = 0
  x = 10   → l = 1   → p = b + m * 1
  x = 100  → l = 2   → p = b + m * 2
  x = 1000 → l = 3   → p = b + m * 3 = length
```

---

## 九、实际示例

### 9.1 对数坐标等值线

```javascript
var data = [{
    type: 'contour',
    z: [[1, 2, 3],
        [2, 4, 6],
        [3, 6, 9]],
    x: [1, 10, 100],   // 对数间隔
    y: [1, 10, 100]
}];

var layout = {
    xaxis: { type: 'log' },
    yaxis: { type: 'log' }
};
```

### 9.2 混合坐标类型

```javascript
var data = [{
    type: 'contour',
    z: [[...]],
    x: ['2020-01-01', '2020-02-01', ...],  // 日期
    y: [0.1, 1, 10, 100]                   // 对数
}];

var layout = {
    xaxis: { type: 'date' },
    yaxis: { type: 'log' }
};
```

---

## 十、关键注意事项

### 10.1 对数轴限制

1. **不能使用 `zsmooth: 'fast'`**：因为 fast 模式假设均匀网格
2. **负值和零会被裁剪**：显示为 BADNUM
3. **插值必须在对数空间**：否则等值线位置不正确

### 10.2 性能考虑

1. **线性轴最快**：不需要额外转换
2. **对数轴需要额外计算**：每次坐标转换都需要 log/pow
3. **日期轴需要解析**：日期字符串与毫秒之间的转换

---

*文档生成时间: 2026-03-03*
