import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.ts';

// Use DATABASE_URL or default to local portable SQLite database file 'cbt_spanju.db'
const dbUrl = process.env.DATABASE_URL || 'file:cbt_spanju.db';

export const sqliteClient = createClient({
  url: dbUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(sqliteClient, { schema });
