import * as zrender from 'zrender';
import type { ContourOption, GridData } from './ContourOption';
import type { Point, PathInfo } from '../types/types';
import { MarchingSquares } from './marching-squares/MarchingSquares';
import { PathFinder } from './path/PathFinder';
import { ColorMapper } from './fill/ColorMapper';

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
export class Contour extends zrender.Group {
  private option: ContourOption;
  private gridData: GridData;
  private colorMapper: ColorMapper;
  private levels: number[] = [];
  private _scaleX: number = 1;
  private _scaleY: number = 1;
  private _offsetX: number = 0;
  private _offsetY: number = 0;

  constructor(option: ContourOption) {
    super();
    this.option = this.mergeDefaultOption(option);
    this.gridData = this.prepareGridData(option);
    this.computeScale();
    this.colorMapper = this.createColorMapper();
    this.levels = this.computeLevels();
    this.render();
  }

  /**
   * 计算缩放参数
   */
  private computeScale(): void {
    const { width, height } = this.option;
    const nx = this.gridData.x.length;
    const ny = this.gridData.y.length;

    // 数据坐标范围
    const dataXMin = this.gridData.x[0];
    const dataXMax = this.gridData.x[nx - 1];
    const dataYMin = this.gridData.y[0];
    const dataYMax = this.gridData.y[ny - 1];

    const dataWidth = dataXMax - dataXMin;
    const dataHeight = dataYMax - dataYMin;

    if (width !== undefined && height !== undefined) {
      // 使用指定的宽高
      this._scaleX = width / dataWidth;
      this._scaleY = height / dataHeight;
      this._offsetX = -dataXMin * this._scaleX;
      this._offsetY = -dataYMin * this._scaleY;
    } else {
      // 默认使用数据坐标
      this._scaleX = 1;
      this._scaleY = 1;
      this._offsetX = 0;
      this._offsetY = 0;
    }
  }

  /**
   * 转换数据坐标到画布坐标
   */
  private toCanvasX(x: number): number {
    return this._offsetX + x * this._scaleX;
  }

  private toCanvasY(y: number): number {
    return this._offsetY + y * this._scaleY;
  }

  /**
   * 合并默认配置
   */
  private mergeDefaultOption(option: ContourOption): ContourOption {
    const zmin = option.zmin ?? this.computeZMin(option.z);
    const zmax = option.zmax ?? this.computeZMax(option.z);

    return {
      ...option,
      zmin,
      zmax,
      contours: {
        coloring: 'fill',
        showlines: true,
        showlabels: false,
        ...option.contours
      },
      line: {
        color: '#555',
        width: 1,
        smoothing: 1,
        ...option.line
      },
      colorscale: option.colorscale || 'Viridis',
      reversescale: option.reversescale || false
    };
  }

  /**
   * 计算数据最小值
   */
  private computeZMin(z: number[][]): number {
    let min = Infinity;
    for (const row of z) {
      for (const val of row) {
        if (val !== null && val < min) min = val;
      }
    }
    return min === Infinity ? 0 : min;
  }

  /**
   * 计算数据最大值
   */
  private computeZMax(z: number[][]): number {
    let max = -Infinity;
    for (const row of z) {
      for (const val of row) {
        if (val !== null && val > max) max = val;
      }
    }
    return max === -Infinity ? 1 : max;
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
   * 创建颜色映射器
   */
  private createColorMapper(): ColorMapper {
    return new ColorMapper(
      this.option.colorscale || 'Viridis',
      this.option.zmin ?? 0,
      this.option.zmax ?? 1,
      this.option.reversescale || false
    );
  }

  /**
   * 计算等值线级别
   */
  private computeLevels(): number[] {
    const { start, end, size, ncontours } = this.option.contours || {};
    const zmin = this.option.zmin ?? 0;
    const zmax = this.option.zmax ?? 1;

    // 如果指定了 start, end, size
    if (start !== undefined && end !== undefined && size !== undefined) {
      const levels: number[] = [];
      for (let l = start; l <= end + 0.0001; l += size) {
        levels.push(l);
      }
      return levels;
    }

    // 如果指定了 ncontours
    const count = ncontours || 10;
    const step = (zmax - zmin) / (count + 1);
    const levels: number[] = [];
    for (let i = 1; i <= count; i++) {
      levels.push(zmin + step * i);
    }
    return levels;
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
   * 获取等值线级别
   */
  getLevels(): number[] {
    return this.levels;
  }

  /**
   * 渲染等值线
   */
  render(): void {
    const coloring = this.option.contours?.coloring || 'fill';
    const showlines = this.option.contours?.showlines ?? true;

    // 计算等值线
    const ms = new MarchingSquares(this.gridData, this.levels);
    const levelInfo = ms.computeLevels();

    // 根据着色模式渲染
    if (coloring === 'fill' || coloring === 'heatmap') {
      this.renderFill(levelInfo);
    }

    if (coloring === 'lines' || coloring === 'none' || showlines) {
      this.renderLines(levelInfo);
    }
  }

  /**
   * 渲染填充区域
   */
  private renderFill(levelInfo: Map<number, PathInfo>): void {
    const nx = this.gridData.x.length;
    const ny = this.gridData.y.length;

    // 数据坐标边界
    const xMin = this.gridData.x[0];
    const xMax = this.gridData.x[nx - 1];
    const yMin = this.gridData.y[0];
    const yMax = this.gridData.y[ny - 1];

    // 边界角落（顺时针：左下、右下、右上、左上）- 使用数据坐标
    const corners = [
      { x: xMin, y: yMin },
      { x: xMax, y: yMin },
      { x: xMax, y: yMax },
      { x: xMin, y: yMax }
    ];

    // 获取点所在边的索引
    const getEdgeIndex = (p: Point): number => {
      const eps = 0.01 * Math.max(xMax - xMin, yMax - yMin);
      if (Math.abs(p.y - yMin) < eps) return 0; // 下边
      if (Math.abs(p.x - xMax) < eps) return 1; // 右边
      if (Math.abs(p.y - yMax) < eps) return 2; // 上边
      if (Math.abs(p.x - xMin) < eps) return 3; // 左边
      return -1;
    };

    // 渲染底层矩形
    const baseColor = this.colorMapper.getFillColor(this.option.zmin ?? 0);
    this.add(new zrender.Rect({
      shape: {
        x: this.toCanvasX(xMin),
        y: this.toCanvasY(yMin),
        width: this.toCanvasX(xMax) - this.toCanvasX(xMin),
        height: this.toCanvasY(yMax) - this.toCanvasY(yMin)
      },
      style: { fill: baseColor, stroke: 'none' },
      z: 0
    }));

    // 从外到内渲染填充
    for (let i = this.levels.length - 1; i >= 0; i--) {
      const level = this.levels[i];
      const info = levelInfo.get(level);
      if (!info) continue;

      const finder = new PathFinder(this.gridData, info);
      const result = finder.findAllPaths();
      const color = this.colorMapper.getFillColor(level);

      // 渲染内部闭合路径
      for (const path of result.paths) {
        if (path.length < 3) continue;
        const points = path.map(p => [this.toCanvasX(p.x), this.toCanvasY(p.y)]);
        this.add(new zrender.Polygon({
          shape: { points },
          style: { fill: color, stroke: 'none' },
          z: i + 1
        }));
      }

      // 渲染边界路径
      for (const path of result.edgePaths) {
        if (path.length < 2) continue;

        const start = path[0];
        const end = path[path.length - 1];
        const startEdge = getEdgeIndex(start);
        const endEdge = getEdgeIndex(end);

        const boundaryPoints: number[][] = path.map(p => [this.toCanvasX(p.x), this.toCanvasY(p.y)]);

        if (startEdge >= 0 && endEdge >= 0) {
          let edge = startEdge;
          while (edge !== endEdge) {
            edge = (edge + 1) % 4;
            const corner = corners[edge];
            boundaryPoints.push([this.toCanvasX(corner.x), this.toCanvasY(corner.y)]);
          }
        }

        this.add(new zrender.Polygon({
          shape: { points: boundaryPoints },
          style: { fill: color, stroke: 'none' },
          z: i + 1
        }));
      }
    }
  }

  /**
   * 渲染线条
   */
  private renderLines(levelInfo: Map<number, PathInfo>): void {
    const smoothing = this.option.line?.smoothing ?? 1;
    const width = this.option.line?.width ?? 1;
    const useColorScale = this.option.contours?.coloring === 'lines';
    const showLabels = this.option.contours?.showlabels ?? false;

    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      const info = levelInfo.get(level);
      if (!info) continue;

      const finder = new PathFinder(this.gridData, info);
      const result = finder.findAllPaths();
      const color = useColorScale
        ? this.colorMapper.getLineColor(level)
        : (this.option.line?.color || '#555');

      // 渲染边缘线条
      for (const path of result.edgePaths) {
        if (path.length < 2) continue;
        const points = this.smoothPath(path, smoothing, false);
        this.add(new zrender.Polyline({
          shape: { points },
          style: { stroke: color, lineWidth: width, fill: 'none' }
        }));

        // 渲染标签
        if (showLabels) {
          this.renderLabel(path, level, color);
        }
      }

      // 渲染闭合线条
      for (const path of result.paths) {
        if (path.length < 2) continue;
        const points = this.smoothPath(path, smoothing, true);
        this.add(new zrender.Polyline({
          shape: { points },
          style: { stroke: color, lineWidth: width, fill: 'none' }
        }));

        // 渲染标签
        if (showLabels) {
          this.renderLabel(path, level, color);
        }
      }
    }
  }

  /**
   * 渲染等值线标签
   */
  private renderLabel(path: Point[], level: number, color: string): void {
    if (path.length < 3) return;

    // 找到路径的中点位置放置标签
    const midIndex = Math.floor(path.length / 2);
    const p = path[midIndex];
    const x = this.toCanvasX(p.x);
    const y = this.toCanvasY(p.y);

    // 格式化标签文本
    const labelText = typeof level === 'number' ? level.toFixed(2) : String(level);

    this.add(new zrender.Text({
      style: {
        text: labelText,
        x,
        y,
        fill: color,
        stroke: '#fff',
        lineWidth: 2,
        fontSize: 11,
        fontWeight: 'bold'
      },
      z: 1000  // 确保标签在线条上方
    }));
  }

  /**
   * 平滑路径（简化版 Catmull-Rom）
   */
  private smoothPath(pts: Point[], smoothing: number, closed: boolean): number[][] {
    if (smoothing === 0 || pts.length < 3) {
      const points = pts.map(p => [this.toCanvasX(p.x), this.toCanvasY(p.y)]);
      if (closed && points.length > 0) {
        points.push(points[0]);
      }
      return points;
    }

    // 简化实现：直接返回原始点（但使用画布坐标）
    const points = pts.map(p => [this.toCanvasX(p.x), this.toCanvasY(p.y)]);
    if (closed && points.length > 0) {
      points.push(points[0]);
    }
    return points;
  }
}
