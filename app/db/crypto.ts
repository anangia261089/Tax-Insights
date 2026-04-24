import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { getEnv } from "@/app/lib/env";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer {
  const raw = getEnv("ENCRYPTION_MASTER_KEY");
  if (!raw) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY is not set. Generate with: openssl rand -hex 32"
    );
  }
  if (raw.length < 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be at least 32 characters");
  }
  // Accept either hex or raw; normalise to 32 bytes via HKDF
  return Buffer.from(raw, raw.length === 64 ? "hex" : "utf8");
}

function deriveTenantKey(tenantId: string): Buffer {
  const master = getMasterKey();
  const salt = Buffer.from(tenantId, "utf8");
  const info = Buffer.from("jax-chat-v1", "utf8");
  return Buffer.from(hkdfSync("sha256", master, salt, info, KEY_LEN));
}

export function encryptForTenant(tenantId: string, plaintext: string): string {
  const key = deriveTenantKey(tenantId);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ct.toString("base64"), tag.toString("base64")].join(":");
}

export function decryptForTenant(tenantId: string, payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }
  const [ivB64, ctB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Invalid ciphertext components");
  }
  const key = deriveTenantKey(tenantId);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function encryptJson(tenantId: string, obj: unknown): string {
  return encryptForTenant(tenantId, JSON.stringify(obj));
}

export function decryptJson<T = unknown>(tenantId: string, payload: string): T {
  return JSON.parse(decryptForTenant(tenantId, payload)) as T;
}
