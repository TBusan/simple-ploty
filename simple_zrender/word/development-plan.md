# ZRender Contour 开发计划

## 一、项目概述

### 1.1 项目目标

基于 ZRender 图形库实现与 Plotly.js contour 等值线图相同的功能，作为独立的 npm 开源插件发布。

### 1.2 功能清单

| 功能模块 | 对应文档 | 优先级 |
|---------|---------|--------|
| Marching Squares 算法 | contour-marching-squares.md | P0 |
| 边界角落填充 | contour-corner-filling.md | P0 |
| **路径平滑处理** | **contour-smoothing.md** | **P0** |
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

### 阶段 3: 平滑处理 (Day 8-9)

#### 3.1 平滑算法概述

Plotly.js 使用 **Centripetal Catmull-Rom 样条曲线** 进行平滑处理，这是一种广义的 Catmull-Rom 样条。

**核心参数**:
| 参数 | 值 | 说明 |
|------|-----|------|
| 类型 | number | 平滑参数 |
| 最小值 | 0 | 无平滑（折线） |
| 最大值 | 1.3 | 最大平滑 |
| 默认值 | 1 | 推荐值 |
| 算法 | Centripetal Catmull-Rom | α = 0.5 |

#### 3.2 平滑实现

**文件**: `src/contour/line/Smoothing.ts`

**核心方法**:
- `makeTangent()`: 计算切线控制点
- `smoothOpen()`: 开放路径平滑
- `smoothClosed()`: 闭合路径平滑

```typescript
// 切线计算函数
function makeTangent(
  prevPt: Point,
  thisPt: Point,
  nextPt: Point,
  smoothness: number
): [Point, Point] {
  const CATMULL_ROM_EXP = 0.5; // Centripetal 参数

  // 计算方向向量
  const d1x = prevPt.x - thisPt.x;
  const d1y = prevPt.y - thisPt.y;
  const d2x = nextPt.x - thisPt.x;
  const d2y = nextPt.y - thisPt.y;

  // Centripetal 参数化
  const d1a = Math.pow(d1x * d1x + d1y * d1y, CATMULL_ROM_EXP / 2);
  const d2a = Math.pow(d2x * d2x + d2y * d2y, CATMULL_ROM_EXP / 2);

  // 计算切线方向
  const numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
  const numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;

  // 入切线和出切线分母
  const denom1 = 3 * d2a * (d1a + d2a);
  const denom2 = 3 * d1a * (d1a + d2a);

  return [
    { x: thisPt.x + (denom1 && numx / denom1), y: thisPt.y + (denom1 && numy / denom1) },
    { x: thisPt.x - (denom2 && numx / denom2), y: thisPt.y - (denom2 && numy / denom2) }
  ];
}
```

#### 3.3 开放路径平滑

```typescript
// 用于边缘路径（edgepaths）
function smoothOpen(pts: Point[], smoothness: number): string {
  if (pts.length < 3) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L');
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  const tangents: [Point, Point][] = [];

  // 为每个内部点计算切线
  for (let i = 1; i < pts.length - 1; i++) {
    tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
  }

  // 起始段：二次贝塞尔曲线
  path += `Q${tangents[0][0].x},${tangents[0][0].y} ${pts[1].x},${pts[1].y}`;

  // 中间段：三次贝塞尔曲线
  for (let i = 2; i < pts.length - 1; i++) {
    path += `C${tangents[i - 2][1].x},${tangents[i - 2][1].y} ` +
            `${tangents[i - 1][0].x},${tangents[i - 1][0].y} ` +
            `${pts[i].x},${pts[i].y}`;
  }

  // 结束段：二次贝塞尔曲线
  const lastIdx = pts.length - 1;
  path += `Q${tangents[lastIdx - 2][1].x},${tangents[lastIdx - 2][1].y} ` +
          `${pts[lastIdx].x},${pts[lastIdx].y}`;

  return path;
}
```

#### 3.4 闭合路径平滑

```typescript
// 用于内部闭合路径（paths）
function smoothClosed(pts: Point[], smoothness: number): string {
  if (pts.length < 3) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  const pLast = pts.length - 1;

  // 计算所有点的切线（包括首尾点的循环处理）
  const tangents: [Point, Point][] = [
    makeTangent(pts[pLast], pts[0], pts[1], smoothness)
  ];
  for (let i = 1; i < pLast; i++) {
    tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
  }
  tangents.push(makeTangent(pts[pLast - 1], pts[pLast], pts[0], smoothness));

  // 所有段都使用三次贝塞尔曲线
  for (let i = 1; i <= pLast; i++) {
    path += `C${tangents[i - 1][1].x},${tangents[i - 1][1].y} ` +
            `${tangents[i][0].x},${tangents[i][0].y} ` +
            `${pts[i].x},${pts[i].y}`;
  }

  // 闭合回到起点
  path += `C${tangents[pLast][1].x},${tangents[pLast][1].y} ` +
          `${tangents[0][0].x},${tangents[0][0].y} ` +
          `${pts[0].x},${pts[0].y}Z`;

  return path;
}
```

#### 3.5 线条与填充一致性保证

**核心设计理念**: 平滑处理在 SVG 路径生成阶段应用，而非数据预处理阶段。

```
数据流架构:

                    ┌─────────────────┐
                    │   原始路径点      │
                    │  (未经平滑)       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │    填充渲染       │          │    线条渲染       │
    │  smoothOpen()    │          │  smoothOpen()    │
    │  smoothClosed()  │          │  smoothClosed()  │
    └────────┬─────────┘          └────────┬──────────┘
             │                              │
             └──────────────┬──────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  相同的平滑算法   │
                   │  = 完美对齐      │
                   └─────────────────┘
```

#### 任务列表

- [ ] 实现 `makeTangent()` 切线计算
- [ ] 实现 `smoothOpen()` 开放路径平滑
- [ ] 实现 `smoothClosed()` 闭合路径平滑
- [ ] 确保填充和线条使用相同平滑算法
- [ ] 编写单元测试

#### 验收标准

- 平滑参数 0 产生折线
- 平滑参数 1 产生平滑曲线
- 填充区域与线条完美对齐
- 无自相交问题

---

### 阶段 4: 填充与着色 (Day 10-12)

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

### 阶段 5: 坐标轴与 Null 处理 (Day 13-15)

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

### 阶段 6: 标签与 ColorBar (Day 16-18)

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

### 阶段 7: 交互与约束等值线 (Day 19-21)

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

### 阶段 8: 打包与文档 (Day 22-23)

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
| 0.2.0 | 平滑处理 | Day 9 |
| 0.3.0 | 四种着色模式 | Day 12 |
| 0.4.0 | 坐标轴 + Null 处理 | Day 15 |
| 0.5.0 | 标签 + ColorBar | Day 18 |
| 0.6.0 | 交互 + 约束等值线 | Day 21 |
| 1.0.0 | 完整功能 + 文档 | Day 23 |

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

1. [contour-marching-squares.md](../../word/contour-marching-squares.md) - Marching Squares 算法
2. [contour-corner-filling.md](../../word/contour-corner-filling.md) - 边界角落处理
3. [contour-smoothing.md](../../word/contour-smoothing.md) - 路径平滑处理
4. [contour-coloring-modes.md](../../word/contour-coloring-modes.md) - 着色模式
5. [contour-labels.md](../../word/contour-labels.md) - 标签放置
6. [colorbar-implementation.md](../../word/colorbar-implementation.md) - ColorBar 实现
7. [contour-interactions.md](../../word/contour-interactions.md) - 交互功能

---

*文档生成时间: 2026-03-03*
