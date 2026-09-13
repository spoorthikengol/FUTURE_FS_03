import './env.js';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import pg from 'pg';
import argon2 from 'argon2';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function file(name: string): Promise<string> {
  return readFile(
    join(process.cwd(), '../../db', name),
    'utf8',
  );
}

export async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      await file('001_init.sql'),
    );

    await client.query('COMMIT');

    console.log(
      'SALORA base database migration completed.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function migrateLedger(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    /*
     * The ledger schema lives in its own migration file.
     *
     * Keeping the SQL in db/003_decision_outcome_ledger.sql
     * avoids having two different definitions of the same
     * database schema.
     */
    await client.query(
      await file(
        '003_decision_outcome_ledger.sql',
      ),
    );

    await client.query('COMMIT');

    console.log(
      'SALORA Decision Outcome Ledger migration completed.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      await file('002_seed.sql'),
    );

    const passwordHash =
      await argon2.hash('Demo@12345', {
        type: argon2.argon2id,
      });

    await client.query(
      `
        INSERT INTO users (
          salon_id,
          name,
          email,
          password_hash,
          role
        )
        VALUES
          (
            $1,
            'SALORA Owner',
            'owner@salora.demo',
            $2,
            'SALON_OWNER'
          ),
          (
            $1,
            'Front Desk',
            'reception@salora.demo',
            $2,
            'RECEPTIONIST'
          )
        ON CONFLICT (
          salon_id,
          email
        )
        DO UPDATE SET
          password_hash = EXCLUDED.password_hash
      `,
      [
        '11111111-1111-1111-1111-111111111111',
        passwordHash,
      ],
    );

    await client.query('COMMIT');

    console.log(
      'SALORA database seed completed.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function testConnection(): Promise<void> {
  const result = await pool.query<{
    now: Date;
  }>('SELECT now()');

  console.log(
    `PostgreSQL connected: ${result.rows[0]?.now.toISOString()}`,
  );
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      await migrate();
      break;

    case 'migrate:ledger':
      await migrateLedger();
      break;

    case 'seed':
      await seed();
      break;

    case 'test':
      await testConnection();
      break;

    case undefined:
      console.log('SALORA database utility');
      console.log('');
      console.log('Available commands:');
      console.log('  npm run db:migrate');
      console.log('  npm run db:migrate:ledger');
      console.log('  npm run db:seed');
      console.log('  npm run db:test');
      break;

    default:
      console.error(
        `Unknown database command: ${command}`,
      );
      process.exitCode = 1;
  }
}

const isDatabaseUtility =
  process.argv[1]?.replaceAll('\\', '/').endsWith(
    '/apps/api/src/db.ts',
  ) ?? false;

if (isDatabaseUtility) {
  void main()
    .catch((error) => {
      console.error(
        'Database command failed.',
      );

      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }

      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}