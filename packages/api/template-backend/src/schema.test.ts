import { describe, it, expect } from 'vitest';
import { buildSchema } from 'graphql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('GraphQL Schema', () => {
  it('should be valid GraphQL schema', () => {
    const schemaPath = path.join(__dirname, 'schema.graphql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // This will throw an error if the schema is invalid
    expect(() => buildSchema(schemaContent)).not.toThrow();
  });

  it('should contain User type definition', () => {
    const schemaPath = path.join(__dirname, 'schema.graphql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    expect(schemaContent).toContain('type User');
    expect(schemaContent).toContain('id: ID!');
    expect(schemaContent).toContain('email: String!');
    expect(schemaContent).toContain('name: String');
  });

  it('should contain Query type definition', () => {
    const schemaPath = path.join(__dirname, 'schema.graphql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    expect(schemaContent).toContain('type Query');
    expect(schemaContent).toContain('listUsers: [User!]!');
    expect(schemaContent).toContain('getUser(id: ID!): User');
  });

  it('should contain Mutation type definition', () => {
    const schemaPath = path.join(__dirname, 'schema.graphql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    expect(schemaContent).toContain('type Mutation');
    expect(schemaContent).toContain('createUser');
    expect(schemaContent).toContain('updateUser');
    expect(schemaContent).toContain('deleteUser');
  });
}); 