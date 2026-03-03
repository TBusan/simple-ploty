/**
 * 线条渲染模块
 *
 * 负责等值线的线条渲染和平滑处理
 *
 * @module line
 */

export {
  makeTangent,
  smoothOpen,
  smoothClosed,
  clampSmoothing
} from './Smoothing';

export { LineRenderer } from './LineRenderer';
export type { LineRenderOption } from './LineRenderer';
