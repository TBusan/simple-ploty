import { MarchingSquares, getMarchingIndex } from '../src/contour/marching-squares';
import { SaddleHandler } from '../src/contour/marching-squares/SaddleHandler';
import type { GridData } from '../src/types/types';

describe('getMarchingIndex', () => {
  describe('基本情况 (0-15)', () => {
    test('case 0: 所有角点 > level', () => {
      expect(getMarchingIndex(5, [10, 10, 10, 10])).toBe(0);
    });

    test('case 1: 只有左上角 <= level', () => {
      expect(getMarchingIndex(5, [3, 10, 10, 10])).toBe(1);
    });

    test('case 2: 只有右上角 <= level', () => {
      expect(getMarchingIndex(5, [10, 3, 10, 10])).toBe(2);
    });

    test('case 3: 左上和右上 <= level', () => {
      expect(getMarchingIndex(5, [3, 3, 10, 10])).toBe(3);
    });

    test('case 4: 只有右下角 <= level', () => {
      expect(getMarchingIndex(5, [10, 10, 3, 10])).toBe(4);
    });

    test('case 6: 右上和右下 <= level', () => {
      expect(getMarchingIndex(5, [10, 3, 3, 10])).toBe(6);
    });

    test('case 7: 只有左下角 > level', () => {
      expect(getMarchingIndex(5, [3, 3, 3, 10])).toBe(7);
    });

    test('case 8: 只有左下角 <= level', () => {
      expect(getMarchingIndex(5, [10, 10, 10, 3])).toBe(8);
    });

    test('case 9: 左上和左下 <= level', () => {
      expect(getMarchingIndex(5, [3, 10, 10, 3])).toBe(9);
    });

    test('case 11: 只有右上角 > level', () => {
      // corners: [左上, 右上, 右下, 左下] = [<=, >, <=, <=] → 1+0+4+8=13
      // 但 case 11 的标准定义是 [<=, <=, >, <=] → 1+2+0+8=11
      // 测试描述与实际数据不一致，修正数据
      expect(getMarchingIndex(5, [3, 3, 10, 3])).toBe(11);
    });

    test('case 12: 左下和右下 <= level', () => {
      expect(getMarchingIndex(5, [10, 10, 3, 3])).toBe(12);
    });

    test('case 13: 只有右下角 > level', () => {
      // corners: [左上, 右上, 右下, 左下] = [<=, >, <=, <=] → 1+0+4+8=13
      expect(getMarchingIndex(5, [3, 10, 3, 3])).toBe(13);
    });

    test('case 14: 只有左上角 > level', () => {
      expect(getMarchingIndex(5, [10, 3, 3, 3])).toBe(14);
    });

    test('case 15: 所有角点 <= level (等价于 case 0)', () => {
      expect(getMarchingIndex(5, [3, 3, 3, 3])).toBe(0);
    });
  });

  describe('鞍点情况', () => {
    test('鞍点 case 5: avg > level → 104', () => {
      // case 5: [<=level, >level, <=level, >level] = [1, 5, 1, 5], avg = 3, level = 2 < avg
      expect(getMarchingIndex(2, [1, 5, 1, 5])).toBe(104);
    });

    test('鞍点 case 5: avg < level → 713', () => {
      // case 5: [<=level, >level, <=level, >level] = [1, 5, 1, 5], avg = 3, level = 4 > avg
      expect(getMarchingIndex(4, [1, 5, 1, 5])).toBe(713);
    });

    test('鞍点 case 10: avg > level → 208', () => {
      // case 10: [>level, <=level, >level, <=level] = [5, 1, 5, 1], avg = 3, level = 2 < avg
      expect(getMarchingIndex(2, [5, 1, 5, 1])).toBe(208);
    });

    test('鞍点 case 10: avg < level → 1114', () => {
      // case 10: [>level, <=level, >level, <=level] = [5, 1, 5, 1], avg = 3, level = 4 > avg
      expect(getMarchingIndex(4, [5, 1, 5, 1])).toBe(1114);
    });
  });
});

describe('SaddleHandler', () => {
  describe('disambiguateSaddle', () => {
    test('鞍点 case 5: 两个谷之间的峰 (104)', () => {
      // case 5: [<=level, >level, <=level, >level] = [1, 5, 1, 5]
      const corners: [number, number, number, number] = [1, 5, 1, 5];
      expect(SaddleHandler.disambiguateSaddle(corners, 2)).toBe(104);
    });

    test('鞍点 case 5: 两个峰之间的谷 (713)', () => {
      const corners: [number, number, number, number] = [1, 5, 1, 5];
      expect(SaddleHandler.disambiguateSaddle(corners, 4)).toBe(713);
    });

    test('鞍点 case 10: 两个谷之间的峰 (208)', () => {
      // case 10: [>level, <=level, >level, <=level] = [5, 1, 5, 1]
      const corners: [number, number, number, number] = [5, 1, 5, 1];
      expect(SaddleHandler.disambiguateSaddle(corners, 2)).toBe(208);
    });

    test('鞍点 case 10: 两个峰之间的谷 (1114)', () => {
      const corners: [number, number, number, number] = [5, 1, 5, 1];
      expect(SaddleHandler.disambiguateSaddle(corners, 4)).toBe(1114);
    });
  });

  describe('getSaddlePaths', () => {
    test('鞍点 104: 负梯度路径', () => {
      const [path1, path2] = SaddleHandler.getSaddlePaths(104, -1, 1);
      expect(path1).toBe(4);
      expect(path2).toBe(1);
    });

    test('鞍点 104: 正梯度路径', () => {
      const [path1, path2] = SaddleHandler.getSaddlePaths(104, 1, 1);
      expect(path1).toBe(1);
      expect(path2).toBe(4);
    });

    test('鞍点 208: 负梯度路径', () => {
      const [path1, path2] = SaddleHandler.getSaddlePaths(208, -1, 1);
      expect(path1).toBe(2);
      expect(path2).toBe(8);
    });

    test('鞍点 713: 正梯度路径', () => {
      const [path1, path2] = SaddleHandler.getSaddlePaths(713, 1, 1);
      expect(path1).toBe(13);
      expect(path2).toBe(7);
    });
  });

  describe('isSaddle', () => {
    test('鞍点编码应返回 true', () => {
      expect(SaddleHandler.isSaddle(104)).toBe(true);
      expect(SaddleHandler.isSaddle(208)).toBe(true);
      expect(SaddleHandler.isSaddle(713)).toBe(true);
      expect(SaddleHandler.isSaddle(1114)).toBe(true);
    });

    test('非鞍点编码应返回 false', () => {
      expect(SaddleHandler.isSaddle(0)).toBe(false);
      expect(SaddleHandler.isSaddle(5)).toBe(false);
      expect(SaddleHandler.isSaddle(10)).toBe(false);
      expect(SaddleHandler.isSaddle(15)).toBe(false);
    });
  });

  describe('isSaddleCase', () => {
    test('基础鞍点情况应返回 true', () => {
      expect(SaddleHandler.isSaddleCase(5)).toBe(true);
      expect(SaddleHandler.isSaddleCase(10)).toBe(true);
    });

    test('非鞍点情况应返回 false', () => {
      expect(SaddleHandler.isSaddleCase(0)).toBe(false);
      expect(SaddleHandler.isSaddleCase(1)).toBe(false);
      expect(SaddleHandler.isSaddleCase(15)).toBe(false);
    });
  });
});

describe('MarchingSquares', () => {
  let ms: MarchingSquares;
  let gridData: GridData;

  beforeEach(() => {
    // 3x3 网格数据
    gridData = {
      z: [
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5]
      ],
      x: [0, 1, 2],
      y: [0, 1, 2]
    };
    ms = new MarchingSquares(gridData, [2, 3, 4]);
  });

  describe('constructor', () => {
    test('应该正确初始化', () => {
      expect(ms).toBeDefined();
      expect(ms.getLevels()).toEqual([2, 3, 4]);
      expect(ms.getGridData()).toBe(gridData);
    });
  });

  describe('computeLevels', () => {
    test('应该计算所有级别的穿越点', () => {
      const result = ms.computeLevels();
      expect(result.size).toBe(3);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
      expect(result.has(4)).toBe(true);
    });

    test('应该正确识别边界起点', () => {
      const result = ms.computeLevels();
      const level2 = result.get(2);

      expect(level2).toBeDefined();
      expect(level2!.starts.length).toBeGreaterThan(0);
    });

    test('应该正确计算穿越点数量', () => {
      const result = ms.computeLevels();
      const level2 = result.get(2);

      expect(level2!.crossings.size).toBeGreaterThan(0);
    });
  });

  describe('computeLevel', () => {
    test('应该计算单个级别的穿越点', () => {
      const level3 = ms.computeLevel(3);

      expect(level3.level).toBe(3);
      expect(level3.crossings.size).toBeGreaterThan(0);
    });

    test('对于不存在的级别应返回空路径信息', () => {
      const level10 = ms.computeLevel(10);

      expect(level10.level).toBe(10);
      expect(level10.crossings.size).toBe(0);
      expect(level10.starts.length).toBe(0);
    });
  });

  describe('getGridCell', () => {
    test('应该返回正确的网格单元', () => {
      const cell = ms.getGridCell(0, 0);

      expect(cell.x).toBe(0);
      expect(cell.y).toBe(0);
      expect(cell.corners).toEqual([1, 2, 3, 2]);
    });
  });

  describe('边界情况', () => {
    test('单层网格', () => {
      const singleGrid: GridData = {
        z: [[1, 2], [2, 3]],
        x: [0, 1],
        y: [0, 1]
      };
      const singleMs = new MarchingSquares(singleGrid, [1.5]);
      const result = singleMs.computeLevels();

      expect(result.size).toBe(1);
      const level15 = result.get(1.5);
      expect(level15!.crossings.size).toBeGreaterThan(0);
    });

    test('空级别数组', () => {
      const emptyMs = new MarchingSquares(gridData, []);
      const result = emptyMs.computeLevels();

      expect(result.size).toBe(0);
    });
  });
});
