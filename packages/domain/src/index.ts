export type Brand<T, N extends string> = T & { readonly __brand: N };
export type OrganizationId = Brand<string, "OrganizationId">;
export type WebsiteId = Brand<string, "WebsiteId">;
export interface Clock {
  now(): Date;
}
export interface IdGenerator<T> {
  next(): T;
}
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}
