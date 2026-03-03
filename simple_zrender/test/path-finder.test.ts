import { PathFinder } from '../src/contour/path/PathFinder';
import { Interpolation } from '../src/contour/path/Interpolation';
import { BoundaryHandler } from '../src/contour/path/BoundaryHandler';
import type { Perimeter } from '../src/contour/path/BoundaryHandler';
import type { GridData, PathInfo, Point } from '../src/types/types';

describe('Interpolation', () => {
  describe('linearInterp', () => {
    test('应该在 0-1 之间插值', () => {
      expect(Interpolation.linearInterp(0, 10, 5)).toBe(0.5);
      expect(Interpolation.linearInterp(0, 10, 0)).toBe(0);
      expect(Interpolation.linearInterp(0, 10, 10)).toBe(1);
    });

    test('应该处理相同值', () => {
      expect(Interpolation.linearInterp(5, 5, 5)).toBe(0.5);
    });

    test('应该限制在 0-1 范围内', () => {
      expect(Interpolation.linearInterp(0, 10, 15)).toBe(1);
      expect(Interpolation.linearInterp(0, 10, -5)).toBe(0);
    });
  });

  describe('horizontalCrossing', () => {
    test('应该计算水平边的穿越点', () => {
      const pt = Interpolation.horizontalCrossing(0, 10, 5, 0, 10, 5);
      expect(pt.x).toBe(5);
      expect(pt.y).toBe(5);
    });
  });

  describe('verticalCrossing', () => {
    test('应该计算垂直边的穿越点', () => {
      const pt = Interpolation.verticalCrossing(5, 0, 10, 0, 10, 5);
      expect(pt.x).toBe(5);
      expect(pt.y).toBe(5);
    });
  });

  describe('getEdgeMask', () => {
    test('case 0: 无穿越', () => {
      expect(Interpolation.getEdgeMask(0)).toBe(0);
    });

    test('case 1: 左 + 上', () => {
      expect(Interpolation.getEdgeMask(1)).toBe(3);
    });

    test('case 2: 上 + 右', () => {
      expect(Interpolation.getEdgeMask(2)).toBe(6);
    });

    test('鞍点 104/713: 上 + 下', () => {
      expect(Interpolation.getEdgeMask(104)).toBe(10);
      expect(Interpolation.getEdgeMask(713)).toBe(10);
    });

    test('鞍点 208/1114: 左 + 右', () => {
      expect(Interpolation.getEdgeMask(208)).toBe(5);
      expect(Interpolation.getEdgeMask(1114)).toBe(5);
    });
  });

  describe('坐标转换', () => {
    test('dataToPixel 应该正确转换', () => {
      const pt = Interpolation.dataToPixel(
        5, 5,
        [0, 10], [0, 10],
        [0, 0, 100, 100]
      );
      expect(pt.x).toBe(50);
      expect(pt.y).toBe(50);
    });

    test('pixelToData 应该正确转换', () => {
      const pt = Interpolation.pixelToData(
        50, 50,
        [0, 10], [0, 10],
        [0, 0, 100, 100]
      );
      expect(pt.x).toBe(5);
      expect(pt.y).toBe(5);
    });
  });
});

describe('BoundaryHandler', () => {
  describe('getPerimeter', () => {
    test('应该计算正确的边界', () => {
      const x = [0, 1, 2];
      const y = [0, 1, 2];
      const xToPixel = (v: number) => v * 100;
      const yToPixel = (v: number) => v * 100;

      const perimeter = BoundaryHandler.getPerimeter(x, y, xToPixel, yToPixel);

      expect(perimeter.topLeft).toEqual([0, 200]);
      expect(perimeter.topRight).toEqual([200, 200]);
      expect(perimeter.bottomRight).toEqual([200, 0]);
      expect(perimeter.bottomLeft).toEqual([0, 0]);
    });
  });

  describe('boundaryPath', () => {
    test('应该生成正确的边界路径', () => {
      const perimeter: Perimeter = {
        topLeft: [0, 0],
        topRight: [100, 0],
        bottomRight: [100, 100],
        bottomLeft: [0, 100]
      };

      const path = BoundaryHandler.boundaryPath(perimeter);
      expect(path).toBe('M0,0L100,0L100,100L0,100Z');
    });
  });

  describe('joinAllPaths', () => {
    test('应该连接边缘路径', () => {
      const edgePaths: Point[][] = [
        [{ x: 0, y: 50 }, { x: 50, y: 0 }],  // 从左到上
        [{ x: 100, y: 50 }, { x: 50, y: 0 }] // 从右到上
      ];
      const perimeter = {
        topLeft: [0, 0] as [number, number],
        topRight: [100, 0] as [number, number],
        bottomRight: [100, 100] as [number, number],
        bottomLeft: [0, 100] as [number, number]
      };

      const result = BoundaryHandler.joinAllPaths(edgePaths, perimeter);
      expect(result).toContain('M');
      expect(result).toContain('Z');
    });

    test('空路径应返回空字符串', () => {
      const perimeter = {
        topLeft: [0, 0] as [number, number],
        topRight: [100, 0] as [number, number],
        bottomRight: [100, 100] as [number, number],
        bottomLeft: [0, 100] as [number, number]
      };

      const result = BoundaryHandler.joinAllPaths([], perimeter);
      expect(result).toBe('');
    });
  });

  describe('needsPrefixBoundary', () => {
    test('有边缘路径时应返回 false', () => {
      const z = [[5, 5], [5, 5]];
      const edgePaths: Point[][] = [[{ x: 0, y: 0 }]];

      expect(BoundaryHandler.needsPrefixBoundary(z, 3, edgePaths)).toBe(false);
    });

    test('边界值 > level 且无边缘路径时应返回 true', () => {
      const z = [[5, 5], [5, 5]];

      expect(BoundaryHandler.needsPrefixBoundary(z, 3, [])).toBe(true);
      expect(BoundaryHandler.needsPrefixBoundary(z, 10, [])).toBe(false);
    });
  });

  describe('buildFillPath', () => {
    test('应该构建完整的填充路径', () => {
      const pathInfo: PathInfo = {
        level: 3,
        crossings: new Map(),
        starts: [],
        edgePaths: [
          [{ x: 0, y: 50 }, { x: 50, y: 0 }],
          [{ x: 100, y: 50 }, { x: 50, y: 0 }]
        ],
        paths: []
      };
      const perimeter = {
        topLeft: [0, 0] as [number, number],
        topRight: [100, 0] as [number, number],
        bottomRight: [100, 100] as [number, number],
        bottomLeft: [0, 100] as [number, number]
      };
      const z = [[5, 5], [5, 5]];

      const result = BoundaryHandler.buildFillPath(pathInfo, perimeter, z);
      expect(result).toContain('M');
    });
  });

  describe('closeBoundaries', () => {
    test('应该闭合边界路径', () => {
      const edgePaths: Point[][] = [
        [{ x: 0, y: 50 }, { x: 50, y: 0 }]
      ];
      const perimeter = {
        topLeft: [0, 0] as [number, number],
        topRight: [100, 0] as [number, number],
        bottomRight: [100, 100] as [number, number],
        bottomLeft: [0, 100] as [number, number]
      };

      const result = BoundaryHandler.closeBoundaries(edgePaths, perimeter);
      expect(result[0].length).toBeGreaterThan(edgePaths[0].length);
    });
  });
});

describe('PathFinder', () => {
  let gridData: GridData;
  let pathInfo: PathInfo;

  beforeEach(() => {
    gridData = {
      z: [
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5]
      ],
      x: [0, 1, 2],
      y: [0, 1, 2]
    };

    pathInfo = {
      level: 2.5,
      crossings: new Map([
        ['0,0', 6],
        ['1,0', 3],
        ['0,1', 12],
        ['1,1', 9]
      ]),
      starts: [[0, 0]],
      edgePaths: [],
      paths: []
    };
  });

  describe('constructor', () => {
    test('应该正确初始化', () => {
      const finder = new PathFinder(gridData, pathInfo);
      expect(finder).toBeDefined();
    });
  });

  describe('findAllPaths', () => {
    test('应该追踪所有路径', () => {
      const finder = new PathFinder(gridData, pathInfo);
      const result = finder.findAllPaths();

      expect(result).toBeDefined();
      expect(result.edgePaths).toBeDefined();
      expect(result.paths).toBeDefined();
    });

    test('应该消耗所有穿越点', () => {
      const finder = new PathFinder(gridData, pathInfo);
      const result = finder.findAllPaths();

      // 穿越点应该被处理完
      expect(result.edgePaths.length + result.paths.length).toBeGreaterThan(0);
    });
  });
});
