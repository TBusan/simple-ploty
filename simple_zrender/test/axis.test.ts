import { Axis, Axis2D } from '../src/contour/axis/Axis';
import { LogAxis } from '../src/contour/axis/LogAxis';
import {
  findEmpties,
  interpNullsWithMean,
  poissonInterpolate,
  connectGaps,
  isNull
} from '../src/util/interpolate';

describe('Axis', () => {
  describe('constructor', () => {
    test('应该使用默认选项', () => {
      const axis = new Axis();
      expect(axis.getType()).toBe('linear');
      expect(axis.isVisible()).toBe(true);
    });

    test('应该接受自定义选项', () => {
      const axis = new Axis({
        type: 'linear',
        visible: false,
        range: [0, 100],
        pixelRange: [0, 500]
      });

      expect(axis.getType()).toBe('linear');
      expect(axis.isVisible()).toBe(false);
      expect(axis.getRange()).toEqual([0, 100]);
      expect(axis.getPixelRange()).toEqual([0, 500]);
    });
  });

  describe('c2p', () => {
    test('应该正确转换数据坐标到像素坐标', () => {
      const axis = new Axis({
        range: [0, 10],
        pixelRange: [0, 100]
      });

      expect(axis.c2p(0)).toBe(0);
      expect(axis.c2p(5)).toBe(50);
      expect(axis.c2p(10)).toBe(100);
    });

    test('应该处理负值范围', () => {
      const axis = new Axis({
        range: [-10, 10],
        pixelRange: [0, 100]
      });

      expect(axis.c2p(-10)).toBe(0);
      expect(axis.c2p(0)).toBe(50);
      expect(axis.c2p(10)).toBe(100);
    });
  });

  describe('p2c', () => {
    test('应该正确转换像素坐标到数据坐标', () => {
      const axis = new Axis({
        range: [0, 10],
        pixelRange: [0, 100]
      });

      expect(axis.p2c(0)).toBe(0);
      expect(axis.p2c(50)).toBe(5);
      expect(axis.p2c(100)).toBe(10);
    });
  });

  describe('getTicks', () => {
    test('应该生成正确数量的刻度', () => {
      const axis = new Axis({ range: [0, 10] });
      const ticks = axis.getTicks(5);

      expect(ticks.length).toBe(5);
      expect(ticks[0]).toBe(0);
      expect(ticks[4]).toBe(10);
    });
  });

  describe('getTickLabels', () => {
    test('应该生成刻度标签', () => {
      const axis = new Axis({ range: [0, 10] });
      const ticks = axis.getTicks(3);
      const labels = axis.getTickLabels(ticks);

      expect(labels.length).toBe(3);
    });

    test('应该使用自定义格式化函数', () => {
      const axis = new Axis({ range: [0, 10] });
      const ticks = axis.getTicks(3);
      const labels = axis.getTickLabels(ticks, v => `${v.toFixed(1)} units`);

      expect(labels[0]).toBe('0.0 units');
    });
  });
});

describe('LogAxis', () => {
  describe('c2l 和 l2c', () => {
    test('应该正确转换对数', () => {
      const axis = new LogAxis({ range: [1, 100] });

      expect(axis.c2l(1)).toBe(0);
      expect(axis.c2l(10)).toBeCloseTo(1);
      expect(axis.c2l(100)).toBeCloseTo(2);

      expect(axis.l2c(0)).toBe(1);
      expect(axis.l2c(1)).toBe(10);
      expect(axis.l2c(2)).toBe(100);
    });

    test('应该处理非 10 底数', () => {
      const axis = new LogAxis({ range: [1, 100], logBase: Math.E });

      expect(axis.c2l(Math.E)).toBeCloseTo(1);
      expect(axis.l2c(1)).toBeCloseTo(Math.E);
    });

    test('负值应该返回 0 并警告', () => {
      const axis = new LogAxis();
      const result = axis.c2l(-1);
      expect(result).toBe(0);
    });
  });

  describe('c2p', () => {
    test('应该在对数刻度上转换', () => {
      const axis = new LogAxis({
        range: [1, 100],
        pixelRange: [0, 100]
      });

      expect(axis.c2p(1)).toBe(0);
      expect(axis.c2p(10)).toBe(50);
      expect(axis.c2p(100)).toBe(100);
    });
  });

  describe('p2c', () => {
    test('应该逆向转换对数刻度', () => {
      const axis = new LogAxis({
        range: [1, 100],
        pixelRange: [0, 100]
      });

      expect(axis.p2c(0)).toBe(1);
      expect(axis.p2c(50)).toBe(10);
      expect(axis.p2c(100)).toBe(100);
    });
  });

  describe('getMajorTicks', () => {
    test('应该返回 10 的幂次刻度', () => {
      const axis = new LogAxis({ range: [1, 1000] });
      const ticks = axis.getMajorTicks();

      expect(ticks).toContain(1);
      expect(ticks).toContain(10);
      expect(ticks).toContain(100);
      expect(ticks).toContain(1000);
    });
  });

  describe('getMinorTicks', () => {
    test('应该返回中间值刻度', () => {
      const axis = new LogAxis({ range: [1, 100] });
      const ticks = axis.getMinorTicks();

      expect(ticks.length).toBeGreaterThan(0);
    });
  });
});

describe('Axis2D', () => {
  describe('dataToPixel', () => {
    test('应该转换二维坐标', () => {
      const axis2d = new Axis2D(
        { range: [0, 10], pixelRange: [0, 100] },
        { range: [0, 10], pixelRange: [0, 100] }
      );

      const pt = axis2d.dataToPixel(5, 5);
      expect(pt.x).toBe(50);
      expect(pt.y).toBe(50);
    });
  });

  describe('pixelToData', () => {
    test('应该逆向转换二维坐标', () => {
      const axis2d = new Axis2D(
        { range: [0, 10], pixelRange: [0, 100] },
        { range: [0, 10], pixelRange: [0, 100] }
      );

      const pt = axis2d.pixelToData(50, 50);
      expect(pt.x).toBe(5);
      expect(pt.y).toBe(5);
    });
  });

  describe('getDataBounds', () => {
    test('应该返回数据边界', () => {
      const axis2d = new Axis2D(
        { range: [0, 10] },
        { range: [0, 20] }
      );

      const bounds = axis2d.getDataBounds();
      expect(bounds.x).toEqual([0, 10]);
      expect(bounds.y).toEqual([0, 20]);
    });
  });
});

describe('Null 数据处理', () => {
  describe('isNull', () => {
    test('应该检测 null 和 undefined', () => {
      expect(isNull(null)).toBe(true);
      expect(isNull(undefined)).toBe(true);
      expect(isNull(NaN)).toBe(true);
      expect(isNull(0)).toBe(false);
      expect(isNull(5)).toBe(false);
    });
  });

  describe('findEmpties', () => {
    test('应该找到所有空值位置', () => {
      const data = [
        [1, null, 3],
        [null, 5, null],
        [7, 8, 9]
      ];

      const empties = findEmpties(data);
      expect(empties.length).toBe(3);
      expect(empties).toContainEqual([1, 0]);
      expect(empties).toContainEqual([0, 1]);
      expect(empties).toContainEqual([2, 1]);
    });
  });

  describe('interpNullsWithMean', () => {
    test('应该用邻居平均值填充空值', () => {
      const data = [
        [1, null, 3],
        [4, 5, 6]
      ];

      const result = interpNullsWithMean(data);

      expect(result[0][0]).toBe(1);
      expect(result[0][1]).toBeGreaterThan(0);  // 应该被填充
      expect(result[0][2]).toBe(3);
    });
  });

  describe('poissonInterpolate', () => {
    test('应该迭代插值空值', () => {
      const data = [
        [1, null, 3],
        [null, null, null],
        [7, null, 9]
      ];

      const result = poissonInterpolate(data, 5);

      // 所有值都应该被填充
      for (let j = 0; j < result.length; j++) {
        for (let i = 0; i < result[j].length; i++) {
          expect(isNull(result[j][i])).toBe(false);
        }
      }
    });
  });

  describe('connectGaps', () => {
    test('应该处理空隙', () => {
      const data = [
        [1, null, 3],
        [4, 5, 6]
      ];

      const result = connectGaps(data, 0.5);

      expect(result.length).toBe(2);
      expect(result[0].length).toBe(3);
    });
  });
});
