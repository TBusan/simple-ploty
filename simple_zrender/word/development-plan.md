# ZRender Contour 开发计划

## 一、项目概述

### 1.1 项目目标

基于 ZRender 图形库实现与 Plotly.js contour 等值线图相同的功能，作为独立的 npm 开源插件发布。

### 1.2 功能清单

| 功能模块 | 对应文档 | 优先级 |
|---------|---------|--------|
| Marching Squares 算法 | contour-marching-squares.md | P0 |
| 边界角落填充 | contour-corner-filling.md | P0 |
| Null 数据处理 | contour-null-data-handling.md | P1 |
| 坐标轴与对数处理 | contour-axis-log-handling.md | P1 |
| 四种着色模式 | contour-coloring-modes.md | P0 |
| 颜色映射与填充 | contour-coloring.md | P0 |
| 约束等值线 | contour-constraints.md | P2 |
| 标签放置 | contour-labels.md | P1 |
| 交互事件 | contour-interactions.md | P2 |
| ColorBar | colorbar-implementation.md | P1 |

### 1.3 技术栈

- **图形库**: ZRender 5.x
- **语言**: TypeScript
- **构建工具**: Rollup
- **测试**: Jest
- **文档**: TypeDoc

---

## 二、项目结构

```
simple_zrender/
├── package.json
├── tsconfig.json
├── rollup.config.js
├── jest.config.js
├── README.md
├── LICENSE
├── src/
│   ├── index.ts                    # 入口文件
│   ├── contour/
│   │   ├── Contour.ts              # 主类
│   │   ├── ContourOption.ts        # 配置接口
│   │   ├── marching-squares/
│   │   │   ├── index.ts
│   │   │   ├── MarchingSquares.ts  # Marching Squares 算法
│   │   │   ├── SaddleHandler.ts    # 鞍点处理
│   │   │   └── constants.ts        # 常量定义
│   │   ├── path/
│   │   │   ├── index.ts
│   │   │   ├── PathFinder.ts       # 路径追踪
│   │   │   ├── BoundaryHandler.ts  # 边界处理
│   │   │   └── Interpolation.ts    # 插值计算
│   │   ├── fill/
│   │   │   ├── index.ts
│   │   │   ├── FillRenderer.ts     # 填充渲染
│   │   │   ├── ColorMapper.ts      # 颜色映射
│   │   │   └── GradientFill.ts     # 渐变填充
│   │   ├── line/
│   │   │   ├── index.ts
│   │   │   ├── LineRenderer.ts     # 线条渲染
│   │   │   └── Smoothing.ts        # 平滑处理
│   │   ├── label/
│   │   │   ├── index.ts
│   │   │   ├── LabelPlacer.ts      # 标签放置
│   │   │   └── CostFunction.ts     # 成本函数
│   │   ├── axis/
│   │   │   ├── index.ts
│   │   │   ├── Axis.ts             # 坐标轴
│   │   │   ├── LogAxis.ts          # 对数轴
│   │   │   └── AxisRenderer.ts     # 轴渲染
│   │   ├── colorbar/
│   │   │   ├── index.ts
│   │   │   ├── ColorBar.ts         # 颜色条
│   │   │   └── ColorBarAxis.ts     # 颜色条轴
│   │   ├── interaction/
│   │   │   ├── index.ts
│   │   │   ├── ZoomHandler.ts      # 缩放处理
│   │   │   ├── PanHandler.ts       # 平移处理
│   │   │   └── HoverHandler.ts     # 悬停处理
│   │   └── constraint/
│   │       ├── index.ts
│   │       └── ConstraintContour.ts # 约束等值线
│   ├── util/
│   │   ├── math.ts                 # 数学工具
│   │   ├── color.ts                # 颜色工具
│   │   ├── array.ts                # 数组工具
│   │   └── interpolate.ts          # 插值工具
│   └── types/
│       ├── index.ts
│       └── types.ts                # 类型定义
├── test/
│   ├── marching-squares.test.ts
│   ├── path-finder.test.ts
│   ├── color-mapper.test.ts
│   └── ...
├── examples/
│   ├── basic.html
│   ├── fill-mode.html
│   ├── heatmap-mode.html
│   └── ...
├── word/
│   ├── development-plan.md         # 本文档
│   └── ...
└── skills/
    ├── contour-marching-squares.md
    ├── contour-corner-filling.md
    └── ...
```

---

## 三、开发阶段

### 阶段 0: 项目初始化 (Day 1)

#### 任务列表

- [ ] 初始化 npm 项目 (package.json)
- [ ] 配置 TypeScript (tsconfig.json)
- [ ] 配置 Rollup 打包 (rollup.config.js)
- [ ] 配置 Jest 测试 (jest.config.js)
- [ ] 创建目录结构
- [ ] 编写 README.md

#### 验收标准

```bash
npm install    # 成功安装依赖
npm run build  # 成功构建
npm test       # 测试框架运行正常
```

---

### 阶段 1: Marching Squares 核心 (Day 2-4)

#### 1.1 基础数据结构

```typescript
// src/types/types.ts

interface GridData {
  z: number[][];      // 数据矩阵
  x: number[];        // x 坐标
  y: number[];        // y 坐标
}

interface ContourLevel {
  level: number;      // 等值线级别
  crossings: Map<string, number>;  // 穿越点
  starts: [number, number][];      // 边界起点
  edgePaths: Point[][];            // 边缘路径
  paths: Point[][];                // 闭合路径
}

interface Point {
  x: number;
  y: number;
}
```

#### 1.2 Marching Squares 实现

**文件**: `src/contour/marching-squares/MarchingSquares.ts`

**核心方法**:
- `getMarchingIndex()`: 计算网格单元的 Marching Index
- `calcCrossings()`: 计算所有穿越点
- `findStarts()`: 识别边界起点

#### 1.3 鞍点处理

**文件**: `src/contour/marching-squares/SaddleHandler.ts`

**核心方法**:
- `disambiguateSaddle()`: 使用平均值法消除鞍点歧义
- `getSaddlePaths()`: 获取鞍点的两条路径

#### 任务列表

- [ ] 实现 `MarchingSquares` 类
- [ ] 实现 16 种基本情况的穿越模式
- [ ] 实现鞍点消歧（104, 208, 713, 1114 编码）
- [ ] 编写单元测试
- [ ] 编写文档

#### 验收标准

```typescript
// 测试用例
const ms = new MarchingSquares(gridData);
const pathInfo = ms.computeLevels([0, 10, 20, 30]);

expect(pathInfo.length).toBe(4);
expect(pathInfo[0].crossings.size).toBeGreaterThan(0);
```

---

### 阶段 2: 路径追踪与边界处理 (Day 5-7)

#### 2.1 路径追踪

**文件**: `src/contour/path/PathFinder.ts`

**核心方法**:
- `findAllPaths()`: 追踪所有等值线路径
- `makePath()`: 从起点追踪单条路径
- `getInterpPx()`: 插值计算穿越点坐标

#### 2.2 边界角落处理

**文件**: `src/contour/path/BoundaryHandler.ts`

**核心方法**:
- `joinAllPaths()`: 连接边缘路径
- `closeBoundaries()`: 关闭边界
- `getPerimeter()`: 计算数据边界

#### 任务列表

- [ ] 实现 `PathFinder` 类
- [ ] 实现边缘路径连接
- [ ] 实现边界角落处理
- [ ] 实现 prefixBoundary 逻辑
- [ ] 编写单元测试

#### 验收标准

- 边缘路径正确连接
- 角落区域正确填充
- 无折角问题

---

### 阶段 3: 填充与着色 (Day 8-10)

#### 3.1 颜色映射

**文件**: `src/contour/fill/ColorMapper.ts`

**核心方法**:
- `makeColorMap()`: 创建颜色映射函数
- `getFillColor()`: 获取填充颜色
- `getLineColor()`: 获取线条颜色

#### 3.2 四种着色模式

**文件**: `src/contour/fill/FillRenderer.ts`

**模式实现**:
- `fill`: SVG path 填充
- `heatmap`: 渐变填充
- `lines`: 彩色线条
- `none`: 单色

#### 任务列表

- [ ] 实现颜色映射
- [ ] 实现 fill 模式
- [ ] 实现 heatmap 模式
- [ ] 实现 lines 模式
- [ ] 实现 none 模式
- [ ] 实现 fill+lines 范围一致性

#### 验收标准

```typescript
const contour = new Contour(zrender, {
  z: data,
  coloring: 'fill',
  colorscale: 'Viridis'
});
```

---

### 阶段 4: 坐标轴与 Null 处理 (Day 11-13)

#### 4.1 坐标轴系统

**文件**: `src/contour/axis/Axis.ts`

**核心方法**:
- `c2p()`: 数据坐标转像素坐标
- `p2c()`: 像素坐标转数据坐标
- `c2l()`, `l2c()`: 对数转换

#### 4.2 Null 数据处理

**文件**: `src/util/interpolate.ts`

**核心方法**:
- `findEmpties()`: 查找空数据点
- `interp2d()`: Poisson 插值

#### 任务列表

- [ ] 实现线性坐标轴
- [ ] 实现对数坐标轴
- [ ] 实现 connectgaps 功能
- [ ] 实现 Null 数据插值

---

### 阶段 5: 标签与 ColorBar (Day 14-16)

#### 5.1 标签放置

**文件**: `src/contour/label/LabelPlacer.ts`

**核心方法**:
- `findBestLocation()`: 寻找最佳标签位置
- `calcCost()`: 计算位置成本
- `avoidOverlap()`: 避免重叠

#### 5.2 ColorBar

**文件**: `src/contour/colorbar/ColorBar.ts`

**核心方法**:
- `draw()`: 绘制颜色条
- `mockAxis()`: 创建模拟轴
- `calcLevels()`: 计算填充级别

#### 任务列表

- [ ] 实现标签成本函数
- [ ] 实现标签位置优化
- [ ] 实现 ColorBar 绘制
- [ ] 实现 ColorBar 交互

---

### 阶段 6: 交互与约束等值线 (Day 17-19)

#### 6.1 交互功能

**文件**: `src/contour/interaction/`

- 缩放
- 平移
- 悬停

#### 6.2 约束等值线

**文件**: `src/contour/constraint/ConstraintContour.ts`

**操作符实现**:
- `>`, `<`, `=`
- `[]`, `][`

#### 任务列表

- [ ] 实现缩放交互
- [ ] 实现平移交互
- [ ] 实现悬停提示
- [ ] 实现约束等值线

---

### 阶段 7: 打包与文档 (Day 20-21)

#### 任务列表

- [ ] 配置 Rollup 多格式输出 (ESM, CJS, UMD)
- [ ] 编写 API 文档
- [ ] 编写使用示例
- [ ] 配置 CI/CD
- [ ] 发布到 npm

---

## 四、API 设计

### 4.1 基本用法

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
    smoothing: 0
  },

  colorbar: {
    title: { text: 'Value' },
    len: 0.9,
    thickness: 20
  }
});

chart.add(contour);
```

### 4.2 配置接口

```typescript
interface ContourOption {
  // 数据
  z: number[][];
  x?: number[];
  y?: number[];

  // 等值线配置
  contours: {
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
    smoothing?: number;
  };

  // 颜色条
  colorbar?: ColorBarOption;

  // 坐标轴
  xaxis?: AxisOption;
  yaxis?: AxisOption;
}
```

---

## 五、测试策略

### 5.1 单元测试

```typescript
// test/marching-squares.test.ts

describe('MarchingSquares', () => {
  test('should compute correct marching index', () => {
    const corners = [[1, 2], [3, 4]];
    const level = 2.5;
    const index = getMarchingIndex(level, corners);
    expect(index).toBe(6);
  });

  test('should handle saddle points', () => {
    const corners = [[1, 5], [5, 1]];
    const level = 3;
    const index = getMarchingIndex(level, corners);
    expect([104, 713]).toContain(index);
  });
});
```

### 5.2 集成测试

```typescript
// test/contour.test.ts

describe('Contour', () => {
  test('should render fill mode correctly', () => {
    const contour = new Contour({
      z: testData,
      contours: { coloring: 'fill' }
    });
    const paths = contour.getPaths();
    expect(paths.length).toBeGreaterThan(0);
  });
});
```

---

## 六、发布计划

### 6.1 版本规划

| 版本 | 功能 | 时间 |
|------|------|------|
| 0.1.0 | Marching Squares + 基础填充 | Day 7 |
| 0.2.0 | 四种着色模式 | Day 10 |
| 0.3.0 | 坐标轴 + Null 处理 | Day 13 |
| 0.4.0 | 标签 + ColorBar | Day 16 |
| 0.5.0 | 交互 + 约束等值线 | Day 19 |
| 1.0.0 | 完整功能 + 文档 | Day 21 |

### 6.2 npm 发布

```json
{
  "name": "zrender-contour",
  "version": "1.0.0",
  "description": "Contour plot library based on ZRender",
  "main": "dist/zrender-contour.js",
  "module": "dist/zrender-contour.esm.js",
  "types": "dist/types/index.d.ts",
  "files": ["dist"],
  "keywords": ["zrender", "contour", "chart", "visualization"],
  "license": "MIT",
  "peerDependencies": {
    "zrender": "^5.0.0"
  }
}
```

---

## 七、参考文档

1. [contour-marching-squares.md](./contour-marching-squares.md) - Marching Squares 算法
2. [contour-corner-filling.md](./contour-corner-filling.md) - 边界角落处理
3. [contour-coloring-modes.md](./contour-coloring-modes.md) - 着色模式
4. [contour-labels.md](./contour-labels.md) - 标签放置
5. [colorbar-implementation.md](./colorbar-implementation.md) - ColorBar 实现

---

*文档生成时间: 2026-03-03*
