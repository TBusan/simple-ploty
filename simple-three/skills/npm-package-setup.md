name: npm-package-setup
description: Use when setting up the npm package infrastructure for the three-contour library
---

# NPM 包设置技能

## 🎯 对应开发阶段

- **Phase 1**: 项目基础设施
- **Phase 14**: 文档与发布

## 🚀 何时使用本技能

### 调用时机

在以下情况下，**必须先阅读本 Skill 文档**：

1. **创建新项目时**:
   ```bash
   mkdir simple-three && cd simple-three
   # → 停下！先阅读本 Skill
   ```

2. **创建配置文件时**:
   - package.json
   - tsconfig.json
   - rollup.config.js
   - vitest.config.ts
   - .eslintrc.cjs
   - .prettierrc

3. **准备发布时**:
   - npm login
   - npm publish

### 如何使用

```
┌─────────────────────────────────────────────────────────────┐
│ 创建项目阶段:                                                │
│ 1. 复制 package.json 和 tsconfig.json                       │
│    ↓                                                         │
│ 2. 创建 rollup.config.js                                     │
│    ↓                                                         │
│ 3. 运行 npm install 安装依赖                                 │
│    ↓                                                         │
│ 4. 运行 npm run build 验证构建                               │
├─────────────────────────────────────────────────────────────┤
│ 发布阶段:                                                    │
│ 1. 检查"发布检查清单"                                        │
│    ↓                                                         │
│ 2. npm login                                                 │
│    ↓                                                         │
│ 3. npm publish                                               │
└─────────────────────────────────────────────────────────────┘
```

## 触发条件

当需要设置 npm 项目基础设施时使用此技能。

## 实现清单

### 1. package.json

```json
{
  "name": "three-contour",
  "version": "1.0.0",
  "description": "Contour plot library for Three.js, compatible with Plotly.js contour features",
  "main": "dist/three-contour.cjs.js",
  "module": "dist/three-contour.esm.js",
  "browser": "dist/three-contour.umd.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "docs": "typedoc src/index.ts --out docs",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "three.js",
    "contour",
    "visualization",
    "webgl",
    "isoline",
    "marching-squares"
  ],
  "author": "",
  "license": "MIT",
  "peerDependencies": {
    "three": "^0.150.0"
  },
  "devDependencies": {
    "@rollup/plugin-typescript": "^11.0.0",
    "@types/three": "^0.150.0",
    "rollup": "^3.20.0",
    "tslib": "^2.5.0",
    "typescript": "^5.0.0",
    "vitest": "^0.30.0",
    "eslint": "^8.38.0",
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0",
    "prettier": "^2.8.0",
    "typedoc": "^0.24.0"
  },
  "repository": {
    "type": "git",
    "url": ""
  },
  "bugs": {
    "url": ""
  },
  "homepage": ""
}
```

### 2. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. rollup.config.js

```javascript
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

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
            typescript({
                tsconfig: './tsconfig.json',
                declaration: true,
                declarationDir: './dist'
            })
        ],
        external: ['three']
    },
    // CommonJS build
    {
        input: 'src/index.ts',
        output: {
            file: pkg.main,
            format: 'cjs',
            sourcemap: true
        },
        plugins: [
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false
            })
        ],
        external: ['three']
    },
    // UMD build
    {
        input: 'src/index.ts',
        output: {
            file: pkg.browser,
            format: 'umd',
            name: 'ThreeContour',
            sourcemap: true,
            globals: {
                three: 'THREE'
            }
        },
        plugins: [
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false
            })
        ],
        external: ['three']
    }
];
```

### 4. 入口文件

```typescript
// src/index.ts

export { Contour } from './core/Contour';
export { ContourOptions } from './core/ContourOptions';
export { ColorScale, BUILT_IN_COLORSCALES } from './coloring/ColorScale';
export { MarchingSquares } from './algorithms/MarchingSquares';
export { CatmullRom } from './smoothing/CatmullRom';

// 类型导出
export type { ContourData } from './core/ContourData';
export type { PathInfo, Point } from './algorithms/types';
export type { LabelOptions, ColorBarOptions } from './core/ContourOptions';
```

### 5. ESLint 配置

```javascript
// .eslintrc.cjs
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'warn'
    }
};
```

### 6. Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 4
}
```

### 7. Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'tests/', 'dist/']
        }
    }
});
```

### 8. .gitignore

```
node_modules/
dist/
*.log
.DS_Store
coverage/
docs/
.idea/
*.tsbuildinfo
```

### 9. .npmignore

```
src/
tests/
*.test.ts
*.spec.ts
tsconfig.json
rollup.config.js
.eslintrc.cjs
.prettierrc
vitest.config.ts
word/
skills/
examples/
.gitignore
```

## 使用示例

```typescript
// 安装
// npm install three-contour three

import * as THREE from 'three';
import { Contour } from 'three-contour';

// 创建场景
const scene = new THREE.Scene();

// 创建等值线
const contour = new Contour(scene, {
    z: [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
        [3, 4, 5, 6, 7],
        [4, 5, 6, 7, 8],
        [5, 6, 7, 8, 9]
    ],
    contours: {
        coloring: 'fill',
        showlines: true
    },
    colorscale: 'Viridis'
});

// 更新数据
contour.update({ z: newData });

// 销毁
contour.dispose();
```

## 发布检查清单

- [ ] 所有测试通过 (`npm test`)
- [ ] 代码格式化 (`npm run format`)
- [ ] Lint 检查通过 (`npm run lint`)
- [ ] 构建成功 (`npm run build`)
- [ ] 文档生成 (`npm run docs`)
- [ ] 版本号更新
- [ ] CHANGELOG 更新
- [ ] README 更新

## 发布命令

```bash
# 登录 npm
npm login

# 发布（首次）
npm publish --access public

# 发布（更新）
npm publish
```

## 参考文档

- `development-plan.md` - Phase 1
