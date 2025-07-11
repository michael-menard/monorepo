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

declare module 'cookie-parser' {
  import { RequestHandler } from 'express'
  function cookieParser(secret?: string | string[], options?: any): RequestHandler
  export = cookieParser
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