import Knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || './homehub.db';

// In production (compiled), __dirname is dist/db/ — migrations are at src/server/db/migrations
// In development, __dirname is src/server/db/ — migrations are at src/server/db/migrations
function resolveDbSubdir(subdir: string) {
  if (__dirname.includes('/dist/')) {
    return path.resolve(__dirname, '../../db', subdir);
  }
  return path.join(__dirname, subdir);
}

export const knex = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: resolveDbSubdir('migrations'),
  },
  seeds: {
    directory: resolveDbSubdir('seeds'),
  },
});

export default knex;
