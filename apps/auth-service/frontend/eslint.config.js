import baseConfig from '../../../packages/shared/eslint-config/base.js'

export default [
  ...baseConfig,
  {
    ignores: ['dist/**']
  }
]
