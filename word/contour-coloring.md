# Plotly.js 等值线颜色映射与填充模式

## 一、概述

等值线的颜色映射和填充模式决定了等值线的视觉呈现方式。Plotly.js 支持多种着色模式，包括纯线条、填充区域和热力图模式。

---

## 二、着色模式

### 2.1 coloring 属性

```javascript
{
    type: 'contour',
    z: [[...], [...], ...],

    contours: {
        coloring: 'fill'  // 'fill' | 'heatmap' | 'lines' | 'none'
    }
}
```

| 模式 | 说明 | 效果 |
|------|------|------|
| `fill` | 填充等值线之间的区域 | 彩色带状区域 |
| `heatmap` | 像热力图一样连续着色 | 平滑颜色渐变 |
| `lines` | 只绘制线条，不填充 | 彩色等值线 |
| `none` | 不着色 | 无色线条（使用 line.color） |

### 2.2 着色模式对比

```
fill 模式:
┌─────────────────────┐
│ ░░░░▒▒▒▒▓▓▓▓████████│
│ ░░░░▒▒▒▒▓▓▓▓████████│
│ ░░░░▒▒▒▒▓▓▓▓████████│
└─────────────────────┘
等值线之间用不同颜色填充

heatmap 模式:
┌─────────────────────┐
│ ░░▒▒▓▓██████████████│
│ ░░▒▒▓▓██████████████│
│ ░░▒▒▓▓██████████████│
└─────────────────────┘
连续平滑的颜色渐变

lines 模式:
┌─────────────────────┐
│ ──────┬──────┬──────│
│       │      │      │
│ ──────┼──────┼──────│
│       │      │      │
│ ──────┴──────┴──────│
└─────────────────────┘
只有彩色线条
```

---

## 三、颜色映射实现

### 3.1 make_color_map.js

颜色映射函数的生成：

```javascript
// 源码位置: src/traces/contour/make_color_map.js

module.exports = function makeColorMap(trace) {
    var contours = trace.contours;
    var start = contours.start;
    var end = endPlus(contours);
    var cs = contours.size || 1;
    var nc = Math.floor((end - start) / cs) + 1;  // 等值线数量
    var extra = contours.coloring === 'lines' ? 0 : 1;

    var cOpts = Colorscale.extractOpts(trace);
    var scl = cOpts.reversescale ?
        Colorscale.flipScale(cOpts.colorscale) :
        cOpts.colorscale;

    var zmin0 = cOpts.min;
    var zmax0 = cOpts.max;

    if(contours.coloring === 'heatmap') {
        // 热力图模式：使用原始 z 值范围
        for(i = 0; i < len; i++) {
            si = scl[i];
            domain[i] = si[0] * (zmax0 - zmin0) + zmin0;
            range[i] = si[1];
        }

        // 检查等值线是否超出颜色范围
        var zRange = d3.extent([
            zmin0, zmax0,
            contours.start,
            contours.start + cs * (nc - 1)
        ]);

        // 扩展颜色范围
        if(zmin !== zmin0) {
            domain.splice(0, 0, zmin);
            range.splice(0, 0, range[0]);
        }
        if(zmax !== zmax0) {
            domain.push(zmax);
            range.push(range[range.length - 1]);
        }
    } else {
        // 填充/线条模式：使用等值线级别

        for(i = 0; i < len; i++) {
            si = scl[i];
            // 将色阶映射到等值线级别
            domain[i] = (si[0] * (nc + extra - 1) - (extra / 2)) * cs + start;
            range[i] = si[1];
        }

        // 确保覆盖整个 z 范围
        if(domain[0] > zmin0) {
            domain.unshift(zmin0);
            range.unshift(range[0]);
        }
        if(domain[domain.length - 1] < zmax0) {
            domain.push(zmax0);
            range.push(range[range.length - 1]);
        }
    }

    return Colorscale.makeColorScaleFunc(
        {domain: domain, range: range},
        {noNumericCheck: true}
    );
};
```

### 3.2 颜色映射公式

**填充/线条模式:**

```
domain[i] = (colorscale[i][0] * (nc + extra - 1) - extra/2) * size + start

其中:
- nc = 等值线数量
- extra = 填充模式为 1，线条模式为 0
- size = 等值线间隔
- start = 起始级别
```

**热力图模式:**

```
domain[i] = colorscale[i][0] * (zmax - zmin) + zmin

直接使用 z 值范围
```

---

## 四、填充绘制

### 4.1 填充路径生成

等值线填充需要将相邻级别的路径组合成封闭区域：

```javascript
// 填充区域由两个相邻级别的等值线定义
// 上边界: level[i+1] 的等值线
// 下边界: level[i] 的等值线

// 对于闭合路径:
// 填充区域 = 内部路径 - 外部路径

// 对于开放路径:
// 需要连接到边界形成闭合区域
```

### 4.2 plot.js 中的填充逻辑

```javascript
// 源码位置: src/traces/contour/plot.js

function makeFills(plotgroup, pathinfo, gd, cd0, contours) {
    var showFills = contours.coloring === 'fill' ||
                    contours.coloring === 'heatmap';

    if(!showFills) return;

    var fillgroup = Lib.ensureSingle(plotgroup, 'g', 'contourfill');

    // 按级别顺序填充
    for(var i = 0; i < pathinfo.length; i++) {
        var pi = pathinfo[i];
        var color = colorMap(pi.level);

        // 创建填充路径
        var pathData = joinAllPaths(pi, perimeter);

        fillgroup.append('path')
            .attr('d', pathData)
            .style('fill', color)
            .style('stroke', 'none');
    }
}
```

### 4.3 边界处理

```
开放路径的填充:
                    数据边界
    ┌─────────────────────────────────┐
    │                                 │
    │   ┌───────────────┐             │
    │   │               │             │  ← 需要连接到边界
    │   │               │             │
    │   └───────────────┘             │
    │                                 │
    └─────────────────────────────────┘

闭合路径的填充:
    ┌─────────────────────────────────┐
    │                                 │
    │     ╭───────────────╮           │
    │     │               │           │  ← 路径已闭合
    │     │               │           │
    │     ╰───────────────╯           │
    │                                 │
    └─────────────────────────────────┘
```

---

## 五、线条绘制

### 5.1 线条样式

```javascript
{
    type: 'contour',
    line: {
        color: 'black',       // 线条颜色（coloring='none' 时使用）
        width: 1,             // 线条宽度
        dash: 'solid',        // 'solid' | 'dot' | 'dash' | 'longdash' | 'dashdot' | 'longdashdot'
        smoothing: 0          // 平滑度 (0-1.3)
    }
}
```

### 5.2 平滑处理

```javascript
// 源码位置: src/traces/contour/find_all_paths.js

// 路径平滑使用 Catmull-Rom 样条
// smoothing 参数控制曲线张力

// smoothing = 0: 直线连接
// smoothing = 1: 平滑曲线
// smoothing > 1: 更平滑（可能产生环）
```

### 5.3 线条颜色

```javascript
// 当 coloring = 'lines' 时，线条颜色由色阶决定
// 当 coloring = 'none' 时，使用 line.color
// 当 coloring = 'fill' 或 'heatmap' 时，线条通常是边界的分割线
```

---

## 六、颜色条

### 6.1 颜色条配置

```javascript
{
    type: 'contour',
    z: [[...]],

    showscale: true,          // 是否显示颜色条

    colorbar: {
        title: { text: 'Value' },
        titleside: 'top',     // 'top' | 'right' | 'bottom' | 'left'
        ticks: 'outside',     // 'outside' | 'inside' | ''
        ticklen: 5,
        tickwidth: 1,
        tickcolor: '#000',
        tickformat: '.1f',
        len: 1,               // 长度比例
        lenmode: 'fraction',  // 'fraction' | 'pixels'
        x: 1.02,              // x 位置
        y: 0.5,               // y 位置
        xanchor: 'left',      // 'left' | 'center' | 'right'
        yanchor: 'middle',    // 'top' | 'middle' | 'bottom'
        xpad: 10,
        ypad: 10,
        thickness: 30,        // 厚度（像素）
        thicknessmode: 'pixels',
        outlinecolor: '#000',
        outlinewidth: 1,
        bgcolor: 'rgba(0,0,0,0)',
        bordercolor: '#000',
        borderwidth: 0
    }
}
```

### 6.2 颜色条与等值线级别的对应

```javascript
// 源码位置: src/traces/contour/colorbar.js

// 颜色条的刻度与等值线级别对应
// 对于 fill 模式:
//   - 刻度位于每个填充区域的中心
//   - 颜色表示该级别的颜色

// 对于 heatmap 模式:
//   - 颜色条是连续渐变的
//   - 刻度可以是任意值
```

---

## 七、色阶配置

### 7.1 内置色阶

Plotly.js 提供了大量内置色阶：

```javascript
// 常用色阶
'Viridis', 'Cividis', 'Plasma', 'Inferno', 'Magma', 'Turbo',
'Rainbow', 'Jet', 'Hot', 'Cool', 'Electric', 'Blackbody',
'Earth', 'Blues', 'Reds', 'Greens', 'YlOrRd', 'YlGnBu',
'RdBu', 'RdYlBu', 'RdYlGn', 'Spectral', 'Picnic'
```

### 7.2 自定义色阶

```javascript
{
    type: 'contour',
    z: [[...]],

    colorscale: [
        [0, 'rgb(0,0,255)'],      // 最小值：蓝色
        [0.5, 'rgb(255,255,0)'],  // 中间值：黄色
        [1, 'rgb(255,0,0)']       // 最大值：红色
    ],

    // 或使用十六进制
    colorscale: [
        [0, '#0000FF'],
        [0.5, '#FFFF00'],
        [1, '#FF0000']
    ]
}
```

### 7.3 颜色范围控制

```javascript
{
    type: 'contour',
    z: [[...]],

    zmin: 0,              // 最小值
    zmax: 100,            // 最大值
    zauto: false,         // 不自动计算范围

    // 或使用 auto
    zauto: true,          // 自动计算 zmin/zmax
}
```

---

## 八、特殊着色效果

### 8.1 反转色阶

```javascript
{
    colorscale: 'Viridis',
    reversescale: true  // 反转颜色顺序
}
```

### 8.2 对数色阶

```javascript
{
    type: 'contour',
    z: [[...]],
    // 通过自定义色阶实现
    colorscale: [
        [0, 'blue'],
        [0.5, 'green'],    // 在 log 尺度的中间
        [1, 'red']
    ],
    zmin: 1,
    zmax: 1000
}
```

### 8.3 离散色阶

```javascript
{
    type: 'contour',
    z: [[...]],
    colorscale: [
        [0, 'blue'],
        [0.33, 'blue'],
        [0.33, 'green'],
        [0.66, 'green'],
        [0.66, 'red'],
        [1, 'red']
    ]
}
// 产生 3 个离散颜色区域
```

---

## 九、性能考虑

### 9.1 着色模式性能

| 模式 | 性能 | 原因 |
|------|------|------|
| `none` | 最快 | 只绘制线条 |
| `lines` | 快 | 绘制彩色线条 |
| `fill` | 中等 | 需要填充区域 |
| `heatmap` | 最慢 | 需要处理整个 z 矩阵 |

### 9.2 优化建议

1. **减少等值线数量**: 设置适当的 `ncontours` 或 `contours.size`
2. **使用简单的色阶**: 减少色阶中的颜色数量
3. **避免过度平滑**: `smoothing: 0` 生成最简单的路径
4. **使用 connectgaps**: 避免复杂的边界处理

---

## 十、示例

### 10.1 基本填充等值线

```javascript
var data = [{
    type: 'contour',
    z: [[10, 10.625, 12.5, 15.625, 20],
        [5.625, 6.25, 8.125, 11.25, 15.625],
        [2.5, 3.125, 5, 8.125, 12.5]],
    colorscale: 'Viridis',
    contours: {
        coloring: 'fill'
    }
}];
```

### 10.2 热力图风格等值线

```javascript
var data = [{
    type: 'contour',
    z: [[...]],
    colorscale: 'Hot',
    contours: {
        coloring: 'heatmap',
        showlines: false  // 隐藏线条
    }
}];
```

### 10.3 仅线条等值线

```javascript
var data = [{
    type: 'contour',
    z: [[...]],
    colorscale: 'Rainbow',
    contours: {
        coloring: 'lines',
        showlabels: true  // 显示标签
    },
    line: {
        width: 2,
        smoothing: 1.3
    }
}];
```

---

*文档生成时间: 2026-03-03*
