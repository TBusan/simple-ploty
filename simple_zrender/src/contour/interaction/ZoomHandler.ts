import type { Point } from '../../types/types';

/**
 * 缩放选项
 */
export interface ZoomOption {
  /** 最小缩放比例 */
  minScale: number;
  /** 最大缩放比例 */
  maxScale: number;
  /** 缩放灵敏度 */
  sensitivity: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 缩放状态
 */
export interface ZoomState {
  /** 当前缩放比例 */
  scale: number;
  /** 缩放中心点 */
  center: Point;
}

/**
 * 缩放处理器
 * 负责处理等值线图的缩放交互
 */
export class ZoomHandler {
  private option: ZoomOption;
  private state: ZoomState;

  constructor(option: Partial<ZoomOption> = {}) {
    this.option = {
      minScale: option.minScale ?? 0.1,
      maxScale: option.maxScale ?? 10,
      sensitivity: option.sensitivity ?? 0.1,
      enabled: option.enabled ?? true
    };

    this.state = {
      scale: 1,
      center: { x: 0, y: 0 }
    };
  }

  /**
   * 处理鼠标滚轮事件
   *
   * @param event 鼠标事件
   * @returns 更新后的缩放状态
   */
  handleWheel(event: WheelEvent): ZoomState {
    if (!this.option.enabled) {
      return this.state;
    }

    const delta = -event.deltaY * this.option.sensitivity;
    const newScale = this.clampScale(this.state.scale * (1 + delta));

    // 以鼠标位置为中心缩放
    const center = {
      x: event.offsetX,
      y: event.offsetY
    };

    this.state = {
      scale: newScale,
      center
    };

    return this.state;
  }

  /**
   * 缩放到指定比例
   *
   * @param scale 目标缩放比例
   * @param center 缩放中心
   */
  zoomTo(scale: number, center?: Point): void {
    this.state.scale = this.clampScale(scale);
    if (center) {
      this.state.center = center;
    }
  }

  /**
   * 放大
   *
   * @param factor 放大因子
   */
  zoomIn(factor: number = 1.2): void {
    this.state.scale = this.clampScale(this.state.scale * factor);
  }

  /**
   * 缩小
   *
   * @param factor 缩小因子
   */
  zoomOut(factor: number = 0.8): void {
    this.state.scale = this.clampScale(this.state.scale * factor);
  }

  /**
   * 重置缩放
   */
  reset(): void {
    this.state = {
      scale: 1,
      center: { x: 0, y: 0 }
    };
  }

  /**
   * 限制缩放比例
   */
  private clampScale(scale: number): number {
    return Math.max(
      this.option.minScale,
      Math.min(this.option.maxScale, scale)
    );
  }

  /**
   * 获取当前状态
   */
  getState(): ZoomState {
    return { ...this.state };
  }

  /**
   * 获取选项
   */
  getOption(): ZoomOption {
    return { ...this.option };
  }

  /**
   * 设置选项
   */
  setOption(option: Partial<ZoomOption>): void {
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
