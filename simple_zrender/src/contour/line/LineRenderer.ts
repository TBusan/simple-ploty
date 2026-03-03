import type { PathInfo, ColorScale } from '../../types/types';
import { smoothOpen, smoothClosed } from './Smoothing';
import { ColorMapper } from '../fill/ColorMapper';

/**
 * 线条渲染选项
 */
export interface LineRenderOption {
  /** 线条颜色 */
  color: string;
  /** 线条宽度 */
  width: number;
  /** 虚线模式 */
  dash: number[];
  /** 平滑参数 */
  smoothing: number;
  /** 是否使用彩色线条 */
  useColorScale: boolean;
  /** 色阶 */
  colorscale: string | ColorScale[];
  /** 是否反转色阶 */
  reversescale: boolean;
  /** 数据最小值 */
  zmin: number;
  /** 数据最大值 */
  zmax: number;
}

/**
 * 线条渲染器
 * 负责渲染等值线的线条
 */
export class LineRenderer {
  private option: LineRenderOption;
  private colorMapper: ColorMapper | null = null;

  constructor(option: Partial<LineRenderOption> = {}) {
    this.option = {
      color: option.color || '#444444',
      width: option.width ?? 1,
      dash: option.dash || [],
      smoothing: option.smoothing ?? 1,
      useColorScale: option.useColorScale || false,
      colorscale: option.colorscale || 'Viridis',
      reversescale: option.reversescale || false,
      zmin: option.zmin ?? 0,
      zmax: option.zmax ?? 1
    };

    if (this.option.useColorScale) {
      this.colorMapper = new ColorMapper(
        this.option.colorscale,
        this.option.zmin,
        this.option.zmax,
        this.option.reversescale
      );
    }
  }

  /**
   * 渲染等值线条
   *
   * @param pathInfoList 路径信息列表
   * @returns SVG 路径数据数组
   */
  renderLines(
    pathInfoList: PathInfo[]
  ): Array<{ path: string; color: string; width: number; dash: number[] }> {
    const results: Array<{ path: string; color: string; width: number; dash: number[] }> = [];

    for (const pathInfo of pathInfoList) {
      const color = this.getLineColor(pathInfo.level);

      // 渲染边缘线条
      for (const edgePath of pathInfo.edgePaths) {
        const linePath = smoothOpen(edgePath, this.option.smoothing);
        if (linePath) {
          results.push({
            path: linePath,
            color,
            width: this.option.width,
            dash: this.option.dash
          });
        }
      }

      // 渲染闭合线条
      for (const path of pathInfo.paths) {
        const linePath = smoothClosed(path, this.option.smoothing);
        if (linePath) {
          results.push({
            path: linePath,
            color,
            width: this.option.width,
            dash: this.option.dash
          });
        }
      }
    }

    return results;
  }

  /**
   * 获取线条颜色
   *
   * @param level 等值线级别
   * @returns 颜色字符串
   */
  private getLineColor(level: number): string {
    if (this.colorMapper && this.option.useColorScale) {
      return this.colorMapper.getLineColor(level);
    }
    return this.option.color;
  }

  /**
   * 获取渲染选项
   */
  getOption(): LineRenderOption {
    return this.option;
  }
}
