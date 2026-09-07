import crypto from 'node:crypto';

import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { pool } from './db.js';

const SESSION_COOKIE = 'salora_session';

const SESSION_TTL_HOURS = Math.max(
  1,
  Number(process.env.SESSION_TTL_HOURS ?? 12)
);

const SESSION_TTL_SECONDS =
  SESSION_TTL_HOURS * 60 * 60;

export type AuthenticatedUser = {
  id: string;
  salonId: string;
  name: string;
  email: string;
  role: string;
};

type UserRow = {
  id: string;
  salon_id: string;
  name: string;
  email: string;
  role: string;
  password_hash: string;
  active: boolean;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Normalize email input before authentication.
 *
 * This keeps login behavior consistent regardless of
 * accidental whitespace or email casing.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Generate a cryptographically secure session token.
 *
 * The raw token is returned only to the browser and is never
 * persisted in the database.
 */
function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session token before database storage.
 *
 * If the database is ever exposed, the attacker does not
 * receive the actual browser session tokens.
 */
function hashSessionToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Convert a database user into the safe public representation.
 *
 * password_hash is deliberately excluded.
 */
function toAuthenticatedUser(
  user: Pick<
    UserRow,
    'id' | 'salon_id' | 'name' | 'email' | 'role'
  >
): AuthenticatedUser {
  return {
    id: user.id,
    salonId: user.salon_id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

/**
 * Validate the shape of a SALORA session token before querying
 * PostgreSQL.
 *
 * SALORA creates 32 random bytes encoded as hexadecimal:
 * 32 bytes × 2 = 64 hexadecimal characters.
 */
function isValidSessionToken(token: string): boolean {
  return (
    token.length === 64 &&
    /^[a-f0-9]{64}$/i.test(token)
  );
}

/**
 * Authenticate a SALORA user and create a server-side session.
 *
 * Security model:
 *
 * Browser
 *   ↓ raw session token
 * HttpOnly cookie
 *   ↓ SHA-256
 * PostgreSQL
 *   ↓
 * user + salon + role
 *
 * Passwords are verified using Argon2.
 */
export async function login(
  email: string,
  password: string
): Promise<{
  token: string;
  user: AuthenticatedUser;
} | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return null;
  }

  const { rows } = await pool.query<UserRow>(
    `
      SELECT
        id,
        salon_id,
        name,
        email,
        role,
        password_hash,
        active
      FROM users
      WHERE lower(email) = lower($1)
        AND active = true
      LIMIT 1
    `,
    [normalizedEmail]
  );

  const databaseUser = rows[0];

  if (!databaseUser) {
    return null;
  }

  let passwordValid = false;

  try {
    passwordValid = await argon2.verify(
      databaseUser.password_hash,
      password
    );
  } catch {
    /*
     * Never expose password-verification implementation
     * details to the client.
     */
    passwordValid = false;
  }

  if (!passwordValid) {
    return null;
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);

  await pool.query(
    `
      INSERT INTO sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (
        $1,
        $2,
        now() + ($3 * interval '1 second')
      )
    `,
    [
      databaseUser.id,
      tokenHash,
      SESSION_TTL_SECONDS
    ]
  );

  return {
    token,
    user: toAuthenticatedUser(databaseUser)
  };
}

/**
 * Set the authenticated SALORA session cookie.
 *
 * httpOnly prevents JavaScript from reading the token.
 * secure is enabled automatically in production.
 * sameSite=lax provides CSRF protection for normal navigation.
 */
export function setSessionCookie(
  reply: FastifyReply,
  token: string
): void {
  reply.setCookie(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS
    }
  );
}

/**
 * Remove the browser session cookie.
 */
function clearSessionCookie(
  reply: FastifyReply
): void {
  reply.clearCookie(
    SESSION_COOKIE,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    }
  );
}

/**
 * Authentication middleware.
 *
 * Resolves the browser session to the current user.
 *
 * Important:
 * The salon_id is loaded from the authenticated session
 * and becomes the trusted tenant boundary for downstream
 * API queries.
 */
export async function user(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];

  if (!token) {
    await reply
      .code(401)
      .send({
        error: 'Authentication required'
      });

    return;
  }

  if (!isValidSessionToken(token)) {
    clearSessionCookie(reply);

    await reply
      .code(401)
      .send({
        error: 'Invalid session'
      });

    return;
  }

  const tokenHash = hashSessionToken(token);

  const { rows } = await pool.query<{
    id: string;
    salon_id: string;
    name: string;
    email: string;
    role: string;
  }>(
    `
      SELECT
        u.id,
        u.salon_id,
        u.name,
        u.email,
        u.role
      FROM sessions s
      INNER JOIN users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.active = true
      LIMIT 1
    `,
    [tokenHash]
  );

  const databaseUser = rows[0];

  if (!databaseUser) {
    clearSessionCookie(reply);

    await reply
      .code(401)
      .send({
        error: 'Session expired'
      });

    return;
  }

  req.user = toAuthenticatedUser(databaseUser);
}

/**
 * Destroy the current server-side session.
 *
 * Logging out therefore invalidates the session immediately
 * instead of merely deleting the browser cookie.
 */
export async function logout(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];

  if (
    token &&
    isValidSessionToken(token)
  ) {
    const tokenHash = hashSessionToken(token);

    await pool.query(
      `
        DELETE FROM sessions
        WHERE token_hash = $1
      `,
      [tokenHash]
    );
  }

  clearSessionCookie(reply);

  await reply.code(204).send();
}

/**
 * Remove expired sessions.
 *
 * This can later be called by a scheduled maintenance job.
 * It is intentionally separate from login so authentication
 * never depends on cleanup succeeding.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const result = await pool.query(
    `
      DELETE FROM sessions
      WHERE expires_at <= now()
    `
  );

  return result.rowCount ?? 0;
}