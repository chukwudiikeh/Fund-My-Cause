# Gas Optimization

Soroban charges fees based on CPU instructions, memory, and ledger-entry reads/writes. This guide covers patterns that reduce those costs in the Fund-My-Cause contracts.

## Storage Access Patterns

Every ledger-entry read or write is the dominant cost driver. Minimize them:

**Batch reads into local variables**

```rust
// ❌ Three separate storage reads
let goal = env.storage().persistent().get::<_, i128>(&DataKey::Goal).unwrap();
let raised = env.storage().persistent().get::<_, i128>(&DataKey::TotalRaised).unwrap();
let deadline = env.storage().persistent().get::<_, u64>(&DataKey::Deadline).unwrap();

// ✅ Read once, work in memory
let stats: CampaignStats = env.storage().persistent().get(&DataKey::Stats).unwrap();
let (goal, raised, deadline) = (stats.goal, stats.total_raised, stats.deadline);
```

**Write only when the value changes**

```rust
// ❌ Always writes
env.storage().persistent().set(&DataKey::TotalRaised, &new_total);

// ✅ Skip write if unchanged
if new_total != current_total {
    env.storage().persistent().set(&DataKey::TotalRaised, &new_total);
}
```

**Use `instance` storage for hot fields**

Instance storage is cheaper to access than persistent storage for data that is read on nearly every invocation (e.g., `status`, `goal`).

```rust
env.storage().instance().set(&DataKey::Status, &CampaignStatus::Active);
```

## Efficient Data Structures

| Choice | Cost impact |
|--------|-------------|
| Pack related fields into one struct | Fewer ledger entries → fewer reads/writes |
| Use `i128` for token amounts | Native Soroban type, no conversion overhead |
| Avoid `Vec` for unbounded contributor lists | Each element is a separate ledger entry; use a counter + per-key mapping instead |
| Use `Symbol` keys over `String` | Smaller serialized size → lower byte fees |

**Contributor storage pattern used in this contract:**

```rust
// One entry per contributor — O(1) read/write, no iteration needed
env.storage().persistent().set(
    &DataKey::Contribution(contributor.clone()),
    &amount,
);
```

This avoids a global `Vec<Address>` that would grow unboundedly and require expensive full reads.

## Benchmarking Methodology

Use the Soroban CLI `--cost` flag to measure instruction counts before and after changes:

```bash
# Simulate a contribution and print resource usage
stellar contract invoke \
  --id $CONTRACT_ID \
  --source-account $ACCOUNT \
  --network testnet \
  --cost \
  -- contribute \
  --contributor $ACCOUNT \
  --amount 1000000
```

Key metrics to track:

| Metric | Field in output |
|--------|----------------|
| CPU instructions | `cpu_insns` |
| Memory bytes | `mem_bytes` |
| Ledger reads | `read_entries` |
| Ledger writes | `write_entries` |

Record baseline numbers, apply a change, re-run, and compare. Automate this in CI:

```bash
# scripts/bench.sh
stellar contract invoke --cost ... -- contribute ... 2>&1 | \
  grep -E "cpu_insns|mem_bytes|read_entries|write_entries"
```

## Before / After Examples

### Example 1: Consolidating stats into one struct

**Before** — 5 separate storage entries read on `get_stats`:

```
read_entries: 5   cpu_insns: 4 200 000
```

**After** — single `CampaignStats` struct:

```
read_entries: 1   cpu_insns: 1 800 000   (−57 %)
```

### Example 2: Removing redundant status check

**Before** — `contribute` read `Status` and `Deadline` separately:

```
read_entries: 4   cpu_insns: 3 100 000
```

**After** — single instance-storage read for both:

```
read_entries: 2   cpu_insns: 2 400 000   (−23 %)
```

## Trade-offs: Gas vs. Code Clarity

| Optimization | Gas saving | Clarity cost | Recommendation |
|---|---|---|---|
| Pack fields into one struct | High | Low — struct is self-documenting | Always do it |
| Instance vs. persistent storage | Medium | Low | Use instance for hot fields |
| Skip unchanged writes | Low–Medium | Low | Do it for high-frequency paths |
| Inline small helpers | Low | Medium — harder to test | Only on hot paths |
| Remove safety assertions | Medium | High — hides bugs | Avoid in production |

**Rule of thumb:** optimize storage access first (highest ROI), leave logic readable. Never remove input validation or safety checks for gas savings — the security cost outweighs the fee reduction.

## References

- [Soroban Fees & Metering](https://developers.stellar.org/docs/learn/fundamentals/fees-resource-limits-metering)
- [Soroban Storage Types](https://developers.stellar.org/docs/build/smart-contracts/storage/state-archival)
- [`stellar contract invoke --cost`](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
