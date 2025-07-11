import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1)
})

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional()
})

export const resolvers = {
  Query: {
    getUser: async (_: any, { id }: { id: string }) => {
      return await prisma.user.findUnique({
        where: { id }
      })
    },
    listUsers: async () => {
      return await prisma.user.findMany()
    }
  },
  Mutation: {
    createUser: async (_: any, { input }: { input: any }) => {
      const validatedInput = CreateUserSchema.parse(input)
      return await prisma.user.create({
        data: validatedInput
      })
    },
    updateUser: async (_: any, { id, input }: { id: string; input: any }) => {
      const validatedInput = UpdateUserSchema.parse(input)
      return await prisma.user.update({
        where: { id },
        data: validatedInput
      })
    },
    deleteUser: async (_: any, { id }: { id: string }) => {
      await prisma.user.delete({
        where: { id }
      })
      return true
    }
  }
} 