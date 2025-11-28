module.exports = {
  testEnvironment: 'node',
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};