import type { Point } from '../../types/types';

/**
 * 坐标轴类型
 */
export type AxisType = 'linear' | 'log';

/**
 * 坐标轴选项
 */
export interface AxisOption {
  /** 轴类型 */
  type: AxisType;
  /** 是否可见 */
  visible: boolean;
  /** 数据范围 */
  range: [number, number];
  /** 像素范围 */
  pixelRange: [number, number];
}

/**
 * 坐标轴基类
 * 负责数据坐标与像素坐标之间的转换
 */
export class Axis {
  protected type: AxisType;
  protected visible: boolean;
  protected range: [number, number];
  protected pixelRange: [number, number];

  constructor(option: Partial<AxisOption> = {}) {
    this.type = option.type || 'linear';
    this.visible = option.visible ?? true;
    this.range = option.range || [0, 1];
    this.pixelRange = option.pixelRange || [0, 100];
  }

  /**
   * 数据坐标转像素坐标
   *
   * @param dataCoord 数据坐标
   * @returns 像素坐标
   */
  c2p(dataCoord: number): number {
    const [dMin, dMax] = this.range;
    const [pMin, pMax] = this.pixelRange;

    // 线性映射
    const t = (dataCoord - dMin) / (dMax - dMin);
    return pMin + t * (pMax - pMin);
  }

  /**
   * 像素坐标转数据坐标
   *
   * @param pixelCoord 像素坐标
   * @returns 数据坐标
   */
  p2c(pixelCoord: number): number {
    const [dMin, dMax] = this.range;
    const [pMin, pMax] = this.pixelRange;

    // 逆向映射
    const t = (pixelCoord - pMin) / (pMax - pMin);
    return dMin + t * (dMax - dMin);
  }

  /**
   * 批量转换数据坐标到像素坐标
   *
   * @param dataCoords 数据坐标数组
   * @returns 像素坐标数组
   */
  c2pArray(dataCoords: number[]): number[] {
    return dataCoords.map(c => this.c2p(c));
  }

  /**
   * 批量转换像素坐标到数据坐标
   *
   * @param pixelCoords 像素坐标数组
   * @returns 数据坐标数组
   */
  p2cArray(pixelCoords: number[]): number[] {
    return pixelCoords.map(p => this.p2c(p));
  }

  /**
   * 获取数据范围
   */
  getRange(): [number, number] {
    return this.range;
  }

  /**
   * 设置数据范围
   */
  setRange(range: [number, number]): void {
    this.range = range;
  }

  /**
   * 获取像素范围
   */
  getPixelRange(): [number, number] {
    return this.pixelRange;
  }

  /**
   * 设置像素范围
   */
  setPixelRange(pixelRange: [number, number]): void {
    this.pixelRange = pixelRange;
  }

  /**
   * 获取轴类型
   */
  getType(): AxisType {
    return this.type;
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 计算刻度位置
   *
   * @param count 刻度数量
   * @returns 刻度位置数组（数据坐标）
   */
  getTicks(count: number = 5): number[] {
    const [dMin, dMax] = this.range;
    const ticks: number[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      ticks.push(dMin + t * (dMax - dMin));
    }

    return ticks;
  }

  /**
   * 计算刻度标签
   *
   * @param ticks 刻度位置
   * @param formatter 格式化函数
   * @returns 刻度标签数组
   */
  getTickLabels(
    ticks: number[],
    formatter?: (value: number) => string
  ): string[] {
    const defaultFormatter = (v: number) => v.toFixed(2);
    const fmt = formatter || defaultFormatter;

    return ticks.map(fmt);
  }
}

/**
 * 二维坐标系统
 * 管理 x 轴和 y 轴
 */
export class Axis2D {
  private xAxis: Axis;
  private yAxis: Axis;

  constructor(
    xAxisOption?: Partial<AxisOption>,
    yAxisOption?: Partial<AxisOption>
  ) {
    this.xAxis = new Axis(xAxisOption);
    this.yAxis = new Axis(yAxisOption);
  }

  /**
   * 数据坐标转像素坐标
   *
   * @param dataX 数据 x 坐标
   * @param dataY 数据 y 坐标
   * @returns 像素坐标
   */
  dataToPixel(dataX: number, dataY: number): Point {
    return {
      x: this.xAxis.c2p(dataX),
      y: this.yAxis.c2p(dataY)
    };
  }

  /**
   * 像素坐标转数据坐标
   *
   * @param pixelX 像素 x 坐标
   * @param pixelY 像素 y 坐标
   * @returns 数据坐标
   */
  pixelToData(pixelX: number, pixelY: number): Point {
    return {
      x: this.xAxis.p2c(pixelX),
      y: this.yAxis.p2c(pixelY)
    };
  }

  /**
   * 获取 X 轴
   */
  getXAxis(): Axis {
    return this.xAxis;
  }

  /**
   * 获取 Y 轴
   */
  getYAxis(): Axis {
    return this.yAxis;
  }

  /**
   * 获取数据边界
   */
  getDataBounds(): { x: [number, number]; y: [number, number] } {
    return {
      x: this.xAxis.getRange(),
      y: this.yAxis.getRange()
    };
  }

  /**
   * 获取像素边界
   */
  getPixelBounds(): { x: [number, number]; y: [number, number] } {
    return {
      x: this.xAxis.getPixelRange(),
      y: this.yAxis.getPixelRange()
    };
  }
}
