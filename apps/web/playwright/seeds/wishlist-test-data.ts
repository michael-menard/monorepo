/**
 * Wishlist Test Data Seed
 *
 * Creates sample wishlist items for South Park test users.
 * Requires users to be seeded first: pnpm --filter playwright seed:users
 *
 * Usage:
 *   pnpm --filter playwright seed:wishlist
 *   pnpm --filter playwright seed:wishlist:delete
 *   pnpm --filter playwright seed:wishlist:list
 */

import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_vtW1Slo3o',
  clientId: process.env.COGNITO_CLIENT_ID || '4527ui02h63b7c0ra7vs00gua5',
  region: process.env.AWS_REGION || 'us-east-1',
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'
const TEST_PASSWORD = '0Xcoffee?'

// ─────────────────────────────────────────────────────────────────────────────
// Test Users (subset for wishlist seeding)
// ─────────────────────────────────────────────────────────────────────────────

const SEED_USERS = [
  { email: 'stan.marsh@southpark.test', name: 'Stan Marsh' },
  { email: 'kyle.broflovski@southpark.test', name: 'Kyle Broflovski' },
  { email: 'eric.cartman@southpark.test', name: 'Eric Cartman' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sample Wishlist Items (LEGO sets themed around South Park)
// ─────────────────────────────────────────────────────────────────────────────

type WishlistItemInput = {
  title: string
  setNumber?: string
  store: string
  price?: string
  currency: string
  pieceCount?: number
  priority: number
  tags: string[]
  notes?: string
  sourceUrl?: string
  imageUrl?: string
  releaseDate?: string
}

const STAN_WISHLIST: WishlistItemInput[] = [
  {
    title: 'LEGO Star Wars Millennium Falcon UCS',
    setNumber: '75192',
    store: 'LEGO',
    price: '849.99',
    currency: 'USD',
    pieceCount: 7541,
    priority: 5,
    tags: ['UCS', 'Star Wars', 'Display'],
    notes: 'The ultimate collector set',
    sourceUrl: 'https://www.lego.com/en-us/product/millennium-falcon-75192',
  },
  {
    title: 'LEGO Technic Lamborghini Sián',
    setNumber: '42115',
    store: 'LEGO',
    price: '449.99',
    currency: 'USD',
    pieceCount: 3696,
    priority: 4,
    tags: ['Technic', 'Cars', 'Display'],
  },
  {
    title: 'LEGO Ideas Grand Piano',
    setNumber: '21323',
    store: 'LEGO',
    price: '399.99',
    currency: 'USD',
    pieceCount: 3662,
    priority: 3,
    tags: ['Ideas', 'Music'],
  },
  {
    title: 'LEGO Architecture Statue of Liberty',
    setNumber: '21042',
    store: 'LEGO',
    price: '119.99',
    currency: 'USD',
    pieceCount: 1685,
    priority: 2,
    tags: ['Architecture', 'Landmarks'],
  },
  {
    title: 'Barweer Star Destroyer MOC',
    store: 'Barweer',
    price: '299.99',
    currency: 'USD',
    pieceCount: 4500,
    priority: 3,
    tags: ['MOC', 'Star Wars', 'Alternative'],
  },
]

const KYLE_WISHLIST: WishlistItemInput[] = [
  {
    title: 'LEGO Harry Potter Hogwarts Castle',
    setNumber: '71043',
    store: 'LEGO',
    price: '469.99',
    currency: 'USD',
    pieceCount: 6020,
    priority: 5,
    tags: ['Harry Potter', 'Castle', 'Display'],
  },
  {
    title: 'LEGO Creator Expert Haunted House',
    setNumber: '10273',
    store: 'LEGO',
    price: '249.99',
    currency: 'USD',
    pieceCount: 3231,
    priority: 4,
    tags: ['Creator Expert', 'Halloween'],
  },
  {
    title: 'LEGO Ideas Tree House',
    setNumber: '21318',
    store: 'LEGO',
    price: '249.99',
    currency: 'USD',
    pieceCount: 3036,
    priority: 3,
    tags: ['Ideas', 'Nature'],
  },
]

const CARTMAN_WISHLIST: WishlistItemInput[] = [
  {
    title: 'LEGO Star Wars AT-AT Ultimate Collector',
    setNumber: '75313',
    store: 'LEGO',
    price: '849.99',
    currency: 'USD',
    pieceCount: 6785,
    priority: 5,
    tags: ['UCS', 'Star Wars', 'Empire'],
    notes: 'Respect my authoritah!',
  },
  {
    title: 'LEGO Super Mario 64 Question Mark Block',
    setNumber: '71395',
    store: 'LEGO',
    price: '199.99',
    currency: 'USD',
    pieceCount: 2064,
    priority: 4,
    tags: ['Super Mario', 'Nintendo', 'Nostalgia'],
  },
  {
    title: 'Cata Modular Building MOC',
    store: 'Cata',
    price: '150.00',
    currency: 'USD',
    pieceCount: 2800,
    priority: 2,
    tags: ['MOC', 'Modular', 'Alternative'],
  },
  {
    title: 'BrickLink Designer Vintage Car',
    store: 'BrickLink',
    price: '89.99',
    currency: 'USD',
    pieceCount: 1200,
    priority: 3,
    tags: ['BrickLink', 'Cars', 'Vintage'],
  },
  {
    title: 'Generic Building Blocks Set',
    store: 'Other',
    price: '25.00',
    currency: 'USD',
    pieceCount: 500,
    priority: 1,
    tags: ['Budget', 'Generic'],
  },
]

const USER_WISHLISTS: Record<string, WishlistItemInput[]> = {
  'stan.marsh@southpark.test': STAN_WISHLIST,
  'kyle.broflovski@southpark.test': KYLE_WISHLIST,
  'eric.cartman@southpark.test': CARTMAN_WISHLIST,
}

// ─────────────────────────────────────────────────────────────────────────────
// Cognito Authentication
// ─────────────────────────────────────────────────────────────────────────────

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

async function getAccessToken(email: string): Promise<string> {
  const response = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: TEST_PASSWORD,
      },
    }),
  )

  if (!response.AuthenticationResult?.AccessToken) {
    throw new Error(`Failed to get access token for ${email}`)
  }

  return response.AuthenticationResult.AccessToken
}

// ─────────────────────────────────────────────────────────────────────────────
// API Operations
// ─────────────────────────────────────────────────────────────────────────────

async function createWishlistItem(
  token: string,
  item: WishlistItemInput,
): Promise<{ id: string; title: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`    Failed to create "${item.title}": ${error}`)
      return null
    }

    const created = await response.json()
    return { id: created.id, title: created.title }
  } catch (error) {
    console.error(`    Error creating "${item.title}":`, (error as Error).message)
    return null
  }
}

async function listWishlistItems(token: string): Promise<{ id: string; title: string }[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.items || []
  } catch {
    return []
  }
}

async function deleteWishlistItem(token: string, id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.status === 204
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Operations
// ─────────────────────────────────────────────────────────────────────────────

async function seedWishlistForUser(
  email: string,
  name: string,
  items: WishlistItemInput[],
): Promise<{ created: number; failed: number }> {
  console.log(`\n  ${name} (${email}):`)

  let token: string
  try {
    token = await getAccessToken(email)
  } catch (error) {
    console.error(`    Failed to authenticate: ${(error as Error).message}`)
    console.error(`    Make sure to run: pnpm --filter playwright seed:users`)
    return { created: 0, failed: items.length }
  }

  let created = 0
  let failed = 0

  for (const item of items) {
    const result = await createWishlistItem(token, item)
    if (result) {
      console.log(`    Created: ${item.title}`)
      created++
    } else {
      failed++
    }
  }

  return { created, failed }
}

async function deleteWishlistForUser(email: string, name: string): Promise<{ deleted: number }> {
  console.log(`\n  ${name} (${email}):`)

  let token: string
  try {
    token = await getAccessToken(email)
  } catch (error) {
    console.error(`    Failed to authenticate: ${(error as Error).message}`)
    return { deleted: 0 }
  }

  const items = await listWishlistItems(token)
  let deleted = 0

  for (const item of items) {
    const success = await deleteWishlistItem(token, item.id)
    if (success) {
      console.log(`    Deleted: ${item.title}`)
      deleted++
    }
  }

  if (items.length === 0) {
    console.log(`    (no items)`)
  }

  return { deleted }
}

async function listWishlistForUser(email: string, name: string): Promise<void> {
  console.log(`\n  ${name} (${email}):`)

  let token: string
  try {
    token = await getAccessToken(email)
  } catch (error) {
    console.error(`    Failed to authenticate: ${(error as Error).message}`)
    return
  }

  const items = await listWishlistItems(token)

  if (items.length === 0) {
    console.log(`    (no items)`)
  } else {
    for (const item of items) {
      console.log(`    - ${item.title}`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Commands
// ─────────────────────────────────────────────────────────────────────────────

async function seedAll(): Promise<void> {
  console.log('Seeding wishlist test data...')
  console.log(`API: ${API_BASE_URL}`)

  let totalCreated = 0
  let totalFailed = 0

  for (const user of SEED_USERS) {
    const items = USER_WISHLISTS[user.email] || []
    const result = await seedWishlistForUser(user.email, user.name, items)
    totalCreated += result.created
    totalFailed += result.failed
  }

  console.log(`\nDone: ${totalCreated} items created, ${totalFailed} failed`)
}

async function deleteAll(): Promise<void> {
  console.log('Deleting wishlist test data...')
  console.log(`API: ${API_BASE_URL}`)

  let totalDeleted = 0

  for (const user of SEED_USERS) {
    const result = await deleteWishlistForUser(user.email, user.name)
    totalDeleted += result.deleted
  }

  console.log(`\nDone: ${totalDeleted} items deleted`)
}

async function listAll(): Promise<void> {
  console.log('Listing wishlist test data...')
  console.log(`API: ${API_BASE_URL}`)

  for (const user of SEED_USERS) {
    await listWishlistForUser(user.email, user.name)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

const command = process.argv[2]

if (command === 'delete') {
  deleteAll()
} else if (command === 'list') {
  listAll()
} else {
  seedAll()
}

export { SEED_USERS, USER_WISHLISTS, STAN_WISHLIST, KYLE_WISHLIST, CARTMAN_WISHLIST }
