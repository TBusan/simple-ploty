/**
 * Marching Squares 算法常量定义
 */

/**
 * 底部起点 Marching Index
 * 当 yi === 0 时的起点类型
 */
export const BOTTOM_START = [1, 9, 13, 104, 713];

/**
 * 顶部起点 Marching Index
 * 当 yi === maxY 时的起点类型
 */
export const TOP_START = [4, 6, 7, 104, 713];

/**
 * 左侧起点 Marching Index
 * 当 xi === 0 时的起点类型
 */
export const LEFT_START = [8, 12, 14, 208, 1114];

/**
 * 右侧起点 Marching Index
 * 当 xi === maxX 时的起点类型
 */
export const RIGHT_START = [2, 3, 11, 208, 1114];

/**
 * 每个 Marching Index 对应的移动方向 [dx, dy]
 * null 表示鞍点或无穿越
 */
export const NEW_DELTA: ([number, number] | null)[] = [
  null,       // 0: 无穿越
  [-1, 0],    // 1: 向左
  [0, -1],    // 2: 向上
  [-1, 0],    // 3: 向左
  [1, 0],     // 4: 向右
  null,       // 5: 鞍点
  [0, -1],    // 6: 向上
  [-1, 0],    // 7: 向左
  [0, 1],     // 8: 向下
  [0, 1],     // 9: 向下
  null,       // 10: 鞍点
  [0, 1],     // 11: 向下
  [1, 0],     // 12: 向右
  [1, 0],     // 13: 向右
  [0, -1]     // 14: 向上
];

/**
 * 鞍点路径选择
 * 根据梯度方向选择不同的路径
 */
export const CHOOSE_SADDLE: Record<number, [number, number]> = {
  104: [4, 1],    // dx/dy < 0 用 4, > 0 用 1
  208: [2, 8],    // dx/dy < 0 用 2, > 0 用 8
  713: [7, 13],   // dx/dy < 0 用 7, > 0 用 13
  1114: [11, 14]  // dx/dy < 0 用 11, > 0 用 14
};

/**
 * 鞍点剩余路径
 * 当一条路径完成后，剩余的路径索引
 */
export const SADDLE_REMAINDER: Record<number, number> = {
  1: 4, 2: 8, 4: 1, 7: 13, 8: 2, 11: 14, 13: 7, 14: 11
};

/**
 * 16 种基本 Marching Index 情况
 */
export const MARCHING_CASES = {
  CASE_0: 0,    // 无穿越
  CASE_1: 1,    // 只有左上角 <= level
  CASE_2: 2,    // 只有右上角 <= level
  CASE_3: 3,    // 左上和右上 <= level
  CASE_4: 4,    // 只有右下角 <= level
  CASE_5: 5,    // 鞍点情况 1（左上和右下 <= level）
  CASE_6: 6,    // 右上和右下 <= level
  CASE_7: 7,    // 只有左下角 > level
  CASE_8: 8,    // 只有左下角 <= level
  CASE_9: 9,    // 左上和左下 <= level
  CASE_10: 10,  // 鞍点情况 2（右上和左下 <= level）
  CASE_11: 11,  // 只有右上角 > level
  CASE_12: 12,  // 左下和右下 <= level
  CASE_13: 13,  // 只有右下角 > level
  CASE_14: 14,  // 只有左上角 > level
  CASE_15: 0    // 全部 <= level（等价于 CASE_0）
} as const;

/**
 * 鞍点编码
 */
export const SADDLE_CODES = {
  SADDLE_104: 104,   // 鞍点：两个谷之间的峰（case 5）
  SADDLE_208: 208,   // 鞍点：两个谷之间的峰（case 10）
  SADDLE_713: 713,   // 鞍点：两个峰之间的谷（case 5）
  SADDLE_1114: 1114  // 鞍点：两个峰之间的谷（case 10）
} as const;
