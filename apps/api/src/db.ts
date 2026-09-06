import './env.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import argon2 from 'argon2';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function file(n: string) {
  return readFile(join(process.cwd(), '../../db', n), 'utf8');
}

export async function migrate() {
  const c = await pool.connect();
  try {
    await c.query(await file('001_init.sql'));
  } finally {
    c.release();
  }
}

export async function seed() {
  const c = await pool.connect();
  try {
    await c.query(await file('002_seed.sql'));

    const h = await argon2.hash('Demo@12345', {
      type: argon2.argon2id
    });

    await c.query(
      `INSERT INTO users(salon_id,name,email,password_hash,role)
       VALUES
       ($1,'SALORA Owner','owner@salora.demo',$2,'SALON_OWNER'),
       ($1,'Front Desk','reception@salora.demo',$2,'RECEPTIONIST')
       ON CONFLICT(salon_id,email)
       DO UPDATE SET password_hash=EXCLUDED.password_hash`,
      ['11111111-1111-1111-1111-111111111111', h]
    );
  } finally {
    c.release();
  }
}

if (process.argv[2] === 'migrate') await migrate();
if (process.argv[2] === 'seed') await seed();
if (process.argv[2]) await pool.end();