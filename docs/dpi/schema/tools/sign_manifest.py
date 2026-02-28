#!/usr/bin/env python3
"""
Corrigibility Manifest Signer (v1.6)

Signs a corrigibility assessment manifest using Ed25519 + JCS (RFC 8785).

Usage:
    python sign_manifest.py <manifest.json> <private-key-hex> <did-key-id>

Dependencies:
    pip install pynacl

WARNING: Do not use test keys in production!
"""

import sys
import json
import hashlib
from datetime import datetime, timezone
from base64 import b64encode
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
        # Handle special float cases per RFC 8785
        if obj == float('inf') or obj == float('-inf') or obj != obj:  # NaN check
            raise ValueError('Cannot canonicalize Infinity or NaN')
        # Use shortest decimal representation
        s = repr(obj)
        if s.endswith('.0'):
            s = s[:-2]
        return s
    if isinstance(obj, str):
        return json.dumps(obj, ensure_ascii=False)
    if isinstance(obj, list):
        return '[' + ','.join(canonicalize(item) for item in obj) + ']'
    if isinstance(obj, dict):
        # Sort keys by Unicode code points (Python's default string sort)
        sorted_keys = sorted(obj.keys())
        parts = []
        for key in sorted_keys:
            value = obj[key]
            if value is not None:  # Skip None values
                parts.append(json.dumps(key, ensure_ascii=False) + ':' + canonicalize(value))
        return '{' + ','.join(parts) + '}'
    raise TypeError(f'Cannot canonicalize type {type(obj)}')


def main():
    if len(sys.argv) < 4:
        print('Usage: python sign_manifest.py <manifest.json> <private-key-hex> <did-key-id>')
        print()
        print('Example:')
        print('  python sign_manifest.py assessment.json 8a88e3dd...5c did:key:z6Mkha...')
        sys.exit(1)

    manifest_path = Path(sys.argv[1])
    private_key_hex = sys.argv[2]
    key_id = sys.argv[3]

    # Import pynacl
    try:
        from nacl.signing import SigningKey
    except ImportError:
        print('Error: pynacl not installed. Run: pip install pynacl')
        sys.exit(1)

    # Read manifest
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Remove assessor_signature if present
    manifest_without_sig = {k: v for k, v in manifest.items() if k != 'assessor_signature'}

    # Step 1: Canonicalize (JCS / RFC 8785)
    canonical = canonicalize(manifest_without_sig)
    print('Canonical JSON:')
    print(canonical)
    print()

    # Step 2: SHA-256 hash
    hash_bytes = hashlib.sha256(canonical.encode('utf-8')).digest()
    print(f'SHA-256 (hex): {hash_bytes.hex()}')
    print(f'SHA-256 (base64): {b64encode(hash_bytes).decode()}')
    print()

    # Step 3: Sign with Ed25519
    private_key_bytes = bytes.fromhex(private_key_hex)

    if len(private_key_bytes) == 32:
        signing_key = SigningKey(private_key_bytes)
    else:
        print(f'Error: Private key must be 32 bytes, got {len(private_key_bytes)}')
        sys.exit(1)

    # Sign the hash bytes
    signed = signing_key.sign(hash_bytes)
    signature = signed.signature  # Just the signature, not the message
    signature_b64 = b64encode(signature).decode()

    print(f'Signature (base64): {signature_b64}')
    print(f'Public key (hex): {signing_key.verify_key.encode().hex()}')
    print()

    # Step 4: Add signature block
    signed_manifest = dict(manifest_without_sig)
    signed_manifest['assessor_signature'] = {
        'algorithm': 'Ed25519',
        'signature': signature_b64,
        'key_id': key_id,
        'signature_time': datetime.now(timezone.utc).isoformat()
    }

    # Write signed manifest
    output_path = manifest_path.with_stem(manifest_path.stem + '-signed')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(signed_manifest, f, indent=2)
    print(f'Signed manifest written to: {output_path}')

    # Verify key_id matches assessed_by.key_id
    assessed_by = signed_manifest.get('assessed_by', {})
    if isinstance(assessed_by, dict) and assessed_by.get('key_id') != key_id:
        print()
        print('WARNING: key_id does not match assessed_by.key_id!')
        print(f'  assessed_by.key_id: {assessed_by.get("key_id")}')
        print(f'  assessor_signature.key_id: {key_id}')
        print('This manifest will fail validation.')


if __name__ == '__main__':
    main()
