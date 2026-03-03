/**
 * 基础类型定义
 */

/**
 * 点坐标
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 网格数据
 */
export interface GridData {
  /** 数据矩阵 */
  z: number[][];
  /** x 坐标 */
  x: number[];
  /** y 坐标 */
  y: number[];
}

/**
 * 等值线级别（路径信息）
 */
export interface ContourLevel {
  /** 等值线级别 */
  level: number;
  /** 穿越点 */
  crossings: Map<string, number>;
  /** 边界起点 */
  starts: [number, number][];
  /** 边缘路径 */
  edgePaths: Point[][];
  /** 闭合路径 */
  paths: Point[][];
}

/**
 * 路径信息（ContourLevel 的别名）
 */
export type PathInfo = ContourLevel;

/**
 * 网格单元
 */
export interface GridCell {
  /** 网格 x 索引 */
  x: number;
  /** 网格 y 索引 */
  y: number;
  /** 四个角点的值 [左上, 右上, 右下, 左下] */
  corners: [number, number, number, number];
}

/**
 * 穿越点信息
 */
export interface CrossingInfo {
  /** "x,y" 格式的位置标识 */
  loc: string;
  /** Marching Index (0-15 或鞍点编码) */
  index: number;
  /** 是否为鞍点 */
  isSaddle: boolean;
}

/**
 * 颜色范围
 */
export interface ColorScale {
  /** 值范围 [0, 1] */
  value: number;
  /** 颜色 */
  color: string;
}
