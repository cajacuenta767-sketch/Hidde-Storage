import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no esta configurada');
}

const globalForDatabase = globalThis as unknown as {
  doraPassSql?: ReturnType<typeof postgres>;
};

export const sqlClient =
  globalForDatabase.doraPassSql ??
  postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.doraPassSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
