declare module "pg" {
  export interface PoolConfig {
    connectionString: string;
  }

  export class Pool {
    constructor(config: PoolConfig);
    query<T = unknown>(queryText: string, values?: unknown[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
