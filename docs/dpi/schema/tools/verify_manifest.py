#!/usr/bin/env python3
"""
Corrigibility Manifest Verifier (v1.6)

Verifies a signed corrigibility assessment manifest.

Usage:
    python verify_manifest.py <signed-manifest.json> [public-key-hex]

If public-key-hex is not provided, the script will attempt to resolve
the key_id DID (did:key only; did:web requires external resolution).

Dependencies:
    pip install pynacl base58
"""

import sys
import json
import hashlib
from base64 import b64decode
from pathlib import Path


def canonicalize(obj):
    """RFC 8785 JSON Canonicalization Scheme implementation."""
    if obj is None:
        return 'null'
    if isinstance(obj, bool):
        return 'true' if obj else 'false'
    if isinstance(obj, int):
        return str(obj)
    if isinstance(obj, float):
        if obj == float('inf') or obj == float('-inf') or obj != obj:
            raise ValueError('Cannot canonicalize Infinity or NaN')
        s = repr(obj)
        if s.endswith('.0'):
            s = s[:-2]
        return s
    if isinstance(obj, str):
        return json.dumps(obj, ensure_ascii=False)
    if isinstance(obj, list):
        return '[' + ','.join(canonicalize(item) for item in obj) + ']'
    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys())
        parts = []
        for key in sorted_keys:
            value = obj[key]
            if value is not None:
                parts.append(json.dumps(key, ensure_ascii=False) + ':' + canonicalize(value))
        return '{' + ','.join(parts) + '}'
    raise TypeError(f'Cannot canonicalize type {type(obj)}')


def resolve_did_key(did_key: str) -> bytes:
    """Resolve did:key to public key bytes."""
    if not did_key.startswith('did:key:z'):
        raise ValueError('Only did:key with multibase z (base58btc) is supported')

    multibase_encoded = did_key[len('did:key:'):]
    if multibase_encoded[0] != 'z':
        raise ValueError('Expected multibase prefix z (base58btc)')

    try:
        import base58
    except ImportError:
        raise ImportError('base58 not installed. Run: pip install base58')

    decoded = base58.b58decode(multibase_encoded[1:])

    # Ed25519 multicodec prefix is 0xed01
    if len(decoded) < 2 or decoded[0] != 0xed or decoded[1] != 0x01:
        raise ValueError('Expected Ed25519 multicodec prefix (0xed01)')

    return bytes(decoded[2:])  # 32-byte public key


def main():
    if len(sys.argv) < 2:
        print('Usage: python verify_manifest.py <signed-manifest.json> [public-key-hex]')
        sys.exit(1)

    manifest_path = Path(sys.argv[1])
    public_key_hex = sys.argv[2] if len(sys.argv) > 2 else None

    # Import pynacl
    try:
        from nacl.signing import VerifyKey
        from nacl.exceptions import BadSignature
    except ImportError:
        print('Error: pynacl not installed. Run: pip install pynacl')
        sys.exit(1)

    # Read manifest
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Extract signature block
    assessor_signature = manifest.get('assessor_signature')
    if not assessor_signature:
        print('INVALID: No assessor_signature found')
        sys.exit(1)

    manifest_without_sig = {k: v for k, v in manifest.items() if k != 'assessor_signature'}

    print('=== Manifest Verification ===')
    print()
    print(f'Target: {manifest.get("target")}')
    assessed_by = manifest.get('assessed_by', {})
    if isinstance(assessed_by, dict):
        print(f'Assessed by: {assessed_by.get("name", "(unknown)")}')
    else:
        print(f'Assessed by: {assessed_by}')
    print(f'Key ID: {assessor_signature.get("key_id")}')
    print(f'Signature time: {assessor_signature.get("signature_time")}')
    print()

    # Check key_id match
    if isinstance(assessed_by, dict):
        if assessed_by.get('key_id') != assessor_signature.get('key_id'):
            print('INVALID: assessed_by.key_id does not match assessor_signature.key_id')
            print(f'  assessed_by.key_id: {assessed_by.get("key_id")}')
            print(f'  assessor_signature.key_id: {assessor_signature.get("key_id")}')
            sys.exit(1)
        print('Key ID match: PASS')

    # Canonicalize
    canonical = canonicalize(manifest_without_sig)
    print(f'Canonical length: {len(canonical)} bytes')

    # Hash
    hash_bytes = hashlib.sha256(canonical.encode('utf-8')).digest()
    print(f'SHA-256 (hex): {hash_bytes.hex()}')

    # Get public key
    if public_key_hex:
        public_key = bytes.fromhex(public_key_hex)
        print('Public key: provided via CLI')
    elif assessor_signature.get('key_id', '').startswith('did:key:'):
        try:
            public_key = resolve_did_key(assessor_signature['key_id'])
            print('Public key: resolved from did:key')
        except Exception as e:
            print(f'KEY_UNRESOLVABLE: {e}')
            sys.exit(1)
    else:
        print('KEY_UNRESOLVABLE: did:web resolution not implemented. Provide public key via CLI.')
        sys.exit(1)

    print(f'Public key (hex): {public_key.hex()}')

    # Verify signature
    signature = b64decode(assessor_signature['signature'])

    if len(signature) != 64:
        print(f'INVALID: Signature must be 64 bytes, got {len(signature)}')
        sys.exit(1)

    try:
        verify_key = VerifyKey(public_key)
        # Ed25519 verification: verify signature over hash
        verify_key.verify(hash_bytes, signature)
        valid = True
    except BadSignature:
        valid = False

    print()
    if valid:
        print('=== VERIFIED ===')

        # Check determination consistency
        tests = manifest.get('tests', {})
        tests_passed = sum(1 for t in ['exit', 'code', 'audit', 'govern', 'fork']
                          if tests.get(t, {}).get('pass') is True)

        determination = manifest.get('determination', {})
        if determination.get('tests_passed') != tests_passed:
            print('WARNING: determination.tests_passed is inconsistent')
            print(f'  Declared: {determination.get("tests_passed")}')
            print(f'  Computed: {tests_passed}')

        expected_corrigible = tests_passed == 5
        if determination.get('corrigible') != expected_corrigible:
            print('WARNING: determination.corrigible is inconsistent')
            print(f'  Declared: {determination.get("corrigible")}')
            print(f'  Should be: {expected_corrigible}')

        sys.exit(0)
    else:
        print('=== INVALID ===')
        print('Signature verification failed')
        sys.exit(1)


if __name__ == '__main__':
    main()
