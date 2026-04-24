# Contract Upgrade Guide

This document covers the process for upgrading deployed Soroban contracts in the Fund-My-Cause project.

## Soroban Contract Upgradeability

Soroban supports in-place contract upgrades via the `update_current_contract_wasm` host function. This replaces the contract's WASM bytecode at the existing contract address without changing the address or losing stored state.

The crowdfund contract currently tracks its version via a compile-time constant:

```rust
// contracts/crowdfund/src/lib.rs
const CONTRACT_VERSION: u32 = 3;
```

This value is exposed through the `version()` view function and can be read by the frontend or tooling to verify which version is deployed.

### How WASM Upgrades Work

1. Compile the new contract to WASM.
2. Upload the new WASM blob to the Stellar network — this returns a WASM hash.
3. Call `update_current_contract_wasm(new_wasm_hash)` on the deployed contract.
4. The contract address stays the same; all stored state is preserved.
5. Subsequent invocations execute the new WASM.

To expose an upgrade entry point, add an `upgrade` function gated behind admin authorization:

```rust
pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
    let admin: Address = env.storage().instance().get(&KEY_ADMIN).unwrap();
    admin.require_auth();
    env.deployer().update_current_contract_wasm(new_wasm_hash);
}
```

The `KEY_ADMIN` key is already set during `initialize()`, so this pattern fits the existing storage layout.

## Data Migration Strategies

Soroban upgrades preserve all contract storage. However, if the new version changes data structures, you need a migration strategy.

### Additive Changes (No Migration Needed)

Safe changes that require no migration:
- Adding new storage keys with default values
- Adding new contract functions
- Adding new error codes
- Changing function logic without changing stored types

Example: adding a `KEY_METADATA` key in v4 — existing contracts simply won't have it set, and the new code can handle the `None` case:

```rust
let metadata: Option<String> = env.storage().instance().get(&KEY_METADATA);
let metadata = metadata.unwrap_or_else(|| String::from_str(&env, ""));
```

### Breaking Changes (Migration Required)

If a stored type changes shape (e.g., `Status` enum gains a new variant, or a struct gains a required field), add a one-time `migrate` function:

```rust
pub fn migrate(env: Env) {
    let admin: Address = env.storage().instance().get(&KEY_ADMIN).unwrap();
    admin.require_auth();

    // Example: rename a storage key
    if let Some(old_value) = env.storage().instance().get::<Symbol, OldType>(&OLD_KEY) {
        let new_value = transform(old_value);
        env.storage().instance().set(&NEW_KEY, &new_value);
        env.storage().instance().remove(&OLD_KEY);
    }
}
```

Call `migrate` once immediately after `upgrade`, then remove it in the next version.

### Storage Key Stability

The current contract uses `symbol_short!` macros for storage keys (e.g., `"CREATOR"`, `"TOKEN"`, `"GOAL"`). These must remain stable across upgrades — changing a key name is equivalent to deleting the old data.

Keep a key registry in comments or a separate doc:

| Key | Type | Since Version |
|---|---|---|
| `CREATOR` | `Address` | v1 |
| `TOKEN` | `Address` | v1 |
| `GOAL` | `i128` | v1 |
| `DEADLINE` | `u64` | v1 |
| `TOTAL` | `i128` | v1 |
| `CONTRIBS` | `Vec<Address>` | v1 |
| `STATUS` | `Status` | v1 |
| `MIN` | `i128` | v1 |
| `TITLE` | `String` | v1 |
| `DESC` | `String` | v1 |
| `SOCIAL` | `Vec<String>` | v1 |
| `PLATFORM` | `PlatformConfig` | v1 |
| `ADMIN` | `Address` | v1 |

## Versioning Best Practices

### Increment CONTRACT_VERSION on Every Upgrade

```rust
const CONTRACT_VERSION: u32 = 4; // bump from 3 → 4
```

This lets the frontend and monitoring tools detect which version is running:

```ts
const version = await simulateView(contractId, "version");
if (Number(version) < MINIMUM_SUPPORTED_VERSION) {
  console.warn(`Contract ${contractId} is running an outdated version`);
}
```

### Semantic Versioning in Cargo.toml

Bump `version` in `contracts/crowdfund/Cargo.toml` to match:

```toml
[package]
version = "0.4.0"  # was 0.2.0 for CONTRACT_VERSION 3
```

Use the convention `0.{CONTRACT_VERSION}.0` to keep them in sync.

### Changelog

Maintain a `CHANGELOG.md` or inline doc comment in `lib.rs` describing what changed in each version:

```rust
// v1: Initial release
// v2: Added platform fee support (PlatformConfig, KEY_PLATFORM)
// v3: Added accepted token whitelist (DataKey::AcceptedTokens)
// v4: Added upgrade() and migrate() entry points
const CONTRACT_VERSION: u32 = 4;
```

## Testing Procedures for Upgrades

### Unit Tests

Before deploying an upgrade, write tests that:
1. Initialize a contract with the old storage layout.
2. Call `upgrade` with the new WASM hash.
3. Verify all existing state is readable by the new code.
4. Call `migrate` if applicable and verify the transformed state.

```rust
#[test]
fn test_upgrade_preserves_state() {
    let env = Env::default();
    // ... set up old contract state ...
    // ... upload new WASM and call upgrade ...
    // ... assert all view functions return expected values ...
}
```

The existing test snapshots in `contracts/crowdfund/test_snapshots/` should all pass against the new version without modification (unless the change intentionally alters behavior).

### Testnet Dry Run

Always upgrade on testnet before mainnet:

```bash
# 1. Build the new WASM
cargo build --release --target wasm32-unknown-unknown

# 2. Upload WASM to testnet
stellar contract upload \
  --wasm target/wasm32-unknown-unknown/release/crowdfund.wasm \
  --source <admin-keypair> \
  --network testnet

# 3. Upgrade the deployed contract
stellar contract invoke \
  --id <contract-id> \
  --source <admin-keypair> \
  --network testnet \
  -- upgrade \
  --new_wasm_hash <hash-from-step-2>

# 4. Verify version
stellar contract invoke \
  --id <contract-id> \
  --network testnet \
  -- version
```

### Snapshot Regression Tests

Run the full test suite after upgrading to catch any snapshot drift:

```bash
cargo test --workspace
```

If snapshots change unexpectedly, review the diff carefully before accepting updates.

## Rollback Procedures

Soroban does not support automatic rollback. A "rollback" is another upgrade — you re-upload the previous WASM and call `upgrade` again with the old hash.

### Keep Previous WASM Hashes

After each upgrade, record the WASM hash of the previous version:

```
v3 WASM hash: abc123...  (current production)
v4 WASM hash: def456...  (new version being deployed)
```

If v4 has a critical bug, call `upgrade` with the v3 hash to revert.

### Rollback Limitations

- If `migrate` was called and transformed storage, rolling back to the old WASM may fail to read the new storage format.
- Design migrations to be backward-compatible where possible, or gate them behind a separate `finalize_migration` call that you only invoke after confirming the upgrade is stable.
- Contributions made between the upgrade and rollback are preserved in storage — the rollback only changes the code, not the data.

### Emergency Pause

If a bug is discovered but rollback is risky, use the existing `pause` function (if implemented) to halt contributions while the fix is prepared:

```bash
stellar contract invoke \
  --id <contract-id> \
  --source <admin-keypair> \
  --network testnet \
  -- pause
```

This sets `Status::Paused`, blocking new contributions without touching existing state.
