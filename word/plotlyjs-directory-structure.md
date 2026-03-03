# Plotly.js 源码目录结构详解

## 一、根目录结构

```
src/
├── assets/              # 静态资源
├── components/          # UI 组件
├── constants/           # 常量定义
├── core.js             # 核心入口
├── css/                # 样式文件
├── fonts/              # 字体资源
├── generated/          # 自动生成代码
├── lib/                # 工具函数库
├── locale-en.js        # 英文语言包
├── locale-en-us.js     # 美式英文语言包
├── plots/              # 图表绑定的坐标系逻辑
├── plot_api/           # Plotly API
├── registry.js         # 模块注册中心
├── snapshot/           # 快照导出
├── traces/             # 图表类型实现
├── transforms/         # 数据转换器
└── version.js          # 版本信息
```

---

## 二、详细目录树

### 2.1 组件目录 (components/)

```
components/
├── annotations/              # 注释标注
│   ├── arrow_paths.js       # 箭头路径定义
│   ├── attributes.js        # 属性定义
│   ├── calc_autorange.js    # 自动范围计算
│   ├── click.js             # 点击事件
│   ├── common_defaults.js   # 通用默认值
│   ├── convert_coords.js    # 坐标转换
│   ├── defaults.js          # 默认值
│   ├── draw.js              # 绘制逻辑
│   ├── draw_arrow_head.js   # 箭头绘制
│   └── index.js             # 模块入口
│
├── annotations3d/            # 3D 注释
│   ├── attributes.js
│   ├── convert.js
│   ├── defaults.js
│   ├── draw.js
│   └── index.js
│
├── calendars/                # 日历系统
│   ├── calendars.js         # 日历实现
│   └── index.js
│
├── color/                    # 颜色处理
│   ├── attributes.js        # 颜色属性
│   └── index.js             # 颜色工具
│
├── colorbar/                 # 颜色条
│   ├── attributes.js
│   ├── constants.js
│   ├── defaults.js
│   ├── draw.js
│   ├── has_colorbar.js
│   └── index.js
│
├── colorscale/               # 色阶
│   ├── attributes.js
│   ├── calc.js
│   ├── cross_trace_defaults.js
│   ├── defaults.js
│   ├── helpers.js
│   ├── index.js
│   ├── layout_attributes.js
│   ├── layout_defaults.js
│   └── scales.js
│
├── dragelement/              # 拖拽元素
│   ├── align.js
│   ├── cursor.js
│   ├── helpers.js
│   ├── index.js
│   └── unhover.js
│
├── drawing/                  # 绘图工具
│   ├── attributes.js
│   ├── index.js
│   └── symbol_defs.js       # 符号定义
│
├── errorbars/                # 误差条
│   ├── attributes.js
│   ├── calc.js
│   ├── compute_error.js
│   ├── defaults.js
│   ├── index.js
│   ├── plot.js
│   └── style.js
│
├── fx/                       # 交互效果
│   ├── attributes.js
│   ├── calc.js
│   ├── click.js
│   ├── constants.js
│   ├── defaults.js
│   ├── helpers.js
│   ├── hover.js             # 悬停逻辑
│   ├── hoverlabel_defaults.js
│   ├── hovermode_defaults.js
│   ├── index.js
│   ├── layout_attributes.js
│   ├── layout_defaults.js
│   └── layout_global_defaults.js
│
├── grid/                     # 网格布局
│   └── index.js
│
├── images/                   # 图片组件
│   ├── attributes.js
│   ├── convert_coords.js
│   ├── defaults.js
│   ├── draw.js
│   └── index.js
│
├── legend/                   # 图例
│   ├── attributes.js
│   ├── constants.js
│   ├── defaults.js
│   ├── draw.js
│   ├── get_legend_data.js
│   ├── handle_click.js
│   ├── helpers.js
│   ├── index.js
│   └── style.js
│
├── modebar/                  # 模式工具栏
│   ├── attributes.js
│   ├── buttons.js           # 工具栏按钮定义
│   ├── constants.js
│   ├── defaults.js
│   ├── index.js
│   ├── manage.js
│   └── modebar.js
│
├── rangeselector/            # 范围选择器
│   ├── attributes.js
│   ├── constants.js
│   ├── defaults.js
│   ├── draw.js
│   ├── get_update_object.js
│   └── index.js
│
├── rangeslider/              # 范围滑块
│   ├── attributes.js
│   ├── calc_autorange.js
│   ├── constants.js
│   ├── defaults.js
│   ├── draw.js
│   ├── helpers.js
│   ├── index.js
│   └── oppaxis_attributes.js
│
├── selections/               # 选择区域
│   ├── attributes.js
│   ├── defaults.js
│   ├── draw.js
│   ├── index.js
│   └── draw_newselection/   # 绘制新选择
│
├── shapes/                   # 形状
│   ├── attributes.js
│   ├── calc_autorange.js
│   ├── constants.js
│   ├── defaults.js
│   ├── draw.js
│   ├── helpers.js
│   ├── index.js
│   └── draw_newshape/       # 绘制新形状
│
├── sliders/                  # 滑块控件
│   ├── attributes.js
│   ├── constants.js
│   ├── defaults.js
│   ├── draw.js
│   └── index.js
│
├── titles/                   # 标题
│   └── index.js
│
└── updatemenus/              # 更新菜单
    ├── attributes.js
    ├── constants.js
    ├── defaults.js
    ├── draw.js
    ├── emit.js
    ├── helpers.js
    ├── index.js
    └── scrollbox.js
```

### 2.2 图表类型目录 (traces/)

```
traces/
├── bar/                  # 柱状图
├── barpolar/             # 极坐标柱状图
├── box/                  # 箱线图
├── candlestick/          # K线图
├── carpet/               # 地毯图
├── choropleth/           # 等值区域图
├── choroplethmap/        # 地图等值区域图
├── choroplethmapbox/     # Mapbox 等值区域图
├── cone/                 # 锥形图
├── contour/              # 等高线图
├── contourcarpet/        # 地毯等高线图
├── densitymap/           # 密度图
├── densitymapbox/        # Mapbox 密度图
├── funnel/               # 漏斗图
├── funnelarea/           # 面积漏斗图
├── heatmap/              # 热力图
├── histogram/            # 直方图
├── histogram2d/          # 2D 直方图
├── histogram2dcontour/   # 2D 直方图等高线
├── icicle/               # 冰柱图
├── image/                # 图像显示
├── indicator/            # 指标图
├── isosurface/           # 等值面
├── mesh3d/               # 3D 网格
├── ohlc/                 # OHLC 图
├── parcats/              # 平行类别图
├── parcoords/            # 平行坐标图
├── pie/                  # 饼图
├── sankey/               # 桑基图
├── scatter/              # 散点图 (核心)
├── scatter3d/            # 3D 散点图
├── scattercarpet/        # 地毯散点图
├── scattergeo/           # 地理散点图
├── scattergl/            # WebGL 散点图
├── scattermap/           # 地图散点图
├── scattermapbox/        # Mapbox 散点图
├── scatterpolar/         # 极坐标散点图
├── scatterpolargl/       # WebGL 极坐标散点图
├── scattersmith/         # 史密斯图散点
├── scatterternary/       # 三元散点图
├── splom/                # 散点图矩阵
├── streamtube/           # 流管图
├── sunburst/             # 旭日图
├── surface/              # 3D 曲面图
├── table/                # 表格
├── treemap/              # 树状图
├── violin/               # 小提琴图
├── volume/               # 体积图
└── waterfall/            # 瀑布图
```

### 2.3 坐标系目录 (plots/)

```
plots/
├── cartesian/            # 笛卡尔坐标系 (2D)
├── geo/                  # 地理坐标系
├── gl3d/                 # WebGL 3D 坐标系
│   └── layout/          # 3D 布局
├── map/                  # 地图坐标系
│   └── styles/          # 地图样式
├── mapbox/               # Mapbox 坐标系
├── polar/                # 极坐标系
├── smith/                # 史密斯坐标系
└── ternary/              # 三元坐标系
```

### 2.4 工具库目录 (lib/)

```
lib/
├── array.js              # 数组操作
├── clean_number.js       # 数字清理
├── coerce.js             # 属性强制转换
├── dates.js              # 日期处理
├── ensure_unique.js      # 确保唯一性
├── events.js             # 事件处理
├── extend.js             # 对象扩展
├── filter_unique.js      # 去重过滤
├── flatten.js            # 扁平化
├── geo_location_utils.js # 地理位置
├── geometry2d.js         # 2D 几何
├── gl_format_color.js    # WebGL 颜色
├── graph_interact.js     # 图形交互
├── html2unicode.js       # HTML 转 Unicode
├── identity.js           # 恒等函数
├── index.js              # 入口
├── is_plain_object.js    # 对象判断
├── loggers.js            # 日志
├── matrix.js             # 矩阵运算
├── mod.js                # 取模
├── nested_property.js    # 嵌套属性
├── noop.js               # 空函数
├── notifier.js           # 通知
├── polygon.js            # 多边形
├── push_unique.js        # 唯一推入
├── queue.js              # 队列
├── search.js             # 搜索
├── setcursor.js          # 光标
├── show_no_webgl.js      # WebGL 提示
├── stats.js              # 统计
├── str2regex.js          # 字符串转正则
├── svg_text_utils.js     # SVG 文本
├── throttle.js           # 节流
├── to_log_range.js       # 对数范围
├── topojson_utils.js     # TopoJSON
└── typed_array_truncate.js # 类型数组截断
```

### 2.5 API 目录 (plot_api/)

```
plot_api/
├── plot_api.js           # 主 API
├── manage_arrays.js      # 数组管理
├── plot_config.js        # 配置
├── plot_schema.js        # 模式定义
├── set_plot_config.js    # 配置设置
└── to_image.js           # 图像导出
```

### 2.6 其他目录

```
assets/
└── geo_assets.js         # 地理资源

constants/
└── *.js                  # 各种常量

css/
└── *.css                 # 样式文件

fonts/
└── *.woff, *.woff2       # 字体文件

generated/
└── regl-codegen/         # WebGL 代码生成

snapshot/
└── *.js                  # 快照功能

transforms/
├── aggregate.js          # 聚合转换
├── filter.js             # 过滤转换
├── groupby.js            # 分组转换
└── sort.js               # 排序转换
```

---

## 三、图表类型分类

### 3.1 按坐标系分类

| 坐标系 | 图表类型 |
|--------|----------|
| **Cartesian (笛卡尔)** | scatter, bar, line, histogram, box, violin, waterfall, funnel |
| **Polar (极坐标)** | scatterpolar, barpolar, scatterpolargl |
| **Geo (地理)** | scattergeo, choropleth |
| **Mapbox** | scattermapbox, choroplethmapbox, densitymapbox |
| **GL3D** | scatter3d, surface, mesh3d, cone, streamtube, volume, isosurface |
| **Ternary (三元)** | scatterternary |
| **Smith** | scattersmith |
| **Carpet (地毯)** | carpet, scattercarpet, contourcarpet |

### 3.2 按渲染方式分类

| 渲染方式 | 图表类型 | 特点 |
|----------|----------|------|
| **SVG** | scatter, bar, pie, heatmap | 矢量图，适合中等数据量 |
| **WebGL** | scattergl, scatter3d, surface | GPU 加速，适合大数据量 |
| **Canvas** | 图像导出 | 位图输出 |

### 3.3 按数据类型分类

| 数据类型 | 图表类型 |
|----------|----------|
| **分布** | histogram, box, violin |
| **相关** | scatter, scattergl, splom |
| **排名** | bar, funnel |
| **部分整体** | pie, sunburst, treemap, funnelarea |
| **时间序列** | scatter, line, candlestick, ohlc |
| **地理** | scattergeo, choropleth, scattermapbox |
| **3D** | scatter3d, surface, mesh3d |
| **流程** | sankey, parcats |
| **多维** | parcoords, splom |

---

## 四、核心文件说明

### 4.1 入口文件

| 文件 | 说明 |
|------|------|
| `core.js` | 主入口，注册所有模块并导出 Plotly 对象 |
| `registry.js` | 模块注册中心，管理所有图表、组件、转换器 |

### 4.2 配置文件

| 文件 | 说明 |
|------|------|
| `plot_api/plot_config.js` | 全局配置定义 |
| `plot_api/plot_schema.js` | JSON Schema 定义 |
| `plots/layout_attributes.js` | 布局属性定义 |

### 4.3 国际化文件

| 文件 | 说明 |
|------|------|
| `locale-en.js` | 英语语言包 |
| `locale-en-us.js` | 美式英语语言包 |

---

## 五、模块文件命名规范

### 5.1 通用命名

| 文件名 | 用途 |
|--------|------|
| `index.js` | 模块入口 |
| `attributes.js` | 属性定义 |
| `defaults.js` | 默认值 |
| `calc.js` | 计算 |
| `plot.js` | 绘制 |
| `draw.js` | 绑定 DOM |
| `style.js` | 样式 |
| `hover.js` | 悬停 |
| `select.js` | 选择 |
| `helpers.js` | 辅助函数 |
| `constants.js` | 常量 |

### 5.2 转换相关

| 文件名 | 用途 |
|--------|------|
| `calc_autorange.js` | 自动范围计算 |
| `convert_coords.js` | 坐标转换 |
| `supply_defaults.js` | 提供默认值 |

---

*文档生成时间: 2026-03-03*
