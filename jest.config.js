export default {
  clearMocks: true,
  collectCoverageFrom: [
    "<rootDir>/src/controllers/**/*.ts",
    "<rootDir>/src/middlewares/**/*.ts",
    "<rootDir>/src/services/**/*.ts",
    "<rootDir>/src/utils/**/*.ts",
    "!<rootDir>/src/index.ts",
    "!<rootDir>/src/scripts/**",
    "!<rootDir>/src/app/**",
  ],
  coverageDirectory: "<rootDir>/coverage",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setup/jest.setup.js"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          isolatedModules: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          types: ["node", "jest"],
        },
        useESM: true,
      },
    ],
  },
};
