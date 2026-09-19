import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

function encryptionKey(): Buffer {
  const key = Buffer.from(serverEnv().ENCRYPTION_KEY, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. ` +
        `Generate one with: node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}

/*
 * Envelope layout: [12-byte IV][16-byte auth tag][ciphertext].
 *
 * `aad` binds the ciphertext to where it is stored, so a refresh token cannot
 * be swapped into another user's row and still decrypt. Pass something stable
 * and specific, e.g. `${userId}:refresh_token`.
 */
export function encryptSecret(plaintext: string, aad: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptSecret(envelope: Buffer, aad: string): string {
  if (envelope.length < IV_BYTES + TAG_BYTES) {
    throw new DecryptionError("Ciphertext envelope is too short to be valid.");
  }

  const iv = envelope.subarray(0, IV_BYTES);
  const tag = envelope.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = envelope.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    /* Wrong key, wrong AAD, or tampered ciphertext are indistinguishable here. */
    throw new DecryptionError("Failed to decrypt secret: authentication check failed.");
  }
}
