---
name: contour-corner-filling
description: 实现等值线边界角落填充处理
---

# 边界角落填充技能

## 触发条件

当需要实现等值线填充时，处理边界角落的正确闭合。

## 实现步骤

### 步骤 1: 定义数据边界

```typescript
// src/contour/path/BoundaryHandler.ts

interface Perimeter {
  topLeft: [number, number];
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
}

export class BoundaryHandler {
  /**
   * 计算数据边界
   */
  static getPerimeter(
    x: number[], y: number[],
    xToPixel: (v: number) => number,
    yToPixel: (v: number) => number
  ): Perimeter {
    return {
      topLeft: [xToPixel(x[0]), yToPixel(y[y.length - 1])],
      topRight: [xToPixel(x[x.length - 1]), yToPixel(y[y.length - 1])],
      bottomRight: [xToPixel(x[x.length - 1]), yToPixel(y[0])],
      bottomLeft: [xToPixel(x[0]), yToPixel(y[0])]
    };
  }

  /**
   * 生成边界路径字符串
   */
  static boundaryPath(perimeter: Perimeter): string {
    const pts = [
      perimeter.topLeft,
      perimeter.topRight,
      perimeter.bottomRight,
      perimeter.bottomLeft
    ];
    return 'M' + pts.map(p => `${p[0]},${p[1]}`).join('L') + 'Z';
  }
}
```

### 步骤 2: 实现边缘路径连接

```typescript
// src/contour/path/BoundaryHandler.ts

export class BoundaryHandler {
  /**
   * 连接所有边缘路径
   * @param edgePaths 边缘路径数组
   * @param perimeter 数据边界
   * @returns 完整的填充路径
   */
  static joinAllPaths(
    edgePaths: Point[][],
    perimeter: Perimeter,
    smoothing: number = 0
  ): string {
    if (edgePaths.length === 0) return '';

    let fullPath = '';
    const startsLeft = edgePaths.map((_, i) => i);
    let isNewLoop = true;

    // 边界判断函数
    const isTop = (pt: Point) => Math.abs(pt.y - perimeter.topLeft[1]) < 0.01;
    const isBottom = (pt: Point) => Math.abs(pt.y - perimeter.bottomLeft[1]) < 0.01;
    const isLeft = (pt: Point) => Math.abs(pt.x - perimeter.topLeft[0]) < 0.01;
    const isRight = (pt: Point) => Math.abs(pt.x - perimeter.topRight[0]) < 0.01;

    while (startsLeft.length > 0) {
      const i = startsLeft[0];
      const path = edgePaths[i];

      // 添加当前路径
      const pathStr = smoothOpen(path, smoothing);
      fullPath += isNewLoop ? pathStr : pathStr.replace(/^M/, 'L');
      startsLeft.shift();

      // 获取终点
      let endPt = path[path.length - 1];
      let nextIdx = -1;

      // 沿边界移动，最多4次（4条边）
      for (let cnt = 0; cnt < 4; cnt++) {
        // 确定下一个角落
        let newEndPt: [number, number];
        if (isTop(endPt) && !isRight(endPt)) {
          newEndPt = perimeter.topRight;
        } else if (isLeft(endPt)) {
          newEndPt = perimeter.topLeft;
        } else if (isBottom(endPt)) {
          newEndPt = perimeter.bottomLeft;
        } else if (isRight(endPt)) {
          newEndPt = perimeter.bottomRight;
        } else {
          break;
        }

        // 检查是否有其他路径在同一边上
        for (let j = 0; j < edgePaths.length; j++) {
          if (!startsLeft.includes(j)) continue;
          const ptNew = edgePaths[j][0];

          // 检查 ptNew 是否在 endPt 到 newEndPt 的线段上
          if (Math.abs(endPt.x - newEndPt[0]) < 0.01) {
            // 垂直边
            if (Math.abs(endPt.x - ptNew.x) < 0.01 &&
                (ptNew.y - endPt.y) * (newEndPt[1] - ptNew.y) >= 0) {
              newEndPt = [ptNew.x, ptNew.y];
              nextIdx = j;
            }
          } else if (Math.abs(endPt.y - newEndPt[1]) < 0.01) {
            // 水平边
            if (Math.abs(endPt.y - ptNew.y) < 0.01 &&
                (ptNew.x - endPt.x) * (newEndPt[0] - ptNew.x) >= 0) {
              newEndPt = [ptNew.x, ptNew.y];
              nextIdx = j;
            }
          }
        }

        endPt = { x: newEndPt[0], y: newEndPt[1] };

        if (nextIdx >= 0) break;

        // 添加边界线段
        fullPath += `L${newEndPt[0]},${newEndPt[1]}`;
      }

      if (nextIdx >= 0) {
        // 继续下一个路径
        const idx = startsLeft.indexOf(nextIdx);
        if (idx >= 0) {
          startsLeft.splice(idx, 1);
          startsLeft.unshift(nextIdx);
        }
        isNewLoop = false;
      } else {
        // 开始新循环
        isNewLoop = true;
        fullPath += 'Z';
      }
    }

    return fullPath;
  }
}
```

### 步骤 3: 实现 prefixBoundary 判断

```typescript
// src/contour/path/BoundaryHandler.ts

export class BoundaryHandler {
  /**
   * 判断是否需要边界前缀
   * @param z 数据矩阵
   * @param level 等值线级别
   * @param edgePaths 边缘路径
   * @returns 是否需要添加边界前缀
   */
  static needsPrefixBoundary(
    z: number[][],
    level: number,
    edgePaths: Point[][]
  ): boolean {
    if (edgePaths.length > 0) return false;

    // 检查边界值
    const edgeVal = Math.min(z[0][0], z[0][1]);
    return edgeVal > level;
  }

  /**
   * 构建完整填充路径
   */
  static buildFillPath(
    pathInfo: PathInfo,
    perimeter: Perimeter,
    z: number[][]
  ): string {
    const boundaryPath = this.boundaryPath(perimeter);
    const prefix = this.needsPrefixBoundary(z, pathInfo.level, pathInfo.edgePaths)
      ? boundaryPath
      : '';
    const paths = this.joinAllPaths(pathInfo.edgePaths, perimeter);

    // 添加内部闭合路径
    let innerPaths = '';
    for (const path of pathInfo.paths) {
      innerPaths += smoothClosed(path, 0);
    }

    return prefix + paths + innerPaths;
  }
}
```

## 验收清单

- [ ] 边缘路径正确连接
- [ ] 角落区域正确填充
- [ ] 无折角问题
- [ ] prefixBoundary 正确判断
- [ ] 嵌套区域使用 evenodd 规则

## 测试用例

```typescript
describe('BoundaryHandler', () => {
  test('should join edge paths along perimeter', () => {
    const edgePaths = [
      [{ x: 0, y: 50 }, { x: 50, y: 0 }],  // 从左到上
      [{ x: 100, y: 50 }, { x: 50, y: 0 }] // 从右到上
    ];
    const perimeter = {
      topLeft: [0, 0],
      topRight: [100, 0],
      bottomRight: [100, 100],
      bottomLeft: [0, 100]
    };

    const result = BoundaryHandler.joinAllPaths(edgePaths, perimeter);
    expect(result).toContain('L100,0'); // 应包含右上角
    expect(result).toContain('Z'); // 应闭合
  });

  test('should detect prefix boundary need', () => {
    const z = [[5, 5], [5, 5]];
    expect(BoundaryHandler.needsPrefixBoundary(z, 3, [])).toBe(true);
    expect(BoundaryHandler.needsPrefixBoundary(z, 10, [])).toBe(false);
  });
});
```

## 参考资料

- [contour-corner-filling.md](../../word/contour-corner-filling.md)
