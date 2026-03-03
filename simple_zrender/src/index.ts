/**
 * zrender-contour
 * Contour plot library based on ZRender
 *
 * @packageDocumentation
 */

// 主类
export { Contour } from './contour/Contour';
export type { ContourOption, GridData, ContourLevel, Point } from './contour/ContourOption';

// Marching Squares 模块
export { MarchingSquares, getMarchingIndex } from './contour/marching-squares';
export { SaddleHandler } from './contour/marching-squares/SaddleHandler';

// PathFinder 模块
export { PathFinder } from './contour/path/PathFinder';

// 颜色工具
export { rgbToHex, hexToRgb, interpolateColor } from './util/color';

// 类型定义
export type { PathInfo, GridCell, CrossingInfo, ColorScale } from './types/types';
