# Campaign Creator Guide

This guide walks you through creating, managing, and promoting a crowdfunding campaign on Fund-My-Cause.

---

## Prerequisites

Before you start, make sure you have:

- A [Freighter wallet](https://www.freighter.app/) installed and funded with XLM (for transaction fees)
- The Stellar CLI installed — see the [deployment guide](./deployment.md)
- A deployed crowdfund contract — or use `scripts/deploy.sh` to deploy one

---

## Campaign Creation Flow

A campaign is created by deploying a crowdfund contract and calling `initialize`. Each contract instance is one campaign.

### 1. Build the contract

```bash
cargo build --release --target wasm32-unknown-unknown --manifest-path contracts/crowdfund/Cargo.toml
```

### 2. Deploy and initialize

Use the deploy script, which handles deployment, initialization, and registry registration in one step:

```bash
DEADLINE=$(date -d "+30 days" +%s)

./scripts/deploy.sh \
  <CREATOR_ADDRESS> \
  <TOKEN_ADDRESS> \
  <GOAL_IN_STROOPS> \
  $DEADLINE \
  <MIN_CONTRIBUTION_IN_STROOPS> \
  "Campaign Title" \
  "Campaign description" \
  null \
  [REGISTRY_CONTRACT_ID]
```

Save the printed `Contract ID` and `Registry ID` — you need them for the frontend `.env.local`.

### 3. Configure the frontend

```bash
NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=<CONTRACT_ID>
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=<REGISTRY_ID>
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## Setting Your Goal and Deadline

### Goal

- Specified in **stroops** (1 XLM = 10,000,000 stroops)
- Must be greater than `0`
- Example: a 1,000 XLM goal → `10000000000`

The campaign is marked `Successful` only if `total_raised >= goal` by the deadline. If the goal is not met, the campaign moves to `Refunded` status and contributors can claim their funds back.

Set a realistic goal — contributors cannot be refunded from a successful campaign, and an overly ambitious goal risks leaving everyone waiting for refunds.

### Deadline

- Specified as a **Unix timestamp** (seconds)
- Must be in the future at the time of initialization
- Example: 30 days from now → `$(date -d "+30 days" +%s)`

Choose a deadline that gives contributors enough time to discover and fund your campaign. Campaigns typically run 2–6 weeks. You can extend the deadline after launch using `extend_deadline`, but you cannot shorten it.

### Minimum Contribution

- Also in stroops; set to `0` to allow any amount
- Helps filter out dust contributions and keeps the contributor list manageable

---

## Metadata Best Practices

Metadata is set at initialization and can be updated any time while the campaign is `Active` via `update_metadata`.

### Title

- Keep it short and descriptive (under 60 characters recommended)
- Make it clear what you're funding — avoid vague names like "My Project"

### Description

- Explain what the campaign is for, how funds will be used, and what happens if the goal is met
- Include a clear call to action
- Markdown is rendered in the frontend — use it for structure

### Social Links

Pass an array of URLs to connect your campaign to external profiles or updates:

```bash
--social_links '["https://twitter.com/yourhandle", "https://yourproject.com"]'
```

These are displayed in the campaign UI and help contributors verify legitimacy.

### Updating Metadata

While the campaign is `Active`, you can update title, description, and social links without redeploying:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <CREATOR_ADDRESS> \
  -- update_metadata \
  --title "Updated Title" \
  --description "Updated description" \
  --social_links '["https://yourproject.com"]'
```

---

## Withdrawal Process

Once the campaign deadline passes and the goal is met, the contract status becomes `Successful` and you can withdraw funds.

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <CREATOR_ADDRESS> \
  -- withdraw
```

- Only the creator address can call `withdraw`
- If a `PlatformConfig` was set at initialization, the platform fee (in basis points) is deducted automatically and sent to the platform address before the remainder is transferred to you
- Example: a 2.5% fee is set as `fee_bps: 250`
- Withdrawal can only happen once — the contract moves to a terminal state after

If the goal is **not** met by the deadline, the campaign moves to `Refunded` status. Contributors call `refund_single` themselves to reclaim their contributions (pull-based model — you do not need to do anything).

---

## Promoting Your Campaign

On-chain campaigns succeed or fail based on visibility. A few practical tips:

- **Share the contract ID** — link directly to your campaign page at `https://<your-frontend-domain>/?campaign=<CONTRACT_ID>`
- **Post your social links** — add your Twitter/X, Discord, or project site via `social_links` so contributors can follow updates
- **Update your description** — use `update_metadata` to post progress updates while the campaign is active; contributors can see the latest description in the UI
- **Announce milestones** — share `get_stats` output (total raised, contributor count, progress %) to build momentum
- **Set a credible minimum contribution** — a non-zero minimum signals seriousness and filters bots

---

## Campaign Lifecycle Reference

| Status | Meaning | Creator actions available |
|---|---|---|
| `Active` | Accepting contributions | `update_metadata`, `extend_deadline`, `pause`, `cancel_campaign` |
| `Paused` | Contributions paused | `unpause`, `cancel_campaign` |
| `Successful` | Goal met, deadline passed | `withdraw` |
| `Refunded` | Goal not met, deadline passed | None (contributors call `refund_single`) |
| `Cancelled` | Creator cancelled | None (contributors call `refund_single`) |

---

## Related Docs

- [Contract API Reference](./contract-api.md)
- [Deployment Guide](./deployment.md)
- [Frontend Integration](./frontend-integration.md)
- [Troubleshooting](./troubleshooting.md)
