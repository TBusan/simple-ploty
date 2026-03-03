/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // 根目录
  rootDir: './',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts'
  ],

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@contour/(.*)$': '<rootDir>/src/contour/$1',
    '^@util/(.*)$': '<rootDir>/src/util/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },

  // 转换配置
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true
    }]
  },

  // 忽略转换
  transformIgnorePatterns: [
    'node_modules/(?!(zrender)/)'
  ],

  // 测试设置文件
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // 详细输出
  verbose: true,

  // 清除模拟
  clearMocks: true,

  // 重置模拟
  resetMocks: true
};
