module.exports = {
  extends: ['../../../eslint.config.js'],
  rules: {
    // Allow console statements in logger package since it's a logging library
    'no-console': 'off',
  },
}
