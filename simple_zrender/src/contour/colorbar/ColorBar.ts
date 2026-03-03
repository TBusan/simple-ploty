import type { ColorScale } from '../../types/types';
import { ColorMapper } from '../fill/ColorMapper';

/**
 * 颜色条选项
 */
export interface ColorBarOption {
  /** 标题 */
  title: {
    text: string;
    fontSize?: number;
    color?: string;
  };
  /** 长度（相对于绘图区域，0-1） */
  len: number;
  /** 厚度（像素） */
  thickness: number;
  /** x 位置（0-1） */
  x: number;
  /** y 位置（0-1） */
  y: number;
  /** 刻度数量 */
  tickCount: number;
  /** 刻度格式化函数 */
  tickFormat?: (value: number) => string;
}

/**
 * 颜色条渲染数据
 */
export interface ColorBarRenderData {
  /** 颜色条矩形路径 */
  barPath: string;
  /** 颜色渐变定义 */
  gradientStops: Array<{ offset: number; color: string }>;
  /** 刻度位置 */
  tickPositions: number[];
  /** 刻度标签 */
  tickLabels: string[];
  /** 标题文本 */
  titleText: string;
  /** 标题位置 */
  titlePosition: { x: number; y: number };
}

/**
 * 颜色条类
 * 负责渲染颜色条图例
 */
export class ColorBar {
  private option: ColorBarOption;
  private colorMapper: ColorMapper;

  constructor(
    colorMapper: ColorMapper,
    option: Partial<ColorBarOption> = {}
  ) {
    this.colorMapper = colorMapper;
    this.option = {
      title: {
        text: option.title?.text || '',
        fontSize: option.title?.fontSize || 14,
        color: option.title?.color || '#333333'
      },
      len: option.len ?? 0.9,
      thickness: option.thickness ?? 20,
      x: option.x ?? 1.02,
      y: option.y ?? 0.5,
      tickCount: option.tickCount ?? 5,
      tickFormat: option.tickFormat
    };
  }

  /**
   * 渲染颜色条
   *
   * @param plotWidth 绘图区域宽度
   * @param plotHeight 绘图区域高度
   * @returns 渲染数据
   */
  render(plotWidth: number, plotHeight: number): ColorBarRenderData {
    const [zmin, zmax] = this.colorMapper.getDataRange();
    const colorScale = this.colorMapper.getColorScale();

    // 计算颜色条尺寸
    const barHeight = plotHeight * this.option.len;
    const barWidth = this.option.thickness;
    const barX = plotWidth * this.option.x;
    const barY = (plotHeight - barHeight) / 2;

    // 生成颜色条路径
    const barPath = this.generateBarPath(barX, barY, barWidth, barHeight);

    // 生成渐变色阶
    const gradientStops = this.generateGradientStops(colorScale);

    // 计算刻度
    const { tickPositions, tickLabels } = this.generateTicks(zmin, zmax, barY, barHeight);

    // 标题位置
    const titlePosition = {
      x: barX + barWidth / 2,
      y: barY - 10
    };

    return {
      barPath,
      gradientStops,
      tickPositions,
      tickLabels,
      titleText: this.option.title.text,
      titlePosition
    };
  }

  /**
   * 生成颜色条矩形路径
   */
  private generateBarPath(
    x: number,
    y: number,
    width: number,
    height: number
  ): string {
    return `M${x},${y}L${x + width},${y}L${x + width},${y + height}L${x},${y + height}Z`;
  }

  /**
   * 生成渐变色阶
   */
  private generateGradientStops(colorScale: ColorScale[]): Array<{ offset: number; color: string }> {
    return colorScale.map(stop => ({
      offset: stop.value * 100,
      color: stop.color
    }));
  }

  /**
   * 生成刻度
   */
  private generateTicks(
    zmin: number,
    zmax: number,
    barY: number,
    barHeight: number
  ): { tickPositions: number[]; tickLabels: string[] } {
    const tickPositions: number[] = [];
    const tickLabels: string[] = [];

    for (let i = 0; i < this.option.tickCount; i++) {
      const t = i / (this.option.tickCount - 1);
      const value = zmin + t * (zmax - zmin);
      const position = barY + barHeight * (1 - t);  // 从下到上

      tickPositions.push(position);
      tickLabels.push(this.formatTick(value));
    }

    return { tickPositions, tickLabels };
  }

  /**
   * 格式化刻度标签
   */
  private formatTick(value: number): string {
    if (this.option.tickFormat) {
      return this.option.tickFormat(value);
    }

    // 默认格式化
    if (Math.abs(value) < 0.01 || Math.abs(value) >= 1000) {
      return value.toExponential(1);
    } else {
      return value.toFixed(2);
    }
  }

  /**
   * 计算填充级别
   * 用于确定颜色条的颜色分段
   *
   * @param levels 等值线级别
   * @returns 填充级别颜色映射
   */
  calcLevels(levels: number[]): Array<{ level: number; color: string }> {
    // 获取数据范围用于后续扩展
    const [_zmin, _zmax] = this.colorMapper.getDataRange();

    return levels.map(level => ({
      level,
      color: this.colorMapper.getFillColor(level)
    }));
  }

  /**
   * 获取选项
   */
  getOption(): ColorBarOption {
    return { ...this.option };
  }

  /**
   * 更新选项
   */
  setOption(option: Partial<ColorBarOption>): void {
    this.option = { ...this.option, ...option };
  }

  /**
   * 获取颜色映射器
   */
  getColorMapper(): ColorMapper {
    return this.colorMapper;
  }
}
