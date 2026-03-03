/**
 * 插值工具函数
 */

/**
 * 二维插值
 */
export function interp2d(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v00: number,
  v01: number,
  v10: number,
  v11: number
): number {
  const tx = (x - x0) / (x1 - x0);
  const ty = (y - y0) / (y1 - y0);

  const v0 = v00 * (1 - tx) + v10 * tx;
  const v1 = v01 * (1 - tx) + v11 * tx;

  return v0 * (1 - ty) + v1 * ty;
}

/**
 * 查找空数据点
 */
export function findEmpties(data: (number | null)[][]): [number, number][] {
  const empties: [number, number][] = [];

  for (let j = 0; j < data.length; j++) {
    for (let i = 0; i < data[j].length; i++) {
      if (data[j][i] === null) {
        empties.push([i, j]);
      }
    }
  }

  return empties;
}

/**
 * 检查值是否为空
 */
export function isNull(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

/**
 * 获取有效邻居值
 */
function getValidNeighbors(
  data: (number | null)[][],
  i: number,
  j: number
): number[] {
  const neighbors: number[] = [];
  const rows = data.length;
  const cols = data[0]?.length || 0;

  // 8 方向邻居
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [di, dj] of directions) {
    const ni = i + di;
    const nj = j + dj;

    if (ni >= 0 && ni < cols && nj >= 0 && nj < rows) {
      const val = data[nj][ni];
      if (!isNull(val)) {
        neighbors.push(val);
      }
    }
  }

  return neighbors;
}

/**
 * 使用邻居平均值插值空值
 *
 * @param data 原始数据（可能包含 null）
 * @returns 插值后的数据
 */
export function interpNullsWithMean(data: (number | null)[][]): number[][] {
  const rows = data.length;
  const cols = data[0]?.length || 0;
  const result: number[][] = [];

  for (let j = 0; j < rows; j++) {
    result[j] = [];
    for (let i = 0; i < cols; i++) {
      const val = data[j][i];
      if (!isNull(val)) {
        result[j][i] = val;
      } else {
        // 使用邻居平均值
        const neighbors = getValidNeighbors(data, i, j);
        if (neighbors.length > 0) {
          result[j][i] = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
        } else {
          result[j][i] = 0;  // 没有有效邻居时使用 0
        }
      }
    }
  }

  return result;
}

/**
 * Poisson 插值（简化版）
 * 使用迭代方法填充空值
 *
 * @param data 原始数据
 * @param iterations 迭代次数
 * @returns 插值后的数据
 */
export function poissonInterpolate(
  data: (number | null)[][],
  iterations: number = 10
): number[][] {
  // 先用邻居平均值初始化
  let result = interpNullsWithMean(data);

  const rows = result.length;
  const cols = result[0]?.length || 0;
  const nullMask: boolean[][] = [];

  // 记录原始空值位置
  for (let j = 0; j < rows; j++) {
    nullMask[j] = [];
    for (let i = 0; i < cols; i++) {
      nullMask[j][i] = isNull(data[j][i]);
    }
  }

  // 迭代平滑
  for (let iter = 0; iter < iterations; iter++) {
    const newResult: number[][] = [];

    for (let j = 0; j < rows; j++) {
      newResult[j] = [];
      for (let i = 0; i < cols; i++) {
        if (!nullMask[j][i]) {
          // 保持原始值
          newResult[j][i] = result[j][i];
        } else {
          // 使用 4 邻居平均
          let sum = 0;
          let count = 0;

          if (i > 0) { sum += result[j][i - 1]; count++; }
          if (i < cols - 1) { sum += result[j][i + 1]; count++; }
          if (j > 0) { sum += result[j - 1][i]; count++; }
          if (j < rows - 1) { sum += result[j + 1][i]; count++; }

          newResult[j][i] = count > 0 ? sum / count : result[j][i];
        }
      }
    }

    result = newResult;
  }

  return result;
}

/**
 * 连接空隙（connectgaps）
 * 处理数据中的空值，允许等值线跨越空隙
 *
 * @param data 原始数据
 * @param threshold 空隙阈值（0-1）
 * @returns 处理后的数据
 */
export function connectGaps(
  data: (number | null)[][],
  threshold: number = 0.5
): number[][] {
  const rows = data.length;
  const cols = data[0]?.length || 0;

  // 计算空值比例
  let nullCount = 0;
  let totalCount = rows * cols;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (isNull(data[j][i])) {
        nullCount++;
      }
    }
  }

  const nullRatio = nullCount / totalCount;

  if (nullRatio > threshold) {
    console.warn(`connectGaps: null ratio ${nullRatio.toFixed(2)} exceeds threshold ${threshold}`);
  }

  // 使用 Poisson 插值填充
  return poissonInterpolate(data);
}

/**
 * 移除数据中的空值行和列
 *
 * @param data 原始数据
 * @returns 清理后的数据和索引映射
 */
export function removeNullRowsCols(
  data: (number | null)[][]
): {
  data: number[][];
  rowMap: number[];
  colMap: number[];
} {
  const rows = data.length;
  const cols = data[0]?.length || 0;

  // 找出非空行
  const validRows: number[] = [];
  for (let j = 0; j < rows; j++) {
    const hasValid = data[j].some(v => !isNull(v));
    if (hasValid) {
      validRows.push(j);
    }
  }

  // 找出非空列
  const validCols: number[] = [];
  for (let i = 0; i < cols; i++) {
    let hasValid = false;
    for (let j = 0; j < rows; j++) {
      if (!isNull(data[j][i])) {
        hasValid = true;
        break;
      }
    }
    if (hasValid) {
      validCols.push(i);
    }
  }

  // 构建结果
  const result: number[][] = [];
  for (const j of validRows) {
    const row: number[] = [];
    for (const i of validCols) {
      const val = data[j][i];
      row.push(isNull(val) ? 0 : val);
    }
    result.push(row);
  }

  return {
    data: result,
    rowMap: validRows,
    colMap: validCols
  };
}
