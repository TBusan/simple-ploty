import type { ContourOption, GridData } from './ContourOption';

/**
 * 等值线主类
 *
 * 基于 ZRender 实现的等值线图，与 Plotly.js contour 功能兼容
 *
 * @example
 * ```typescript
 * import * as zrender from 'zrender';
 * import { Contour } from 'zrender-contour';
 *
 * const chart = zrender.init(document.getElementById('main'));
 * const contour = new Contour({
 *   z: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
 *   x: [0, 1, 2],
 *   y: [0, 1, 2],
 *   contours: {
 *     coloring: 'fill',
 *     start: 1,
 *     end: 5,
 *     size: 1
 *   }
 * });
 * chart.add(contour);
 * ```
 */
export class Contour {
  private option: ContourOption;
  private gridData: GridData;

  constructor(option: ContourOption) {
    this.option = this.mergeDefaultOption(option);
    this.gridData = this.prepareGridData(option);
  }

  /**
   * 合并默认配置
   */
  private mergeDefaultOption(option: ContourOption): ContourOption {
    return {
      ...option,
      contours: {
        coloring: 'fill',
        showlines: true,
        showlabels: false,
        ...option.contours
      },
      line: {
        color: '#000',
        width: 1,
        smoothing: 1,
        ...option.line
      }
    };
  }

  /**
   * 准备网格数据
   */
  private prepareGridData(option: ContourOption): GridData {
    const { z, x, y } = option;
    const nx = z[0]?.length || 0;
    const ny = z.length;

    return {
      z,
      x: x || Array.from({ length: nx }, (_, i) => i),
      y: y || Array.from({ length: ny }, (_, i) => i)
    };
  }

  /**
   * 获取配置选项
   */
  getOption(): ContourOption {
    return this.option;
  }

  /**
   * 获取网格数据
   */
  getGridData(): GridData {
    return this.gridData;
  }

  /**
   * 渲染等值线
   */
  render(): void {
    // TODO: 实现渲染逻辑
    console.log('Contour render - to be implemented');
  }
}
