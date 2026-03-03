# ZRender Contour 技能索引

## 概述

本文档列出了所有可用的开发技能，用于指导 zrender-contour 库的开发。

## 技能列表

| 技能名称 | 描述 | 对应文档 |
|---------|------|---------|
| `npm-project-setup` | NPM 项目初始化与配置 | - |
| `contour-marching-squares` | Marching Squares 算法实现 | contour-marching-squares.md |
| `contour-corner-filling` | 边界角落填充处理 | contour-corner-filling.md |
| `contour-coloring-modes` | 四种着色模式实现 | contour-coloring-modes.md |
| `contour-labels` | 标签放置算法 | contour-labels.md |
| `colorbar-implementation` | ColorBar 组件实现 | colorbar-implementation.md |
| `contour-interactions` | 交互功能实现 | contour-interactions.md |

## 开发顺序

建议按以下顺序使用技能进行开发：

### 阶段 0: 项目初始化
1. `npm-project-setup` - 创建项目结构

### 阶段 1: 核心算法
2. `contour-marching-squares` - Marching Squares 算法
3. `contour-corner-filling` - 边界角落处理

### 阶段 2: 渲染功能
4. `contour-coloring-modes` - 着色模式

### 阶段 3: 增强功能
5. `contour-labels` - 标签放置
6. `colorbar-implementation` - ColorBar

### 阶段 4: 交互功能
7. `contour-interactions` - 交互事件

## 使用方法

每个技能文件包含：
- 触发条件
- 实现步骤
- 代码示例
- 验收清单
- 测试用例

## 文件位置

```
simple_zrender/
├── word/
│   ├── development-plan.md     # 开发计划
│   └── skills-index.md         # 本文档
└── skills/
    ├── npm-project-setup.md
    ├── contour-marching-squares.md
    ├── contour-corner-filling.md
    ├── contour-coloring-modes.md
    ├── contour-labels.md
    ├── colorbar-implementation.md
    └── contour-interactions.md
```

---

*文档生成时间: 2026-03-03*
