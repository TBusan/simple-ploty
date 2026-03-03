import { LabelPlacer, LabelPosition } from '../src/contour/label/LabelPlacer';
import { CostFunction } from '../src/contour/label/CostFunction';
import { ColorBar } from '../src/contour/colorbar/ColorBar';
import { ColorMapper } from '../src/contour/fill/ColorMapper';
import type { PathInfo, Point } from '../src/types/types';

describe('LabelPlacer', () => {
  let placer: LabelPlacer;
  let pathInfo: PathInfo;

  beforeEach(() => {
    placer = new LabelPlacer();

    pathInfo = {
      level: 5,
      crossings: new Map(),
      starts: [],
      edgePaths: [
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 0 },
          { x: 3, y: 1 },
          { x: 4, y: 0 }
        ]
      ],
      paths: [
        [
          { x: 1, y: 0.5 },
          { x: 1.5, y: 1 },
          { x: 2, y: 0.5 },
          { x: 1.5, y: 0 }
        ]
      ]
    };
  });

  describe('constructor', () => {
    test('应该使用默认选项', () => {
      const option = placer.getOption();
      expect(option.show).toBe(true);
      expect(option.fontSize).toBe(12);
    });

    test('应该接受自定义选项', () => {
      const customPlacer = new LabelPlacer({
        show: false,
        fontSize: 16,
        color: '#ff0000'
      });
      const option = customPlacer.getOption();

      expect(option.show).toBe(false);
      expect(option.fontSize).toBe(16);
      expect(option.color).toBe('#ff0000');
    });
  });

  describe('findBestLocations', () => {
    test('应该返回标签位置', () => {
      const labels = placer.findBestLocations(pathInfo);
      expect(labels.length).toBeGreaterThan(0);
    });

    test('show=false 时不应该返回标签', () => {
      const hiddenPlacer = new LabelPlacer({ show: false });
      const labels = hiddenPlacer.findBestLocations(pathInfo);
      expect(labels.length).toBe(0);
    });

    test('标签应该包含正确的级别', () => {
      const labels = placer.findBestLocations(pathInfo);
      labels.forEach(label => {
        expect(label.level).toBe(5);
      });
    });
  });

  describe('calcCost', () => {
    test('应该计算成本', () => {
      const labels = placer.findBestLocations(pathInfo);
      if (labels.length > 0) {
        const path = pathInfo.edgePaths[0];
        const cost = placer.calcCost(labels[0], [], path);
        expect(cost).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('avoidOverlap', () => {
    test('应该移除重叠的标签', () => {
      const labels: LabelPosition[] = [
        {
          position: { x: 0, y: 0 },
          text: '1',
          rotation: 0,
          pathIndex: 0,
          level: 1
        },
        {
          position: { x: 5, y: 5 },
          text: '2',
          rotation: 0,
          pathIndex: 1,
          level: 2
        },
        {
          position: { x: 1, y: 1 },
          text: '3',
          rotation: 0,
          pathIndex: 2,
          level: 3
        }
      ];

      const result = placer.avoidOverlap(labels, 20);
      expect(result.length).toBeLessThan(labels.length);
    });
  });
});

describe('CostFunction', () => {
  let costFunction: CostFunction;
  let path: Point[];

  beforeEach(() => {
    costFunction = new CostFunction();
    path = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 4, y: 0 }
    ];
  });

  describe('calculateCurvatureCost', () => {
    test('应该计算曲率成本', () => {
      const cost = costFunction.calculateCurvatureCost(path, 2);
      expect(cost).toBeGreaterThanOrEqual(0);
      expect(cost).toBeLessThanOrEqual(1);
    });
  });

  describe('calculatePathPositionCost', () => {
    test('中间位置成本应该较低', () => {
      const midCost = costFunction.calculatePathPositionCost(path, 2);
      const endCost = costFunction.calculatePathPositionCost(path, 0);

      expect(midCost).toBeLessThan(endCost);
    });
  });

  describe('calculateOverlapCost', () => {
    test('无重叠时成本应该为 0', () => {
      const existingLabels: LabelPosition[] = [
        {
          position: { x: 100, y: 100 },
          text: '1',
          rotation: 0,
          pathIndex: 0,
          level: 1
        }
      ];

      const cost = costFunction.calculateOverlapCost(
        { x: 0, y: 0 },
        existingLabels
      );

      expect(cost).toBe(0);
    });

    test('有重叠时成本应该大于 0', () => {
      const existingLabels: LabelPosition[] = [
        {
          position: { x: 10, y: 10 },
          text: '1',
          rotation: 0,
          pathIndex: 0,
          level: 1
        }
      ];

      const cost = costFunction.calculateOverlapCost(
        { x: 0, y: 0 },
        existingLabels,
        50
      );

      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('calculateBoundaryCost', () => {
    test('边界附近成本应该较高', () => {
      const bounds: [number, number, number, number] = [0, 0, 100, 100];

      const nearBoundary = costFunction.calculateBoundaryCost(
        { x: 5, y: 50 },
        bounds
      );
      const farFromBoundary = costFunction.calculateBoundaryCost(
        { x: 50, y: 50 },
        bounds
      );

      expect(nearBoundary).toBeGreaterThan(farFromBoundary);
    });
  });

  describe('getWeights/setWeights', () => {
    test('应该获取和设置权重', () => {
      const weights = costFunction.getWeights();
      expect(weights.curvature).toBeDefined();

      costFunction.setWeights({ curvature: 20 });
      const newWeights = costFunction.getWeights();
      expect(newWeights.curvature).toBe(20);
    });
  });
});

describe('ColorBar', () => {
  let colorMapper: ColorMapper;
  let colorBar: ColorBar;

  beforeEach(() => {
    colorMapper = new ColorMapper('Viridis', 0, 10);
    colorBar = new ColorBar(colorMapper, {
      title: { text: 'Value' },
      len: 0.9,
      thickness: 20
    });
  });

  describe('constructor', () => {
    test('应该使用默认选项', () => {
      const defaultColorBar = new ColorBar(colorMapper);
      const option = defaultColorBar.getOption();

      expect(option.len).toBe(0.9);
      expect(option.thickness).toBe(20);
    });

    test('应该接受自定义选项', () => {
      const customColorBar = new ColorBar(colorMapper, {
        title: { text: 'Custom' },
        len: 0.8,
        thickness: 30
      });
      const option = customColorBar.getOption();

      expect(option.title.text).toBe('Custom');
      expect(option.len).toBe(0.8);
      expect(option.thickness).toBe(30);
    });
  });

  describe('render', () => {
    test('应该返回渲染数据', () => {
      const data = colorBar.render(500, 400);

      expect(data.barPath).toBeDefined();
      expect(data.gradientStops.length).toBeGreaterThan(0);
      expect(data.tickPositions.length).toBeGreaterThan(0);
      expect(data.tickLabels.length).toBeGreaterThan(0);
    });

    test('刻度数量应该正确', () => {
      const customColorBar = new ColorBar(colorMapper, { tickCount: 7 });
      const data = customColorBar.render(500, 400);

      expect(data.tickPositions.length).toBe(7);
      expect(data.tickLabels.length).toBe(7);
    });
  });

  describe('calcLevels', () => {
    test('应该计算级别颜色', () => {
      const levels = [0, 2, 4, 6, 8, 10];
      const result = colorBar.calcLevels(levels);

      expect(result.length).toBe(6);
      result.forEach(item => {
        expect(item.level).toBeDefined();
        expect(item.color).toBeDefined();
      });
    });
  });

  describe('setOption', () => {
    test('应该更新选项', () => {
      colorBar.setOption({ len: 0.5, thickness: 15 });
      const option = colorBar.getOption();

      expect(option.len).toBe(0.5);
      expect(option.thickness).toBe(15);
    });
  });

  describe('getColorMapper', () => {
    test('应该返回颜色映射器', () => {
      const mapper = colorBar.getColorMapper();
      expect(mapper).toBe(colorMapper);
    });
  });
});
