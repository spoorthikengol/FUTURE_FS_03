import crypto from 'node:crypto';

import argon2 from 'argon2';
import type {
  FastifyReply,
  FastifyRequest,
} from 'fastify';

import { pool } from './db.js';

const SESSION_COOKIE = 'salora_session';

const DEFAULT_SESSION_TTL_HOURS = 12;
const MIN_SESSION_TTL_HOURS = 1;
const MAX_SESSION_TTL_HOURS = 24;

const parsedSessionTtl = Number(
  process.env.SESSION_TTL_HOURS ??
    DEFAULT_SESSION_TTL_HOURS,
);

const SESSION_TTL_HOURS = Number.isFinite(
  parsedSessionTtl,
)
  ? Math.min(
      MAX_SESSION_TTL_HOURS,
      Math.max(
        MIN_SESSION_TTL_HOURS,
        parsedSessionTtl,
      ),
    )
  : DEFAULT_SESSION_TTL_HOURS;

const SESSION_TTL_SECONDS =
  Math.floor(SESSION_TTL_HOURS * 60 * 60);

const SESSION_TOKEN_BYTES = 32;
const SESSION_TOKEN_HEX_LENGTH =
  SESSION_TOKEN_BYTES * 2;

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Generate a cryptographically secure opaque session token.
 *
 * 32 random bytes = 256 bits of entropy.
 */
function createSessionToken(): string {
  return crypto
    .randomBytes(SESSION_TOKEN_BYTES)
    .toString('hex');
}

/**
 * Hash the session token before it is persisted.
 *
 * The raw token exists only in the browser cookie and the
 * current request lifecycle.
 */
function hashSessionToken(
  token: string,
): string {
  return crypto
    .createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

function toAuthenticatedUser(
  user: Pick<
    UserRow,
    | 'id'
    | 'salon_id'
    | 'name'
    | 'email'
    | 'role'
  >,
): AuthenticatedUser {
  return {
    id: user.id,
    salonId: user.salon_id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function isValidSessionToken(
  token: string,
): boolean {
  return (
    typeof token === 'string' &&
    token.length === SESSION_TOKEN_HEX_LENGTH &&
    /^[a-f0-9]+$/i.test(token)
  );
}

/**
 * Remove the browser session cookie.
 */
function clearSessionCookie(
  reply: FastifyReply,
): void {
  reply.clearCookie(
    SESSION_COOKIE,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  );
}

/**
 * Set the authenticated session cookie.
 */
export function setSessionCookie(
  reply: FastifyReply,
  token: string,
): void {
  if (!isValidSessionToken(token)) {
    throw new Error(
      'Cannot set an invalid session token.',
    );
  }

  reply.setCookie(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    },
  );
}

/**
 * Authenticate credentials and create a new server-side
 * session.
 *
 * Security model:
 *
 * Password
 *    ↓ Argon2 verification
 * User
 *    ↓
 * Random session token
 *    ↓ SHA-256
 * Database session
 *    ↓
 * HttpOnly browser cookie
 */
export async function login(
  email: string,
  password: string,
): Promise<{
  token: string;
  user: AuthenticatedUser;
} | null> {
  const normalizedEmail =
    normalizeEmail(email);

  if (
    normalizedEmail.length === 0 ||
    password.length === 0
  ) {
    return null;
  }

  /*
   * Deliberately return the same null result for:
   * - unknown email
   * - inactive user
   * - incorrect password
   *
   * This avoids exposing which account identifiers exist.
   */
  const { rows } =
    await pool.query<UserRow>(
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
        WHERE lower(email) = $1
          AND active = true
        LIMIT 1
      `,
      [normalizedEmail],
    );

  const databaseUser = rows[0];

  if (!databaseUser) {
    return null;
  }

  let passwordValid = false;

  try {
    passwordValid =
      await argon2.verify(
        databaseUser.password_hash,
        password,
      );
  } catch {
    /*
     * Never expose Argon2 implementation details.
     */
    passwordValid = false;
  }

  if (!passwordValid) {
    return null;
  }

  /*
   * Session rotation:
   *
   * Every successful login receives a completely new
   * random token. No client-controlled session identifier
   * is ever reused.
   */
  const token =
    createSessionToken();

  const tokenHash =
    hashSessionToken(token);

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
        now() +
          ($3 * interval '1 second')
      )
    `,
    [
      databaseUser.id,
      tokenHash,
      SESSION_TTL_SECONDS,
    ],
  );

  return {
    token,
    user:
      toAuthenticatedUser(
        databaseUser,
      ),
  };
}

/**
 * Resolve the authenticated user from the server-side
 * session.
 *
 * The tenant boundary comes from the database-backed
 * authenticated session rather than request parameters.
 */
export async function user(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token =
    req.cookies?.[SESSION_COOKIE];

  if (!token) {
    await reply
      .code(401)
      .send({
        error:
          'Authentication required',
      });

    return;
  }

  if (
    !isValidSessionToken(token)
  ) {
    clearSessionCookie(reply);

    await reply
      .code(401)
      .send({
        error: 'Invalid session',
      });

    return;
  }

  const tokenHash =
    hashSessionToken(token);

  const { rows } =
    await pool.query<{
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
      [tokenHash],
    );

  const databaseUser =
    rows[0];

  if (!databaseUser) {
    clearSessionCookie(reply);

    await reply
      .code(401)
      .send({
        error:
          'Session expired',
      });

    return;
  }

  req.user =
    toAuthenticatedUser(
      databaseUser,
    );
}

/**
 * Destroy the current server-side session.
 *
 * Deleting the database session makes the token unusable
 * even if the browser cookie still exists.
 */
export async function logout(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token =
    req.cookies?.[SESSION_COOKIE];

  if (
    token &&
    isValidSessionToken(token)
  ) {
    const tokenHash =
      hashSessionToken(token);

    await pool.query(
      `
        DELETE FROM sessions
        WHERE token_hash = $1
      `,
      [tokenHash],
    );
  }

  clearSessionCookie(reply);

  await reply
    .code(204)
    .send();
}

/**
 * Remove expired sessions.
 *
 * Cleanup is intentionally independent from authentication.
 * A cleanup failure must never prevent a valid user from
 * authenticating.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const result =
    await pool.query(
      `
        DELETE FROM sessions
        WHERE expires_at <= now()
      `,
    );

  return result.rowCount ?? 0;
}