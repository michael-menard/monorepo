/**
 * Composition Root
 *
 * Central location for wiring up all dependencies.
 * This follows the Composition Root pattern from DI/IoC.
 */
export { db, schema } from './database.js';
// Domain compositions will be added here as domains are restructured:
// export { galleryComposition } from './gallery.js'
// export { setsComposition } from './sets.js'
// etc.
