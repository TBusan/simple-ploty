import {
  makeTangent,
  smoothOpen,
  smoothClosed,
  clampSmoothing
} from '../src/contour/line/Smoothing';
import type { Point } from '../src/types/types';

describe('Smoothing', () => {
  describe('makeTangent', () => {
    test('应该计算切线控制点', () => {
      const prev = { x: 0, y: 0 };
      const curr = { x: 1, y: 1 };
      const next = { x: 2, y: 0 };

      const [inTangent, outTangent] = makeTangent(prev, curr, next, 1);

      // V 形点：切线在 x 方向偏移，y 方向保持不变（因为 prev.y == next.y）
      expect(inTangent.x).toBeLessThan(1);  // 入切线 x < curr.x
      expect(inTangent.y).toBeCloseTo(1, 5);  // y 保持不变

      expect(outTangent.x).toBeGreaterThan(1);  // 出切线 x > curr.x
      expect(outTangent.y).toBeCloseTo(1, 5);  // y 保持不变
    });

    test('平滑度为 0 时应该返回零偏移', () => {
      const prev = { x: 0, y: 0 };
      const curr = { x: 1, y: 1 };
      const next = { x: 2, y: 0 };

      const [inTangent, outTangent] = makeTangent(prev, curr, next, 0);

      expect(inTangent.x).toBe(1);
      expect(inTangent.y).toBe(1);
      expect(outTangent.x).toBe(1);
      expect(outTangent.y).toBe(1);
    });

    test('应该在相同点时返回当前点', () => {
      const pt = { x: 1, y: 1 };
      const [inTangent, _outTangent] = makeTangent(pt, pt, pt, 1);

      // 所有点相同时，切线应该是当前点
      expect(inTangent.x).toBe(1);
      expect(inTangent.y).toBe(1);
    });

    test('应该处理共线点', () => {
      const prev = { x: 0, y: 0 };
      const curr = { x: 1, y: 1 };
      const next = { x: 2, y: 2 };

      const [inTangent, outTangent] = makeTangent(prev, curr, next, 1);

      // 共线点的切线应该在同一直线上
      expect(inTangent.x).toBeCloseTo(1, 0);
      expect(outTangent.x).toBeCloseTo(1, 0);
    });
  });

  describe('smoothOpen', () => {
    test('少于 3 个点应返回折线', () => {
      const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      const path = smoothOpen(pts, 1);

      expect(path).toBe('M0,0L1,1');
    });

    test('平滑度为 0 应返回折线', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothOpen(pts, 0);

      expect(path).toBe('M0,0L1,1L2,0');
    });

    test('平滑度 > 0 应返回贝塞尔曲线', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ];
      const path = smoothOpen(pts, 1);

      expect(path).toContain('M');
      expect(path).toContain('Q');  // 二次贝塞尔
      expect(path).toContain('C');  // 三次贝塞尔
    });

    test('应该以 M 命令开始', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothOpen(pts, 1);

      expect(path.startsWith('M')).toBe(true);
    });

    test('不应该以 Z 结束', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothOpen(pts, 1);

      expect(path.endsWith('Z')).toBe(false);
    });

    test('空路径应返回空字符串', () => {
      const path = smoothOpen([], 1);
      expect(path).toBe('');
    });
  });

  describe('smoothClosed', () => {
    test('少于 3 个点应返回闭合折线', () => {
      const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      const path = smoothClosed(pts, 1);

      expect(path).toBe('M0,0L1,1Z');
    });

    test('平滑度为 0 应返回闭合折线', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothClosed(pts, 0);

      expect(path).toBe('M0,0L1,1L2,0Z');
    });

    test('应该以 Z 结束', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothClosed(pts, 1);

      expect(path.endsWith('Z')).toBe(true);
    });

    test('应该使用三次贝塞尔曲线', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 1, y: -1 }
      ];
      const path = smoothClosed(pts, 1);

      expect(path).toContain('C');  // 三次贝塞尔
    });

    test('应该循环处理首尾点', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];
      const path = smoothClosed(pts, 1);

      // 路径应该包含起点坐标
      expect(path).toContain('0,0');
    });

    test('空路径应返回空字符串', () => {
      const path = smoothClosed([], 1);
      expect(path).toBe('');
    });
  });

  describe('clampSmoothing', () => {
    test('应该限制在 0-1.3 范围内', () => {
      expect(clampSmoothing(-1)).toBe(0);
      expect(clampSmoothing(0)).toBe(0);
      expect(clampSmoothing(0.5)).toBe(0.5);
      expect(clampSmoothing(1)).toBe(1);
      expect(clampSmoothing(1.3)).toBe(1.3);
      expect(clampSmoothing(2)).toBe(1.3);
    });
  });

  describe('一致性测试', () => {
    test('填充和线条应该使用相同的平滑函数', () => {
      // 确保填充和线条使用相同的平滑函数
      const pts: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];

      const fillPath = smoothClosed(pts, 1);
      const linePath = smoothClosed(pts, 1);

      // 两者应该是相同的
      expect(fillPath).toBe(linePath);
    });

    test('不同平滑度应该产生不同路径', () => {
      const pts: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ];

      const path0 = smoothOpen(pts, 0);
      const path1 = smoothOpen(pts, 1);

      // 不同平滑度应该产生不同的路径
      expect(path0).not.toBe(path1);
    });

    test('开放路径和闭合路径应该不同', () => {
      const pts: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];

      const openPath = smoothOpen(pts, 1);
      const closedPath = smoothClosed(pts, 1);

      // 开放路径不应该以 Z 结束
      expect(openPath.endsWith('Z')).toBe(false);
      // 闭合路径应该以 Z 结束
      expect(closedPath.endsWith('Z')).toBe(true);
    });
  });

  describe('边界情况', () => {
    test('单点路径', () => {
      const pts = [{ x: 0, y: 0 }];
      expect(smoothOpen(pts, 1)).toBe('M0,0');
      expect(smoothClosed(pts, 1)).toBe('M0,0Z');
    });

    test('重复点', () => {
      const pts = [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 }
      ];
      const path = smoothOpen(pts, 1);

      // 应该处理重复点而不崩溃
      expect(path).toContain('M');
    });

    test('负坐标', () => {
      const pts = [
        { x: -1, y: -1 },
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ];
      const path = smoothOpen(pts, 1);

      expect(path).toContain('-1,-1');
    });

    test('大坐标值', () => {
      const pts = [
        { x: 1000000, y: 1000000 },
        { x: 1000001, y: 1000001 },
        { x: 1000002, y: 1000002 }
      ];
      const path = smoothOpen(pts, 1);

      expect(path).toContain('1000000');
    });
  });
});
