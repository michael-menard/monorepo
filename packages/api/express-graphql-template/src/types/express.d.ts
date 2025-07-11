declare module 'express' {
  import { Request, Response, NextFunction, RequestHandler } from 'express'
  export { Request, Response, NextFunction, RequestHandler }
  
  interface Express {
    (): any
    use: (middleware: any) => any
    get: (path: string, handler: any) => any
    post: (path: string, handler: any) => any
    put: (path: string, handler: any) => any
    delete: (path: string, handler: any) => any
    listen: (port: number, callback?: () => void) => any
  }
  
  function express(): Express
  export = express
}

declare module 'cors' {
  import { RequestHandler } from 'express'
  function cors(options?: any): RequestHandler
  export = cors
}

declare module 'helmet' {
  import { RequestHandler } from 'express'
  function helmet(options?: any): RequestHandler
  export = helmet
}

declare module 'xss-clean' {
  import { RequestHandler } from 'express'
  function xss(): RequestHandler
  export = xss
}

declare module 'hpp' {
  import { RequestHandler } from 'express'
  function hpp(): RequestHandler
  export = hpp
}

declare module 'express-rate-limit' {
  import { RequestHandler } from 'express'
  
  interface RateLimitOptions {
    windowMs?: number
    max?: number | ((req: any) => number)
    message?: string | object
    statusCode?: number
    headers?: boolean
    skipSuccessfulRequests?: boolean
    skipFailedRequests?: boolean
    keyGenerator?: (req: any) => string
    handler?: (req: any, res: any) => void
    onLimitReached?: (req: any, res: any) => void
    standardHeaders?: boolean
    legacyHeaders?: boolean
  }
  
  function rateLimit(options?: RateLimitOptions): RequestHandler
  export = rateLimit
}

declare module 'express-graphql' {
  import { RequestHandler } from 'express'
  import { GraphQLSchema } from 'graphql'
  
  interface GraphQLHTTPOptions {
    schema: GraphQLSchema
    rootValue?: any
    graphiql?: boolean
    pretty?: boolean
    formatError?: (error: any) => any
    customFormatErrorFn?: (error: any) => any
  }
  
  function graphqlHTTP(options: GraphQLHTTPOptions): RequestHandler
  export { graphqlHTTP }
}

declare module 'cookie-parser' {
  import { RequestHandler } from 'express'
  function cookieParser(secret?: string | string[], options?: any): RequestHandler
  export = cookieParser
}

declare module 'morgan' {
  import { RequestHandler } from 'express'
  function morgan(format: string, options?: any): RequestHandler
  export = morgan
}

declare module 'compression' {
  import { RequestHandler } from 'express'
  function compression(options?: any): RequestHandler
  export = compression
}

declare module 'body-parser' {
  import { RequestHandler } from 'express'
  function json(options?: any): RequestHandler
  function urlencoded(options?: any): RequestHandler
  export { json, urlencoded }
}

declare module 'dotenv' {
  interface DotenvConfigOptions {
    path?: string
    encoding?: string
    debug?: boolean
    override?: boolean
  }
  
  function config(options?: DotenvConfigOptions): void
  export { config }
}

declare module 'bcryptjs' {
  function hash(data: string, saltOrRounds: string | number): Promise<string>
  function compare(data: string, encrypted: string): Promise<boolean>
  function genSalt(rounds?: number): Promise<string>
  function hashSync(data: string, saltOrRounds: string | number): string
  function compareSync(data: string, encrypted: string): boolean
  function genSaltSync(rounds?: number): string
}

declare module 'jose' {
  export class SignJWT {
    constructor(payload: any)
    setProtectedHeader(header: any): SignJWT
    setIssuedAt(): SignJWT
    setExpirationTime(time: string): SignJWT
    sign(key: Uint8Array): Promise<string>
  }
  
  export function jwtVerify(token: string, key: Uint8Array): Promise<{ payload: any }>
}

declare module 'uuid' {
  export function v4(): string
}

// Extend Express Request interface
declare namespace Express {
  interface Request {
    id?: string
  }
} 