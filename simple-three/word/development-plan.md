# Three.js Contour 实现开发计划

## 概述

本文档描述如何使用 Three.js 实现与 Plotly.js contour 功能相同的等值线渲染库。该库将作为 npm 开源插件发布，支持运行、打包和安装。

**重要**: 本项目使用 **Skills 驱动开发** 模式。每个开发阶段都有对应的 Skill 文档，包含详细的实现指南、代码示例和验收标准。

## 项目结构

```
simple-three/
├── package.json
├── tsconfig.json
├── rollup.config.js
├── src/
│   ├── index.ts                 # 入口文件
│   ├── core/
│   │   ├── Contour.ts           # 主类
│   │   ├── ContourOptions.ts    # 配置选项
│   │   └── ContourData.ts       # 数据处理
│   ├── algorithms/
│   │   ├── MarchingSquares.ts   # Marching Squares 算法
│   │   ├── PathFinder.ts        # 路径追踪
│   │   ├── SaddleHandler.ts     # 鞍点处理
│   │   └── Interpolation.ts     # 插值算法
│   ├── rendering/
│   │   ├── FillRenderer.ts      # 填充渲染
│   │   ├── LineRenderer.ts      # 线条渲染
│   │   ├── HeatmapRenderer.ts   # 热力图渲染
│   │   └── LabelRenderer.ts     # 标签渲染
│   ├── coloring/
│   │   ├── ColorScale.ts        # 色阶
│   │   ├── ColorMap.ts          # 颜色映射
│   │   └── ColorBar.ts          # 颜色条
│   ├── smoothing/
│   │   └── CatmullRom.ts        # Catmull-Rom 样条
│   ├── interaction/
│   │   ├── ZoomPan.ts           # 缩放平移
│   │   └── Hover.ts             # 悬停交互
│   └── utils/
│       ├── MathUtils.ts         # 数学工具
│       ├── LogAxis.ts           # 对数轴处理
│       └── NullHandler.ts       # 空值处理
├── skills/                      # ⭐ 开发技能文档
│   ├── README.md               # 技能索引
│   └── *.md                    # 各阶段技能
├── word/
│   └── *.md                    # 开发文档
└── examples/
    └── *.html                   # 示例文件
```

---

## 如何使用本计划

### Skills 驱动开发流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 阅读当前阶段的开发计划                                     │
│    ↓                                                         │
│ 2. 检查是否有对应的 Skill 文档                                │
│    ↓                                                         │
│ 3. 按 Skill 文档中的实现清单逐项开发                          │
│    ↓                                                         │
│ 4. 运行 Skill 文档中的验收测试                                │
│    ↓                                                         │
│ 5. 完成后进入下一阶段                                         │
└─────────────────────────────────────────────────────────────┘
```

### Skill 调用时机

在开发过程中，当遇到以下情况时，**必须**先阅读对应的 Skill 文档：

| 触发场景 | 使用的 Skill |
|----------|-------------|
| 创建项目、配置 npm | `npm-package-setup` |
| 实现等值线生成算法 | `implement-marching-squares` |
| 实现颜色填充/线条 | `implement-coloring-modes` |
| 实现曲线平滑 | `implement-smoothing` |
| 实现标签显示 | `implement-labels` |
| 处理缺失数据 | `implement-null-handling` |

---

## 开发阶段

### 阶段 1: 项目基础设施 (Phase 1)

**🎯 使用的 Skill**: [`npm-package-setup`](../skills/npm-package-setup.md)

**目标**: 建立 npm 项目结构和构建系统

**何时调用 Skill**:
- 开始本阶段时，**首先阅读** `npm-package-setup.md`
- 按照 Skill 文档创建所有配置文件
- 使用 Skill 中的验收标准检查完成度

**任务清单** (来自 Skill 文档):
- [ ] 创建 `package.json`
- [ ] 配置 `tsconfig.json`
- [ ] 配置 `rollup.config.js`
- [ ] 创建入口文件 `src/index.ts`
- [ ] 配置 `vitest.config.ts`
- [ ] 配置 `.eslintrc.cjs` 和 `.prettierrc`
- [ ] 创建 `.gitignore` 和 `.npmignore`

**验收标准** (来自 Skill 文档):
```bash
npm install     # 正常安装依赖
npm run build   # 生成 dist 文件
npm test        # 运行测试（即使是空的）
npm run lint    # Lint 检查通过
```

**预计时间**: 1-2 天

---

### 阶段 2: Marching Squares 核心算法 (Phase 2)

**🎯 使用的 Skill**: [`implement-marching-squares`](../skills/implement-marching-squares.md)

**目标**: 实现 Marching Squares 算法核心

**何时调用 Skill**:
- 实现 `src/algorithms/MarchingSquares.ts` 时
- 编写算法相关单元测试时
- 遇到鞍点处理问题时

**Skill 中的关键实现**:
```typescript
// 来自 implement-marching-squares.md
export function getMarchingIndex(level: number, corners: number[][]): number
```

**任务清单**:
- [ ] 实现 16 种基本情况的索引计算
- [ ] 实现鞍点检测和处理
- [ ] 定义边界起点常量
- [ ] 定义路径方向常量 (NEWDELTA)
- [ ] 编写单元测试

**验收测试** (来自 Skill 文档):
```typescript
// tests/marching-squares.test.ts
test('case 0: all above level', () => { ... });
test('case 15: all below level', () => { ... });
test('saddle point 5', () => { ... });
test('saddle point 10', () => { ... });
```

**预计时间**: 3-4 天

---

### 阶段 3: 路径追踪算法 (Phase 3)

**🎯 使用的 Skill**: [`implement-marching-squares`](../skills/implement-marching-squares.md) (继续)

**目标**: 实现完整的等值线路径追踪

**何时调用 Skill**:
- 实现 `src/algorithms/PathFinder.ts` 时
- 参考 Skill 文档中的"路径追踪"部分

**任务清单**:
- [ ] 实现交叉点计算 (make_crossings)
- [ ] 实现路径生成 (find_all_paths)
- [ ] 实现插值计算 (getInterpPx)
- [ ] 实现边界角落处理 (joinAllPaths)

**关键代码参考** (来自 Skill 文档):
```typescript
// 边界起点识别
export const BOTTOMSTART = [1, 9, 13, 104, 713];
export const TOPSTART = [4, 6, 7, 104, 713];
export const LEFTSTART = [8, 12, 14, 208, 1114];
export const RIGHTSTART = [2, 3, 11, 208, 1114];
```

**验收标准**:
- [ ] 开放路径正确追踪
- [ ] 闭合路径正确追踪
- [ ] 边界角落正确连接

**预计时间**: 4-5 天

---

### 阶段 4: 等值线级别计算 (Phase 4)

**🎯 使用的 Skill**: 无特定 Skill（基础实现）

**目标**: 实现等值线级别的自动和手动配置

**任务清单**:
- [ ] 实现自动级别计算函数
- [ ] 处理级别边界情况
- [ ] 定义 PathInfo 接口

**关键实现**:
```typescript
function autoContours(zmin: number, zmax: number, ncontours: number): ContourLevels
```

**验收标准**:
- [ ] 自动级别计算合理
- [ ] 手动级别配置生效

**预计时间**: 1-2 天

---

### 阶段 5: 着色模式实现 (Phase 5)

**🎯 使用的 Skill**: [`implement-coloring-modes`](../skills/implement-coloring-modes.md)

**目标**: 实现四种着色模式

**何时调用 Skill**:
- 实现 `src/rendering/FillRenderer.ts` 时
- 实现 `src/rendering/LineRenderer.ts` 时
- 实现 `src/rendering/HeatmapRenderer.ts` 时
- 处理 Fill 和 Lines 颜色一致性问题时

**Skill 中的关键实现**:
```typescript
// 来自 implement-coloring-modes.md
export function makeColorMap(trace: ContourTrace): (value: number) => Color
```

**任务清单** (来自 Skill 文档):
- [ ] 实现 Fill 模式（使用 evenodd 规则）
- [ ] 实现 Heatmap 模式（Canvas 纹理）
- [ ] 实现 Lines 模式
- [ ] 实现 None 模式
- [ ] 确保颜色一致性

**验收测试** (来自 Skill 文档):
```typescript
test('fill color uses level + 0.5 * size', () => { ... });
test('lines color matches exact level', () => { ... });
test('fill and lines share same color range', () => { ... });
```

**预计时间**: 4-5 天

---

### 阶段 6: 颜色映射与色阶 (Phase 6)

**🎯 使用的 Skill**: [`implement-coloring-modes`](../skills/implement-coloring-modes.md) (继续)

**目标**: 实现完整的颜色映射系统

**任务清单**:
- [ ] 实现内置色阶 (Viridis, Jet, Hot, etc.)
- [ ] 实现自定义色阶支持
- [ ] 实现颜色范围控制 (zmin/zmax)
- [ ] 实现颜色条组件

**关键代码** (来自 Skill 文档):
```typescript
// 填充颜色对应关系
bg:    colorMap(start - 0.5 * size)
fill0: colorMap(start + 0.5 * size)
fill1: colorMap(start + 1.5 * size)
```

**预计时间**: 3-4 天

---

### 阶段 7: 平滑处理 (Phase 7)

**🎯 使用的 Skill**: [`implement-smoothing`](../skills/implement-smoothing.md)

**目标**: 实现 Catmull-Rom 样条平滑

**何时调用 Skill**:
- 实现 `src/smoothing/CatmullRom.ts` 时
- 处理 Fill 和 Lines 边缘对齐问题时
- 遇到曲线自相交问题时

**Skill 中的关键实现**:
```typescript
// 来自 implement-smoothing.md
export function makeTangent(prevpt, thispt, nextpt, smoothness): [Point, Point]
export function smoothOpen(pts: Point[], smoothness: number): Point[]
export function smoothClosed(pts: Point[], smoothness: number): Point[]
```

**任务清单** (来自 Skill 文档):
- [ ] 实现切线计算
- [ ] 实现开放路径平滑
- [ ] 实现闭合路径平滑
- [ ] 确保 Fill 和 Lines 一致性

**验收测试** (来自 Skill 文档):
```typescript
test('smoothing 0 returns original points', () => { ... });
test('closed path returns to start', () => { ... });
test('no self-intersection', () => { ... });
test('fill and lines have same smoothing', () => { ... });
```

**预计时间**: 2-3 天

---

### 阶段 8: 标签系统 (Phase 8)

**🎯 使用的 Skill**: [`implement-labels`](../skills/implement-labels.md)

**目标**: 实现等值线标签

**何时调用 Skill**:
- 实现 `src/rendering/LabelRenderer.ts` 时
- 实现标签位置优化算法时
- 处理标签重叠问题时

**Skill 中的关键实现**:
```typescript
// 来自 implement-labels.md
export function locationCost(loc, textOpts, labelData, bounds): number
export function findBestTextLocation(path, pathBounds, textOpts, labelData, bounds): LabelLocation
```

**任务清单** (来自 Skill 文档):
- [ ] 实现成本函数（边缘、角度、邻居）
- [ ] 实现位置优化搜索
- [ ] 实现标签格式化
- [ ] 实现标签数量控制

**验收测试** (来自 Skill 文档):
```typescript
test('labels avoid edges', () => { ... });
test('labels avoid overlap', () => { ... });
test('prefers horizontal orientation', () => { ... });
```

**预计时间**: 3-4 天

---

### 阶段 9: 空值处理 (Phase 9)

**🎯 使用的 Skill**: [`implement-null-handling`](../skills/implement-null-handling.md)

**目标**: 实现 null 数据处理和 connectgaps

**何时调用 Skill**:
- 实现 `src/utils/NullHandler.ts` 时
- 实现数据插值时
- 处理 connectgaps 选项时

**Skill 中的关键实现**:
```typescript
// 来自 implement-null-handling.md
export function findEmpties(z: (number | null)[][]): EmptyPoint[]
export function interp2d(z: (number | null)[][], emptyPoints: EmptyPoint[]): number[][]
export function makeClipMask(cd0: ContourData): number[][]
```

**任务清单** (来自 Skill 文档):
- [ ] 实现空白点检测
- [ ] 实现泊松插值
- [ ] 实现裁剪路径生成
- [ ] 处理 connectgaps 模式

**验收测试** (来自 Skill 文档):
```typescript
test('finds all empty points', () => { ... });
test('interpolation converges', () => { ... });
test('interpolated values are within range', () => { ... });
```

**预计时间**: 2-3 天

---

### 阶段 10: 约束等值线 (Phase 10)

**🎯 使用的 Skill**: 待创建 `implement-constraints`

**目标**: 实现约束等值线

**任务清单**:
- [ ] 支持五种约束操作符 (>, <, =, [], ][)
- [ ] 实现约束映射
- [ ] 实现路径转换
- [ ] 处理边界闭合

**预计时间**: 2-3 天

---

### 阶段 11: 对数坐标支持 (Phase 11)

**🎯 使用的 Skill**: 待创建 `implement-log-axis`

**目标**: 支持对数坐标轴

**任务清单**:
- [ ] 实现坐标转换系统
- [ ] 实现对数空间插值
- [ ] 处理无效值

**预计时间**: 2-3 天

---

### 阶段 12: 交互系统 (Phase 12)

**🎯 使用的 Skill**: 待创建 `implement-interactions`

**目标**: 实现缩放、平移、悬停交互

**任务清单**:
- [ ] 实现框选缩放
- [ ] 实现滚轮缩放
- [ ] 实现拖拽平移
- [ ] 实现悬停显示
- [ ] 实现事件发射

**预计时间**: 3-4 天

---

### 阶段 13: Three.js 集成与优化 (Phase 13)

**🎯 使用的 Skill**: 待创建 `threejs-integration`

**目标**: Three.js 渲染优化和最终集成

**任务清单**:
- [ ] 将路径转换为 Three.js Shape
- [ ] 实现材质系统
- [ ] 性能优化
- [ ] 响应式更新

**预计时间**: 4-5 天

---

### 阶段 14: 文档与发布 (Phase 14)

**🎯 使用的 Skill**: [`npm-package-setup`](../skills/npm-package-setup.md) (发布部分)

**目标**: 完善文档和发布准备

**任务清单**:
- [ ] 编写 TSDoc 注释
- [ ] 创建示例文件
- [ ] 编写 README
- [ ] npm 发布

**发布检查清单** (来自 Skill 文档):
```bash
npm test           # 所有测试通过
npm run lint       # Lint 检查通过
npm run build      # 构建成功
npm run docs       # 文档生成
npm publish        # 发布
```

**预计时间**: 2-3 天

---

## Skills 快速参考

| 阶段 | Skill | 调用时机 |
|------|-------|----------|
| Phase 1 | `npm-package-setup` | 创建项目时 |
| Phase 2-3 | `implement-marching-squares` | 实现算法时 |
| Phase 5-6 | `implement-coloring-modes` | 实现着色时 |
| Phase 7 | `implement-smoothing` | 实现平滑时 |
| Phase 8 | `implement-labels` | 实现标签时 |
| Phase 9 | `implement-null-handling` | 处理空值时 |
| Phase 14 | `npm-package-setup` | 发布时 |

## 依赖关系图

```
Phase 1: npm-package-setup
    │
    ├── Phase 2-3: implement-marching-squares
    │       │
    │       ├── Phase 4: (级别计算，无特定 Skill)
    │       │
    │       ├── Phase 5-6: implement-coloring-modes
    │       │
    │       ├── Phase 7: implement-smoothing
    │       │
    │       ├── Phase 8: implement-labels
    │       │
    │       ├── Phase 9: implement-null-handling
    │       │
    │       ├── Phase 10: implement-constraints (待创建)
    │       │
    │       └── Phase 11: implement-log-axis (待创建)
    │
    └── Phase 12: implement-interactions (待创建)
            │
            └── Phase 13: threejs-integration (待创建)
                    │
                    └── Phase 14: npm-package-setup (发布)
```

---

## 时间估算

| 阶段 | 使用的 Skill | 预计时间 |
|------|-------------|----------|
| Phase 1 | `npm-package-setup` | 1-2 天 |
| Phase 2 | `implement-marching-squares` | 3-4 天 |
| Phase 3 | `implement-marching-squares` | 4-5 天 |
| Phase 4 | - | 1-2 天 |
| Phase 5 | `implement-coloring-modes` | 4-5 天 |
| Phase 6 | `implement-coloring-modes` | 3-4 天 |
| Phase 7 | `implement-smoothing` | 2-3 天 |
| Phase 8 | `implement-labels` | 3-4 天 |
| Phase 9 | `implement-null-handling` | 2-3 天 |
| Phase 10 | 待创建 | 2-3 天 |
| Phase 11 | 待创建 | 2-3 天 |
| Phase 12 | 待创建 | 3-4 天 |
| Phase 13 | 待创建 | 4-5 天 |
| Phase 14 | `npm-package-setup` | 2-3 天 |
| **总计** | | **36-50 天** |

---

*文档创建时间: 2026-03-03*
