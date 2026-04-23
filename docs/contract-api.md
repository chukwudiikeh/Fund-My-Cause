# Fund-My-Cause Contract API Reference

Complete reference for the Soroban smart contract powering Fund-My-Cause crowdfunding platform.

## Overview

The contract manages decentralized crowdfunding campaigns on the Stellar network. Campaigns accept contributions in XLM or any Stellar token, with automatic fund release or refund based on goal achievement.

**Contract Version:** 3

---

## Data Types

### Status

Campaign lifecycle state.

```rust
pub enum Status {
    Active,      // Campaign accepting contributions
    Successful,  // Goal reached, funds withdrawn
    Refunded,    // Goal not met, contributors refunded
    Cancelled,   // Creator cancelled campaign
    Paused,      // Temporarily paused (admin only)
}
```

### CampaignStats

Live campaign statistics.

```rust
pub struct CampaignStats {
    pub total_raised: i128,           // Total raised in stroops (1 XLM = 10,000,000 stroops)
    pub goal: i128,                   // Funding goal in stroops
    pub progress_bps: u32,            // Progress in basis points (0-10000, where 10000 = 100%)
    pub contributor_count: u32,       // Number of unique contributors
    pub average_contribution: i128,   // Average contribution per contributor in stroops
    pub largest_contribution: i128,   // Largest single contribution in stroops
}
```

### CampaignInfo

Complete campaign metadata and state.

```rust
pub struct CampaignInfo {
    pub creator: Address,             // Campaign creator's Stellar address
    pub token: Address,               // Primary token address (usually XLM)
    pub goal: i128,                   // Funding goal in stroops
    pub deadline: u64,                // Unix timestamp (seconds) when campaign ends
    pub min_contribution: i128,       // Minimum contribution in stroops
    pub title: String,                // Campaign title (max 100 chars recommended)
    pub description: String,          // Campaign description (max 1000 chars recommended)
    pub status: Status,               // Current campaign status
    pub has_platform_config: bool,    // Whether platform fee is configured
    pub platform_fee_bps: u32,        // Platform fee in basis points (0-10000)
    pub platform_address: Address,    // Address receiving platform fees
}
```

### PlatformConfig

Optional platform fee configuration.

```rust
pub struct PlatformConfig {
    pub address: Address,             // Address to receive fees
    pub fee_bps: u32,                 // Fee in basis points (0-10000, where 10000 = 100%)
}
```

### DataKey

Storage key variants for persistent and instance storage.

```rust
pub enum DataKey {
    Contribution(Address),            // Persistent: individual contribution amount
    ContributorPresence(Address),     // Persistent: whether address has contributed
    ContributorCount,                 // Instance: total unique contributors
    LargestContribution,              // Instance: largest single contribution
    AcceptedTokens,                   // Instance: whitelist of accepted token addresses
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract already initialized (can only initialize once) |
| 2 | `CampaignEnded` | Campaign deadline has passed |
| 3 | `CampaignStillActive` | Campaign is still active (deadline not reached) |
| 4 | `GoalNotReached` | Funding goal not met (cannot withdraw) |
| 5 | `GoalReached` | Funding goal already reached (cannot refund) |
| 6 | `Overflow` | Arithmetic overflow in amount calculation |
| 7 | `NotActive` | Campaign is not in Active status |
| 8 | `InvalidFee` | Platform fee exceeds 10000 basis points |
| 9 | `BelowMinimum` | Contribution below minimum or invalid amount |
| 10 | `InvalidDeadline` | Deadline is in the past or invalid |
| 11 | `CampaignPaused` | Campaign is paused (admin action) |
| 12 | `InvalidGoal` | Goal must be positive |
| 13 | `TokenNotAccepted` | Token not in accepted tokens whitelist |

---

## State-Changing Functions

### initialize

Initialize a new campaign. **Can only be called once per contract.**

**Signature:**
```rust
pub fn initialize(
    env: Env,
    creator: Address,
    token: Address,
    goal: i128,
    deadline: u64,
    min_contribution: i128,
    title: String,
    description: String,
    social_links: Option<Vec<String>>,
    platform_config: Option<PlatformConfig>,
    accepted_tokens: Option<Vec<Address>>,
) -> Result<(), ContractError>
```

**Parameters:**
- `creator` — Campaign creator's Stellar address (must authorize)
- `token` — Primary token address (usually XLM contract)
- `goal` — Funding goal in stroops (must be > 0)
- `deadline` — Unix timestamp when campaign ends (must be > current time)
- `min_contribution` — Minimum contribution in stroops (must be ≥ 0)
- `title` — Campaign title
- `description` — Campaign description
- `social_links` — Optional array of social media URLs or image CIDs
- `platform_config` — Optional fee configuration (fee_bps must be ≤ 10000)
- `accepted_tokens` — Optional whitelist of token addresses; if omitted, only `token` is accepted

**Returns:** `Ok(())` on success, error code on failure

**Events:** Publishes `("campaign", "initialized")`

**Storage:** Instance storage (TTL managed by Soroban)

---

### contribute

Submit a contribution to the campaign.

**Signature:**
```rust
pub fn contribute(
    env: Env,
    contributor: Address,
    amount: i128,
    token: Address,
) -> Result<(), ContractError>
```

**Parameters:**
- `contributor` — Contributor's Stellar address (must authorize)
- `amount` — Contribution amount in stroops (must be ≥ min_contribution)
- `token` — Token address being contributed (must be in accepted tokens)

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Active`
- Current time must be before deadline
- Amount must be ≥ min_contribution
- Token must be in accepted tokens list (or equal to default token)
- Campaign must not be paused

**Events:** Publishes `("campaign", "contributed", (contributor, amount))`

**Storage:** 
- Persistent: Updates contributor's total contribution amount
- Instance: Updates total_raised, contributor_count, largest_contribution

---

### withdraw

Creator claims funds after successful campaign.

**Signature:**
```rust
pub fn withdraw(env: Env) -> Result<(), ContractError>
```

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Active`
- Current time must be ≥ deadline
- Total raised must be ≥ goal
- Caller must be campaign creator (must authorize)

**Behavior:**
1. Deducts platform fee (if configured) and transfers to platform address
2. Transfers remaining funds to creator
3. Sets campaign status to `Successful`
4. Clears total_raised to 0

**Events:** Publishes `("campaign", "withdrawn", (creator, total_amount))`

**Storage:** Instance storage updated

---

### refund_single

Contributor claims their refund after failed campaign.

**Signature:**
```rust
pub fn refund_single(
    env: Env,
    contributor: Address,
) -> Result<(), ContractError>
```

**Parameters:**
- `contributor` — Contributor's Stellar address (must authorize)

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Either:
  - Campaign status is `Cancelled`, OR
  - Current time is ≥ deadline AND total raised < goal
- Contributor must have a non-zero contribution

**Behavior:**
1. Transfers contributor's full contribution back to them
2. Sets their contribution to 0 (prevents double-refund)

**Events:** Publishes `("campaign", "refunded", (contributor, amount))`

**Storage:** Persistent storage updated

---

### update_metadata

Update campaign title, description, or social links.

**Signature:**
```rust
pub fn update_metadata(
    env: Env,
    title: Option<String>,
    description: Option<String>,
    social_links: Option<Vec<String>>,
) -> Result<(), ContractError>
```

**Parameters:**
- `title` — New title (optional)
- `description` — New description (optional)
- `social_links` — New social links array (optional)

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Active`
- Caller must be campaign creator (must authorize)

**Events:** Publishes `("campaign", "metadata_updated")`

**Storage:** Instance storage updated

---

### extend_deadline

Extend campaign deadline.

**Signature:**
```rust
pub fn extend_deadline(env: Env, new_deadline: u64) -> Result<(), ContractError>
```

**Parameters:**
- `new_deadline` — New Unix timestamp (must be > current deadline)

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Active`
- Caller must be campaign creator (must authorize)
- New deadline must be > current deadline

**Events:** Publishes `("campaign", "deadline_extended", new_deadline)`

**Storage:** Instance storage updated

---

### cancel_campaign

Creator cancels campaign, allowing all contributors to refund.

**Signature:**
```rust
pub fn cancel_campaign(env: Env) -> Result<(), ContractError>
```

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Active`
- Caller must be campaign creator (must authorize)

**Behavior:**
- Sets campaign status to `Cancelled`
- Contributors can then call `refund_single` to claim refunds

**Events:** Publishes `("campaign", "cancelled")`

**Storage:** Instance storage updated

---

### pause

Admin pauses campaign (prevents new contributions).

**Signature:**
```rust
pub fn pause(env: Env) -> Result<(), ContractError>
```

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Active`
- Caller must be campaign creator/admin (must authorize)

**Behavior:**
- Sets campaign status to `Paused`
- Contributions are blocked until unpaused

**Events:** Publishes `("campaign", "paused")`

**Storage:** Instance storage updated

---

### unpause

Admin resumes paused campaign.

**Signature:**
```rust
pub fn unpause(env: Env) -> Result<(), ContractError>
```

**Returns:** `Ok(())` on success, error code on failure

**Preconditions:**
- Campaign status must be `Paused`
- Caller must be campaign creator/admin (must authorize)

**Behavior:**
- Sets campaign status back to `Active`
- Contributions are allowed again

**Events:** Publishes `("campaign", "unpaused")`

**Storage:** Instance storage updated

---

## Read-Only Functions

### get_stats

Fetch live campaign statistics.

**Signature:**
```rust
pub fn get_stats(env: Env) -> CampaignStats
```

**Returns:** `CampaignStats` struct with current metrics

**Storage:** Instance storage (read-only)

---

### get_campaign_info

Fetch complete campaign metadata and state.

**Signature:**
```rust
pub fn get_campaign_info(env: Env) -> CampaignInfo
```

**Returns:** `CampaignInfo` struct with all campaign details

**Storage:** Instance storage (read-only)

---

### total_raised

Get total amount raised so far.

**Signature:**
```rust
pub fn total_raised(env: Env) -> i128
```

**Returns:** Total raised in stroops

---

### goal

Get campaign funding goal.

**Signature:**
```rust
pub fn goal(env: Env) -> i128
```

**Returns:** Goal amount in stroops

---

### deadline

Get campaign deadline.

**Signature:**
```rust
pub fn deadline(env: Env) -> u64
```

**Returns:** Unix timestamp (seconds)

---

### status

Get current campaign status.

**Signature:**
```rust
pub fn status(env: Env) -> Status
```

**Returns:** Current `Status` enum value

---

### creator

Get campaign creator address.

**Signature:**
```rust
pub fn creator(env: Env) -> Address
```

**Returns:** Creator's Stellar address

---

### contribution

Get a specific contributor's total contribution.

**Signature:**
```rust
pub fn contribution(env: Env, contributor: Address) -> i128
```

**Parameters:**
- `contributor` — Contributor's Stellar address

**Returns:** Contribution amount in stroops (0 if no contribution)

**Storage:** Persistent storage (read-only)

---

### is_contributor

Check if an address has contributed.

**Signature:**
```rust
pub fn is_contributor(env: Env, address: Address) -> bool
```

**Parameters:**
- `address` — Stellar address to check

**Returns:** `true` if address has non-zero contribution, `false` otherwise

---

### min_contribution

Get minimum contribution amount.

**Signature:**
```rust
pub fn min_contribution(env: Env) -> i128
```

**Returns:** Minimum contribution in stroops

---

### title

Get campaign title.

**Signature:**
```rust
pub fn title(env: Env) -> String
```

**Returns:** Campaign title

---

### description

Get campaign description.

**Signature:**
```rust
pub fn description(env: Env) -> String
```

**Returns:** Campaign description

---

### social_links

Get campaign social links.

**Signature:**
```rust
pub fn social_links(env: Env) -> Vec<String>
```

**Returns:** Array of social media URLs or image CIDs

---

### accepted_tokens

Get whitelist of accepted tokens.

**Signature:**
```rust
pub fn accepted_tokens(env: Env) -> Vec<Address>
```

**Returns:** Array of accepted token addresses (empty if no whitelist)

---

### platform_config

Get platform fee configuration.

**Signature:**
```rust
pub fn platform_config(env: Env) -> Option<PlatformConfig>
```

**Returns:** `Some(PlatformConfig)` if configured, `None` otherwise

---

### version

Get contract version.

**Signature:**
```rust
pub fn version(_env: Env) -> u32
```

**Returns:** Contract version number (currently 3)

---

### contributor_list

Get paginated list of contributors.

**Signature:**
```rust
pub fn contributor_list(env: Env, offset: u32, limit: u32) -> Vec<Address>
```

**Parameters:**
- `offset` — Starting index (0-based)
- `limit` — Maximum results (capped at 50)

**Returns:** Array of contributor addresses

**Storage:** Persistent storage (read-only)

---

## Storage Layout

### Instance Storage

Stores campaign metadata and state. Persists for contract lifetime.

| Key | Type | Description |
|-----|------|-------------|
| `CREATOR` | Address | Campaign creator |
| `TOKEN` | Address | Primary token address |
| `GOAL` | i128 | Funding goal in stroops |
| `DEADLINE` | u64 | Unix timestamp deadline |
| `TOTAL` | i128 | Total raised in stroops |
| `STATUS` | Status | Current campaign status |
| `MIN` | i128 | Minimum contribution |
| `TITLE` | String | Campaign title |
| `DESC` | String | Campaign description |
| `SOCIAL` | Vec<String> | Social links/image CIDs |
| `PLATFORM` | PlatformConfig | Optional fee configuration |
| `ADMIN` | Address | Admin address (usually creator) |
| `ContributorCount` | u32 | Number of unique contributors |
| `LargestContribution` | i128 | Largest single contribution |
| `AcceptedTokens` | Vec<Address> | Whitelist of accepted tokens |

### Persistent Storage

Stores contributor-specific data with TTL management.

| Key | Type | Description | TTL |
|-----|------|-------------|-----|
| `Contribution(Address)` | i128 | Individual contribution amount | 100 ledgers |
| `ContributorPresence(Address)` | bool | Whether address has contributed | 100 ledgers |
| `CONTRIBS` | Vec<Address> | List of all contributors | 100 ledgers |

**TTL Strategy:** Persistent entries use threshold of 17,280 ledgers (~2 days) and extension of 518,400 ledgers (~60 days). This ensures data remains available for refunds and historical queries while managing storage costs.

---

## Events

The contract emits Soroban events for every significant state change. All events share the same topic prefix `("campaign", "<event_type>")` and carry typed data payloads.

### Event summary

| Event type | Emitted by | Data payload | Description |
|------------|-----------|--------------|-------------|
| `initialized` | `initialize` | `()` | Campaign created and ready to accept contributions |
| `contributed` | `contribute` | `(contributor: Address, amount: i128)` | A contribution was received |
| `withdrawn` | `withdraw` | `(creator: Address, total: i128)` | Creator withdrew funds after a successful campaign |
| `refunded` | `refund_single` | `(contributor: Address, amount: i128)` | A contributor claimed their refund |
| `metadata_updated` | `update_metadata` | `()` | Campaign title, description, or social links changed |
| `deadline_extended` | `extend_deadline` | `new_deadline: u64` | Campaign deadline was pushed to a later time |
| `cancelled` | `cancel_campaign` | `()` | Campaign was cancelled by the creator |
| `paused` | `pause` | `()` | Campaign was paused; contributions blocked |
| `unpaused` | `unpause` | `()` | Campaign was resumed after a pause |

---

### `initialized`

Emitted once when `initialize` completes successfully.

**Topics:** `("campaign", "initialized")`  
**Data:** `()` (no payload)  
**When:** Campaign storage is fully written and the contract is ready to accept contributions.

```rust
env.events().publish(("campaign", "initialized"), ());
```

---

### `contributed`

Emitted every time a contributor successfully pledges tokens.

**Topics:** `("campaign", "contributed")`  
**Data:** `(contributor: Address, amount: i128)`

| Field | Type | Description |
|-------|------|-------------|
| `contributor` | `Address` | Stellar address of the contributor |
| `amount` | `i128` | Amount contributed in this transaction (stroops) |

```rust
env.events().publish(("campaign", "contributed"), (contributor, amount));
```

> `amount` is the amount sent in **this** transaction, not the contributor's cumulative total. To get the running total call `contribution(contributor)`.

---

### `withdrawn`

Emitted when the creator successfully withdraws funds after the campaign goal is met.

**Topics:** `("campaign", "withdrawn")`  
**Data:** `(creator: Address, total: i128)`

| Field | Type | Description |
|-------|------|-------------|
| `creator` | `Address` | Campaign creator's Stellar address |
| `total` | `i128` | Total raised before the platform fee deduction (stroops) |

```rust
env.events().publish(("campaign", "withdrawn"), (creator, total));
```

> `total` is the gross amount raised. The creator receives `total - platform_fee`. Use `get_stats()` before withdrawal to calculate the net payout.

---

### `refunded`

Emitted for each contributor who successfully claims a refund via `refund_single`.

**Topics:** `("campaign", "refunded")`  
**Data:** `(contributor: Address, amount: i128)`

| Field | Type | Description |
|-------|------|-------------|
| `contributor` | `Address` | Address receiving the refund |
| `amount` | `i128` | Refund amount in stroops |

```rust
env.events().publish(("campaign", "refunded"), (contributor, amount));
```

> This event is only emitted when `amount > 0`. Calling `refund_single` for an address with no contribution is a no-op and produces no event.

---

### `metadata_updated`

Emitted when the creator updates campaign metadata (title, description, or social links).

**Topics:** `("campaign", "metadata_updated")`  
**Data:** `()` (no payload)

```rust
env.events().publish(("campaign", "metadata_updated"), ());
```

> To read the new values after this event, call `title()`, `description()`, or `social_links()`.

---

### `deadline_extended`

Emitted when the creator pushes the campaign deadline to a later timestamp.

**Topics:** `("campaign", "deadline_extended")`  
**Data:** `new_deadline: u64`

| Field | Type | Description |
|-------|------|-------------|
| `new_deadline` | `u64` | New Unix timestamp (seconds) for the campaign end |

```rust
env.events().publish(("campaign", "deadline_extended"), new_deadline);
```

---

### `cancelled`

Emitted when the creator cancels the campaign. After this event, contributors may call `refund_single` to reclaim their funds.

**Topics:** `("campaign", "cancelled")`  
**Data:** `()` (no payload)

```rust
env.events().publish(("campaign", "cancelled"), ());
```

---

### `paused`

Emitted when the admin pauses the campaign. While paused, `contribute` calls fail with `CampaignPaused`.

**Topics:** `("campaign", "paused")`  
**Data:** `()` (no payload)

```rust
env.events().publish(("campaign", "paused"), ());
```

---

### `unpaused`

Emitted when the admin resumes a paused campaign. Contributions are accepted again.

**Topics:** `("campaign", "unpaused")`  
**Data:** `()` (no payload)

```rust
env.events().publish(("campaign", "unpaused"), ());
```

---

### Listening to events from the frontend

Use the Soroban RPC `getEvents` method to subscribe to or query past events. The `@stellar/stellar-sdk` client wraps this API.

#### Fetch all events for a campaign contract

```ts
import { SorobanRpc } from "@stellar/stellar-sdk";

const server = new SorobanRpc.Server(process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!);

async function getCampaignEvents(contractId: string) {
  const response = await server.getEvents({
    startLedger: 0,
    filters: [
      {
        type: "contract",
        contractIds: [contractId],
        topics: [["*", "*"]], // match all ("campaign", "<type>") topics
      },
    ],
    limit: 100,
  });
  return response.events;
}
```

#### Listen for new contributions in real time

```ts
async function watchContributions(
  contractId: string,
  onContribution: (contributor: string, amount: bigint) => void,
) {
  let latestLedger = (await server.getLatestLedger()).sequence;

  setInterval(async () => {
    const response = await server.getEvents({
      startLedger: latestLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
          topics: [["campaign", "contributed"]],
        },
      ],
    });

    for (const event of response.events) {
      const [contributor, amount] = event.value.value as [
        { value: string },
        { value: bigint },
      ];
      onContribution(contributor.value, amount.value);
    }

    if (response.events.length > 0) {
      latestLedger = response.latestLedger + 1;
    }
  }, 5_000); // poll every 5 seconds
}
```

#### Decode a `contributed` event payload

```ts
import { xdr, scValToNative } from "@stellar/stellar-sdk";

function decodeContributedEvent(event: SorobanRpc.Api.EventResponse) {
  // topics[0] = "campaign", topics[1] = "contributed"
  const [contributor, amount] = scValToNative(event.value) as [string, bigint];
  return { contributor, amount };
}
```

#### React hook example

```tsx
import { useEffect, useState } from "react";
import { SorobanRpc, scValToNative } from "@stellar/stellar-sdk";

export function useContributionEvents(contractId: string) {
  const [events, setEvents] = useState<{ contributor: string; amount: bigint }[]>([]);

  useEffect(() => {
    const server = new SorobanRpc.Server(process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!);
    let startLedger = 0;

    const poll = async () => {
      const res = await server.getEvents({
        startLedger,
        filters: [
          {
            type: "contract",
            contractIds: [contractId],
            topics: [["campaign", "contributed"]],
          },
        ],
      });

      const decoded = res.events.map((e) => {
        const [contributor, amount] = scValToNative(e.value) as [string, bigint];
        return { contributor, amount };
      });

      if (decoded.length > 0) {
        setEvents((prev) => [...prev, ...decoded]);
        startLedger = res.latestLedger + 1;
      }
    };

    poll();
    const id = setInterval(poll, 6_000);
    return () => clearInterval(id);
  }, [contractId]);

  return events;
}
```

---

## Accepted Tokens & Multi-Token Support

The contract supports a token whitelist (`accepted_tokens`) that controls which Stellar tokens contributors may use. This section explains how the whitelist works, how to configure it, and how to use it with XLM or custom tokens.

### How the Whitelist Works

At initialization the creator can pass an optional `accepted_tokens: Option<Vec<Address>>` argument.

**No whitelist set (default)**

When `accepted_tokens` is `None`, the contract only accepts the single `token` address passed to `initialize`. Any `contribute` call that passes a different token address will fail with `TokenNotAccepted` (error 13).

**Whitelist set**

When `accepted_tokens` is `Some(vec![...])`, the contract stores the list under `DataKey::AcceptedTokens` in instance storage. On every `contribute` call the contract checks whether the supplied `token` is present in that list. If it is not, the call fails with `TokenNotAccepted`.

The default `token` address is **not** automatically included in the whitelist — if you want it accepted you must add it explicitly.

Token validation logic (from `contribute`):

```rust
let default_token: Address = env.storage().instance().get(&KEY_TOKEN).unwrap();
if let Some(whitelist) = env.storage().instance().get::<_, Vec<Address>>(&DataKey::AcceptedTokens) {
    if !whitelist.contains(&token) {
        return Err(ContractError::TokenNotAccepted);
    }
} else if token != default_token {
    return Err(ContractError::TokenNotAccepted);
}
```

### Token Address Verification

Before passing a token address to the contract, verify it on-chain using the Stellar CLI or the Soroban RPC.

**XLM (native asset)**

On Stellar, the native XLM asset is wrapped as a Soroban token contract. Retrieve its address with:

```bash
# Testnet
stellar contract id asset --asset native --network testnet

# Mainnet
stellar contract id asset --asset native --network mainnet
```

The returned contract ID is the address you pass as `token` or include in `accepted_tokens`.

**Custom / issued tokens**

For any SEP-41-compatible token (e.g., USDC, custom assets), obtain the contract address from the issuer or asset explorer, then verify it responds to the standard token interface:

```bash
# Check token name — should return without error
stellar contract invoke \
  --id <TOKEN_CONTRACT_ID> \
  --network testnet \
  -- name
```

### Initializing with Multiple Accepted Tokens

Pass the list of allowed token addresses in the `accepted_tokens` parameter. The example below accepts both XLM and a custom USDC-like token:

```bash
stellar contract invoke \
  --id <CAMPAIGN_CONTRACT_ID> \
  --source <CREATOR_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --creator <CREATOR_ADDRESS> \
  --token <XLM_CONTRACT_ID> \
  --goal 1000000000 \
  --deadline 1800000000 \
  --min_contribution 10000000 \
  --title "My Campaign" \
  --description "Help us build something great" \
  --social_links '[]' \
  --platform_config 'null' \
  --accepted_tokens '["<XLM_CONTRACT_ID>", "<USDC_CONTRACT_ID>"]'
```

> **Note:** The `token` parameter sets the primary token used for refunds and withdrawals. All tokens in `accepted_tokens` are accepted for contributions, but refunds via `refund_single` always use the primary `token`. Design your campaign accordingly.

### Accepting Only XLM

To accept only XLM, omit `accepted_tokens` (pass `null`) and set `token` to the native asset contract ID:

```bash
stellar contract invoke \
  --id <CAMPAIGN_CONTRACT_ID> \
  --source <CREATOR_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --creator <CREATOR_ADDRESS> \
  --token <XLM_CONTRACT_ID> \
  --goal 1000000000 \
  --deadline 1800000000 \
  --min_contribution 10000000 \
  --title "XLM-only Campaign" \
  --description "Accepts XLM only" \
  --social_links 'null' \
  --platform_config 'null' \
  --accepted_tokens 'null'
```

### Contributing with a Specific Token

The `contribute` function requires the caller to specify which token they are sending. The address must match an entry in the whitelist (or the default token if no whitelist is set):

```bash
# Contribute 5 XLM
stellar contract invoke \
  --id <CAMPAIGN_CONTRACT_ID> \
  --source <CONTRIBUTOR_SECRET_KEY> \
  --network testnet \
  -- contribute \
  --contributor <CONTRIBUTOR_ADDRESS> \
  --amount 50000000 \
  --token <XLM_CONTRACT_ID>

# Contribute 5 USDC (only works if USDC is in the whitelist)
stellar contract invoke \
  --id <CAMPAIGN_CONTRACT_ID> \
  --source <CONTRIBUTOR_SECRET_KEY> \
  --network testnet \
  -- contribute \
  --contributor <CONTRIBUTOR_ADDRESS> \
  --amount 50000000 \
  --token <USDC_CONTRACT_ID>
```

### Querying the Accepted Tokens List

Use the `accepted_tokens` view function to inspect the current whitelist at any time:

```bash
stellar contract invoke \
  --id <CAMPAIGN_CONTRACT_ID> \
  --network testnet \
  -- accepted_tokens
```

Returns a JSON array of token contract addresses, or an empty array `[]` if no whitelist was set.

### Error Reference

| Error | Code | When it occurs |
|-------|------|----------------|
| `TokenNotAccepted` | 13 | `contribute` called with a token address not in the whitelist (or not equal to the default token when no whitelist is set) |

---

## Usage Examples

### Initialize Campaign

```rust
let platform_config = Some(PlatformConfig {
    address: platform_address,
    fee_bps: 250,  // 2.5% fee
});

initialize(
    env,
    creator,
    token_address,
    1_000_000_000,  // 100 XLM goal
    deadline_timestamp,
    10_000_000,     // 1 XLM minimum
    String::from_str(&env, "My Campaign"),
    String::from_str(&env, "Help us build..."),
    None,
    platform_config,
    None,
)?;
```

### Contribute

```rust
contribute(
    env,
    contributor,
    50_000_000,  // 5 XLM
    token_address,
)?;
```

### Withdraw (Creator)

```rust
// After deadline and if goal reached
withdraw(env)?;
```

### Refund (Contributor)

```rust
// After deadline if goal not met, or if campaign cancelled
refund_single(env, contributor)?;
```

---

## Security Considerations

1. **Authorization:** All state-changing functions require caller authorization via `require_auth()`
2. **Overflow Protection:** Arithmetic operations use `checked_add()` to prevent overflow
3. **Reentrancy:** Token transfers use Soroban's safe token interface
4. **TTL Management:** Persistent storage uses TTL to manage costs while ensuring data availability
5. **Pull-Based Refunds:** Refunds use pull model (contributor-initiated) to avoid single-point-of-failure
6. **Fee Validation:** Platform fees capped at 10,000 basis points (100%)

---

## Deployment Notes

- Contract is compiled to WASM and deployed to Stellar testnet/mainnet
- Each campaign gets its own contract instance
- Registry contract maintains list of active campaigns
- Soroban RPC endpoint required for interaction
- Freighter wallet integration for frontend signing
