import type { GridData, PathInfo, GridCell } from '../../types/types';
import { SaddleHandler } from './SaddleHandler';
import {
  BOTTOM_START,
  TOP_START,
  LEFT_START,
  RIGHT_START
} from './constants';

/**
 * 计算网格单元的 Marching Index
 *
 * @param level 等值线级别
 * @param corners 四个角点的值 [左上, 右上, 右下, 左下]
 * @returns Marching Index (0-15) 或鞍点编码 (104, 208, 713, 1114)
 */
export function getMarchingIndex(
  level: number,
  corners: [number, number, number, number]
): number {
  // 位编码: 每个角点如果 <= level 则为 1，否则为 0
  const mi = (corners[0] > level ? 0 : 1) +   // 左上角 (位 0)
             (corners[1] > level ? 0 : 2) +   // 右上角 (位 1)
             (corners[2] > level ? 0 : 4) +   // 右下角 (位 2)
             (corners[3] > level ? 0 : 8);    // 左下角 (位 3)

  // 鞍点特殊处理
  if (mi === 5 || mi === 10) {
    return SaddleHandler.disambiguateSaddle(corners, level);
  }

  // mi === 15 表示全部 <= level，等价于无穿越
  return mi === 15 ? 0 : mi;
}

/**
 * Marching Squares 算法实现
 *
 * 用于计算等值线的穿越点和边界起点
 */
export class MarchingSquares {
  private gridData: GridData;
  private levels: number[];

  constructor(gridData: GridData, levels: number[]) {
    this.gridData = gridData;
    this.levels = levels;
  }

  /**
   * 计算所有级别的穿越点
   *
   * @returns Map<级别, 路径信息>
   */
  computeLevels(): Map<number, PathInfo> {
    const result = new Map<number, PathInfo>();
    const z = this.gridData.z;
    const m = z.length;      // y 方向网格数
    const n = z[0].length;   // x 方向网格数

    for (const level of this.levels) {
      const pathInfo: PathInfo = {
        level,
        crossings: new Map<string, number>(),
        starts: [],
        edgePaths: [],
        paths: []
      };

      // 遍历所有网格单元
      for (let yi = 0; yi < m - 1; yi++) {
        for (let xi = 0; xi < n - 1; xi++) {
          const corners: [number, number, number, number] = [
            z[yi][xi],           // 左上
            z[yi][xi + 1],       // 右上
            z[yi + 1][xi + 1],   // 右下
            z[yi + 1][xi]        // 左下
          ];

          // 检查是否有 null 值，如果有则跳过该单元
          if (corners.some(c => c === null)) continue;

          const mi = getMarchingIndex(level, corners);
          if (mi === 0) continue;  // 无穿越

          const locStr = `${xi},${yi}`;
          pathInfo.crossings.set(locStr, mi);

          // 检查是否为边界起点
          if (this.isStart(mi, xi, yi, n - 2, m - 2)) {
            pathInfo.starts.push([xi, yi]);
          }
        }
      }

      result.set(level, pathInfo);
    }

    return result;
  }

  /**
   * 计算单个级别的穿越点
   *
   * @param level 等值线级别
   * @returns 路径信息
   */
  computeLevel(level: number): PathInfo {
    const result = this.computeLevels();
    return result.get(level) || {
      level,
      crossings: new Map(),
      starts: [],
      edgePaths: [],
      paths: []
    };
  }

  /**
   * 判断网格单元是否为边界起点
   *
   * @param mi Marching Index
   * @param xi x 索引
   * @param yi y 索引
   * @param maxX 最大 x 索引
   * @param maxY 最大 y 索引
   * @returns 是否为起点
   */
  private isStart(
    mi: number,
    xi: number,
    yi: number,
    maxX: number,
    maxY: number
  ): boolean {
    const starts: number[] = [];

    // 根据位置添加可能的起点类型
    if (yi === 0) starts.push(...BOTTOM_START);
    if (yi === maxY) starts.push(...TOP_START);
    if (xi === 0) starts.push(...LEFT_START);
    if (xi === maxX) starts.push(...RIGHT_START);

    return starts.includes(mi);
  }

  /**
   * 获取网格单元信息
   *
   * @param xi x 索引
   * @param yi y 索引
   * @returns 网格单元
   */
  getGridCell(xi: number, yi: number): GridCell {
    const z = this.gridData.z;
    return {
      x: xi,
      y: yi,
      corners: [
        z[yi][xi],           // 左上
        z[yi][xi + 1],       // 右上
        z[yi + 1][xi + 1],   // 右下
        z[yi + 1][xi]        // 左下
      ]
    };
  }

  /**
   * 获取所有级别
   */
  getLevels(): number[] {
    return this.levels;
  }

  /**
   * 获取网格数据
   */
  getGridData(): GridData {
    return this.gridData;
  }
}
