import rootConfig from '../../../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        // Node.js globals
        Buffer: true,
        process: true,
        require: true,
        module: true,
        __dirname: true,
        __filename: true,
        global: true,
        console: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        setImmediate: true,
        clearImmediate: true,
        // Express types
        Express: true,
        // Fetch API (available in Node 18+)
        fetch: true,
        // NodeJS namespace
        NodeJS: true,
      },
    },
  },
]; 