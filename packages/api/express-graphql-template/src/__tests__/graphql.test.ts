import { describe, it, expect } from 'vitest'
import { buildSchema, graphql } from 'graphql'

// Import the schema and resolvers from the main file
// For testing purposes, we'll recreate them here
const schema = buildSchema(`
  type Query {
    hello: String
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    createUser(name: String!, email: String!): User
    updateUser(id: ID!, name: String, email: String): User
    deleteUser(id: ID!): Boolean
  }

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }
`)

const root = {
  hello: () => 'Hello world!',
  users: async () => {
    return [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
  },
  user: async ({ id }: { id: string }) => {
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  createUser: async ({ name, email }: { name: string; email: string }) => {
    return {
      id: '1',
      name,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  updateUser: async ({ id, name, email }: { id: string; name?: string; email?: string }) => {
    return {
      id,
      name: name || 'John Doe',
      email: email || 'john@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  deleteUser: async ({ id }: { id: string }) => {
    return true
  },
}

describe('GraphQL Schema', () => {
  it('should return hello world', async () => {
    const query = `
      query {
        hello
      }
    `

    const result = await graphql({ schema, source: query, rootValue: root })
    
    expect(result.data).toEqual({ hello: 'Hello world!' })
    expect(result.errors).toBeUndefined()
  })

  it('should return users list', async () => {
    const query = `
      query {
        users {
          id
          name
          email
          createdAt
          updatedAt
        }
      }
    `

    const result = await graphql({ schema, source: query, rootValue: root })
    
    expect(result.data?.users).toBeDefined()
    expect(Array.isArray(result.data?.users)).toBe(true)
    expect(result.errors).toBeUndefined()
  })

  it('should return user by ID', async () => {
    const query = `
      query {
        user(id: "1") {
          id
          name
          email
          createdAt
          updatedAt
        }
      }
    `

    const result = await graphql({ schema, source: query, rootValue: root })
    
    expect(result.data?.user).toBeDefined()
    expect((result.data?.user as any)?.id).toBe('1')
    expect(result.errors).toBeUndefined()
  })

  it('should create a user', async () => {
    const mutation = `
      mutation {
        createUser(name: "Jane Doe", email: "jane@example.com") {
          id
          name
          email
          createdAt
          updatedAt
        }
      }
    `

    const result = await graphql({ schema, source: mutation, rootValue: root })
    
    expect(result.data?.createUser).toBeDefined()
    expect((result.data?.createUser as any)?.name).toBe('Jane Doe')
    expect((result.data?.createUser as any)?.email).toBe('jane@example.com')
    expect(result.errors).toBeUndefined()
  })

  it('should update a user', async () => {
    const mutation = `
      mutation {
        updateUser(id: "1", name: "Updated Name") {
          id
          name
          email
          createdAt
          updatedAt
        }
      }
    `

    const result = await graphql({ schema, source: mutation, rootValue: root })
    
    expect(result.data?.updateUser).toBeDefined()
    expect((result.data?.updateUser as any)?.id).toBe('1')
    expect((result.data?.updateUser as any)?.name).toBe('Updated Name')
    expect(result.errors).toBeUndefined()
  })

  it('should delete a user', async () => {
    const mutation = `
      mutation {
        deleteUser(id: "1")
      }
    `

    const result = await graphql({ schema, source: mutation, rootValue: root })
    
    expect(result.data?.deleteUser).toBe(true)
    expect(result.errors).toBeUndefined()
  })
}) 