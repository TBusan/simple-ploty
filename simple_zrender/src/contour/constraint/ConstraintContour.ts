import type { GridData } from '../../types/types';

/**
 * 约束操作符类型
 */
export type ConstraintOperator =
  | '>'   // 大于
  | '<'   // 小于
  | '='   // 等于
  | '[]'  // 区间内
  | ']['; // 区间外

/**
 * 约束条件
 */
export interface Constraint {
  /** 操作符 */
  operator: ConstraintOperator;
  /** 值（单值操作） */
  value?: number;
  /** 最小值（区间操作） */
  min?: number;
  /** 最大值（区间操作） */
  max?: number;
}

/**
 * 约束等值线选项
 */
export interface ConstraintOption {
  /** 约束条件列表 */
  constraints: Constraint[];
  /** 是否显示边界线 */
  showBoundary: boolean;
  /** 边界线颜色 */
  boundaryColor: string;
  /** 边界线宽度 */
  boundaryWidth: number;
}

/**
 * 约束等值线
 * 负责根据约束条件过滤和生成等值线
 */
export class ConstraintContour {
  private option: ConstraintOption;

  constructor(option: Partial<ConstraintOption> = {}) {
    this.option = {
      constraints: option.constraints || [],
      showBoundary: option.showBoundary ?? true,
      boundaryColor: option.boundaryColor || '#ff0000',
      boundaryWidth: option.boundaryWidth ?? 2
    };
  }

  /**
   * 应用约束条件过滤数据
   *
   * @param gridData 原始网格数据
   * @returns 过滤后的数据掩码
   */
  applyConstraints(gridData: GridData): boolean[][] {
    const { z } = gridData;
    const rows = z.length;
    const cols = z[0]?.length || 0;

    // 初始化掩码（全部通过）
    const mask: boolean[][] = [];
    for (let j = 0; j < rows; j++) {
      mask[j] = [];
      for (let i = 0; i < cols; i++) {
        mask[j][i] = this.evaluateConstraints(z[j][i]);
      }
    }

    return mask;
  }

  /**
   * 评估单个值是否满足所有约束条件
   */
  private evaluateConstraints(value: number): boolean {
    for (const constraint of this.option.constraints) {
      if (!this.evaluateConstraint(value, constraint)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 评估单个约束条件
   */
  private evaluateConstraint(value: number, constraint: Constraint): boolean {
    switch (constraint.operator) {
      case '>':
        return value > (constraint.value ?? 0);
      case '<':
        return value < (constraint.value ?? 0);
      case '=':
        return Math.abs(value - (constraint.value ?? 0)) < 0.001;
      case '[]':
        return value >= (constraint.min ?? 0) && value <= (constraint.max ?? 0);
      case '][':
        return value < (constraint.min ?? 0) || value > (constraint.max ?? 0);
      default:
        return true;
    }
  }

  /**
   * 生成约束边界路径
   *
   * @param gridData 网格数据
   * @returns 边界路径点列表
   */
  generateBoundaryPaths(gridData: GridData): Array<{ x: number; y: number }[]> {
    const mask = this.applyConstraints(gridData);
    const paths: Array<{ x: number; y: number }[]> = [];

    // 简化实现：查找边界点
    const { x, y, z } = gridData;
    const rows = z.length;
    const cols = z[0]?.length || 0;

    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const current = mask[j][i];
        const right = mask[j][i + 1];
        const bottom = mask[j + 1][i];

        // 水平边界
        if (current !== right) {
          const px = (x[i] + x[i + 1]) / 2;
          const py = y[j];
          paths.push([{ x: px, y: py }]);
        }

        // 垂直边界
        if (current !== bottom) {
          const px = x[i];
          const py = (y[j] + y[j + 1]) / 2;
          paths.push([{ x: px, y: py }]);
        }
      }
    }

    return paths;
  }

  /**
   * 添加约束条件
   */
  addConstraint(constraint: Constraint): void {
    this.option.constraints.push(constraint);
  }

  /**
   * 移除约束条件
   */
  removeConstraint(index: number): void {
    this.option.constraints.splice(index, 1);
  }

  /**
   * 清除所有约束条件
   */
  clearConstraints(): void {
    this.option.constraints = [];
  }

  /**
   * 获取约束条件列表
   */
  getConstraints(): Constraint[] {
    return [...this.option.constraints];
  }

  /**
   * 获取选项
   */
  getOption(): ConstraintOption {
    return { ...this.option };
  }

  /**
   * 设置选项
   */
  setOption(option: Partial<ConstraintOption>): void {
    this.option = { ...this.option, ...option };
  }
}
