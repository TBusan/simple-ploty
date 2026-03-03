import type { Point } from '../../types/types';

/**
 * Centripetal Catmull-Rom 指数
 * 用于计算切线控制点
 */
const CATMULL_ROM_EXP = 0.5;

/**
 * 计算点的入切线和出切线控制点
 *
 * 使用 Centripetal Catmull-Rom 样条算法计算平滑曲线的控制点。
 * 这种参数化方法可以避免自相交和循环问题。
 *
 * @param prevPt 前一个点
 * @param thisPt 当前点
 * @param nextPt 后一个点
 * @param smoothness 平滑度 (0-1.3)
 * @returns [入切线控制点, 出切线控制点]
 */
export function makeTangent(
  prevPt: Point,
  thisPt: Point,
  nextPt: Point,
  smoothness: number
): [Point, Point] {
  // 计算与前一点的方向向量
  const d1x = prevPt.x - thisPt.x;
  const d1y = prevPt.y - thisPt.y;

  // 计算与后一点的方向向量
  const d2x = nextPt.x - thisPt.x;
  const d2y = nextPt.y - thisPt.y;

  // Centripetal 参数化：计算距离的指数幂
  const d1a = Math.pow(d1x * d1x + d1y * d1y, CATMULL_ROM_EXP / 2);
  const d2a = Math.pow(d2x * d2x + d2y * d2y, CATMULL_ROM_EXP / 2);

  // 计算切线方向
  const numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
  const numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;

  // 入切线和出切线分母
  const denom1 = 3 * d2a * (d1a + d2a);  // 入切线
  const denom2 = 3 * d1a * (d1a + d2a);  // 出切线

  // 返回两个控制点
  return [
    {
      x: thisPt.x + (denom1 && numx / denom1),
      y: thisPt.y + (denom1 && numy / denom1)
    },
    {
      x: thisPt.x - (denom2 && numx / denom2),
      y: thisPt.y - (denom2 && numy / denom2)
    }
  ];
}

/**
 * 平滑开放路径（边缘路径）
 *
 * 用于处理接触数据边界的等高线。
 * 路径不闭合，起点和终点在边界上。
 *
 * @param pts 路径点数组
 * @param smoothness 平滑度 (0-1.3)
 * @returns SVG 路径字符串
 */
export function smoothOpen(pts: Point[], smoothness: number): string {
  // 空路径返回空字符串
  if (pts.length === 0) {
    return '';
  }

  // 少于3个点直接连线
  if (pts.length < 3) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L');
  }

  // 无平滑时返回折线
  if (smoothness === 0) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L');
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  const tangents: [Point, Point][] = [];

  // 为每个内部点计算切线
  for (let i = 1; i < pts.length - 1; i++) {
    tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
  }

  // 起始段：二次贝塞尔曲线
  path += `Q${tangents[0][0].x},${tangents[0][0].y} ${pts[1].x},${pts[1].y}`;

  // 中间段：三次贝塞尔曲线
  for (let i = 2; i < pts.length - 1; i++) {
    const tPrev = tangents[i - 2];
    const tCurr = tangents[i - 1];
    path += `C${tPrev[1].x},${tPrev[1].y} ${tCurr[0].x},${tCurr[0].y} ${pts[i].x},${pts[i].y}`;
  }

  // 结束段：二次贝塞尔曲线
  const lastIdx = pts.length - 1;
  path += `Q${tangents[lastIdx - 2][1].x},${tangents[lastIdx - 2][1].y} ${pts[lastIdx].x},${pts[lastIdx].y}`;

  return path;
}

/**
 * 平滑闭合路径（内部路径）
 *
 * 用于处理完全在数据内部的环形等高线。
 * 路径闭合，首尾相连。
 *
 * @param pts 路径点数组
 * @param smoothness 平滑度 (0-1.3)
 * @returns SVG 路径字符串
 */
export function smoothClosed(pts: Point[], smoothness: number): string {
  // 空路径返回空字符串
  if (pts.length === 0) {
    return '';
  }

  // 少于3个点直接连线闭合
  if (pts.length < 3) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
  }

  // 无平滑时返回折线闭合
  if (smoothness === 0) {
    return 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  const pLast = pts.length - 1;

  // 计算所有点的切线（包括首尾点的循环处理）
  const tangents: [Point, Point][] = [
    makeTangent(pts[pLast], pts[0], pts[1], smoothness)
  ];

  for (let i = 1; i < pLast; i++) {
    tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
  }

  tangents.push(makeTangent(pts[pLast - 1], pts[pLast], pts[0], smoothness));

  // 所有段都使用三次贝塞尔曲线
  for (let i = 1; i <= pLast; i++) {
    const tPrev = tangents[i - 1];
    const tCurr = tangents[i];
    path += `C${tPrev[1].x},${tPrev[1].y} ${tCurr[0].x},${tCurr[0].y} ${pts[i].x},${pts[i].y}`;
  }

  // 闭合回到起点
  path += `C${tangents[pLast][1].x},${tangents[pLast][1].y} ` +
          `${tangents[0][0].x},${tangents[0][0].y} ` +
          `${pts[0].x},${pts[0].y}Z`;

  return path;
}

/**
 * 平滑参数约束
 * 确保平滑参数在有效范围内
 *
 * @param smoothing 输入的平滑参数
 * @returns 约束后的平滑参数 [0, 1.3]
 */
export function clampSmoothing(smoothing: number): number {
  return Math.max(0, Math.min(1.3, smoothing));
}
