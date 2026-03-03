import type { Point, GridData, ContourLevel, ColorScale } from '../types/types';

/**
 * 等值线配置选项
 */
export interface ContourOption {
  /** 数据 */
  z: number[][];
  /** x 坐标（可选） */
  x?: number[];
  /** y 坐标（可选） */
  y?: number[];

  /** 宽度（像素，可选，默认为容器宽度） */
  width?: number;
  /** 高度（像素，可选，默认为容器高度） */
  height?: number;

  /** 等值线配置 */
  contours?: {
    /** 着色模式 */
    coloring?: 'fill' | 'heatmap' | 'lines' | 'none';
    /** 是否显示线条 */
    showlines?: boolean;
    /** 是否显示标签 */
    showlabels?: boolean;
    /** 起始级别 */
    start?: number;
    /** 结束级别 */
    end?: number;
    /** 级别间隔 */
    size?: number;
    /** 等值线数量 */
    ncontours?: number;
  };

  /** 色阶 */
  colorscale?: string | ColorScale[];
  /** 是否反转色阶 */
  reversescale?: boolean;
  /** 最小值 */
  zmin?: number;
  /** 最大值 */
  zmax?: number;

  /** 线条配置 */
  line?: {
    /** 线条颜色 */
    color?: string;
    /** 线条宽度 */
    width?: number;
    /** 虚线模式 */
    dash?: number[];
    /** 平滑参数 [0, 1.3] */
    smoothing?: number;
  };

  /** 颜色条配置 */
  colorbar?: ColorBarOption;

  /** x 轴配置 */
  xaxis?: AxisOption;
  /** y 轴配置 */
  yaxis?: AxisOption;
}

/**
 * 颜色条配置
 */
export interface ColorBarOption {
  /** 标题 */
  title?: {
    text: string;
  };
  /** 长度（相对于绘图区域） */
  len?: number;
  /** 厚度（像素） */
  thickness?: number;
}

/**
 * 坐标轴配置
 */
export interface AxisOption {
  /** 轴类型 */
  type?: 'linear' | 'log';
  /** 是否显示 */
  visible?: boolean;
  /** 范围 */
  range?: [number, number];
}

// 重新导出类型
export type { Point, GridData, ContourLevel, ColorScale };
