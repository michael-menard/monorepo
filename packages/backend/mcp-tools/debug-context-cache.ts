import { contextCachePut } from './src/context-cache/context-cache-put.js'

async function debug() {
  try {
    const result = await contextCachePut({
      packType: 'codebase',
      packKey: 'test',
      content: { test: 'value' },
    })
    console.log('Result:', result)
  } catch (error) {
    console.error('Error:', error)
  }
  process.exit(0)
}

debug()
