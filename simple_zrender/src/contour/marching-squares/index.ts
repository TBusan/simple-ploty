/**
 * Marching Squares 模块
 *
 * 实现等值线生成的 Marching Squares 算法
 *
 * @module marching-squares
 */

export { MarchingSquares, getMarchingIndex } from './MarchingSquares';
export { SaddleHandler } from './SaddleHandler';
export {
  BOTTOM_START,
  TOP_START,
  LEFT_START,
  RIGHT_START,
  NEW_DELTA,
  CHOOSE_SADDLE,
  SADDLE_REMAINDER,
  MARCHING_CASES,
  SADDLE_CODES
} from './constants';
