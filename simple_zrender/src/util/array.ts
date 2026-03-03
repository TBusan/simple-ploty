/**
 * 数组工具函数
 */

/**
 * 查找数组中的最小值
 */
export function min(array: number[]): number {
  return Math.min(...array);
}

/**
 * 查找数组中的最大值
 */
export function max(array: number[]): number {
  return Math.max(...array);
}

/**
 * 数组求和
 */
export function sum(array: number[]): number {
  return array.reduce((acc, val) => acc + val, 0);
}

/**
 * 数组平均值
 */
export function mean(array: number[]): number {
  return sum(array) / array.length;
}
