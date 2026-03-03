import type { ColorScale } from '../../types/types';

/**
 * 预定义色阶
 */
export const COLOR_SCALES: Record<string, ColorScale[]> = {
  Viridis: [
    { value: 0, color: '#440154' },
    { value: 0.25, color: '#3b528b' },
    { value: 0.5, color: '#21918c' },
    { value: 0.75, color: '#5ec962' },
    { value: 1, color: '#fde725' }
  ],
  Jet: [
    { value: 0, color: '#000080' },
    { value: 0.1, color: '#0000ff' },
    { value: 0.35, color: '#00ffff' },
    { value: 0.5, color: '#00ff00' },
    { value: 0.65, color: '#ffff00' },
    { value: 0.9, color: '#ff0000' },
    { value: 1, color: '#800000' }
  ],
  Hot: [
    { value: 0, color: '#000000' },
    { value: 0.33, color: '#ff0000' },
    { value: 0.66, color: '#ffff00' },
    { value: 1, color: '#ffffff' }
  ],
  Cool: [
    { value: 0, color: '#00ffff' },
    { value: 1, color: '#ff00ff' }
  ],
  Rainbow: [
    { value: 0, color: '#ff0000' },
    { value: 0.17, color: '#ff7f00' },
    { value: 0.33, color: '#ffff00' },
    { value: 0.5, color: '#00ff00' },
    { value: 0.67, color: '#0000ff' },
    { value: 0.83, color: '#4b0082' },
    { value: 1, color: '#9400d3' }
  ],
  Electric: [
    { value: 0, color: '#000000' },
    { value: 0.25, color: '#000080' },
    { value: 0.5, color: '#0080ff' },
    { value: 0.75, color: '#ffff00' },
    { value: 1, color: '#ffffff' }
  ],
  Greens: [
    { value: 0, color: '#f7fcf5' },
    { value: 0.5, color: '#74c476' },
    { value: 1, color: '#00441b' }
  ],
  Blues: [
    { value: 0, color: '#f7fbff' },
    { value: 0.5, color: '#6baed6' },
    { value: 1, color: '#08306b' }
  ],
  Reds: [
    { value: 0, color: '#fff5f0' },
    { value: 0.5, color: '#fb6a4a' },
    { value: 1, color: '#67000d' }
  ]
};

/**
 * 颜色映射器
 * 负责将数值映射到颜色
 */
export class ColorMapper {
  private colorScale: ColorScale[];
  private zmin: number;
  private zmax: number;
  private reverse: boolean;

  constructor(
    colorScale: string | ColorScale[],
    zmin: number,
    zmax: number,
    reverse: boolean = false
  ) {
    this.colorScale = this.resolveColorScale(colorScale);
    this.zmin = zmin;
    this.zmax = zmax;
    this.reverse = reverse;
  }

  /**
   * 解析色阶定义
   */
  private resolveColorScale(colorScale: string | ColorScale[]): ColorScale[] {
    if (typeof colorScale === 'string') {
      const predefined = COLOR_SCALES[colorScale];
      if (!predefined) {
        console.warn(`Unknown colorscale: ${colorScale}, using Viridis`);
        return COLOR_SCALES.Viridis;
      }
      return predefined;
    }
    return colorScale;
  }

  /**
   * 创建颜色映射函数
   *
   * @returns 颜色映射函数 (value: number) => string
   */
  makeColorMap(): (value: number) => string {
    return (value: number) => this.getColor(value);
  }

  /**
   * 获取填充颜色
   *
   * @param value 数据值
   * @returns 颜色字符串
   */
  getFillColor(value: number): string {
    return this.getColor(value);
  }

  /**
   * 获取线条颜色
   *
   * @param value 数据值
   * @returns 颜色字符串
   */
  getLineColor(value: number): string {
    return this.getColor(value);
  }

  /**
   * 根据数值获取颜色
   *
   * @param value 数据值
   * @returns 颜色字符串
   */
  private getColor(value: number): string {
    // 归一化到 [0, 1]
    let t = (value - this.zmin) / (this.zmax - this.zmin);
    t = Math.max(0, Math.min(1, t));

    // 反转色阶
    if (this.reverse) {
      t = 1 - t;
    }

    // 在色阶中查找
    return this.interpolateColor(t);
  }

  /**
   * 在色阶中插值颜色
   *
   * @param t 归一化值 [0, 1]
   * @returns 颜色字符串
   */
  private interpolateColor(t: number): string {
    const scale = this.colorScale;

    // 边界情况
    if (t <= scale[0].value) return scale[0].color;
    if (t >= scale[scale.length - 1].value) return scale[scale.length - 1].color;

    // 查找插值区间
    for (let i = 0; i < scale.length - 1; i++) {
      if (t >= scale[i].value && t <= scale[i + 1].value) {
        const localT = (t - scale[i].value) / (scale[i + 1].value - scale[i].value);
        return this.lerpColor(scale[i].color, scale[i + 1].color, localT);
      }
    }

    return scale[scale.length - 1].color;
  }

  /**
   * 线性插值两个颜色
   */
  private lerpColor(color1: string, color2: string, t: number): string {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
    const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
    const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);

    return this.rgbToHex(r, g, b);
  }

  /**
   * 十六进制转 RGB
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return [0, 0, 0];
    }
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }

  /**
   * RGB 转十六进制
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * 获取色阶中的所有颜色
   */
  getColorScale(): ColorScale[] {
    return this.colorScale;
  }

  /**
   * 获取数据范围
   */
  getDataRange(): [number, number] {
    return [this.zmin, this.zmax];
  }
}
