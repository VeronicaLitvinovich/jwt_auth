module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./setup.js'],
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],
  testTimeout: 30000,
  collectCoverageFrom: [
    "app/**/*.js",
    "!app/models/index.js",
    "!server.js"
  ]
};