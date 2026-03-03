# Plotly.js 核心 API 与数据流详解

## 一、核心 API 方法

### 1.1 图表创建与更新

```javascript
// 创建新图表
Plotly.newPlot(gd, data, layout, config)

// 在现有容器中绘制/更新
Plotly.plot(gd, data, layout, config)

// 响应式更新（智能 diff）
Plotly.react(gd, data, layout, config)

// 更新数据/样式属性
Plotly.restyle(gd, aobj, traces)

// 更新布局属性
Plotly.relayout(gd, aobj)

// 更新数据转换
Plotly.restyleTransform(gd, aobj, traces)
```

### 1.2 图表管理

```javascript
// 清理图表
Plotly.purge(gd)

// 添加图表
Plotly.addTraces(gd, traces, newIndices)

// 删除图表
Plotly.deleteTraces(gd, indices)

// 移动图表顺序
Plotly.moveTraces(gd, currentIndices, newIndices)

// 扩展数据
Plotly.extendTraces(gd, update, indices, maxPoints)

// 前置数据
Plotly.prependTraces(gd, update, indices, maxPoints)
```

### 1.3 导出功能

```javascript
// 导出为图片
Plotly.toImage(gd, opts)

// 下载图片
Plotly.downloadImage(gd, opts)

// 生成 SVG
Plotly.Snapshot.toSVG(gd)
```

### 1.4 动画

```javascript
// 添加动画帧
Plotly.addFrames(gd, frames, indices)

// 删除动画帧
Plotly.deleteFrames(gd, indices)

// 播放动画
Plotly.animate(gd, frameOrListOfFrames, animationOpts)
```

---

## 二、数据结构

### 2.1 基础图表数据 (Trace)

```javascript
data = [
    {
        // 基础属性
        type: 'scatter',           // 图表类型
        mode: 'lines+markers',     // 显示模式
        name: 'Series 1',          // 系列名称

        // 数据
        x: [1, 2, 3, 4],           // X 轴数据
        y: [10, 15, 13, 17],       // Y 轴数据

        // 标记样式
        marker: {
            color: 'red',          // 颜色
            size: 8,               // 大小
            symbol: 'circle',      // 符号
            line: {
                color: 'black',    // 边框颜色
                width: 1           // 边框宽度
            }
        },

        // 线条样式
        line: {
            color: 'blue',         // 颜色
            width: 2,              // 宽度
            dash: 'solid',         // 虚线样式
            shape: 'linear'        // 插值方式
        },

        // 填充
        fill: 'tozeroy',           // 填充方式
        fillcolor: 'rgba(0,0,255,0.3)',

        // 文本
        text: ['A', 'B', 'C', 'D'], // 悬停文本
        textposition: 'top center', // 文本位置

        // 坐标轴
        xaxis: 'x',                // X 轴引用
        yaxis: 'y',                // Y 轴引用

        // 可见性
        visible: true,             // 是否可见
        showlegend: true,          // 显示图例

        // 悬停
        hoverinfo: 'x+y+text',     // 悬停信息
        hovertext: ['Info A', ...], // 自定义悬停文本
        hovertemplate: '<b>%{x}</b>: %{y}<extra></extra>',

        // 选中
        selectedpoints: [0, 2],    // 选中的点

        // 变换
        transforms: [{
            type: 'filter',
            operation: '>',
            value: 10
        }]
    }
];
```

### 2.2 布局配置 (Layout)

```javascript
layout = {
    // 标题
    title: {
        text: 'Chart Title',
        font: { family: 'Arial', size: 24, color: 'black' },
        x: 0.5,                    // 水平位置
        xanchor: 'center',
        y: 1,
        yanchor: 'top',
        pad: { t: 10, r: 0, b: 0, l: 0 }
    },

    // 坐标轴
    xaxis: {
        title: { text: 'X Axis' },
        type: 'linear',            // linear, log, date, category
        autorange: true,
        range: [0, 10],
        tickmode: 'auto',
        tickvals: [0, 2, 4, 6, 8, 10],
        ticktext: ['Zero', 'Two', ...],
        tickformat: '.2f',
        dtick: 2,
        gridcolor: '#ccc',
        gridwidth: 1,
        zeroline: true,
        showline: true,
        linecolor: 'black',
        mirror: true
    },

    yaxis: {
        // 同 xaxis 配置
    },

    // 多坐标轴
    xaxis2: { anchor: 'y2', ... },
    yaxis2: { anchor: 'x2', ... },

    // 图例
    showlegend: true,
    legend: {
        x: 1,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        orientation: 'v',          // v 或 h
        bgcolor: 'rgba(255,255,255,0.5)',
        bordercolor: '#ccc',
        borderwidth: 1,
        font: { family: 'Arial', size: 12 },
        traceorder: 'normal',      // normal, reversed, grouped
        itemsizing: 'trace'        // trace 或 constant
    },

    // 边距
    margin: {
        l: 50, r: 50, t: 50, b: 50,
        pad: 0,
        autoexpand: true
    },

    // 尺寸
    width: 800,
    height: 600,
    autosize: true,

    // 背景
    paper_bgcolor: '#fff',
    plot_bgcolor: '#fff',

    // 网格布局（子图）
    grid: {
        rows: 2,
        columns: 2,
        pattern: 'independent',    // independent 或 coupled
        roworder: 'top to bottom',
        xgap: 0.2,
        ygap: 0.3
    },

    // 交互模式
    hovermode: 'closest',          // closest, x, y, x unified, false
    dragmode: 'zoom',              // zoom, pan, select, lasso, drawclosedcurve, drawopencurve, drawline, drawcircle, drawrect, orbit, turntable, false
    clickmode: 'event',            // event, select, event+select

    // 选择模式
    selectdirection: 'd',          // h, v, d (any direction)

    // 注释
    annotations: [{
        text: 'Annotation',
        x: 1,
        y: 1,
        xref: 'x',
        yref: 'y',
        showarrow: true,
        arrowhead: 1,
        ax: 20,
        ay: -30
    }],

    // 形状
    shapes: [{
        type: 'rect',              // rect, circle, line, path
        x0: 0, y0: 0,
        x1: 1, y1: 1,
        fillcolor: 'blue',
        opacity: 0.5,
        line: { color: 'black', width: 1 }
    }],

    // 图片
    images: [{
        source: 'image.png',
        xref: 'x',
        yref: 'y',
        x: 0, y: 0,
        sizex: 1, sizey: 1,
        sizing: 'contain',
        opacity: 1,
        layer: 'above'             // above, below
    }],

    // 滑块
    sliders: [{
        active: 0,
        steps: [{
            label: 'Step 1',
            method: 'restyle',
            args: ['marker.color', 'red']
        }],
        currentvalue: {
            visible: true,
            prefix: 'Value: ',
            xanchor: 'right'
        },
        pad: { t: 50 }
    }],

    // 更新菜单
    updatemenus: [{
        type: 'dropdown',          // dropdown, buttons
        direction: 'down',         // down, left, right, up
        active: 0,
        buttons: [{
            label: 'Option 1',
            method: 'restyle',
            args: ['visible', [true, false]]
        }],
        showactive: true,
        x: 0,
        y: 1
    }],

    // 范围滑块
    xaxis: {
        rangeslider: {
            visible: true,
            thickness: 0.15,
            bgcolor: '#eee',
            bordercolor: '#ccc',
            borderwidth: 1,
            autorange: true,
            range: [0, 10]
        }
    },

    // 范围选择器
    xaxis: {
        rangeselector: {
            visible: true,
            buttons: [{
                count: 1,
                label: '1m',
                step: 'month',
                stepmode: 'backward'
            }, {
                step: 'all',
                label: 'All'
            }],
            x: 0,
            y: 1
        }
    },

    // 主题模板
    template: {
        layout: { ... },
        data: {
            scatter: [{ ... }],
            bar: [{ ... }]
        }
    },

    // 色阶
    colorscale: {
        sequential: [[0, 'rgb(0,0,0)'], [1, 'rgb(255,255,255)']],
        diverging: [[0, 'blue'], [0.5, 'white'], [1, 'red']]
    },

    // 颜色轴
    coloraxis: {
        cmin: 0,
        cmax: 100,
        colorscale: 'Viridis',
        showscale: true,
        colorbar: {
            title: { text: 'Value' },
            thickness: 20,
            len: 0.8
        }
    }
};
```

### 2.3 配置选项 (Config)

```javascript
config = {
    // 模式栏
    displayModeBar: true,          // true, false, 'hover'
    modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d'],
    modeBarButtonsToAdd: ['drawopenpath', 'eraseshape'],
    modeBarButtons: false,         // 完全自定义按钮

    // Logo
    displaylogo: true,
    watermark: false,

    // 响应式
    responsive: true,

    // 滚动缩放
    scrollZoom: true,              // 或 'gl3d', 'geo', 'mapbox' (按坐标系)

    // 双击
    doubleClick: 'reset',          // reset, autosize, reset+autosize, false
    doubleClickDelay: 300,

    // 提示
    showTips: true,
    showLink: false,
    linkText: 'Edit chart',

    // 导出图片选项
    toImageButtonOptions: {
        format: 'png',             // png, svg, jpeg, webp
        filename: 'chart',
        height: 800,
        width: 1200,
        scale: 2                   // 分辨率倍数
    },

    // WebGL 像素比
    plotGlPixelRatio: 2,

    // 本地化
    locale: 'en-US',
    locales: { ... },              // 自定义语言包

    // 编辑
    editable: false,
    edits: {
        annotationPosition: true,
        annotationTail: true,
        annotationText: true,
        axisTitleText: true,
        colorbarPosition: true,
        colorbarTitleText: true,
        legendPosition: true,
        legendText: true,
        shapePosition: true,
        titleText: true
    },

    // 静态图
    staticPlot: false,

    // 事件
    queueLength: 0,                // 事件队列长度

    // 填充模式
    fillFrame: false,
    frameMargins: 0,

    // 滚动到缩放
    scrollZoom: 'gl3d',

    // 事件处理
    doubleClick: 'reset',

    // 顶部 marginal
    topspline: false,

    // 按顺序模式
    modeBarButtonsToRemove: [],

    // 设置数据
    setData: false
};
```

---

## 三、数据流程图

### 3.1 初始化流程

```
用户调用 Plotly.newPlot(gd, data, layout, config)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 验证容器 (gd 必须是有效的 DOM 元素)                        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 清理旧图表 (如果存在)                                      │
│     - 移除事件监听器                                          │
│     - 清空 SVG/Canvas                                         │
│     - 清理 WebGL 上下文                                       │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 合并配置                                                   │
│     config = defaults(config, plotConfig)                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 数据验证和默认值填充                                        │
│     for each trace:                                          │
│         supplyDefaults(traceIn, traceOut)                    │
│         validateAttributes(traceOut)                         │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 数据转换 (transforms)                                      │
│     for each transform:                                      │
│         transform.transform()                                │
│         - filter: 过滤数据                                    │
│         - aggregate: 聚合数据                                 │
│         - groupby: 分组数据                                   │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  6. 数据计算 (calc)                                            │
│     for each trace:                                          │
│         trace.calc(gd, trace)                                │
│         - 坐标转换                                            │
│         - 统计计算                                            │
│         - 缓存计算结果 (cd)                                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  7. 布局计算                                                   │
│     - 计算坐标轴范围 (autorange)                               │
│     - 计算图例尺寸和位置                                       │
│     - 计算组件位置 (annotations, shapes, images)              │
│     - 计算边距                                                 │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  8. 绘制                                                       │
│     - 创建 SVG/Canvas 容器                                    │
│     - 绘制背景                                                 │
│     - 绘制坐标轴                                               │
│     - 绘制图表 (for each trace: trace.plot())                 │
│     - 绘制组件                                                 │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  9. 交互绑定                                                   │
│     - 绑定鼠标事件                                             │
│     - 绑定触摸事件                                             │
│     - 绑定键盘事件                                             │
│     - 设置拖拽行为                                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  10. 触发完成事件                                               │
│      gd.emit('plotly_afterplot')                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 更新流程 (restyle)

```
Plotly.restyle(gd, update, traces)
                │
                ▼
┌───────────────────────────────────────────┐
│  1. 解析更新对象                            │
│     aobj = parseUpdateObject(update)      │
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  2. 验证新属性                              │
│     for each key in aobj:                 │
│         validateAttribute(key, value)     │
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  3. 更新数据模型                            │
│     gd.data[trace][key] = value           │
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  4. 判断是否需要重新计算                     │
│     if (needsRecalc):                     │
│         recalc(gd)                        │
│     if (needsRelayout):                   │
│         relayout(gd)                      │
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  5. 重新绘制                                │
│     redraw(gd)                            │
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  6. 触发更新事件                            │
│     gd.emit('plotly_restyle')             │
└───────────────────────────────────────────┘
```

### 3.3 响应式更新流程 (react)

```
Plotly.react(gd, newData, newLayout, newConfig)
                │
                ▼
┌───────────────────────────────────────────┐
│  1. 比较新旧数据                            │
│     dataDiff = diff(gd.data, newData)     │
│     layoutDiff = diff(gd.layout, newLayout)│
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  2. 智能判断更新策略                        │
│                                           │
│     if (onlyDataChanged):                 │
│         → 使用 restyle()                  │
│                                           │
│     elif (onlyLayoutChanged):             │
│         → 使用 relayout()                 │
│                                           │
│     elif (structureChanged):              │
│         → 完全重绘 (newPlot)               │
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  3. 执行最优更新                            │
│     executeUpdate(strategy)               │
└───────────────────────────────────────────┘
```

---

## 四、事件系统

### 4.1 事件类型

```javascript
// 图表事件
'plotly_afterexport'          // 导出后
'plotly_afterimport'          // 导入后
'plotly_afterplot'            // 绑定后
'plotly_animated'             // 动画完成
'plotly_animating'            // 动画进行中
'plotly_animationinterrupted' // 动画中断
'plotly_autoscale'            // 自动缩放
'plotly_beforeexport'         // 导出前
'plotly_beforeexport'         // 导出前
'plotly_click'                // 点击
'plotly_clickannotation'      // 点击注释
'plotly_deselect'             // 取消选择
'plotly_doubleclick'          // 双击
'plotly_framework'            // 框架事件
'plotly_hover'                // 悬停
'plotly_legendclick'          // 点击图例
'plotly_legenddoubleclick'    // 双击图例
'plotly_relayout'             // 布局更新
'plotly_relayouting'          // 布局更新中
'plotly_restyle'              // 样式更新
'plotly_redraw'               // 重绘
'plotly_select'               // 选择
'plotly_selecting'            // 选择中
'plotly_sliderchange'         // 滑块变化
'plotly_sliderend'            // 滑块结束
'plotly_sliderstart'          // 滑块开始
'plotly_sunburstclick'        // 旭日图点击
'plotly_transitioning'        // 过渡中
'plotly_transitioninterrupted'// 过渡中断
'plotly_unhover'              // 取消悬停
'plotly_deselect'             // 取消选择
```

### 4.2 事件监听

```javascript
// 添加事件监听器
gd.on('plotly_click', function(data) {
    console.log('Clicked:', data.points);
});

// 一次性监听
gd.once('plotly_hover', function(data) {
    console.log('Hovered:', data.points);
});

// 移除监听器
gd.removeListener('plotly_click', handler);

// 移除所有监听器
gd.removeAllListeners('plotly_click');
```

### 4.3 事件数据结构

```javascript
// plotly_click 事件数据
{
    points: [{
        curveNumber: 0,          // 图表索引
        pointNumber: 2,          // 点索引
        x: 3,                    // X 值
        y: 15,                   // Y 值
        data: {...},             // 原始数据
        fullData: {...},         // 完整数据
        xaxis: {...},            // X 轴对象
        yaxis: {...}             // Y 轴对象
    }],
    xaxis: {...},
    yaxis: {...}
}

// plotly_relayout 事件数据
{
    'xaxis.range[0]': 0,
    'xaxis.range[1]': 10,
    // 或
    'xaxis.range': [0, 10],
    // 或
    'autosize': true
}

// plotly_select 事件数据
{
    points: [...],
    range: {
        x: [0, 10],
        y: [0, 20]
    },
    lassoPoints: {
        x: [1, 2, 3, 1],
        y: [1, 2, 1, 1]
    }
}
```

---

## 五、坐标轴详解

### 5.1 坐标轴类型

```javascript
// 线性坐标
xaxis: {
    type: 'linear',
    range: [0, 100]
}

// 对数坐标
xaxis: {
    type: 'log',
    range: [0, 2]             // 10^0 到 10^2
}

// 日期坐标
xaxis: {
    type: 'date',
    range: ['2020-01-01', '2020-12-31'],
    tickformat: '%Y-%m-%d'
}

// 分类坐标
xaxis: {
    type: 'category',
    categoryorder: 'array',    // trace, category descending, category ascending, array
    categoryarray: ['A', 'B', 'C']
}

// 多级分类
xaxis: {
    type: 'multicategory',
    categories: [['A', '1'], ['A', '2'], ['B', '1']]
}
```

### 5.2 双 Y 轴

```javascript
layout = {
    yaxis: {
        title: 'Left Y Axis',
        side: 'left'
    },
    yaxis2: {
        title: 'Right Y Axis',
        side: 'right',
        overlaying: 'y',        // 覆盖 yaxis
        anchor: 'x'             // 锚定到 xaxis
    }
};

data = [
    { y: [1, 2, 3], yaxis: 'y' },
    { y: [100, 200, 300], yaxis: 'y2' }
];
```

### 5.3 子图布局

```javascript
// 独立子图
layout = {
    grid: {
        rows: 2,
        columns: 2,
        pattern: 'independent'
    },
    xaxis: { domain: [0, 0.45] },
    yaxis: { domain: [0.55, 1] },
    xaxis2: { domain: [0.55, 1] },
    yaxis2: { domain: [0.55, 1] },
    xaxis3: { domain: [0, 0.45] },
    yaxis3: { domain: [0, 0.45] },
    xaxis4: { domain: [0.55, 1] },
    yaxis4: { domain: [0, 0.45] }
};
```

---

## 六、转换器详解

### 6.1 Filter 转换

```javascript
{
    type: 'scatter',
    x: [1, 2, 3, 4, 5],
    y: [10, 20, 30, 40, 50],
    transforms: [{
        type: 'filter',
        target: 'y',            // 或数组
        operation: '>',         // =, !=, >, <, >=, <=, [], ][, ()][, [], in, ∉
        value: 25
    }]
}
// 结果: 只显示 y > 25 的点
```

### 6.2 Aggregate 转换

```javascript
{
    type: 'scatter',
    x: ['A', 'A', 'B', 'B', 'B'],
    y: [1, 2, 3, 4, 5],
    transforms: [{
        type: 'aggregate',
        groups: 'x',
        aggregations: [{
            target: 'y',
            func: 'avg',        // count, sum, avg, median, mode, rms, stddev, min, max, first, last
            enabled: true
        }]
    }]
}
// 结果: A → 1.5, B → 4
```

### 6.3 GroupBy 转换

```javascript
{
    type: 'scatter',
    x: [1, 2, 3, 4, 5],
    y: [10, 20, 30, 40, 50],
    transforms: [{
        type: 'groupby',
        groups: ['A', 'B', 'A', 'B', 'A'],
        styles: [{
            target: 'A',
            value: { marker: { color: 'red' } }
        }, {
            target: 'B',
            value: { marker: { color: 'blue' } }
        }]
    }]
}
// 结果: 创建两个系列，A 组红色，B 组蓝色
```

---

## 七、动画系统

### 7.1 动画帧

```javascript
frames = [{
    name: 'frame1',
    data: [{
        y: [1, 2, 3]
    }],
    layout: {
        title: 'Frame 1'
    }
}, {
    name: 'frame2',
    data: [{
        y: [4, 5, 6]
    }],
    layout: {
        title: 'Frame 2'
    }
}];
```

### 7.2 动画选项

```javascript
Plotly.animate(gd, ['frame1', 'frame2'], {
    frame: {
        duration: 500,          // 每帧持续时间
        redraw: false           // 是否重绘
    },
    transition: {
        duration: 300,          // 过渡时间
        easing: 'cubic-in-out'  // 缓动函数
    },
    mode: 'immediate',          // immediate, afterall
    fromcurrent: false,         // 从当前位置开始
    direction: 'forward'        // forward, backward
});
```

### 7.3 缓动函数

```javascript
// 可用的缓动函数
'linear'
'quad'
'cubic'
'sin'
'exp'
'circle'
'elastic'
'back'
'bounce'
// 及其变体
'cubic-in', 'cubic-out', 'cubic-in-out'
```

---

## 八、WebGL 图表

### 8.1 ScatterGL

```javascript
{
    type: 'scattergl',
    mode: 'markers',
    x: largeArray,              // 可处理百万级数据
    y: largeArray,
    marker: {
        color: colorArray,
        size: sizeArray,
        opacity: opacityArray
    }
}
```

### 8.2 3D 图表

```javascript
{
    type: 'scatter3d',
    mode: 'markers',
    x: [1, 2, 3],
    y: [2, 3, 1],
    z: [3, 1, 2],
    marker: {
        size: 5,
        color: [1, 2, 3],
        colorscale: 'Viridis'
    },
    scene: 'scene'              // 引用场景
}

layout = {
    scene: {
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
        zaxis: { title: 'Z' },
        camera: {
            eye: { x: 1, y: 1, z: 1 },
            center: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 0, z: 1 }
        },
        aspectmode: 'cube',     // auto, cube, data, manual
        aspectratio: { x: 1, y: 1, z: 1 }
    }
};
```

---

*文档生成时间: 2026-03-03*
