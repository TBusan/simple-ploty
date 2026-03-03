# Plotly.js 约束等值线 (Constraint Contours) 实现

## 一、概述

约束等值线（Constraint Contours）是 Plotly.js 中一种特殊的等值线类型，用于显示满足特定约束条件的区域。与普通等值线显示多个级别不同，约束等值线只关注满足/不满足某个条件的区域边界。

---

## 二、约束类型

### 2.1 支持的操作符

| 操作符 | 含义 | 示例 |
|--------|------|------|
| `>` | 大于 | 显示 z > value 的区域 |
| `<` | 小于 | 显示 z < value 的区域 |
| `=` | 等于 | 显示 z = value 的线 |
| `[]` | 区间内 | 显示 min ≤ z ≤ max 的区域 |
| `][` | 区间外 | 显示 z < min 或 z > max 的区域 |

### 2.2 数据结构

```javascript
{
    type: 'contour',
    z: [[...], [...], ...],
    contours: {
        type: 'constraint',    // 关键：指定为约束类型
        value: 5,              // 单值约束（>, <, =）
        // 或
        value: [3, 7],         // 区间约束（[], ][）

        operation: '>',        // 操作符

        showlines: true,       // 显示边界线
        line: {
            color: 'black',
            width: 2
        }
    },

    // 填充颜色
    fillcolor: 'rgba(255,0,0,0.5)'
}
```

---

## 三、约束映射实现

### 3.1 constraint_mapping.js

将约束条件转换为等值线参数：

```javascript
// 源码位置: src/traces/contour/constraint_mapping.js

module.exports = {
    '[]': makeRangeSettings('[]'),   // 区间内
    '][': makeRangeSettings(']['),   // 区间外
    '>': makeInequalitySettings('>'), // 大于
    '<': makeInequalitySettings('<'), // 小于
    '=': makeInequalitySettings('=')  // 等于
};

// 区间约束设置
function makeRangeSettings(operation) {
    return function(value) {
        value = coerceValue(operation, value);

        var min = Math.min(value[0], value[1]);
        var max = Math.max(value[0], value[1]);

        return {
            start: min,
            end: max,
            size: max - min
        };
    };
}

// 不等式约束设置
function makeInequalitySettings(operation) {
    return function(value) {
        value = coerceValue(operation, value);

        return {
            start: value,
            end: Infinity,
            size: Infinity
        };
    };
}
```

### 3.2 约束到等值线参数转换

| 操作 | start | end | size | pathinfo 数量 |
|------|-------|-----|------|---------------|
| `>` | value | ∞ | ∞ | 1 |
| `<` | value | ∞ | ∞ | 1 |
| `=` | value | ∞ | ∞ | 1 |
| `[]` | min | max | max-min | 2 |
| `][` | min | max | max-min | 2 |

---

## 四、约束路径转换

### 4.1 convert_to_constraints.js

将标准等值线路径转换为约束等值线路径：

```javascript
// 源码位置: src/traces/contour/convert_to_constraints.js

module.exports = function(pathinfo, operation) {
    var op0 = function(arr) { return arr.reverse(); };
    var op1 = function(arr) { return arr; };

    switch(operation) {
        case '=':
        case '<':
            // 保持原样
            return pathinfo;

        case '>':
            // 反转所有路径（使等值线闭合）
            pi0 = pathinfo[0];
            for(i = 0; i < pi0.edgepaths.length; i++) {
                pi0.edgepaths[i] = op0(pi0.edgepaths[i]);
            }
            for(i = 0; i < pi0.paths.length; i++) {
                pi0.paths[i] = op0(pi0.paths[i]);
            }
            return pathinfo;

        case '][':
            // 交换操作函数
            var tmp = op0;
            op0 = op1;
            op1 = tmp;
            // 继续执行 [] 的逻辑

        case '[]':
            // 合并两个等值线级别
            pi0 = copyPathinfo(pathinfo[0]);
            pi1 = copyPathinfo(pathinfo[1]);

            // 合并路径
            while(pi1.edgepaths.length) {
                pi0.edgepaths.push(op1(pi1.edgepaths.shift()));
            }
            while(pi1.paths.length) {
                pi0.paths.push(op1(pi1.paths.shift()));
            }

            return [pi0];
    }
};
```

### 4.2 路径反转原理

```
原始等值线 (开放路径):
    ┌─────────────────────────┐
    │                         │
    │   ─────────────►        │  从边界开始，在边界结束
    │                         │
    └─────────────────────────┘

反转后的约束等值线 (闭合路径):
    ┌─────────────────────────┐
    │ ┌───────────────────┐   │
    │ │                   │   │  包围满足条件的区域
    │ │   ◄─────────────  │   │
    │ │                   │   │
    │ └───────────────────┘   │
    └─────────────────────────┘
```

---

## 五、边界闭合处理

### 5.1 close_boundaries.js

对于约束等值线，需要特殊处理边界闭合：

```javascript
// 源码位置: src/traces/contour/close_boundaries.js

module.exports = function(pathinfo, contours) {
    var pi0 = pathinfo[0];
    var z = pi0.z;

    switch(contours.type) {
        case 'levels':
            // 普通等值线的边界处理
            var edgeVal2 = Math.min(z[0][0], z[0][1]);
            for(i = 0; i < pathinfo.length; i++) {
                var pi = pathinfo[i];
                pi.prefixBoundary = !pi.edgepaths.length &&
                    (edgeVal2 > pi.level || pi.starts.length && edgeVal2 === pi.level);
            }
            break;

        case 'constraint':
            pi0.prefixBoundary = false;

            // 如果有边缘路径，已经足够
            if(pi0.edgepaths.length) return;

            // 计算边界值范围
            var boundaryMax = -Infinity;
            var boundaryMin = Infinity;

            for(i = 0; i < nb; i++) {
                boundaryMin = Math.min(boundaryMin, z[i][0]);
                boundaryMin = Math.min(boundaryMin, z[i][na - 1]);
                boundaryMax = Math.max(boundaryMax, z[i][0]);
                boundaryMax = Math.max(boundaryMax, z[i][na - 1]);
            }

            var contoursValue = contours.value;

            switch(contours._operation) {
                case '>':
                    // 如果约束值大于边界最大值，需要添加边界前缀
                    if(contoursValue > boundaryMax) {
                        pi0.prefixBoundary = true;
                    }
                    break;

                case '<':
                    // 如果约束值小于边界最小值，需要添加边界前缀
                    if(contoursValue < boundaryMin ||
                        (pi0.starts.length && contoursValue === boundaryMin)) {
                        pi0.prefixBoundary = true;
                    }
                    break;

                case '[]':
                    var v1 = Math.min(contoursValue[0], contoursValue[1]);
                    var v2 = Math.max(contoursValue[0], contoursValue[1]);
                    if(v2 < boundaryMin || v1 > boundaryMax) {
                        pi0.prefixBoundary = true;
                    }
                    break;

                case '][':
                    if(v1 < boundaryMin && v2 > boundaryMax) {
                        pi0.prefixBoundary = true;
                    }
                    break;
            }
            break;
    }
};
```

### 5.2 边界前缀的作用

```
情况1: 约束值在数据范围内 - 正常显示
    ┌─────────────────────────┐
    │     1 2 3 4 5 6 7 8     │
    │   ┌─────────────┐       │
    │   │ 5 6 7 8 9   │       │  约束 > 5
    │   └─────────────┘       │
    └─────────────────────────┘

情况2: 约束值大于所有数据 - 需要边界前缀
    ┌─────────────────────────┐
    │     1 2 3 4 5 6 7 8     │
    │                         │  约束 > 10
    │   (整个区域都应该填充)    │  → prefixBoundary = true
    │                         │
    └─────────────────────────┘
```

---

## 六、悬停处理

### 6.1 hover.js

约束等值线的悬停处理与普通等值线略有不同：

```javascript
// 源码位置: src/traces/contour/hover.js

module.exports = function hoverPoints(pointData, xval, yval, hovermode, opts) {
    opts.isContour = true;

    var hoverData = heatmapHoverPoints(pointData, xval, yval, hovermode, opts);

    if(hoverData) {
        hoverData.forEach(function(hoverPt) {
            var trace = hoverPt.trace;

            // 约束等值线的特殊处理
            if(trace.contours.type === 'constraint') {
                // 优先使用填充颜色
                if(trace.fillcolor && Color.opacity(trace.fillcolor)) {
                    hoverPt.color = Color.addOpacity(trace.fillcolor, 1);
                }
                // 否则使用线条颜色
                else if(trace.contours.showlines && Color.opacity(trace.line.color)) {
                    hoverPt.color = Color.addOpacity(trace.line.color, 1);
                }
            }
        });
    }

    return hoverData;
};
```

---

## 七、完整流程

```
用户配置 (constraints)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. constraint_mapping.js: 将约束转换为等值线参数            │
│    operation: '>' → {start: value, end: ∞, size: ∞}        │
│    operation: '[]' → {start: min, end: max, size: diff}    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 标准 Marching Squares 处理                               │
│    - 计算穿越点                                             │
│    - 生成路径                                               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. convert_to_constraints.js: 路径转换                      │
│    - '>' : 反转所有路径                                     │
│    - '[]' : 合并两个级别的路径                              │
│    - '][' : 合并并反转                                      │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. close_boundaries.js: 边界处理                            │
│    - 检查是否需要边界前缀                                   │
│    - 处理超出数据范围的约束                                 │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 绑制约束区域                                             │
│    - 填充颜色                                               │
│    - 绘制边界线                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 八、示例

### 8.1 大于约束

```javascript
var data = [{
    type: 'contour',
    z: [[1, 2, 3],
        [2, 3, 4],
        [3, 4, 5]],
    contours: {
        type: 'constraint',
        operation: '>',
        value: 3
    },
    fillcolor: 'rgba(255, 0, 0, 0.5)',
    showscale: false
}];
// 结果: 显示 z > 3 的区域（右下角）
```

### 8.2 区间约束

```javascript
var data = [{
    type: 'contour',
    z: [[...]],
    contours: {
        type: 'constraint',
        operation: '[]',
        value: [3, 7]  // 显示 3 ≤ z ≤ 7 的区域
    },
    fillcolor: 'blue',
    showscale: false
}];
```

### 8.3 区间外约束

```javascript
var data = [{
    type: 'contour',
    z: [[...]],
    contours: {
        type: 'constraint',
        operation: '][',
        value: [3, 7]  // 显示 z < 3 或 z > 7 的区域
    },
    fillcolor: 'red',
    showscale: false
}];
```

---

## 九、与普通等值线的区别

| 特性 | 普通等值线 (levels) | 约束等值线 (constraint) |
|------|---------------------|-------------------------|
| 目的 | 显示多个等值级别 | 显示满足条件的区域 |
| 路径类型 | 可能开放或闭合 | 总是闭合（或包含边界） |
| 填充 | 按级别渐变 | 单一颜色填充 |
| 级别数量 | 多个 | 1-2 个 |
| 操作符 | 无 | >, <, =, [], ][ |
| 颜色条 | 通常显示 | 通常隐藏 |

---

*文档生成时间: 2026-03-03*
