import type { Point } from '../../types/types';
import type { LabelPosition } from './LabelPlacer';

/**
 * 成本权重配置
 */
export interface CostWeights {
  /** 曲率权重 */
  curvature: number;
  /** 路径长度位置权重 */
  pathPosition: number;
  /** 重叠权重 */
  overlap: number;
  /** 边界距离权重 */
  boundary: number;
}

/**
 * 成本函数类
 * 用于评估标签位置的质量
 */
export class CostFunction {
  private weights: CostWeights;

  constructor(weights: Partial<CostWeights> = {}) {
    this.weights = {
      curvature: weights.curvature ?? 10,
      pathPosition: weights.pathPosition ?? 5,
      overlap: weights.overlap ?? 20,
      boundary: weights.boundary ?? 15
    };
  }

  /**
   * 计算综合成本
   *
   * @param point 评估点
   * @param path 路径
   * @param index 点在路径中的索引
   * @param existingLabels 已有标签
   * @param bounds 边界 [xmin, ymin, xmax, ymax]
   * @returns 综合成本
   */
  calculateTotalCost(
    point: Point,
    path: Point[],
    index: number,
    existingLabels: LabelPosition[],
    bounds?: [number, number, number, number]
  ): number {
    const curvatureCost = this.calculateCurvatureCost(path, index);
    const positionCost = this.calculatePathPositionCost(path, index);
    const overlapCost = this.calculateOverlapCost(point, existingLabels);
    const boundaryCost = bounds
      ? this.calculateBoundaryCost(point, bounds)
      : 0;

    return (
      curvatureCost * this.weights.curvature +
      positionCost * this.weights.pathPosition +
      overlapCost * this.weights.overlap +
      boundaryCost * this.weights.boundary
    );
  }

  /**
   * 计算曲率成本
   * 曲率越小，成本越低
   */
  calculateCurvatureCost(path: Point[], index: number): number {
    if (index < 1 || index >= path.length - 1) {
      return 1;  // 边界点曲率成本较高
    }

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

    // 归一化曲率 [0, 1]
    const curvature = Math.abs(Math.atan2(cross, dot)) / Math.PI;

    return curvature;
  }

  /**
   * 计算路径位置成本
   * 靠近路径中间的位置成本更低
   */
  calculatePathPositionCost(path: Point[], index: number): number {
    const midIndex = (path.length - 1) / 2;
    const deviation = Math.abs(index - midIndex) / midIndex;

    return deviation;
  }

  /**
   * 计算重叠成本
   * 与现有标签越近，成本越高
   */
  calculateOverlapCost(
    point: Point,
    existingLabels: LabelPosition[],
    threshold: number = 50
  ): number {
    let maxOverlap = 0;

    for (const label of existingLabels) {
      const dx = point.x - label.position.x;
      const dy = point.y - label.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold) {
        const overlap = 1 - dist / threshold;
        maxOverlap = Math.max(maxOverlap, overlap);
      }
    }

    return maxOverlap;
  }

  /**
   * 计算边界距离成本
   * 靠近边界的位置成本更高
   */
  calculateBoundaryCost(
    point: Point,
    bounds: [number, number, number, number],
    margin: number = 30
  ): number {
    const [xmin, ymin, xmax, ymax] = bounds;

    const leftDist = point.x - xmin;
    const rightDist = xmax - point.x;
    const topDist = point.y - ymin;
    const bottomDist = ymax - point.y;

    let cost = 0;

    if (leftDist < margin) cost += (margin - leftDist) / margin;
    if (rightDist < margin) cost += (margin - rightDist) / margin;
    if (topDist < margin) cost += (margin - topDist) / margin;
    if (bottomDist < margin) cost += (margin - bottomDist) / margin;

    return cost / 4;  // 归一化
  }

  /**
   * 获取权重配置
   */
  getWeights(): CostWeights {
    return { ...this.weights };
  }

  /**
   * 设置权重配置
   */
  setWeights(weights: Partial<CostWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }
}
