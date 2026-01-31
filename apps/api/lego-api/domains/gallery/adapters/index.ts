/**
 * Gallery Domain Adapters
 *
 * Infrastructure implementations of the domain ports.
 */

export { createImageRepository, createAlbumRepository } from './repositories.js'
export { createImageStorage, generateImageKey, generateThumbnailKey } from './storage.js'
