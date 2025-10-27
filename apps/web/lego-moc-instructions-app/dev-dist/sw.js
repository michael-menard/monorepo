/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  const registry = {}

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + '.js', parentUri).href
    return (
      registry[uri] ||
      new Promise(resolve => {
        if ('document' in self) {
          const script = document.createElement('script')
          script.src = uri
          script.onload = resolve
          document.head.appendChild(script)
        } else {
          nextDefineUri = uri
          importScripts(uri)
          resolve()
        }
      }).then(() => {
        const promise = registry[uri]
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`)
        }
        return promise
      })
    )
  }

  self.define = (depsNames, factory) => {
    const uri =
      nextDefineUri || ('document' in self ? document.currentScript.src : '') || location.href
    if (registry[uri]) {
      // Module is already loading or loaded.
      return
    }
    const exports = {}
    const require = depUri => singleRequire(depUri, uri)
    const specialDeps = {
      module: { uri },
      exports,
      require,
    }
    registry[uri] = Promise.all(
      depsNames.map(depName => specialDeps[depName] || require(depName)),
    ).then(deps => {
      factory(...deps)
      return exports
    })
  }
}
define(['./workbox-6abc3855'], function (workbox) {
  'use strict'

  self.skipWaiting()
  workbox.clientsClaim()

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute(
    [
      {
        url: 'registerSW.js',
        revision: '3ca0b8505b4bec776b69afdba2768812',
      },
      {
        url: '/index.html',
        revision: '0.tjem9kf0e6o',
      },
    ],
    {},
  )
  workbox.cleanupOutdatedCaches()
  workbox.registerRoute(
    new workbox.NavigationRoute(workbox.createHandlerBoundToURL('/index.html'), {
      allowlist: [/^\/$/],
    }),
  )
  workbox.registerRoute(
    /^https:\/\/.*\/api\/.*/i,
    new workbox.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 86400,
        }),
        new workbox.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        {
          cacheKeyWillBeUsed: async ({ request }) => {
            if (request.method !== 'GET' && request.method !== 'HEAD') {
              return `${request.url}?${Date.now()}`
            }
            return request.url
          },
        },
      ],
    }),
    'GET',
  )
  workbox.registerRoute(
    /^https:\/\/.*\/uploads\/.*\.(jpg|jpeg|png|gif|webp)$/i,
    new workbox.CacheFirst({
      cacheName: 'moc-images',
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 604800,
        }),
        new workbox.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
    'GET',
  )
  workbox.registerRoute(
    /\.(js|css|woff2|woff|ttf|eot)$/,
    new workbox.CacheFirst({
      cacheName: 'static-assets',
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 2592000,
        }),
        new workbox.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
    'GET',
  )
  workbox.registerRoute(
    /^https:\/\/.*\/.*$/,
    new workbox.NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 2,
      plugins: [
        new workbox.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 86400,
        }),
        new workbox.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
    'GET',
  )
})
//# sourceMappingURL=sw.js.map
