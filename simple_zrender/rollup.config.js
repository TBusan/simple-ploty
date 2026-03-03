import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const input = 'src/index.ts';

const plugins = [
  resolve({
    preferBuiltins: true,
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false, // 在单独的构建中生成声明文件
  }),
];

export default [
  // ESM format
  {
    input,
    output: {
      file: 'dist/zrender-contour.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins,
    external: ['zrender'],
  },

  // CommonJS format
  {
    input,
    output: {
      file: 'dist/zrender-contour.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    plugins,
    external: ['zrender'],
  },

  // UMD format (for browsers)
  {
    input,
    output: {
      file: 'dist/zrender-contour.umd.js',
      format: 'umd',
      name: 'ZRenderContour',
      sourcemap: true,
      globals: {
        zrender: 'zrender',
      },
    },
    plugins,
    external: ['zrender'],
  },

  // Type declarations
  {
    input,
    output: {
      file: 'dist/zrender-contour.d.ts',
      format: 'esm',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
        emitDeclarationOnly: true,
        outDir: 'dist/types',
      }),
    ],
    external: ['zrender'],
  },
];
