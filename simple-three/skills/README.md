# Three.js Contour 开发技能索引

本目录包含实现 Three.js 等值线库所需的各种技能文档。每个技能文档对应开发计划中的一个或多个阶段。

## 技能列表

| 技能 | 描述 | 对应阶段 |
|------|------|----------|
| [npm-package-setup](npm-package-setup.md) | npm 项目基础设施设置 | Phase 1 |
| [implement-marching-squares](implement-marching-squares.md) | Marching Squares 算法实现 | Phase 2 |
| [implement-coloring-modes](implement-coloring-modes.md) | 着色模式实现 (fill, heatmap, lines, none) | Phase 5, 6 |
| [implement-smoothing](implement-smoothing.md) | Catmull-Rom 样条平滑处理 | Phase 7 |
| [implement-labels](implement-labels.md) | 标签系统与成本函数优化 | Phase 8 |
| [implement-null-handling](implement-null-handling.md) | 空值处理与 connectgaps | Phase 9 |

## 使用方法

在开发过程中，根据当前任务查阅对应的技能文档。每个技能文档包含：

1. **触发条件**: 何时使用该技能
2. **实现清单**: 具体的代码实现和接口
3. **验收测试**: 单元测试示例
4. **常见问题**: FAQ
5. **参考文档**: 相关的详细文档链接

## 依赖关系

```
npm-package-setup (基础设施)
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
```

## 待添加技能

以下技能将在后续开发中添加：

- `implement-path-tracing` - 路径追踪算法 (Phase 3)
- `implement-contour-levels` - 等值线级别计算 (Phase 4)
- `implement-colorbar` - 颜色条组件 (Phase 6)
- `implement-constraints` - 约束等值线 (Phase 10)
- `implement-log-axis` - 对数坐标支持 (Phase 11)
- `implement-interactions` - 交互系统 (Phase 12)
- `threejs-integration` - Three.js 集成与优化 (Phase 13)

---

*文档创建时间: 2026-03-03*
