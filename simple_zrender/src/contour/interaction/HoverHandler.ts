import type { Point } from '../../types/types';

/**
 * 悬停选项
 */
export interface HoverOption {
  /** 是否启用 */
  enabled: boolean;
  /** 悬停延迟（毫秒） */
  delay: number;
  /** 是否显示数值提示 */
  showTooltip: boolean;
  /** 自定义提示格式化函数 */
  tooltipFormat?: (value: number, x: number, y: number) => string;
}

/**
 * 悬停数据
 */
export interface HoverData {
  /** 悬停位置 */
  position: Point;
  /** 数据值 */
  value: number;
  /** 数据坐标 */
  dataX: number;
  /** 数据坐标 */
  dataY: number;
  /** 提示文本 */
  tooltip: string;
}

/**
 * 悬停处理器
 * 负责处理等值线图的悬停交互
 */
export class HoverHandler {
  private option: HoverOption;
  private currentHover: HoverData | null;
  private hoverTimeout: number | null;

  constructor(option: Partial<HoverOption> = {}) {
    this.option = {
      enabled: option.enabled ?? true,
      delay: option.delay ?? 100,
      showTooltip: option.showTooltip ?? true,
      tooltipFormat: option.tooltipFormat
    };

    this.currentHover = null;
    this.hoverTimeout = null;
  }

  /**
   * 处理鼠标移动事件
   *
   * @param event 鼠标事件
   * @param dataProvider 数据提供函数
   * @param callback 悬停回调
   */
  handleMouseMove(
    event: MouseEvent,
    dataProvider: (x: number, y: number) => { value: number; dataX: number; dataY: number } | null,
    callback?: (data: HoverData | null) => void
  ): void {
    if (!this.option.enabled) return;

    // 清除之前的延迟
    if (this.hoverTimeout !== null) {
      clearTimeout(this.hoverTimeout);
    }

    // 设置延迟
    this.hoverTimeout = window.setTimeout(() => {
      const pixelX = event.offsetX;
      const pixelY = event.offsetY;

      const data = dataProvider(pixelX, pixelY);

      if (data) {
        this.currentHover = {
          position: { x: pixelX, y: pixelY },
          value: data.value,
          dataX: data.dataX,
          dataY: data.dataY,
          tooltip: this.formatTooltip(data.value, data.dataX, data.dataY)
        };
      } else {
        this.currentHover = null;
      }

      if (callback) {
        callback(this.currentHover);
      }
    }, this.option.delay);
  }

  /**
   * 处理鼠标离开事件
   *
   * @param callback 离开回调
   */
  handleMouseLeave(callback?: () => void): void {
    if (this.hoverTimeout !== null) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.currentHover = null;

    if (callback) {
      callback();
    }
  }

  /**
   * 格式化提示文本
   */
  private formatTooltip(value: number, dataX: number, dataY: number): string {
    if (this.option.tooltipFormat) {
      return this.option.tooltipFormat(value, dataX, dataY);
    }

    // 默认格式
    return `Value: ${value.toFixed(2)}\nX: ${dataX.toFixed(2)}\nY: ${dataY.toFixed(2)}`;
  }

  /**
   * 获取当前悬停数据
   */
  getCurrentHover(): HoverData | null {
    return this.currentHover;
  }

  /**
   * 是否正在悬停
   */
  isHovering(): boolean {
    return this.currentHover !== null;
  }

  /**
   * 获取选项
   */
  getOption(): HoverOption {
    return { ...this.option };
  }

  /**
   * 设置选项
   */
  setOption(option: Partial<HoverOption>): void {
    this.option = { ...this.option, ...option };
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.option.enabled;
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled: boolean): void {
    this.option.enabled = enabled;
  }
}
