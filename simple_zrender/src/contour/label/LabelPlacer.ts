import type { Point, PathInfo } from '../../types/types';

/**
 * 标签选项
 */
export interface LabelOption {
  /** 是否显示标签 */
  show: boolean;
  /** 字体大小 */
  fontSize: number;
  /** 字体颜色 */
  color: string;
  /** 标签格式化函数 */
  formatter?: (value: number) => string;
}

/**
 * 标签位置信息
 */
export interface LabelPosition {
  /** 标签位置 */
  position: Point;
  /** 标签文本 */
  text: string;
  /** 旋转角度（弧度） */
  rotation: number;
  /** 对应的路径索引 */
  pathIndex: number;
  /** 对应的级别 */
  level: number;
}

/**
 * 标签放置器
 * 负责在等值线上寻找最佳标签位置
 */
export class LabelPlacer {
  private option: LabelOption;

  constructor(option: Partial<LabelOption> = {}) {
    this.option = {
      show: option.show ?? true,
      fontSize: option.fontSize ?? 12,
      color: option.color ?? '#333333',
      formatter: option.formatter
    };
  }

  /**
   * 寻找最佳标签位置
   *
   * @param pathInfo 路径信息
   * @returns 标签位置列表
   */
  findBestLocations(pathInfo: PathInfo): LabelPosition[] {
    if (!this.option.show) {
      return [];
    }

    const labels: LabelPosition[] = [];

    // 处理边缘路径
    for (let i = 0; i < pathInfo.edgePaths.length; i++) {
      const path = pathInfo.edgePaths[i];
      const position = this.findPathLabelPosition(path, pathInfo.level, i);
      if (position) {
        labels.push(position);
      }
    }

    // 处理内部闭合路径
    for (let i = 0; i < pathInfo.paths.length; i++) {
      const path = pathInfo.paths[i];
      const position = this.findPathLabelPosition(path, pathInfo.level, i);
      if (position) {
        labels.push(position);
      }
    }

    return labels;
  }

  /**
   * 在单条路径上寻找标签位置
   */
  private findPathLabelPosition(
    path: Point[],
    level: number,
    pathIndex: number
  ): LabelPosition | null {
    if (path.length < 2) return null;

    // 寻找路径中最平直的部分
    const bestIndex = this.findFlattestSegment(path);
    const midPoint = path[bestIndex];

    // 计算切线角度
    const rotation = this.calculateTangentAngle(path, bestIndex);

    // 格式化标签文本
    const text = this.formatLabel(level);

    return {
      position: midPoint,
      text,
      rotation,
      pathIndex,
      level
    };
  }

  /**
   * 寻找最平直的线段
   */
  private findFlattestSegment(path: Point[]): number {
    if (path.length < 3) return Math.floor(path.length / 2);

    let minCurvature = Infinity;
    let bestIndex = 1;

    for (let i = 1; i < path.length - 1; i++) {
      const curvature = this.calculateCurvature(path, i);
      if (curvature < minCurvature) {
        minCurvature = curvature;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * 计算曲率
   */
  private calculateCurvature(path: Point[], index: number): number {
    const prev = path[index - 1];
    const curr = path[index];
    const next = path[index + 1];

    // 使用向量叉积计算曲率
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    const dot = dx1 * dx2 + dy1 * dy2;

    // 曲率近似
    return Math.abs(Math.atan2(cross, dot));
  }

  /**
   * 计算切线角度
   */
  private calculateTangentAngle(path: Point[], index: number): number {
    const prev = path[Math.max(0, index - 1)];
    const next = path[Math.min(path.length - 1, index + 1)];

    return Math.atan2(next.y - prev.y, next.x - prev.x);
  }

  /**
   * 格式化标签文本
   */
  private formatLabel(value: number): string {
    if (this.option.formatter) {
      return this.option.formatter(value);
    }

    // 默认格式化
    if (Math.abs(value) < 0.01) {
      return value.toExponential(1);
    } else if (Math.abs(value) >= 1000) {
      return value.toExponential(1);
    } else {
      return value.toFixed(1);
    }
  }

  /**
   * 计算位置成本
   *
   * @param position 标签位置
   * @param existingLabels 已有标签
   * @param path 路径
   * @returns 成本值（越低越好）
   */
  calcCost(
    position: LabelPosition,
    existingLabels: LabelPosition[],
    path: Point[]
  ): number {
    let cost = 0;

    // 曲率成本（曲率越小越好）
    const index = this.findClosestIndex(path, position.position);
    const curvatureCost = this.calculateCurvature(path, index) * 10;
    cost += curvatureCost;

    // 路径长度成本（靠近中间越好）
    const lengthCost = Math.abs(index - path.length / 2) / path.length * 5;
    cost += lengthCost;

    // 重叠成本
    const overlapCost = this.calcOverlapCost(position, existingLabels);
    cost += overlapCost;

    return cost;
  }

  /**
   * 寻找最近的路径点索引
   */
  private findClosestIndex(path: Point[], point: Point): number {
    let minDist = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < path.length; i++) {
      const dx = path[i].x - point.x;
      const dy = path[i].y - point.y;
      const dist = dx * dx + dy * dy;

      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  /**
   * 计算重叠成本
   */
  private calcOverlapCost(
    position: LabelPosition,
    existingLabels: LabelPosition[]
  ): number {
    let cost = 0;
    const fontSize = this.option.fontSize;
    const threshold = fontSize * 2;  // 2 倍字体大小的距离阈值

    for (const existing of existingLabels) {
      const dx = position.position.x - existing.position.x;
      const dy = position.position.y - existing.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold) {
        cost += (threshold - dist) * 10;
      }
    }

    return cost;
  }

  /**
   * 避免标签重叠
   *
   * @param labels 标签位置列表
   * @param minDistance 最小距离
   * @returns 调整后的标签位置
   */
  avoidOverlap(
    labels: LabelPosition[],
    minDistance: number = 20
  ): LabelPosition[] {
    const result: LabelPosition[] = [];

    for (const label of labels) {
      let isOverlapping = false;

      for (const existing of result) {
        const dx = label.position.x - existing.position.x;
        const dy = label.position.y - existing.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
          isOverlapping = true;
          break;
        }
      }

      if (!isOverlapping) {
        result.push(label);
      }
    }

    return result;
  }

  /**
   * 获取标签选项
   */
  getOption(): LabelOption {
    return this.option;
  }
}
