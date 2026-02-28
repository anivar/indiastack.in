# Corrigibility Manifest Tools (v1.6)

Reference implementations for signing and verifying corrigibility assessment manifests.

## Quick Start

### Node.js

```bash
# Install dependencies
npm install tweetnacl

# Sign a manifest
node sign-manifest.mjs assessment.json <private-key-hex> <did:key:...>

# Verify a signed manifest
node verify-manifest.mjs assessment-signed.json [public-key-hex]
```

### Python

```bash
# Install dependencies
pip install pynacl base58

# Sign a manifest
python sign_manifest.py assessment.json <private-key-hex> <did:key:...>

# Verify a signed manifest
python verify_manifest.py assessment-signed.json [public-key-hex]
```

## Test Keys (DO NOT USE IN PRODUCTION)

```
Private key (hex): 8a88e3dd7409f195fd52db2d3cba5d72ca6709bf1d94121bf3748801b40f6f5c
Public key (hex):  8680c2f86236314f8d55b086e492b4a536551b32d2948286a11e86a9f451f284
DID:              did:key:z6MkhaXgBZDvotTqN8cxYx89dJqD6Qc28x5wYt9tFv4dF
```

## Example: Full Signing Flow

```bash
# Create a minimal test manifest
cat > test-manifest.json << 'EOF'
{
  "target": "did:web:example.org",
  "assessed_by": {
    "name": "Test Auditor",
    "key_id": "did:key:z6MkhaXgBZDvotTqN8cxYx89dJqD6Qc28x5wYt9tFv4dF"
  },
  "assessed_at": "2026-01-15",
  "tests": {
    "exit": { "pass": true },
    "code": { "pass": true },
    "audit": { "pass": true },
    "govern": { "pass": true },
    "fork": { "pass": true }
  },
  "determination": {
    "corrigible": true,
    "tests_passed": 5
  }
}
EOF

# Sign it
node sign-manifest.mjs test-manifest.json \
  8a88e3dd7409f195fd52db2d3cba5d72ca6709bf1d94121bf3748801b40f6f5c \
  did:key:z6MkhaXgBZDvotTqN8cxYx89dJqD6Qc28x5wYt9tFv4dF

# Verify it
node verify-manifest.mjs test-manifest-signed.json
```

## Verification Status Codes

| Status | Exit Code | Meaning |
|--------|-----------|---------|
| VERIFIED | 0 | Signature valid, key resolved, determination consistent |
| INVALID | 1 | Signature fails or determination inconsistent |
| KEY_UNRESOLVABLE | 1 | DID could not be resolved |

## Implementation Notes

### JCS Canonicalization (RFC 8785)

Both implementations include inline RFC 8785 canonicalizers. Key rules:
- Object keys sorted by Unicode code points
- No whitespace between tokens
- Numbers in shortest decimal form
- Strings with minimal JSON escaping

### DID Resolution

- `did:key:z...` — Resolved inline (multibase base58btc + multicodec Ed25519)
- `did:web:...` — NOT resolved (requires HTTP fetch to `/.well-known/did.json`)

For production, implement full DID resolution or use a DID resolver library.

### Signature Scope

The signature covers the SHA-256 hash of the canonical JSON **excluding** the `assessor_signature` field itself. This allows the signature to be embedded in the document.

## Security Considerations

1. **Key Management**: Store private keys securely. Consider hardware security modules (HSMs) for production.
2. **DID Verification**: Always verify the key_id resolves to a trusted auditor.
3. **Evidence Snapshots**: Ensure all evidence URLs have corresponding snapshots.
4. **Timestamp Validation**: Verify `signature_time` is recent and plausible.
