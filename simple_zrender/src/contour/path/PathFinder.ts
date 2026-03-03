import type { Point, PathInfo, GridData } from '../../types/types';
import { NEW_DELTA, SADDLE_REMAINDER } from '../marching-squares/constants';
import { SaddleHandler } from '../marching-squares/SaddleHandler';

/**
 * 路径追踪器
 * 负责从 Marching Squares 的穿越点追踪等值线路径
 */
export class PathFinder {
  private gridData: GridData;
  private pathInfo: PathInfo;

  constructor(gridData: GridData, pathInfo: PathInfo) {
    this.gridData = gridData;
    this.pathInfo = pathInfo;
  }

  /**
   * 追踪所有等值线路径
   *
   * @returns 追踪后的路径信息（包含 edgePaths 和 paths）
   */
  findAllPaths(): PathInfo {
    const crossings = new Map(this.pathInfo.crossings);
    const starts = [...this.pathInfo.starts];

    const edgePaths: Point[][] = [];
    const paths: Point[][] = [];

    // 首先处理边界起点（边缘路径）
    for (const start of starts) {
      if (crossings.size === 0) break;

      const path = this.makePath(start, crossings, true);
      if (path.length > 0) {
        edgePaths.push(path);
      }
    }

    // 然后处理内部闭合路径
    while (crossings.size > 0) {
      const firstKey = crossings.keys().next().value;
      if (!firstKey) break;

      const [xi, yi] = firstKey.split(',').map(Number);
      const path = this.makePath([xi, yi], crossings, false);
      if (path.length > 0) {
        paths.push(path);
      }
    }

    return {
      ...this.pathInfo,
      edgePaths,
      paths
    };
  }

  /**
   * 从起点追踪单条路径
   *
   * @param start 起点坐标 [xi, yi]
   * @param crossings 穿越点 Map（会被修改）
   * @param isEdge 是否为边缘路径
   * @returns 路径点数组
   */
  private makePath(
    start: [number, number],
    crossings: Map<string, number>,
    isEdge: boolean
  ): Point[] {
    const path: Point[] = [];
    let [xi, yi] = start;
    let locStr = `${xi},${yi}`;

    // 获取起始点的 Marching Index
    let mi = crossings.get(locStr);
    if (mi === undefined) return path;

    // 添加起始点
    const startPt = this.getInterpPx(xi, yi, mi);
    path.push(startPt);

    // 从 crossings 中移除起始点
    crossings.delete(locStr);

    // 追踪路径
    let cnt = 0;
    const maxCnt = this.gridData.z.length * this.gridData.z[0].length * 2;

    while (cnt < maxCnt) {
      cnt++;

      // 获取移动方向
      const delta = this.getDelta(mi);
      if (!delta) break;

      const [dx, dy] = delta;
      xi += dx;
      yi += dy;

      // 检查是否回到起点（闭合路径）
      if (!isEdge && xi === start[0] && yi === start[1]) {
        break;
      }

      // 检查是否越界
      if (xi < 0 || yi < 0) break;

      locStr = `${xi},${yi}`;
      mi = crossings.get(locStr);

      if (mi === undefined) {
        // 可能是鞍点的剩余路径
        break;
      }

      // 添加路径点
      const pt = this.getInterpPx(xi, yi, mi);
      path.push(pt);

      // 从 crossings 中移除
      crossings.delete(locStr);

      // 处理鞍点
      if (SaddleHandler.isSaddle(mi)) {
        // 鞍点有两条路径，需要继续追踪
        const remainder = SADDLE_REMAINDER[mi];
        if (remainder !== undefined) {
          // 继续追踪剩余路径
          const remainingDelta = NEW_DELTA[remainder];
          if (remainingDelta) {
            xi += remainingDelta[0];
            yi += remainingDelta[1];
          }
        }
      }
    }

    return path;
  }

  /**
   * 获取 Marching Index 对应的移动方向
   *
   * @param mi Marching Index
   * @returns 移动方向 [dx, dy] 或 null
   */
  private getDelta(mi: number): [number, number] | null {
    if (mi >= 0 && mi < NEW_DELTA.length) {
      return NEW_DELTA[mi];
    }

    // 处理鞍点编码
    if (SaddleHandler.isSaddle(mi)) {
      // 简化处理：使用默认方向
      if (mi === 104 || mi === 713) {
        return [-1, 0]; // 向左
      } else if (mi === 208 || mi === 1114) {
        return [0, -1]; // 向上
      }
    }

    return null;
  }

  /**
   * 插值计算穿越点的像素坐标
   *
   * @param xi x 索引
   * @param yi y 索引
   * @param mi Marching Index
   * @returns 插值后的点坐标
   */
  private getInterpPx(xi: number, yi: number, mi: number): Point {
    const z = this.gridData.z;
    const x = this.gridData.x;
    const y = this.gridData.y;

    // 获取网格单元的四个角点值
    const z00 = z[yi][xi];         // 左上
    const z10 = z[yi][xi + 1];     // 右上
    const z11 = z[yi + 1][xi + 1]; // 右下
    const z01 = z[yi + 1][xi];     // 左下

    const level = this.pathInfo.level;

    // 根据 Marching Index 确定穿越位置
    // 这里简化处理，使用网格中心
    // 实际实现需要根据具体的穿越边进行插值

    const px = x[xi];
    const py = y[yi];

    // 根据不同的穿越模式计算插值
    // 这里是一个简化版本
    switch (mi) {
      case 1:
      case 3:
      case 7:
        // 左边穿越
        return {
          x: px,
          y: py + this.linearInterp(z00, z01, level) * (y[yi + 1] - py)
        };
      case 2:
      case 6:
      case 14:
        // 上边穿越
        return {
          x: px + this.linearInterp(z00, z10, level) * (x[xi + 1] - px),
          y: py
        };
      case 4:
      case 12:
      case 13:
        // 右边穿越
        return {
          x: x[xi + 1],
          y: py + this.linearInterp(z10, z11, level) * (y[yi + 1] - py)
        };
      case 8:
      case 9:
      case 11:
        // 下边穿越
        return {
          x: px + this.linearInterp(z01, z11, level) * (x[xi + 1] - px),
          y: y[yi + 1]
        };
      default:
        // 鞍点或其他情况：返回网格中心
        return {
          x: (x[xi] + x[xi + 1]) / 2,
          y: (y[yi] + y[yi + 1]) / 2
        };
    }
  }

  /**
   * 线性插值
   *
   * @param v0 起始值
   * @param v1 结束值
   * @param t 目标值
   * @returns 插值参数 [0, 1]
   */
  private linearInterp(v0: number, v1: number, t: number): number {
    if (v0 === v1) return 0.5;
    return (t - v0) / (v1 - v0);
  }
}
