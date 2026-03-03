# Three.js Contour 开发技能索引

本目录包含实现 Three.js 等值线库所需的各种技能文档。每个技能文档对应开发计划中的一个或多个阶段。

## 🎯 Skills 驱动开发

### 什么是 Skills 驱动开发？

Skills 驱动开发是一种将实现知识封装为可重用文档的开发模式：

```
传统开发流程:
需求 → 直接编码 → 测试 → 完成

Skills 驱动开发流程:
需求 → 查找 Skill → 按 Skill 编码 → 运行 Skill 测试 → 完成
              ↓
         包含实现指南
         包含代码示例
         包含验收标准
```

### 为什么使用 Skills？

1. **知识复用**: 每个算法的实现细节被记录下来
2. **质量保证**: 每个 Skill 包含验收测试
3. **减少错误**: 常见问题在 FAQ 中提前说明
4. **并行开发**: 不同开发者可以同时使用不同的 Skill

---

## 技能列表

| 技能 | 描述 | 对应阶段 | 调用时机 |
|------|------|----------|----------|
| [npm-package-setup](npm-package-setup.md) | npm 项目基础设施设置 | Phase 1, 14 | 创建项目时、发布时 |
| [implement-marching-squares](implement-marching-squares.md) | Marching Squares 算法实现 | Phase 2, 3 | 实现等值线算法时 |
| [implement-coloring-modes](implement-coloring-modes.md) | 着色模式实现 | Phase 5, 6 | 实现颜色填充/线条时 |
| [implement-smoothing](implement-smoothing.md) | Catmull-Rom 样条平滑处理 | Phase 7 | 实现曲线平滑时 |
| [implement-labels](implement-labels.md) | 标签系统与成本函数优化 | Phase 8 | 实现标签显示时 |
| [implement-null-handling](implement-null-handling.md) | 空值处理与 connectgaps | Phase 9 | 处理缺失数据时 |

---

## 🚀 如何使用 Skill

### 步骤 1: 识别当前任务

根据 `development-plan.md` 确定当前阶段：

```markdown
当前阶段: Phase 5 - 着色模式实现
```

### 步骤 2: 查找对应 Skill

在上面的表格中找到对应的 Skill 文档：

```
Phase 5 → implement-coloring-modes.md
```

### 步骤 3: 阅读 Skill 文档

打开 Skill 文档，关注以下部分：

```markdown
## 实现清单
- [ ] 任务1
- [ ] 任务2
...

## 关键代码
```typescript
// 复制粘贴或参考这些代码
```

## 验收测试
```typescript
// 确保这些测试通过
```
```

### 步骤 4: 实现并验证

1. 按照 Skill 中的实现清单逐项开发
2. 使用 Skill 中的代码示例作为参考
3. 编写并运行 Skill 中的验收测试
4. 检查 FAQ 部分，避免常见错误

---

## 📋 每个阶段对应的 Skill

### Phase 1: 项目基础设施

**Skill**: [`npm-package-setup`](npm-package-setup.md)

**何时调用**:
```bash
# 创建新项目时
mkdir simple-three && cd simple-three
# → 打开 npm-package-setup.md
```

**完成标志**:
- [ ] `npm install` 成功
- [ ] `npm run build` 生成 dist
- [ ] `npm test` 运行成功

---

### Phase 2-3: Marching Squares 算法

**Skill**: [`implement-marching-squares`](implement-marching-squares.md)

**何时调用**:
```typescript
// 开始编写这个文件时
// src/algorithms/MarchingSquares.ts
// → 打开 implement-marching-squares.md
```

**完成标志**:
- [ ] 16 种基本情况测试通过
- [ ] 鞍点处理测试通过
- [ ] 边界起点识别正确

---

### Phase 5-6: 着色模式

**Skill**: [`implement-coloring-modes`](implement-coloring-modes.md)

**何时调用**:
```typescript
// 开始编写这些文件时
// src/rendering/FillRenderer.ts
// src/rendering/LineRenderer.ts
// src/coloring/ColorMap.ts
// → 打开 implement-coloring-modes.md
```

**完成标志**:
- [ ] 四种着色模式都能渲染
- [ ] Fill 和 Lines 颜色一致
- [ ] 颜色条与等值线匹配

---

### Phase 7: 平滑处理

**Skill**: [`implement-smoothing`](implement-smoothing.md)

**何时调用**:
```typescript
// 开始编写这个文件时
// src/smoothing/CatmullRom.ts
// → 打开 implement-smoothing.md
```

**完成标志**:
- [ ] 平滑参数 0-1.3 有效
- [ ] Fill 和 Lines 边缘对齐
- [ ] 无自相交产生

---

### Phase 8: 标签系统

**Skill**: [`implement-labels`](implement-labels.md)

**何时调用**:
```typescript
// 开始编写这个文件时
// src/rendering/LabelRenderer.ts
// → 打开 implement-labels.md
```

**完成标志**:
- [ ] 标签位置优化
- [ ] 无标签重叠
- [ ] 线条在标签处断开

---

### Phase 9: 空值处理

**Skill**: [`implement-null-handling`](implement-null-handling.md)

**何时调用**:
```typescript
// 开始编写这个文件时
// src/utils/NullHandler.ts
// → 打开 implement-null-handling.md
```

**完成标志**:
- [ ] 空值正确识别
- [ ] 插值收敛
- [ ] 裁剪路径正确

---

## 🔄 Skill 依赖关系

```
npm-package-setup (项目基础)
    │
    ├── implement-marching-squares (核心算法)
    │       │
    │       ├── implement-coloring-modes (着色)
    │       │
    │       ├── implement-smoothing (平滑)
    │       │
    │       ├── implement-labels (标签)
    │       │
    │       └── implement-null-handling (空值处理)
    │
    └── npm-package-setup (发布)
```

**建议开发顺序**:
1. `npm-package-setup` → 创建项目
2. `implement-marching-squares` → 核心算法
3. `implement-coloring-modes` → 着色渲染
4. `implement-smoothing` → 曲线平滑
5. `implement-labels` → 标签系统
6. `implement-null-handling` → 空值处理
7. `npm-package-setup` → 发布

---

## 📝 待创建的 Skill

以下技能将在后续开发中添加：

| Skill | 对应阶段 | 优先级 |
|-------|----------|--------|
| `implement-path-tracing` | Phase 3 | 中 |
| `implement-contour-levels` | Phase 4 | 低 |
| `implement-colorbar` | Phase 6 | 中 |
| `implement-constraints` | Phase 10 | 低 |
| `implement-log-axis` | Phase 11 | 低 |
| `implement-interactions` | Phase 12 | 中 |
| `threejs-integration` | Phase 13 | 高 |

---

## 🆘 常见问题

### Q1: 如果没有找到对应的 Skill 怎么办？

如果某个阶段没有对应的 Skill，可以：
1. 参考类似的 Skill 作为模板
2. 阅读参考文档 (word 目录下的 .md 文件)
3. 自己创建新的 Skill 文档

### Q2: Skill 文档中的代码可以直接复制吗？

可以。Skill 文档中的代码是经过验证的，可以直接使用或作为参考。

### Q3: 如何验证 Skill 是否正确实现？

每个 Skill 文档都包含"验收测试"部分，运行这些测试来验证实现。

### Q4: 多人开发时如何协调 Skill 使用？

建议：
1. 每个开发者负责一个或多个 Skill
2. 使用 Git 分支隔离工作
3. 定期同步 Skill 文档更新

---

*文档创建时间: 2026-03-03*
