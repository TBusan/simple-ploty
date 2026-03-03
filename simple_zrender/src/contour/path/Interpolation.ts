import type { Point } from '../../types/types';

/**
 * 插值计算工具
 * 用于计算等值线穿越点的精确坐标
 */
export class Interpolation {
  /**
   * 线性插值
   *
   * @param v0 起始值
   * @param v1 结束值
   * @param t 目标值
   * @returns 插值参数 [0, 1]
   */
  static linearInterp(v0: number, v1: number, t: number): number {
    if (v0 === v1) return 0.5;
    const result = (t - v0) / (v1 - v0);
    return Math.max(0, Math.min(1, result));
  }

  /**
   * 计算水平边的穿越点
   *
   * @param x0 左边 x 坐标
   * @param x1 右边 x 坐标
   * @param y y 坐标（水平边）
   * @param z00 左端点值
   * @param z10 右端点值
   * @param level 等值线级别
   * @returns 穿越点坐标
   */
  static horizontalCrossing(
    x0: number,
    x1: number,
    y: number,
    z00: number,
    z10: number,
    level: number
  ): Point {
    const t = this.linearInterp(z00, z10, level);
    return {
      x: x0 + t * (x1 - x0),
      y: y
    };
  }

  /**
   * 计算垂直边的穿越点
   *
   * @param x x 坐标（垂直边）
   * @param y0 上边 y 坐标
   * @param y1 下边 y 坐标
   * @param z00 上端点值
   * @param z01 下端点值
   * @param level 等值线级别
   * @returns 穿越点坐标
   */
  static verticalCrossing(
    x: number,
    y0: number,
    y1: number,
    z00: number,
    z01: number,
    level: number
  ): Point {
    const t = this.linearInterp(z00, z01, level);
    return {
      x: x,
      y: y0 + t * (y1 - y0)
    };
  }

  /**
   * 计算网格单元的穿越点
   * 根据 Marching Index 返回所有穿越点
   *
   * @param xi x 索引
   * @param yi y 索引
   * @param xCoords x 坐标数组
   * @param yCoords y 坐标数组
   * @param z 数据矩阵
   * @param level 等值线级别
   * @param mi Marching Index
   * @returns 穿越点数组（0-2个点）
   */
  static getCellCrossings(
    xi: number,
    yi: number,
    xCoords: number[],
    yCoords: number[],
    z: number[][],
    level: number,
    mi: number
  ): Point[] {
    const crossings: Point[] = [];

    const x0 = xCoords[xi];
    const x1 = xCoords[xi + 1];
    const y0 = yCoords[yi];
    const y1 = yCoords[yi + 1];

    const z00 = z[yi][xi];         // 左上
    const z10 = z[yi][xi + 1];     // 右上
    const z11 = z[yi + 1][xi + 1]; // 右下
    const z01 = z[yi + 1][xi];     // 左下

    // 根据 Marching Index 确定穿越的边
    // 位掩码: 1=左边, 2=上边, 4=右边, 8=下边
    const edgeMask = this.getEdgeMask(mi);

    if (edgeMask & 1) {
      // 左边穿越
      crossings.push(this.verticalCrossing(x0, y0, y1, z00, z01, level));
    }
    if (edgeMask & 2) {
      // 上边穿越
      crossings.push(this.horizontalCrossing(x0, x1, y0, z00, z10, level));
    }
    if (edgeMask & 4) {
      // 右边穿越
      crossings.push(this.verticalCrossing(x1, y0, y1, z10, z11, level));
    }
    if (edgeMask & 8) {
      // 下边穿越
      crossings.push(this.horizontalCrossing(x0, x1, y1, z01, z11, level));
    }

    return crossings;
  }

  /**
   * 根据 Marching Index 获取穿越边掩码
   *
   * @param mi Marching Index
   * @returns 边掩码 (1=左, 2=上, 4=右, 8=下)
   */
  static getEdgeMask(mi: number): number {
    // 16 种基本情况的边掩码
    const edgeMasks: Record<number, number> = {
      0: 0,    // 无穿越
      1: 3,    // 左 + 上
      2: 6,    // 上 + 右
      3: 5,    // 左 + 右
      4: 12,   // 右 + 下
      5: 10,   // 上 + 下 (鞍点)
      6: 10,   // 上 + 下
      7: 9,    // 左 + 下
      8: 9,    // 左 + 下
      9: 9,    // 左 + 下
      10: 10,  // 上 + 下 (鞍点)
      11: 6,   // 上 + 右
      12: 5,   // 左 + 右
      13: 3,   // 左 + 上
      14: 12   // 右 + 下
    };

    // 处理鞍点编码
    if (mi === 104 || mi === 713) {
      return 10; // 上 + 下
    } else if (mi === 208 || mi === 1114) {
      return 5;  // 左 + 右
    }

    return edgeMasks[mi] || 0;
  }

  /**
   * 坐标转换：数据坐标到像素坐标
   *
   * @param dataX 数据 x 坐标
   * @param dataY 数据 y 坐标
   * @param xRange 数据 x 范围 [min, max]
   * @param yRange 数据 y 范围 [min, max]
   * @param pixelBox 像素边界 [left, top, right, bottom]
   * @returns 像素坐标
   */
  static dataToPixel(
    dataX: number,
    dataY: number,
    xRange: [number, number],
    yRange: [number, number],
    pixelBox: [number, number, number, number]
  ): Point {
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    const [pLeft, pTop, pRight, pBottom] = pixelBox;

    const x = pLeft + ((dataX - xMin) / (xMax - xMin)) * (pRight - pLeft);
    const y = pTop + ((yMax - dataY) / (yMax - yMin)) * (pBottom - pTop);

    return { x, y };
  }

  /**
   * 坐标转换：像素坐标到数据坐标
   *
   * @param pixelX 像素 x 坐标
   * @param pixelY 像素 y 坐标
   * @param xRange 数据 x 范围 [min, max]
   * @param yRange 数据 y 范围 [min, max]
   * @param pixelBox 像素边界 [left, top, right, bottom]
   * @returns 数据坐标
   */
  static pixelToData(
    pixelX: number,
    pixelY: number,
    xRange: [number, number],
    yRange: [number, number],
    pixelBox: [number, number, number, number]
  ): Point {
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    const [pLeft, pTop, pRight, pBottom] = pixelBox;

    const x = xMin + ((pixelX - pLeft) / (pRight - pLeft)) * (xMax - xMin);
    const y = yMax - ((pixelY - pTop) / (pBottom - pTop)) * (yMax - yMin);

    return { x, y };
  }
}
