import type { Point } from '../../types/types';

/**
 * 平移选项
 */
export interface PanOption {
  /** 是否启用 */
  enabled: boolean;
  /** 边界限制 */
  bounds?: {
    x: [number, number];
    y: [number, number];
  };
}

/**
 * 平移状态
 */
export interface PanState {
  /** 当前偏移量 */
  offset: Point;
  /** 是否正在拖拽 */
  isDragging: boolean;
}

/**
 * 平移处理器
 * 负责处理等值线图的平移交互
 */
export class PanHandler {
  private option: PanOption;
  private state: PanState;
  private startOffset: Point;
  private startPoint: Point | null;

  constructor(option: Partial<PanOption> = {}) {
    this.option = {
      enabled: option.enabled ?? true,
      bounds: option.bounds
    };

    this.state = {
      offset: { x: 0, y: 0 },
      isDragging: false
    };

    this.startOffset = { x: 0, y: 0 };
    this.startPoint = null;
  }

  /**
   * 处理鼠标按下事件
   *
   * @param event 鼠标事件
   */
  handleMouseDown(event: MouseEvent): void {
    if (!this.option.enabled) return;

    this.state.isDragging = true;
    this.startPoint = {
      x: event.clientX,
      y: event.clientY
    };
    this.startOffset = { ...this.state.offset };
  }

  /**
   * 处理鼠标移动事件
   *
   * @param event 鼠标事件
   * @returns 更新后的平移状态
   */
  handleMouseMove(event: MouseEvent): PanState {
    if (!this.option.enabled || !this.state.isDragging || !this.startPoint) {
      return this.state;
    }

    const dx = event.clientX - this.startPoint.x;
    const dy = event.clientY - this.startPoint.y;

    let newOffset = {
      x: this.startOffset.x + dx,
      y: this.startOffset.y + dy
    };

    // 应用边界限制
    newOffset = this.clampOffset(newOffset);

    this.state.offset = newOffset;
    return this.state;
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(): void {
    this.state.isDragging = false;
    this.startPoint = null;
  }

  /**
   * 平移到指定位置
   *
   * @param offset 目标偏移量
   */
  panTo(offset: Point): void {
    this.state.offset = this.clampOffset(offset);
  }

  /**
   * 平移指定增量
   *
   * @param dx x 方向增量
   * @param dy y 方向增量
   */
  panBy(dx: number, dy: number): void {
    this.state.offset = this.clampOffset({
      x: this.state.offset.x + dx,
      y: this.state.offset.y + dy
    });
  }

  /**
   * 重置平移
   */
  reset(): void {
    this.state = {
      offset: { x: 0, y: 0 },
      isDragging: false
    };
    this.startPoint = null;
  }

  /**
   * 限制偏移量
   */
  private clampOffset(offset: Point): Point {
    if (!this.option.bounds) {
      return offset;
    }

    return {
      x: Math.max(
        this.option.bounds.x[0],
        Math.min(this.option.bounds.x[1], offset.x)
      ),
      y: Math.max(
        this.option.bounds.y[0],
        Math.min(this.option.bounds.y[1], offset.y)
      )
    };
  }

  /**
   * 获取当前状态
   */
  getState(): PanState {
    return {
      ...this.state,
      offset: { ...this.state.offset }
    };
  }

  /**
   * 获取选项
   */
  getOption(): PanOption {
    return { ...this.option };
  }

  /**
   * 设置选项
   */
  setOption(option: Partial<PanOption>): void {
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
