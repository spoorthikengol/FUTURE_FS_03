import {config} from 'dotenv';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

// dotenv's default lookup resolves ".env" against process.cwd(). npm sets cwd to this
// workspace's own folder (apps/api) even when `npm run dev` is invoked from the project
// root, so a .env placed at the project root (as the README instructs) is silently missed
// and DATABASE_URL etc. end up undefined. Resolve explicitly instead.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(process.cwd(), '.env'),   // cwd is project root (e.g. cd apps/api not used)
  join(here, '../.env'),         // apps/api/.env
  join(here, '../../../.env')    // project root .env, regardless of cwd
];
const envPath = candidates.find(existsSync);
config(envPath ? {path: envPath} : undefined);