declare module "pg" {
  export class Pool {
    constructor(config?: unknown);
    connect(): Promise<unknown>;
    end(): Promise<void>;
    query<T = unknown>(sql: unknown, params?: unknown[]): Promise<T>;
  }
}
