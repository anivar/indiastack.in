#!/usr/bin/env node
/**
 * Corrigibility Manifest Verifier (v1.6)
 *
 * Verifies a signed corrigibility assessment manifest.
 *
 * Usage:
 *   node verify-manifest.mjs <signed-manifest.json> [public-key-hex]
 *
 * If public-key-hex is not provided, the script will attempt to resolve
 * the key_id DID (did:key only; did:web requires external resolution).
 *
 * Dependencies:
 *   npm install tweetnacl
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// Inline JCS implementation (RFC 8785)
function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(key => {
    const value = obj[key];
    if (value === undefined) return null;
    return JSON.stringify(key) + ':' + canonicalize(value);
  }).filter(x => x !== null);

  return '{' + parts.join(',') + '}';
}

// Hex/Base64 utilities
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64) {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

// Multibase decoder for did:key (z = base58btc)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(str) {
  let result = BigInt(0);
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`);
    result = result * BigInt(58) + BigInt(index);
  }
  const bytes = [];
  while (result > 0) {
    bytes.unshift(Number(result % BigInt(256)));
    result = result / BigInt(256);
  }
  // Handle leading zeros
  for (const char of str) {
    if (char === '1') bytes.unshift(0);
    else break;
  }
  return new Uint8Array(bytes);
}

// Resolve did:key to public key bytes
function resolveDidKey(didKey) {
  if (!didKey.startsWith('did:key:z')) {
    throw new Error('Only did:key with multibase z (base58btc) is supported');
  }
  const multibaseEncoded = didKey.slice('did:key:'.length);
  if (multibaseEncoded[0] !== 'z') {
    throw new Error('Expected multibase prefix z (base58btc)');
  }
  const decoded = base58Decode(multibaseEncoded.slice(1));

  // Ed25519 multicodec prefix is 0xed01
  if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('Expected Ed25519 multicodec prefix (0xed01)');
  }

  return decoded.slice(2); // 32-byte public key
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node verify-manifest.mjs <signed-manifest.json> [public-key-hex]');
    process.exit(1);
  }

  const [manifestPath, publicKeyHex] = args;

  // Load tweetnacl
  let nacl;
  try {
    nacl = (await import('tweetnacl')).default;
  } catch (e) {
    console.error('Error: tweetnacl not installed. Run: npm install tweetnacl');
    process.exit(1);
  }

  // Read manifest
  const manifestText = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);

  // Extract signature block
  const { assessor_signature, ...manifestWithoutSig } = manifest;

  if (!assessor_signature) {
    console.error('INVALID: No assessor_signature found');
    process.exit(1);
  }

  console.log('=== Manifest Verification ===\n');
  console.log('Target:', manifest.target);
  console.log('Assessed by:', manifest.assessed_by?.name || '(unknown)');
  console.log('Key ID:', assessor_signature.key_id);
  console.log('Signature time:', assessor_signature.signature_time);
  console.log('');

  // Check key_id match
  if (manifest.assessed_by?.key_id !== assessor_signature.key_id) {
    console.error('INVALID: assessed_by.key_id does not match assessor_signature.key_id');
    console.error('  assessed_by.key_id:', manifest.assessed_by?.key_id);
    console.error('  assessor_signature.key_id:', assessor_signature.key_id);
    process.exit(1);
  }
  console.log('Key ID match: PASS');

  // Canonicalize
  const canonical = canonicalize(manifestWithoutSig);
  console.log('Canonical length:', canonical.length, 'bytes');

  // Hash
  const hash = createHash('sha256').update(canonical, 'utf8').digest();
  console.log('SHA-256 (hex):', hash.toString('hex'));

  // Get public key
  let publicKey;
  if (publicKeyHex) {
    publicKey = hexToBytes(publicKeyHex);
    console.log('Public key: provided via CLI');
  } else if (assessor_signature.key_id.startsWith('did:key:')) {
    try {
      publicKey = resolveDidKey(assessor_signature.key_id);
      console.log('Public key: resolved from did:key');
    } catch (e) {
      console.error('KEY_UNRESOLVABLE:', e.message);
      process.exit(1);
    }
  } else {
    console.error('KEY_UNRESOLVABLE: did:web resolution not implemented. Provide public key via CLI.');
    process.exit(1);
  }

  console.log('Public key (hex):', Buffer.from(publicKey).toString('hex'));

  // Verify signature
  const signature = base64ToBytes(assessor_signature.signature);

  if (signature.length !== 64) {
    console.error('INVALID: Signature must be 64 bytes, got', signature.length);
    process.exit(1);
  }

  const valid = nacl.sign.detached.verify(hash, signature, publicKey);

  console.log('');
  if (valid) {
    console.log('=== VERIFIED ===');

    // Check determination consistency
    const testsPassed = ['exit', 'code', 'audit', 'govern', 'fork']
      .filter(t => manifest.tests?.[t]?.pass === true).length;

    if (manifest.determination?.tests_passed !== testsPassed) {
      console.warn('WARNING: determination.tests_passed is inconsistent');
      console.warn('  Declared:', manifest.determination?.tests_passed);
      console.warn('  Computed:', testsPassed);
    }

    if (manifest.determination?.corrigible !== (testsPassed === 5)) {
      console.warn('WARNING: determination.corrigible is inconsistent');
      console.warn('  Declared:', manifest.determination?.corrigible);
      console.warn('  Should be:', testsPassed === 5);
    }

    process.exit(0);
  } else {
    console.log('=== INVALID ===');
    console.log('Signature verification failed');
    process.exit(1);
  }
}

main().catch(console.error);
