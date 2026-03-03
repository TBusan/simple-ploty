import type { PathInfo, ColorScale } from '../../types/types';
import { ColorMapper } from './ColorMapper';
import { BoundaryHandler } from '../path/BoundaryHandler';

/**
 * 填充模式类型
 */
export type FillMode = 'fill' | 'heatmap' | 'lines' | 'none';

/**
 * 填充渲染选项
 */
export interface FillRenderOption {
  /** 着色模式 */
  coloring: FillMode;
  /** 色阶 */
  colorscale: string | ColorScale[];
  /** 是否反转色阶 */
  reversescale: boolean;
  /** 数据最小值 */
  zmin: number;
  /** 数据最大值 */
  zmax: number;
  /** 平滑参数 */
  smoothing: number;
}

/**
 * 填充渲染器
 * 负责渲染等值线的填充区域
 */
export class FillRenderer {
  private colorMapper: ColorMapper;
  private option: FillRenderOption;

  constructor(option: Partial<FillRenderOption> = {}) {
    this.option = {
      coloring: option.coloring || 'fill',
      colorscale: option.colorscale || 'Viridis',
      reversescale: option.reversescale || false,
      zmin: option.zmin ?? 0,
      zmax: option.zmax ?? 1,
      smoothing: option.smoothing ?? 1
    };

    this.colorMapper = new ColorMapper(
      this.option.colorscale,
      this.option.zmin,
      this.option.zmax,
      this.option.reversescale
    );
  }

  /**
   * 渲染填充区域
   *
   * @param pathInfoList 路径信息列表
   * @param gridData 网格数据
   * @returns SVG 路径数据数组
   */
  renderFill(
    pathInfoList: PathInfo[],
    gridData: { z: number[][], x: number[], y: number[] }
  ): Array<{ path: string; color: string; level: number }> {
    const results: Array<{ path: string; color: string; level: number }> = [];

    switch (this.option.coloring) {
      case 'fill':
        return this.renderFillMode(pathInfoList, gridData);
      case 'heatmap':
        return this.renderHeatmapMode(pathInfoList, gridData);
      case 'lines':
        return this.renderLinesMode(pathInfoList, gridData);
      case 'none':
        return this.renderNoneMode(pathInfoList, gridData);
      default:
        return results;
    }
  }

  /**
   * fill 模式：SVG path 填充
   */
  private renderFillMode(
    pathInfoList: PathInfo[],
    gridData: { z: number[][], x: number[], y: number[] }
  ): Array<{ path: string; color: string; level: number }> {
    const results: Array<{ path: string; color: string; level: number }> = [];

    // 计算边界
    const perimeter = BoundaryHandler.getPerimeter(
      gridData.x,
      gridData.y,
      x => x,
      y => y
    );

    for (const pathInfo of pathInfoList) {
      const color = this.colorMapper.getFillColor(pathInfo.level);
      const fullPath = BoundaryHandler.buildFillPath(
        pathInfo,
        perimeter,
        gridData.z,
        this.option.smoothing
      );

      if (fullPath) {
        results.push({
          path: fullPath,
          color,
          level: pathInfo.level
        });
      }
    }

    return results;
  }

  /**
   * heatmap 模式：渐变填充
   */
  private renderHeatmapMode(
    pathInfoList: PathInfo[],
    gridData: { z: number[][], x: number[], y: number[] }
  ): Array<{ path: string; color: string; level: number }> {
    // heatmap 模式使用渐变，这里简化处理
    // 实际实现需要创建渐变定义
    return this.renderFillMode(pathInfoList, gridData);
  }

  /**
   * lines 模式：彩色线条（不填充）
   */
  private renderLinesMode(
    _pathInfoList: PathInfo[],
    _gridData: { z: number[][], x: number[], y: number[] }
  ): Array<{ path: string; color: string; level: number }> {
    // lines 模式不填充，返回空数组
    return [];
  }

  /**
   * none 模式：单色
   */
  private renderNoneMode(
    pathInfoList: PathInfo[],
    gridData: { z: number[][], x: number[], y: number[] }
  ): Array<{ path: string; color: string; level: number }> {
    const results: Array<{ path: string; color: string; level: number }> = [];

    const perimeter = BoundaryHandler.getPerimeter(
      gridData.x,
      gridData.y,
      x => x,
      y => y
    );

    for (const pathInfo of pathInfoList) {
      const color = 'transparent';  // 无颜色填充
      const fullPath = BoundaryHandler.buildFillPath(
        pathInfo,
        perimeter,
        gridData.z,
        this.option.smoothing
      );

      if (fullPath) {
        results.push({
          path: fullPath,
          color,
          level: pathInfo.level
        });
      }
    }

    return results;
  }

  /**
   * 获取颜色映射器
   */
  getColorMapper(): ColorMapper {
    return this.colorMapper;
  }

  /**
   * 获取渲染选项
   */
  getOption(): FillRenderOption {
    return this.option;
  }
}
