import { Axis, AxisOption } from './Axis';

/**
 * 对数坐标轴
 * 继承自 Axis，实现对数刻度的坐标转换
 */
export class LogAxis extends Axis {
  private logBase: number;

  constructor(option: Partial<AxisOption> & { logBase?: number } = {}) {
    super({ ...option, type: 'log' });
    this.logBase = option.logBase || 10;
  }

  /**
   * 数据坐标转对数
   *
   * @param dataCoord 数据坐标
   * @returns 对数值
   */
  c2l(dataCoord: number): number {
    if (dataCoord <= 0) {
      console.warn('LogAxis: value must be positive');
      return 0;
    }
    return Math.log(dataCoord) / Math.log(this.logBase);
  }

  /**
   * 对数转数据坐标
   *
   * @param logValue 对数值
   * @returns 数据坐标
   */
  l2c(logValue: number): number {
    return Math.pow(this.logBase, logValue);
  }

  /**
   * 数据坐标转像素坐标（对数刻度）
   *
   * @param dataCoord 数据坐标
   * @returns 像素坐标
   */
  override c2p(dataCoord: number): number {
    const [dMin, dMax] = this.range;
    const [pMin, pMax] = this.pixelRange;

    // 对数转换
    const logMin = this.c2l(dMin);
    const logMax = this.c2l(dMax);
    const logCoord = this.c2l(dataCoord);

    // 线性映射对数值
    const t = (logCoord - logMin) / (logMax - logMin);
    return pMin + t * (pMax - pMin);
  }

  /**
   * 像素坐标转数据坐标（对数刻度）
   *
   * @param pixelCoord 像素坐标
   * @returns 数据坐标
   */
  override p2c(pixelCoord: number): number {
    const [dMin, dMax] = this.range;
    const [pMin, pMax] = this.pixelRange;

    const logMin = this.c2l(dMin);
    const logMax = this.c2l(dMax);

    // 逆向映射
    const t = (pixelCoord - pMin) / (pMax - pMin);
    const logCoord = logMin + t * (logMax - logMin);

    // 逆对数转换
    return this.l2c(logCoord);
  }

  /**
   * 计算对数刻度位置
   *
   * @param count 刻度数量
   * @returns 刻度位置数组（数据坐标）
   */
  override getTicks(count: number = 5): number[] {
    const [dMin, dMax] = this.range;
    const logMin = this.c2l(dMin);
    const logMax = this.c2l(dMax);

    const ticks: number[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const logTick = logMin + t * (logMax - logMin);
      ticks.push(this.l2c(logTick));
    }

    return ticks;
  }

  /**
   * 获取对数底数
   */
  getLogBase(): number {
    return this.logBase;
  }

  /**
   * 设置对数底数
   */
  setLogBase(base: number): void {
    if (base <= 0 || base === 1) {
      console.warn('LogAxis: base must be positive and not equal to 1');
      return;
    }
    this.logBase = base;
  }

  /**
   * 获取主要刻度线（10 的幂次）
   *
   * @returns 主要刻度位置数组
   */
  getMajorTicks(): number[] {
    const [dMin, dMax] = this.range;
    const ticks: number[] = [];

    // 找到范围内的 10 的幂次
    const minExp = Math.floor(this.c2l(dMin));
    const maxExp = Math.ceil(this.c2l(dMax));

    for (let exp = minExp; exp <= maxExp; exp++) {
      const tick = this.l2c(exp);
      if (tick >= dMin && tick <= dMax) {
        ticks.push(tick);
      }
    }

    return ticks;
  }

  /**
   * 获取次要刻度线（中间值）
   *
   * @returns 次要刻度位置数组
   */
  getMinorTicks(): number[] {
    const [dMin, dMax] = this.range;
    const ticks: number[] = [];

    const minExp = Math.floor(this.c2l(dMin));
    const maxExp = Math.ceil(this.c2l(dMax));

    for (let exp = minExp; exp <= maxExp; exp++) {
      // 在每个数量级内添加次要刻度
      const base = this.l2c(exp);
      const multipliers = [2, 3, 4, 5, 6, 7, 8, 9];

      for (const mult of multipliers) {
        const tick = base * mult;
        if (tick >= dMin && tick <= dMax) {
          ticks.push(tick);
        }
      }
    }

    return ticks;
  }
}
