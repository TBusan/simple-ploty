import { ColorMapper, COLOR_SCALES } from '../src/contour/fill/ColorMapper';
import { FillRenderer } from '../src/contour/fill/FillRenderer';
import { LineRenderer } from '../src/contour/line/LineRenderer';
import type { PathInfo, ColorScale } from '../src/types/types';

describe('ColorMapper', () => {
  describe('预定义色阶', () => {
    test('应该包含 Viridis 色阶', () => {
      expect(COLOR_SCALES.Viridis).toBeDefined();
      expect(COLOR_SCALES.Viridis.length).toBe(5);
    });

    test('应该包含 Jet 色阶', () => {
      expect(COLOR_SCALES.Jet).toBeDefined();
      expect(COLOR_SCALES.Jet.length).toBe(7);
    });
  });

  describe('constructor', () => {
    test('应该接受预定义色阶名称', () => {
      const mapper = new ColorMapper('Viridis', 0, 10);
      expect(mapper).toBeDefined();
    });

    test('应该接受自定义色阶', () => {
      const customScale: ColorScale[] = [
        { value: 0, color: '#000000' },
        { value: 1, color: '#ffffff' }
      ];
      const mapper = new ColorMapper(customScale, 0, 10);
      expect(mapper).toBeDefined();
    });

    test('未知色阶应使用 Viridis', () => {
      const mapper = new ColorMapper('Unknown', 0, 10);
      expect(mapper.getColorScale()).toEqual(COLOR_SCALES.Viridis);
    });
  });

  describe('makeColorMap', () => {
    test('应该返回颜色映射函数', () => {
      const mapper = new ColorMapper('Viridis', 0, 10);
      const colorMap = mapper.makeColorMap();

      expect(typeof colorMap).toBe('function');
      expect(colorMap(0)).toBe(COLOR_SCALES.Viridis[0].color);
      expect(colorMap(10)).toBe(COLOR_SCALES.Viridis[4].color);
    });
  });

  describe('getColor', () => {
    test('应该返回边界颜色', () => {
      const mapper = new ColorMapper('Viridis', 0, 10);

      expect(mapper.getFillColor(0)).toBe(COLOR_SCALES.Viridis[0].color);
      expect(mapper.getFillColor(10)).toBe(COLOR_SCALES.Viridis[4].color);
    });

    test('应该插值中间颜色', () => {
      const customScale: ColorScale[] = [
        { value: 0, color: '#000000' },
        { value: 1, color: '#ffffff' }
      ];
      const mapper = new ColorMapper(customScale, 0, 10);

      const color5 = mapper.getFillColor(5);
      // 中间值应该在两个颜色之间
      expect(color5).not.toBe('#000000');
      expect(color5).not.toBe('#ffffff');
    });

    test('应该限制值在范围内', () => {
      const mapper = new ColorMapper('Viridis', 0, 10);

      expect(mapper.getFillColor(-5)).toBe(COLOR_SCALES.Viridis[0].color);
      expect(mapper.getFillColor(15)).toBe(COLOR_SCALES.Viridis[4].color);
    });
  });

  describe('reversescale', () => {
    test('反转色阶应该交换颜色', () => {
      const mapperNormal = new ColorMapper('Viridis', 0, 10, false);
      const mapperReverse = new ColorMapper('Viridis', 0, 10, true);

      const color10 = mapperReverse.getFillColor(0);

      expect(color10).toBe(mapperNormal.getFillColor(10));
    });
  });

  describe('getDataRange', () => {
    test('应该返回数据范围', () => {
      const mapper = new ColorMapper('Viridis', 0, 10);
      const range = mapper.getDataRange();

      expect(range).toEqual([0, 10]);
    });
  });
});

describe('FillRenderer', () => {
  let pathInfoList: PathInfo[];
  let gridData: { z: number[][], x: number[], y: number[] };

  beforeEach(() => {
    pathInfoList = [
      {
        level: 3,
        crossings: new Map(),
        starts: [],
        edgePaths: [
          [{ x: 0, y: 0.5 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }]
        ],
        paths: [
          [{ x: 0.5, y: 0.3 }, { x: 0.7, y: 0.5 }, { x: 0.5, y: 0.7 }, { x: 0.3, y: 0.5 }]
        ]
      }
    ];

    gridData = {
      z: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
      x: [0, 0.5, 1],
      y: [0, 0.5, 1]
    };
  });

  describe('constructor', () => {
    test('应该使用默认选项', () => {
      const renderer = new FillRenderer();
      const option = renderer.getOption();

      expect(option.coloring).toBe('fill');
      expect(option.smoothing).toBe(1);
    });

    test('应该接受自定义选项', () => {
      const renderer = new FillRenderer({
        coloring: 'heatmap',
        smoothing: 0.5
      });
      const option = renderer.getOption();

      expect(option.coloring).toBe('heatmap');
      expect(option.smoothing).toBe(0.5);
    });
  });

  describe('renderFill', () => {
    test('fill 模式应该返回路径数据', () => {
      const renderer = new FillRenderer({ coloring: 'fill' });
      const results = renderer.renderFill(pathInfoList, gridData);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toContain('M');
    });

    test('none 模式应该返回透明色', () => {
      const renderer = new FillRenderer({ coloring: 'none' });
      const results = renderer.renderFill(pathInfoList, gridData);

      expect(results.every(r => r.color === 'transparent')).toBe(true);
    });

    test('lines 模式应该返回空数组', () => {
      const renderer = new FillRenderer({ coloring: 'lines' });
      const results = renderer.renderFill(pathInfoList, gridData);

      expect(results.length).toBe(0);
    });
  });

  describe('getColorMapper', () => {
    test('应该返回颜色映射器', () => {
      const renderer = new FillRenderer();
      const mapper = renderer.getColorMapper();

      expect(mapper).toBeInstanceOf(ColorMapper);
    });
  });
});

describe('LineRenderer', () => {
  let pathInfoList: PathInfo[];

  beforeEach(() => {
    pathInfoList = [
      {
        level: 3,
        crossings: new Map(),
        starts: [],
        edgePaths: [
          [{ x: 0, y: 0.5 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }]
        ],
        paths: [
          [{ x: 0.5, y: 0.3 }, { x: 0.7, y: 0.5 }, { x: 0.5, y: 0.7 }, { x: 0.3, y: 0.5 }]
        ]
      }
    ];
  });

  describe('constructor', () => {
    test('应该使用默认选项', () => {
      const renderer = new LineRenderer();
      const option = renderer.getOption();

      expect(option.color).toBe('#444444');
      expect(option.width).toBe(1);
      expect(option.smoothing).toBe(1);
    });

    test('应该接受自定义选项', () => {
      const renderer = new LineRenderer({
        color: '#ff0000',
        width: 2,
        smoothing: 0.5
      });
      const option = renderer.getOption();

      expect(option.color).toBe('#ff0000');
      expect(option.width).toBe(2);
      expect(option.smoothing).toBe(0.5);
    });
  });

  describe('renderLines', () => {
    test('应该返回线条路径数据', () => {
      const renderer = new LineRenderer();
      const results = renderer.renderLines(pathInfoList);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toContain('M');
    });

    test('应该使用正确的线条宽度', () => {
      const renderer = new LineRenderer({ width: 3 });
      const results = renderer.renderLines(pathInfoList);

      expect(results.every(r => r.width === 3)).toBe(true);
    });

    test('应该使用正确的颜色', () => {
      const renderer = new LineRenderer({ color: '#00ff00' });
      const results = renderer.renderLines(pathInfoList);

      expect(results.every(r => r.color === '#00ff00')).toBe(true);
    });

    test('彩色线条模式应该使用色阶', () => {
      const renderer = new LineRenderer({
        useColorScale: true,
        colorscale: 'Viridis',
        zmin: 0,
        zmax: 10
      });
      const results = renderer.renderLines(pathInfoList);

      // 应该使用色阶中的颜色
      expect(results.every(r => r.color !== '#444444')).toBe(true);
    });
  });
});

describe('填充与线条一致性', () => {
  test('填充和线条应该使用相同的平滑参数', () => {
    const smoothing = 0.8;

    const fillRenderer = new FillRenderer({ smoothing });
    const lineRenderer = new LineRenderer({ smoothing });

    expect(fillRenderer.getOption().smoothing).toBe(smoothing);
    expect(lineRenderer.getOption().smoothing).toBe(smoothing);
  });

  test('填充和线条应该使用相同的色阶', () => {
    const colorscale = 'Jet';
    const zmin = 0;
    const zmax = 10;

    const fillRenderer = new FillRenderer({ colorscale, zmin, zmax });
    const lineRenderer = new LineRenderer({
      useColorScale: true,
      colorscale,
      zmin,
      zmax
    });

    const fillColorMapper = fillRenderer.getColorMapper();
    // 验证 colorMapper 可用
    expect(fillColorMapper).toBeDefined();

    // 线条渲染器应该使用相同的色阶
    expect(lineRenderer.getOption().colorscale).toBe(colorscale);
  });
});
