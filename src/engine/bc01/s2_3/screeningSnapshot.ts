// src/engine/bc01/s2_3/screeningSnapshot.ts
// Tamper-detection utilities for MethodologySnapshot (SHA-256, sync pure-JS)

import type { MethodologySnapshot, ScreeningCriterion } from "./screeningTypes";

// ── Stable JSON serialization ─────────────────────────────────────────────────

/**
 * Deterministic JSON serialization: keys sorted recursively.
 * Required so that the same logical object always produces the same hash
 * regardless of key insertion order.
 */
export function stableStringify(obj: unknown): string {
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) =>
      JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k])
  );
  return "{" + pairs.join(",") + "}";
}

// ── Pure-JS SHA-256 (synchronous, FIPS 180-4) ─────────────────────────────────
//
// Why not SubtleCrypto?
//   SubtleCrypto.digest() is async; React reducers and synchronous validators
//   cannot await a Promise. This implementation is synchronous and correct.
//   It is used for tamper-detection (integrity), NOT for security/passwords.

const SHA256_K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08,  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** Synchronous SHA-256 of a UTF-8 string. Returns lowercase hex digest. */
export function sha256(str: string): string {
  // 1. UTF-8 encode
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      // surrogate pair
      const next = str.charCodeAt(++i);
      const cp = ((c - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }

  // 2. Pre-processing: padding
  const msgLen = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);

  // 3. Append bit-length as 64-bit big-endian (upper 32 bits assumed 0)
  const bitLen = msgLen * 8;
  bytes.push(0, 0, 0, 0);
  bytes.push(
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff
  );

  // 4. Initial hash values (first 32 bits of fractional parts of sqrt of primes)
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a;
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  // 5. Process 512-bit (64-byte) chunks
  for (let i = 0; i < bytes.length; i += 64) {
    const w: number[] = new Array(64);

    for (let j = 0; j < 16; j++) {
      w[j] =
        (bytes[i + j * 4] << 24) |
        (bytes[i + j * 4 + 1] << 16) |
        (bytes[i + j * 4 + 2] << 8) |
        bytes[i + j * 4 + 3];
    }

    for (let j = 16; j < 64; j++) {
      const s0 =
        rotr32(w[j - 15], 7) ^ rotr32(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 =
        rotr32(w[j - 2], 17) ^ rotr32(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3;
    let e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[j] + w[j]) | 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return (
    toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) +
    toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)
  );
}

// ── MethodologySnapshot factory ───────────────────────────────────────────────

/**
 * Creates a tamper-detectable MethodologySnapshot.
 *
 * The hash covers { criteria, viabilityRule, scoringMatrixSpecMeta } only —
 * NOT the version/lockedBy/lockedAt fields which are metadata.
 */
export function createMethodologySnapshot(
  criteria: ScreeningCriterion[],
  viabilityRule: MethodologySnapshot["viabilityRule"],
  scoringMatrixSpecMeta: Record<string, unknown> | undefined,
  actor: string
): MethodologySnapshot {
  const lockedAt = new Date().toISOString();

  // Hash covers only the evaluation-relevant payload
  const hashPayload = {
    criteria,
    viabilityRule,
    scoringMatrixSpecMeta: scoringMatrixSpecMeta ?? null,
  };
  const hash = sha256(stableStringify(hashPayload));

  return {
    version: lockedAt, // ISO timestamp as opaque version
    hash,
    criteria,
    viabilityRule,
    scoringMatrixSpecMeta,
    lockedBy: actor,
    lockedAt,
  };
}

// ── Snapshot validation ───────────────────────────────────────────────────────

/**
 * Re-computes the hash from the snapshot's payload and compares it to
 * snapshot.hash. Returns { valid: false } on any mismatch.
 *
 * Call this before every EVALUATE_OPTION action to detect tampering.
 */
export function validateSnapshot(
  snapshot: MethodologySnapshot
): { valid: boolean; reason?: string } {
  if (!snapshot) {
    return { valid: false, reason: "Snapshot is null or undefined" };
  }

  const hashPayload = {
    criteria: snapshot.criteria,
    viabilityRule: snapshot.viabilityRule,
    scoringMatrixSpecMeta: snapshot.scoringMatrixSpecMeta ?? null,
  };

  const expectedHash = sha256(stableStringify(hashPayload));

  if (expectedHash !== snapshot.hash) {
    return {
      valid: false,
      reason: `Hash mismatch — snapshot may have been tampered with. Expected: ${expectedHash.slice(0, 16)}… Got: ${snapshot.hash.slice(0, 16)}…`,
    };
  }

  if (!snapshot.criteria?.length) {
    return { valid: false, reason: "Snapshot contains no criteria" };
  }

  if (!snapshot.viabilityRule?.dealBreakerIds) {
    return { valid: false, reason: "Snapshot missing viabilityRule.dealBreakerIds" };
  }

  return { valid: true };
}
