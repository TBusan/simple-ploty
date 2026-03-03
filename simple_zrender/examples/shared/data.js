/**
 * 示例数据集
 * 为 zrender-contour 示例提供共享数据
 */

// 简单渐变数据 (3x3)
export const simpleGrid = {
  z: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
  x: [0, 1, 2],
  y: [0, 1, 2]
};

// 生成高斯分布数据
function generateGaussian(nx, ny) {
  const z = [];
  const centerX = nx / 2;
  const centerY = ny / 2;
  const sigma = Math.min(nx, ny) / 4;

  for (let j = 0; j < ny; j++) {
    const row = [];
    for (let i = 0; i < nx; i++) {
      const dx = i - centerX;
      const dy = j - centerY;
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      row.push(value);
    }
    z.push(row);
  }

  return {
    z,
    x: Array.from({ length: nx }, (_, i) => i),
    y: Array.from({ length: ny }, (_, i) => i)
  };
}

// 高斯分布数据 (适合展示平滑效果)
export const gaussianGrid = generateGaussian(50, 50);

// 生成地形数据 (带多个峰值)
function generateTerrain(nx, ny) {
  const z = [];
  for (let j = 0; j < ny; j++) {
    const row = [];
    for (let i = 0; i < nx; i++) {
      // 多个高斯峰叠加
      const v1 = Math.exp(-((i - nx * 0.3) ** 2 + (j - ny * 0.3) ** 2) / 200);
      const v2 = 0.7 * Math.exp(-((i - nx * 0.7) ** 2 + (j - ny * 0.6) ** 2) / 150);
      const v3 = 0.5 * Math.exp(-((i - nx * 0.5) ** 2 + (j - ny * 0.8) ** 2) / 100);
      row.push(v1 + v2 + v3);
    }
    z.push(row);
  }

  return {
    z,
    x: Array.from({ length: nx }, (_, i) => i),
    y: Array.from({ length: ny }, (_, i) => i)
  };
}

// 地形数据 (带峰值和谷底)
export const terrainGrid = generateTerrain(100, 100);

// 带 Null 值的数据
export const nullDataGrid = {
  z: [
    [1, 2, null, 4, 5],
    [2, 3, 4, 5, 6],
    [null, 4, 5, 6, 7],
    [4, 5, 6, 7, 8],
    [5, 6, 7, 8, 9]
  ],
  x: [0, 1, 2, 3, 4],
  y: [0, 1, 2, 3, 4]
};

// 生成对数刻度数据
function generateLogData(nx, ny) {
  const z = [];
  for (let j = 0; j < ny; j++) {
    const row = [];
    for (let i = 0; i < nx; i++) {
      const x = i / nx;
      const y = j / ny;
      // 指数衰减 + 噪声
      const value = 10 ** (2 * (1 - Math.sqrt(x * x + y * y)) + 0.1 * Math.random());
      row.push(value);
    }
    z.push(row);
  }

  return {
    z,
    x: Array.from({ length: nx }, (_, i) => i),
    y: Array.from({ length: ny }, (_, i) => i)
  };
}

// 对数刻度数据
export const logScaleData = generateLogData(30, 30);

// 波纹数据 (同心圆)
function generateRipple(nx, ny) {
  const z = [];
  const centerX = nx / 2;
  const centerY = ny / 2;

  for (let j = 0; j < ny; j++) {
    const row = [];
    for (let i = 0; i < nx; i++) {
      const dx = i - centerX;
      const dy = j - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      row.push(Math.sin(dist / 3) * Math.exp(-dist / 30));
    }
    z.push(row);
  }

  return {
    z,
    x: Array.from({ length: nx }, (_, i) => i),
    y: Array.from({ length: ny }, (_, i) => i)
  };
}

// 波纹数据
export const rippleGrid = generateRipple(60, 60);

// 预定义色阶
export const colorScales = {
  Viridis: [
    [0, '#440154'],
    [0.25, '#3b528b'],
    [0.5, '#21918c'],
    [0.75, '#5ec962'],
    [1, '#fde725']
  ],
  Jet: [
    [0, '#000080'],
    [0.25, '#00ffff'],
    [0.5, '#00ff00'],
    [0.75, '#ffff00'],
    [1, '#ff0000']
  ],
  Heatmap: [
    [0, '#000033'],
    [0.33, '#cc0000'],
    [0.66, '#ffcc00'],
    [1, '#ffffff']
  ],
  CoolWarm: [
    [0, '#3b4cc0'],
    [0.5, '#dddddd'],
    [1, '#b40426']
  ]
};
