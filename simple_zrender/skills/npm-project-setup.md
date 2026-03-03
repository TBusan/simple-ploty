---
name: npm-project-setup
description: 初始化 npm 项目并配置 TypeScript、Rollup 打包
---

# NPM 项目初始化技能

## 触发条件

当需要初始化一个新的 npm 开源项目时使用。

## 实现步骤

### 步骤 1: 初始化 package.json

```bash
npm init -y
```

然后修改 `package.json`:

```json
{
  "name": "zrender-contour",
  "version": "0.1.0",
  "description": "Contour plot library based on ZRender",
  "main": "dist/zrender-contour.js",
  "module": "dist/zrender-contour.esm.js",
  "umd:main": "dist/zrender-contour.umd.js",
  "types": "dist/types/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "rollup -c -w",
    "build": "rollup -c",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "docs": "typedoc src --out docs",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "zrender",
    "contour",
    "chart",
    "visualization",
    "marching-squares",
    "isoline"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": ""
  },
  "peerDependencies": {
    "zrender": "^5.4.0"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^25.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "rollup": "^3.0.0",
    "rollup-plugin-dts": "^5.0.0",
    "ts-jest": "^29.0.0",
    "tslib": "^2.0.0",
    "typescript": "^5.0.0",
    "typedoc": "^0.24.0",
    "zrender": "^5.4.0"
  }
}
```

### 步骤 2: 配置 TypeScript

创建 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "lib": ["ES2018", "DOM"],
    "declaration": true,
    "declarationDir": "./dist/types",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 步骤 3: 配置 Rollup

创建 `rollup.config.js`:

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const pkg = require('./package.json');

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' })
    ],
    external: ['zrender']
  },

  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' })
    ],
    external: ['zrender']
  },

  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: pkg['umd:main'],
      format: 'umd',
      name: 'ZRenderContour',
      sourcemap: true,
      globals: {
        zrender: 'zrender'
      }
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' })
    ],
    external: ['zrender']
  },

  // Type declarations
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: pkg.types,
      format: 'esm'
    },
    plugins: [dts()]
  }
];
```

### 步骤 4: 配置 Jest

创建 `jest.config.js`:

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
```

创建 `test/setup.ts`:

```typescript
// Jest setup file
// Add any global test configuration here
```

### 步骤 5: 创建入口文件

创建 `src/index.ts`:

```typescript
// Main entry point
export { Contour } from './contour/Contour';
export type { ContourOption } from './contour/ContourOption';
export type { GridData, Point, PathInfo } from './types/types';

// Export utilities
export { MarchingSquares } from './contour/marching-squares/MarchingSquares';
export { ColorMapper } from './contour/fill/ColorMapper';
export { BoundaryHandler } from './contour/path/BoundaryHandler';
```

### 步骤 6: 创建 README

创建 `README.md`:

```markdown
# ZRender Contour

A contour plot library based on ZRender, providing efficient and interactive contour visualization.

## Features

- 🎨 Four coloring modes: fill, heatmap, lines, none
- 📊 Marching Squares algorithm with saddle point handling
- 🏷️ Smart label placement
- 🖱️ Interactive zoom, pan, and hover
- 📏 Automatic axis handling (including log scale)
- 🎯 ColorBar component

## Installation

\`\`\`bash
npm install zrender-contour zrender
\`\`\`

## Quick Start

\`\`\`typescript
import * as zrender from 'zrender';
import { Contour } from 'zrender-contour';

const chart = zrender.init(document.getElementById('main'));

const contour = new Contour({
  z: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
  x: [0, 1, 2],
  y: [0, 1, 2],

  contours: {
    coloring: 'fill',
    showlabels: true
  },

  colorscale: 'Viridis'
});

chart.add(contour);
\`\`\`

## API Documentation

See [API Docs](./docs/index.html)

## License

MIT
\`\`\`

### 步骤 7: 安装依赖并验证

```bash
# 安装依赖
npm install

# 运行构建
npm run build

# 运行测试
npm test

# 检查文件
ls -la dist/
```

## 验收清单

- [ ] package.json 配置正确
- [ ] TypeScript 编译无错误
- [ ] Rollup 构建生成三种格式
- [ ] Jest 测试框架运行正常
- [ ] 类型声明文件生成

## 文件结构验证

```
simple_zrender/
├── package.json       ✓
├── tsconfig.json      ✓
├── rollup.config.js   ✓
├── jest.config.js     ✓
├── README.md          ✓
├── src/
│   └── index.ts       ✓
├── test/
│   └── setup.ts       ✓
└── dist/              (构建后生成)
    ├── zrender-contour.js
    ├── zrender-contour.esm.js
    ├── zrender-contour.umd.js
    └── types/
        └── index.d.ts
```

## 发布流程

```bash
# 1. 登录 npm
npm login

# 2. 发布
npm publish

# 3. 发布 beta 版本
npm publish --tag beta
```
