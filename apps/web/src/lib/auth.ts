import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@cryptopilot/db";

export const SESSION_COOKIE = "cp_session";
const SESSION_TTL_DAYS = 30;
const BCRYPT_COST = 11;

export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifySecret(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/** Normaliza respuestas a preguntas: trim + lowercase + colapso de espacios. */
export function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Normaliza email: trim + lowercase. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export interface SessionUser {
  id: string;
  email: string;
}

export async function createSession(opts: {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000);
  await prisma.session.create({
    data: {
      userId: opts.userId,
      token,
      expiresAt,
      userAgent: opts.userAgent ?? null,
      ipAddress: opts.ipAddress ?? null,
    },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Devuelve el user de la sesión actual, o null si no hay sesión válida. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true, user: { select: { id: true, email: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

/** Cuenta de usuarios — usado para decidir si mostrar /setup. */
export async function userCount(): Promise<number> {
  return prisma.user.count();
}
