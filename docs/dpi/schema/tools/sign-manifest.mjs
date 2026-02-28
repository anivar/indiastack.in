#!/usr/bin/env node
/**
 * Corrigibility Manifest Signer (v1.6)
 *
 * Signs a corrigibility assessment manifest using Ed25519 + JCS (RFC 8785).
 *
 * Usage:
 *   node sign-manifest.mjs <manifest.json> <private-key-hex> <did-key-id>
 *
 * Dependencies:
 *   npm install tweetnacl tweetnacl-util
 *
 * WARNING: Do not use test keys in production!
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

// Inline JCS implementation (RFC 8785)
function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }

  // Sort keys lexicographically by Unicode code points
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(key => {
    const value = obj[key];
    if (value === undefined) return null;
    return JSON.stringify(key) + ':' + canonicalize(value);
  }).filter(x => x !== null);

  return '{' + parts.join(',') + '}';
}

// Hex encoding/decoding
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node sign-manifest.mjs <manifest.json> <private-key-hex> <did-key-id>');
    console.error('\nExample:');
    console.error('  node sign-manifest.mjs assessment.json 8a88e3dd7409f195fd52db2d3cba5d72ca6709bf1d94121bf3748801b40f6f5c did:key:z6MkhaXgBZDvotTqN8cxYx89dJqD6Qc28x5wYt9tFv4dF');
    process.exit(1);
  }

  const [manifestPath, privateKeyHex, keyId] = args;

  // Load tweetnacl dynamically
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

  // Remove assessor_signature if present
  const { assessor_signature, ...manifestWithoutSig } = manifest;

  // Step 1: Canonicalize (JCS / RFC 8785)
  const canonical = canonicalize(manifestWithoutSig);
  console.log('Canonical JSON:');
  console.log(canonical);
  console.log('');

  // Step 2: SHA-256 hash
  const hash = createHash('sha256').update(canonical, 'utf8').digest();
  console.log('SHA-256 (hex):', hash.toString('hex'));
  console.log('SHA-256 (base64):', hash.toString('base64'));
  console.log('');

  // Step 3: Sign with Ed25519
  const privateKey = hexToBytes(privateKeyHex);

  // Ed25519 private key is 32 bytes, but tweetnacl expects 64-byte seed+public key
  // For seed-only keys, we derive the full keypair
  let keypair;
  if (privateKey.length === 32) {
    keypair = nacl.sign.keyPair.fromSeed(privateKey);
  } else if (privateKey.length === 64) {
    keypair = { secretKey: privateKey, publicKey: privateKey.slice(32) };
  } else {
    console.error('Error: Private key must be 32 bytes (seed) or 64 bytes (full key)');
    process.exit(1);
  }

  // Sign the hash bytes directly
  const signature = nacl.sign.detached(hash, keypair.secretKey);
  const signatureBase64 = bytesToBase64(signature);

  console.log('Signature (base64):', signatureBase64);
  console.log('Public key (hex):', Buffer.from(keypair.publicKey).toString('hex'));
  console.log('');

  // Step 4: Add signature block
  const signedManifest = {
    ...manifestWithoutSig,
    assessor_signature: {
      algorithm: 'Ed25519',
      signature: signatureBase64,
      key_id: keyId,
      signature_time: new Date().toISOString()
    }
  };

  // Write signed manifest
  const outputPath = manifestPath.replace('.json', '-signed.json');
  writeFileSync(outputPath, JSON.stringify(signedManifest, null, 2));
  console.log('Signed manifest written to:', outputPath);

  // Verify key_id matches assessed_by.key_id
  if (signedManifest.assessed_by?.key_id && signedManifest.assessed_by.key_id !== keyId) {
    console.warn('\nWARNING: key_id does not match assessed_by.key_id!');
    console.warn('  assessed_by.key_id:', signedManifest.assessed_by.key_id);
    console.warn('  assessor_signature.key_id:', keyId);
    console.warn('This manifest will fail validation.');
  }
}

main().catch(console.error);
