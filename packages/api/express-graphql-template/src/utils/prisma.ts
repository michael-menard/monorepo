// Note: PrismaClient will be available after running 'pnpm db:generate'
// import { PrismaClient } from '@prisma/client'

// For now, we'll use a mock implementation
// Replace this with the actual import after generating the Prisma client
const PrismaClient = class {
  user = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  }
  $disconnect = async () => {}
}

// Create a singleton instance of PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Example of how to use Prisma with GraphQL resolvers
export const userResolvers = {
  // Get all users
  users: async () => {
    try {
      return await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      throw new Error('Failed to fetch users')
    }
  },

  // Get user by ID
  user: async ({ id }: { id: string }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      })
      
      if (!user) {
        throw new Error('User not found')
      }
      
      return user
    } catch (error) {
      console.error('Error fetching user:', error)
      throw new Error('Failed to fetch user')
    }
  },

  // Create a new user
  createUser: async ({ name, email }: { name: string; email: string }) => {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      
      if (existingUser) {
        throw new Error('User with this email already exists')
      }
      
      return await prisma.user.create({
        data: {
          name,
          email,
        },
      })
    } catch (error) {
      console.error('Error creating user:', error)
      throw new Error('Failed to create user')
    }
  },

  // Update user
  updateUser: async ({ id, name, email }: { id: string; name?: string; email?: string }) => {
    try {
      const updateData: any = {}
      
      if (name !== undefined) updateData.name = name
      if (email !== undefined) updateData.email = email
      
      return await prisma.user.update({
        where: { id },
        data: updateData,
      })
    } catch (error) {
      console.error('Error updating user:', error)
      throw new Error('Failed to update user')
    }
  },

  // Delete user
  deleteUser: async ({ id }: { id: string }) => {
    try {
      await prisma.user.delete({
        where: { id },
      })
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      throw new Error('Failed to delete user')
    }
  },
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
}) 