import typescript from '@rollup/plugin-typescript';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
                declaration: false,
                declarationDir: undefined
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
                declaration: false,
                declarationDir: undefined
            })
        ],
        external: ['three']
    }
];
