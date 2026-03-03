# zrender-contour 示例 Demo 设计文档

## 概述

为 zrender-contour 库创建完整的示例 demo 集合，覆盖所有功能特性。

## 设计决策

### 形式
- 纯 HTML 文件，可直接在浏览器打开
- 使用 ES Module 方式引入依赖

### 依赖引入
- ZRender: 通过 CDN (jsdelivr ESM) 加载
- 本地库: 引用 `dist/zrender-contour.esm.js`

### 页面风格
- 带说明文档式：每个页面包含标题、描述、代码说明和画布

### 组织方式
- 按功能分类：basic / coloring / styling / advanced

## 文件结构

```
examples/
├── index.html                   # 导航首页
├── basic/                       # 基础示例
│   ├── 01-minimal.html
│   ├── 02-coordinates.html
│   └── 03-levels.html
├── coloring/                    # 着色模式
│   ├── fill.html
│   ├── heatmap.html
│   ├── lines.html
│   └── none.html
├── styling/                     # 样式定制
│   ├── smoothing.html
│   ├── colorscale.html
│   ├── line-style.html
│   └── reverse-scale.html
├── advanced/                    # 高级功能
│   ├── labels.html
│   ├── colorbar.html
│   ├── log-axis.html
│   ├── null-data.html
│   ├── interaction.html
│   └── constraint.html
└── shared/
    └── data.js                  # 共享数据集
```

## 共享数据集

`shared/data.js` 提供：
- `simpleGrid` - 简单 3x3 渐变数据
- `gaussianGrid` - 高斯分布数据 (50x50)
- `terrainGrid` - 地形数据 (100x100)
- `nullDataGrid` - 带 Null 值的数据
- `logScaleData` - 对数刻度数据
- `rippleGrid` - 波纹数据 (同心圆)
- `colorScales` - 预定义色阶

## HTML 模板

每个示例页面统一结构：
- 返回导航链接
- 标题和描述
- 画布容器 (400px 高度)
- 代码块展示关键代码

## 示例列表

| 分类 | 示例 | 功能点 |
|------|------|--------|
| basic | 01-minimal | 最小可运行示例 |
| basic | 02-coordinates | 自定义 x/y 坐标 |
| basic | 03-levels | 等值线级别控制 |
| coloring | fill | fill 填充模式 |
| coloring | heatmap | heatmap 热力图模式 |
| coloring | lines | lines 线条模式 |
| coloring | none | none 无着色模式 |
| styling | smoothing | 平滑参数 (0-1.3) |
| styling | colorscale | 自定义色阶 |
| styling | line-style | 线条颜色/宽度/虚线 |
| styling | reverse-scale | 反转色阶 |
| advanced | labels | 等值线标签 |
| advanced | colorbar | 颜色条配置 |
| advanced | log-axis | 对数坐标轴 |
| advanced | null-data | Null 数据处理 |
| advanced | interaction | 交互事件 |
| advanced | constraint | 约束等值线 |

## 使用方式

1. 构建项目：`npm run build`
2. 打开 `examples/index.html` 浏览所有示例
3. 或直接打开单个示例文件

---

*创建时间: 2026-03-03*
