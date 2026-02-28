# Corrigibility Schema Test Vectors (v1.6)

## Purpose

These test vectors allow implementers to verify their signature tooling against the schema specification.

## Canonical Test Vector

See `canonical-v1.6.json` for the exact test case. Implementers MUST reproduce:

```
Expected SHA-256 (hex): f4405362c9540b64d1f568601569426f30d07412f808728a504a54c9a3c9b78e
```

If your implementation produces a different hash, your JCS canonicalization is incorrect.

## Signing Workflow (RFC 8785 + Ed25519)

### Step 1: Prepare Document

Remove the `assessor_signature` block from the JSON document. The remaining content is what gets signed.

### Step 2: Canonicalize (RFC 8785)

Apply JSON Canonicalization Scheme:
- Object keys sorted lexicographically (Unicode code points)
- No whitespace between tokens
- Numbers as shortest decimal representation
- Strings as UTF-8 with minimal escaping

```bash
# Using jcs (JSON Canonicalization Scheme) tool
jcs < unsigned-document.json > canonical.json
```

### Step 3: Hash (SHA-256)

```bash
sha256sum canonical.json
# Output: <64-char hex hash>
```

### Step 4: Sign (Ed25519)

```bash
# Using signify, minisign, or similar Ed25519 tool
echo "<hash>" | signify -S -s private.key -m - -x signature.sig
```

### Step 5: Encode + Attach

Base64-encode the signature and add to the document:

```json
"assessor_signature": {
  "algorithm": "Ed25519",
  "signature": "<base64-encoded-signature>",
  "key_id": "did:key:z6Mk...",
  "signature_time": "2025-01-15T12:00:00Z"
}
```

## Verification Workflow

### Step 1: Extract Signature Block

Parse and remove `assessor_signature` from document.

### Step 2: Canonicalize + Hash

Same as signing steps 2-3.

### Step 3: Resolve Key

Resolve `key_id` (DID) to public key:
- `did:key:z6Mk...` — Self-describing Ed25519 key (decode multibase)
- `did:web:example.org` — Fetch `https://example.org/.well-known/did.json`

### Step 4: Verify Signature

```bash
echo "<hash>" | signify -V -p public.key -m - -x signature.sig
```

## Test Key Pair (DO NOT USE IN PRODUCTION)

This key pair is for testing only:

```
# Ed25519 Private Key (Base64)
MC4CAQAwBQYDK2VwBCIEIBxqXx7X8r8HpJmqLH5ZBcTmIvl0bMEgkb1zSqU3RQeC

# Ed25519 Public Key (Base64)
MCowBQYDK2VwAyEAJb8T1UqXN0zZ1pIxRwzwVjKFrRLAC3y1lZf8n8QMpQE=

# DID:key representation
did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

## Verification Status Codes

Dashboards should display:

| Status | Meaning |
|--------|---------|
| `VERIFIED` | Signature valid, key resolved, hash matches, assessed_by.key_id == assessor_signature.key_id |
| `INVALID` | Signature fails verification, or key_id mismatch, or determination inconsistent with tests |
| `KEY_UNRESOLVABLE` | DID could not be resolved to public key (reject until resolved) |

**Note:** Unsigned assessments are schema-invalid in v1.6. There is no `UNVERIFIED` status.

## Reference Implementations

- **Node.js**: `@stablelib/ed25519` + `canonicalize` (npm)
- **Python**: `pynacl` + `json-canonicalization`
- **Go**: `crypto/ed25519` + custom JCS
- **Rust**: `ed25519-dalek` + `serde_json_canonicalizer`
