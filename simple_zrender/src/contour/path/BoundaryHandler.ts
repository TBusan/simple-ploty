import type { Point, PathInfo } from '../../types/types';

/**
 * 边界数据结构
 */
export interface Perimeter {
  topLeft: [number, number];
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
}

/**
 * 边界处理器
 * 负责处理等值线的边界角落填充
 */
export class BoundaryHandler {
  /**
   * 计算数据边界
   *
   * @param x x 坐标数组
   * @param y y 坐标数组
   * @param xToPixel x 坐标转像素函数
   * @param yToPixel y 坐标转像素函数
   * @returns 边界对象
   */
  static getPerimeter(
    x: number[],
    y: number[],
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
   *
   * @param perimeter 边界对象
   * @returns SVG 路径字符串
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

  /**
   * 连接所有边缘路径
   *
   * @param edgePaths 边缘路径数组
   * @param perimeter 数据边界
   * @param smoothing 平滑参数
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
      const pathStr = this.smoothOpen(path, smoothing);
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

  /**
   * 判断是否需要边界前缀
   *
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
   *
   * @param pathInfo 路径信息
   * @param perimeter 边界对象
   * @param z 数据矩阵
   * @param smoothing 平滑参数
   * @returns SVG 路径字符串
   */
  static buildFillPath(
    pathInfo: PathInfo,
    perimeter: Perimeter,
    z: number[][],
    smoothing: number = 0
  ): string {
    const boundaryPath = this.boundaryPath(perimeter);
    const prefix = this.needsPrefixBoundary(z, pathInfo.level, pathInfo.edgePaths)
      ? boundaryPath
      : '';
    const paths = this.joinAllPaths(pathInfo.edgePaths, perimeter, smoothing);

    // 添加内部闭合路径
    let innerPaths = '';
    for (const path of pathInfo.paths) {
      innerPaths += this.smoothClosed(path, smoothing);
    }

    return prefix + paths + innerPaths;
  }

  /**
   * 关闭边界
   * 确保所有边缘路径都正确闭合
   *
   * @param edgePaths 边缘路径
   * @param _perimeter 边界对象（保留用于扩展）
   * @returns 闭合后的路径数组
   */
  static closeBoundaries(
    edgePaths: Point[][],
    _perimeter: Perimeter
  ): Point[][] {
    return edgePaths.map(path => {
      if (path.length < 2) return path;

      const first = path[0];
      const last = path[path.length - 1];

      // 检查是否已经闭合
      if (Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01) {
        return path;
      }

      // 沿边界添加闭合点
      const closedPath = [...path];

      // 简化：直接添加回到起点的路径
      closedPath.push(first);

      return closedPath;
    });
  }

  /**
   * 开放路径平滑（简化版）
   *
   * @param pts 路径点数组
   * @param smoothing 平滑参数
   * @returns SVG 路径字符串
   */
  private static smoothOpen(pts: Point[], smoothing: number): string {
    if (pts.length === 0) return '';

    if (smoothing === 0 || pts.length < 3) {
      return 'M' + pts.map(p => `${p.x},${p.y}`).join('L');
    }

    // 简化实现：使用二次贝塞尔曲线
    let path = `M${pts[0].x},${pts[0].y}`;

    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];

      if (i < pts.length - 1) {
        const next = pts[i + 1];
        const cpx = curr.x - (next.x - prev.x) * smoothing * 0.25;
        const cpy = curr.y - (next.y - prev.y) * smoothing * 0.25;
        path += `Q${cpx},${cpy} ${curr.x},${curr.y}`;
      } else {
        path += `L${curr.x},${curr.y}`;
      }
    }

    return path;
  }

  /**
   * 闭合路径平滑（简化版）
   *
   * @param pts 路径点数组
   * @param smoothing 平滑参数
   * @returns SVG 路径字符串
   */
  private static smoothClosed(pts: Point[], smoothing: number): string {
    if (pts.length === 0) return '';

    if (smoothing === 0 || pts.length < 3) {
      return 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
    }

    // 简化实现
    let path = `M${pts[0].x},${pts[0].y}`;

    for (let i = 0; i < pts.length; i++) {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];

      const cpx = curr.x - (next.x - prev.x) * smoothing * 0.25;
      const cpy = curr.y - (next.y - prev.y) * smoothing * 0.25;
      path += `Q${cpx},${cpy} ${curr.x},${curr.y}`;
    }

    path += 'Z';
    return path;
  }
}
