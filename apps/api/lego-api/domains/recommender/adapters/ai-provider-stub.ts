import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import { ConceptSignalsSchema } from '../types.js'
import type { ConceptSignals, PartExplanation } from '../types.js'
import type { AIProvider } from '../ports/index.js'

/**
 * Stub AI provider for development and testing.
 *
 * Returns hardcoded concept expansions for known concepts
 * and template-based explanations. Replace with a real
 * implementation (Ollama, OpenAI, Claude) by implementing
 * the AIProvider interface.
 *
 * To implement a real provider:
 * 1. Implement the AIProvider interface
 * 2. Call your LLM with a system prompt that requests structured JSON output
 * 3. Parse the response with ConceptSignalsSchema.safeParse()
 * 4. For explanations, send the parts + concept and request per-part explanations
 *
 * Example Ollama implementation sketch:
 *
 *   async expandConcept(concept: string) {
 *     const response = await ollama.chat({
 *       model: 'qwen2.5:14b',
 *       messages: [{
 *         role: 'system',
 *         content: CONCEPT_EXPANSION_SYSTEM_PROMPT,
 *       }, {
 *         role: 'user',
 *         content: concept,
 *       }],
 *       format: 'json',
 *     })
 *     const parsed = ConceptSignalsSchema.safeParse(JSON.parse(response.message.content))
 *     if (!parsed.success) return err('AI_EXPANSION_FAILED')
 *     return ok(parsed.data)
 *   }
 */
export function createStubAIProvider(): AIProvider {
  return {
    async expandConcept(concept: string): Promise<Result<ConceptSignals, 'AI_EXPANSION_FAILED'>> {
      logger.info(`[recommender:ai-stub] Expanding concept: "${concept}"`)

      // Normalize concept for matching
      const normalized = concept.toLowerCase().trim()

      // Try to generate reasonable signals from keywords
      const signals = generateSignalsFromKeywords(normalized)

      const parsed = ConceptSignalsSchema.safeParse(signals)
      if (!parsed.success) {
        logger.warn('[recommender:ai-stub] Failed to parse generated signals')
        return err('AI_EXPANSION_FAILED')
      }

      return ok(parsed.data)
    },

    async explainParts(
      concept: string,
      parts: Array<{
        partNumber: string
        partName: string
        color: string
        category: string | null
        source: string
        matchReasons: string[]
      }>,
    ): Promise<Result<PartExplanation[], 'AI_EXPLANATION_FAILED'>> {
      logger.info(
        `[recommender:ai-stub] Generating explanations for ${parts.length} parts (concept: "${concept}")`,
      )

      const explanations: PartExplanation[] = parts.map(part => {
        const reasons =
          part.matchReasons.length > 0 ? part.matchReasons.join(', ') : 'general style match'

        return {
          partNumber: part.partNumber,
          color: part.color,
          explanation: `Suggested for your ${concept} build because of ${reasons}. ${
            part.source === 'collection'
              ? 'You already own this part.'
              : part.source === 'wishlist'
                ? 'This is on your wishlist.'
                : 'Available from external sources.'
          }`,
        }
      })

      return ok(explanations)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Keyword-based signal generation (stub logic)
// ─────────────────────────────────────────────────────────────────────────

const COLOR_KEYWORDS: Record<string, string[]> = {
  fire: ['dark red', 'red', 'orange', 'trans-orange', 'yellow', 'black'],
  ice: ['white', 'light blue', 'trans-light blue', 'medium blue', 'silver'],
  forest: ['dark green', 'green', 'brown', 'dark brown', 'tan', 'olive green'],
  dark: ['black', 'dark bluish gray', 'dark red', 'dark purple', 'dark brown'],
  light: ['white', 'light bluish gray', 'light yellow', 'gold', 'pearl gold'],
  royal: ['dark blue', 'pearl gold', 'dark red', 'white', 'metallic gold'],
  undead: ['black', 'dark bluish gray', 'sand green', 'glow in dark', 'white'],
  water: ['dark blue', 'blue', 'trans-dark blue', 'dark turquoise', 'sand blue'],
  desert: ['tan', 'dark tan', 'sand yellow', 'dark orange', 'reddish brown'],
  city: ['dark bluish gray', 'light bluish gray', 'blue', 'black', 'white'],
  space: ['black', 'white', 'light bluish gray', 'trans-neon green', 'dark blue'],
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  mage: ['headgear', 'cape', 'staff', 'torso', 'legs', 'wand'],
  wizard: ['headgear', 'cape', 'staff', 'torso', 'legs', 'wand'],
  knight: ['helmet', 'armor', 'shield', 'sword', 'torso', 'legs', 'cape'],
  warrior: ['helmet', 'armor', 'weapon', 'shield', 'torso', 'legs'],
  ranger: ['headgear', 'bow', 'quiver', 'cape', 'torso', 'legs'],
  rogue: ['hood', 'cape', 'dagger', 'torso', 'legs'],
  pirate: ['hat', 'cutlass', 'torso', 'legs', 'parrot', 'hook'],
  mechanic: ['helmet', 'wrench', 'torso', 'legs', 'tool'],
  soldier: ['helmet', 'gun', 'armor', 'torso', 'legs', 'backpack'],
  musician: ['hat', 'instrument', 'torso', 'legs'],
  witch: ['hat', 'cape', 'broom', 'torso', 'legs', 'cauldron'],
  druid: ['headgear', 'staff', 'cape', 'torso', 'legs', 'animal'],
}

const THEME_KEYWORDS: Record<string, string[]> = {
  mage: ['Castle', 'Harry Potter', 'Ninjago', 'Lord of the Rings'],
  wizard: ['Harry Potter', 'Castle', 'Lord of the Rings'],
  knight: ['Castle', 'Kingdoms', 'Lord of the Rings', 'Nexo Knights'],
  pirate: ['Pirates', 'Pirates of the Caribbean'],
  space: ['Space', 'Star Wars', 'Galaxy Squad'],
  city: ['City', 'Creator'],
  ninja: ['Ninjago'],
  warrior: ['Castle', 'Vikings', 'Lord of the Rings', 'Legends of Chima'],
  ranger: ['Castle', 'Lord of the Rings', 'Forestmen'],
  undead: ['Monster Fighters', 'Castle', 'Lord of the Rings', 'Ninjago'],
  smuggler: ['Star Wars'],
}

function generateSignalsFromKeywords(concept: string): ConceptSignals {
  const words = concept.split(/\s+/)

  const colors = new Set<string>()
  const categories = new Set<string>()
  const themes = new Set<string>()
  const styleDescriptors: string[] = []
  const accessoryTypes = new Set<string>()

  for (const word of words) {
    // Match color keywords
    for (const [keyword, colorList] of Object.entries(COLOR_KEYWORDS)) {
      if (word.includes(keyword)) {
        colorList.forEach(c => colors.add(c))
      }
    }

    // Match category keywords
    for (const [keyword, categoryList] of Object.entries(CATEGORY_KEYWORDS)) {
      if (word.includes(keyword)) {
        categoryList.forEach(c => categories.add(c))
      }
    }

    // Match theme keywords
    for (const [keyword, themeList] of Object.entries(THEME_KEYWORDS)) {
      if (word.includes(keyword)) {
        themeList.forEach(t => themes.add(t))
      }
    }

    // Collect as style descriptor
    if (!['a', 'an', 'the', 'of', 'for', 'with', 'and'].includes(word)) {
      styleDescriptors.push(word)
    }
  }

  // Defaults if nothing matched
  if (colors.size === 0) colors.add('black').add('dark bluish gray')
  if (categories.size === 0) categories.add('torso').add('legs').add('headgear')
  if (themes.size === 0) themes.add('Castle').add('City')

  // Extract accessory types from categories
  const accessoryKeywords = [
    'staff',
    'wand',
    'sword',
    'bow',
    'dagger',
    'shield',
    'weapon',
    'cutlass',
    'gun',
    'wrench',
    'tool',
    'instrument',
    'broom',
    'hook',
    'parrot',
    'cauldron',
    'quiver',
    'backpack',
    'animal',
  ]
  for (const cat of categories) {
    if (accessoryKeywords.includes(cat)) {
      accessoryTypes.add(cat)
    }
  }

  return {
    colors: [...colors],
    categories: [...categories],
    accessoryTypes: [...accessoryTypes],
    styleDescriptors,
    relatedThemes: [...themes],
  }
}

// ─────────────────────────────────────────────────────────────────────────
// System prompts for real implementations
// ─────────────────────────────────────────────────────────────────────────

/**
 * System prompt for concept expansion.
 * Use this when implementing a real AI provider.
 */
export const CONCEPT_EXPANSION_SYSTEM_PROMPT = `You are a LEGO minifig building assistant. Your job is to translate character concepts into structured search signals for finding LEGO parts.

Given a character concept, return a JSON object with these fields:
- colors: array of LEGO color names that fit the concept (e.g. "dark red", "pearl gold")
- categories: array of part categories needed (e.g. "headgear", "torso", "cape", "weapon")
- accessoryTypes: array of accessory types (e.g. "staff", "shield", "wand")
- styleDescriptors: array of style words (e.g. "sinister", "ornate", "flowing")
- relatedThemes: array of LEGO themes that would have relevant parts (e.g. "Castle", "Harry Potter")

Be creative and thorough. Think about what physical parts would represent the concept.
Return ONLY valid JSON, no other text.`

/**
 * System prompt for part explanations.
 * Use this when implementing a real AI provider.
 */
export const PART_EXPLANATION_SYSTEM_PROMPT = `You are a LEGO minifig building assistant. Given a character concept and a list of recommended parts, write a brief, creative explanation for why each part was suggested.

Rules:
- Each explanation should be 1-2 sentences
- Reference the actual attributes of the part (color, category, name)
- Connect the part to the character concept
- Be creative but grounded — don't mention attributes the part doesn't have
- Note whether the user already owns the part, has it on their wishlist, or needs to acquire it

Return a JSON array of objects with: partNumber, color, explanation`
