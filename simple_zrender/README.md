# zrender-contour

基于 ZRender 的等值线图库，与 Plotly.js contour 功能兼容。

## 项目目标

实现与 Plotly.js contour 等值线图相同的功能，作为独立的 npm 开源插件发布。

## 功能特性

- ✅ Marching Squares 算法实现
- ✅ 边界角落填充
- ✅ 路径平滑处理（Centripetal Catmull-Rom 样条）
- ✅ 四种着色模式（fill, heatmap, lines, none）
- ✅ 颜色映射与填充
- ✅ Null 数据处理
- ✅ 坐标轴与对数处理
- ✅ 标签放置
- ✅ 交互事件
- ✅ ColorBar 支持

## 安装

```bash
npm install zrender-contour
```

或使用 yarn:

```bash
yarn add zrender-contour
```

## 快速开始

```typescript
import * as zrender from 'zrender';
import { Contour } from 'zrender-contour';

const chart = zrender.init(document.getElementById('main'));

const contour = new Contour({
  z: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
  x: [0, 1, 2],
  y: [0, 1, 2],

  contours: {
    coloring: 'fill',
    start: 1,
    end: 5,
    size: 1,
    showlabels: true
  },

  colorscale: 'Viridis',
  line: {
    width: 1,
    smoothing: 1
  },

  colorbar: {
    title: { text: 'Value' },
    len: 0.9,
    thickness: 20
  }
});

chart.add(contour);
```

## API 文档

### ContourOption

```typescript
interface ContourOption {
  // 数据
  z: number[][];          // 数据矩阵
  x?: number[];           // x 坐标
  y?: number[];           // y 坐标

  // 等值线配置
  contours?: {
    coloring?: 'fill' | 'heatmap' | 'lines' | 'none';
    showlines?: boolean;
    showlabels?: boolean;
    start?: number;
    end?: number;
    size?: number;
    ncontours?: number;
  };

  // 色阶
  colorscale?: string | ColorScale[];
  reversescale?: boolean;
  zmin?: number;
  zmax?: number;

  // 线条
  line?: {
    color?: string;
    width?: number;
    dash?: number[];
    smoothing?: number;  // 0-1.3, 默认 1
  };

  // 颜色条
  colorbar?: ColorBarOption;

  // 坐标轴
  xaxis?: AxisOption;
  yaxis?: AxisOption;
}
```

## 开发指南

### 环境准备

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 生成文档
npm run docs
```

### 项目结构

```
simple_zrender/
├── src/
│   ├── index.ts                    # 入口文件
│   ├── contour/
│   │   ├── Contour.ts              # 主类
│   │   ├── ContourOption.ts        # 配置接口
│   │   ├── marching-squares/       # Marching Squares 算法
│   │   ├── path/                   # 路径追踪
│   │   ├── fill/                   # 填充渲染
│   │   ├── line/                   # 线条渲染
│   │   ├── label/                  # 标签放置
│   │   ├── axis/                   # 坐标轴
│   │   ├── colorbar/               # 颜色条
│   │   ├── interaction/            # 交互事件
│   │   └── constraint/             # 约束等值线
│   ├── util/                       # 工具函数
│   └── types/                      # 类型定义
├── test/                           # 测试文件
├── examples/                       # 示例代码
└── word/                           # 文档
```

## 技术栈

- **图形库**: ZRender 5.x
- **语言**: TypeScript
- **构建工具**: Rollup
- **测试**: Jest
- **文档**: TypeDoc

## 路线图

### v0.1.0 (Day 7)
- Marching Squares + 基础填充

### v0.2.0 (Day 9)
- 平滑处理

### v0.3.0 (Day 12)
- 四种着色模式

### v0.4.0 (Day 15)
- 坐标轴 + Null 处理

### v0.5.0 (Day 18)
- 标签 + ColorBar

### v0.6.0 (Day 21)
- 交互 + 约束等值线

### v1.0.0 (Day 23)
- 完整功能 + 文档

## 贡献指南

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详情。

## 许可证

[MIT](LICENSE)

## 参考

- [Plotly.js Contour](https://plotly.com/javascript/contour-plots/)
- [ZRender](https://github.com/ecomfe/zrender)
- [Marching Squares Algorithm](https://en.wikipedia.org/wiki/Marching_squares)

## 联系方式

如有问题或建议，请提交 [Issue](../../issues)。

---

*文档生成时间: 2026-03-03*
