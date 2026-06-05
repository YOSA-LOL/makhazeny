import type { Request } from 'express'

/** Express 5 types route params as string | string[] */
export function paramId(req: Request, key = 'id'): string {
  const value = req.params[key]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
