# Wallet Adapter Architecture

This document explains how Fund-My-Cause abstracts over multiple Stellar wallets using the adapter pattern, covers the two built-in implementations (Freighter and LOBSTR), and shows how to add support for a new wallet.

---

## Overview

Rather than calling Freighter's API directly throughout the codebase, the app defines a thin `WalletAdapter` interface. Each wallet ships as a small object that satisfies that interface. The rest of the app — `WalletContext`, `signTx`, balance hooks — only ever talks to the interface, so swapping or adding wallets requires no changes outside the adapter file.

```
┌─────────────────────────────────────────────────────┐
│                   React UI layer                    │
│  WalletSelectModal  ·  PledgeModal  ·  Navbar       │
└────────────────────────┬────────────────────────────┘
                         │ useWallet()
┌────────────────────────▼────────────────────────────┐
│                   WalletContext                     │
│  connect · disconnect · signTx · address · balance  │
└──────┬──────────────────────────────────┬───────────┘
       │ freighterAdapter                 │ lobstrAdapter
┌──────▼──────────┐              ┌────────▼────────────┐
│  WalletAdapter  │              │   WalletAdapter     │
│  (interface)    │              │   (interface)       │
└──────┬──────────┘              └────────┬────────────┘
       │                                  │
┌──────▼──────────┐              ┌────────▼────────────┐
│ @stellar/       │              │ @walletconnect/     │
│ freighter-api   │              │ sign-client         │
└─────────────────┘              └─────────────────────┘
```

---

## WalletAdapter Interface

Defined in `apps/interface/src/lib/walletAdapters.ts`:

```ts
export interface WalletAdapter {
  /** Human-readable name shown in the wallet selection UI. */
  name: string;

  /** Request wallet access and return the user's Stellar public key (G…). */
  connect(): Promise<string>;

  /**
   * Sign a base64-encoded transaction XDR and return the signed XDR.
   * @param xdr              - Unsigned transaction XDR
   * @param networkPassphrase - Stellar network passphrase (testnet or mainnet)
   */
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;

  /**
   * Optional cleanup called on disconnect (e.g. close a WalletConnect session).
   * Omit for extension-based wallets that have no persistent session.
   */
  disconnect?(): Promise<void>;
}
```

### Contract

| Method | Must return | Throws when |
|--------|-------------|-------------|
| `connect` | Stellar public key string (`G…`) | User rejects, extension not installed, WalletConnect pairing fails |
| `signTransaction` | Signed transaction XDR (base64) | User rejects, network error, session expired |
| `disconnect` | `void` | — (should swallow errors silently) |

`WalletContext` catches errors from `connect` and `signTransaction` and surfaces them as toasts. Adapters should throw plain `Error` objects with human-readable messages.

---

## Freighter Implementation

File: `apps/interface/src/lib/freighterAdapter.ts`

Freighter is a browser extension that injects a JavaScript API. The adapter wraps `@stellar/freighter-api`:

```ts
import { requestAccess, signTransaction } from "@stellar/freighter-api";
import type { WalletAdapter } from "./walletAdapters";

export const freighterAdapter: WalletAdapter = {
  name: "Freighter",

  async connect() {
    const result = await requestAccess();
    if (result.error) throw new Error(result.error.message ?? "Freighter connection failed");
    return result.address;
  },

  async signTransaction(xdr, networkPassphrase) {
    const result = await signTransaction(xdr, { networkPassphrase });
    if (result.error) throw new Error(result.error.message ?? "Signing failed");
    return result.signedTxXdr;
  },
  // No disconnect needed — extension manages its own session
};
```

**Key points:**
- No `disconnect` method — the extension manages its own session state.
- `requestAccess` opens the Freighter popup asking the user to approve the connection.
- `signTransaction` opens a second popup showing the transaction details for approval.
- Both calls return a result object with an optional `error` field rather than throwing directly; the adapter normalises this into a thrown `Error`.

---

## LOBSTR Implementation

File: `apps/interface/src/lib/lobstrAdapter.ts`

LOBSTR is a mobile wallet that connects via the WalletConnect v2 protocol. The adapter lazy-imports `@walletconnect/sign-client` to avoid SSR issues (the module uses browser APIs).

```ts
import type { WalletAdapter } from "./walletAdapters";

// Module-level singletons — one client and one session per page load
let _client: SignClient | null = null;
let _session: { topic: string } | null = null;

async function getClient() {
  if (_client) return _client;
  const { default: SignClient } = await import("@walletconnect/sign-client");
  _client = await SignClient.init({
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    metadata: { name: "Fund-My-Cause", /* … */ },
  });
  return _client;
}

export const lobstrAdapter: WalletAdapter = {
  name: "LOBSTR",

  async connect() {
    const client = await getClient();
    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        stellar: {
          methods: ["stellar_signXDR"],
          chains: ["stellar:testnet", "stellar:pubnet"],
          events: [],
        },
      },
    });
    // Open the LOBSTR deep-link so the user can scan the QR code
    if (uri) window.open(`https://lobstr.co/wc?uri=${encodeURIComponent(uri)}`, "_blank");
    const session = await approval();
    _session = session;
    // Session account format: "stellar:testnet:GADDRESS…"
    const address = session.namespaces.stellar?.accounts[0]?.split(":")[2];
    if (!address) throw new Error("Could not parse address from LOBSTR session");
    return address;
  },

  async signTransaction(xdr) {
    if (!_session) throw new Error("LOBSTR not connected");
    const client = await getClient();
    const result = await client.request<{ signedXDR: string }>({
      topic: _session.topic,
      chainId: "stellar:testnet",
      request: { method: "stellar_signXDR", params: { xdr } },
    });
    return result.signedXDR;
  },

  async disconnect() {
    if (!_session || !_client) return;
    await _client.disconnect({
      topic: _session.topic,
      reason: { code: 6000, message: "User disconnected" },
    });
    _session = null;
  },
};
```

**Key points:**
- `getClient()` is memoised — the WalletConnect `SignClient` is expensive to initialise and must be a singleton.
- `connect` uses the WalletConnect pairing flow: generate a URI → user scans it in LOBSTR → `approval()` resolves with the session.
- The current implementation opens the LOBSTR deep-link directly. In a production UI you would render a QR code modal instead (see [WalletConnect QR Code Modal](https://docs.walletconnect.com/advanced/walletconnectmodal/about)).
- `disconnect` closes the WalletConnect session so LOBSTR stops showing the dApp as connected.
- Requires `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local` (get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com)).

---

## WalletContext Integration

File: `apps/interface/src/context/WalletContext.tsx`

`WalletContext` holds the registry of adapters and orchestrates connect / disconnect / sign:

```ts
const ADAPTERS: Record<"freighter" | "lobstr", WalletAdapter> = {
  freighter: freighterAdapter,
  lobstr:    lobstrAdapter,
};
```

When the user picks a wallet in `WalletSelectModal`, `connectWith(walletType)` is called:

```ts
const connectWith = async (walletType: "freighter" | "lobstr") => {
  const adapter = ADAPTERS[walletType];
  const addr = await adapter.connect();           // delegates to the adapter
  sessionStorage.setItem(SESSION_KEY, addr);
  sessionStorage.setItem(SESSION_WALLET_KEY, walletType);
  setActiveAdapter(adapter);                      // stored for later signTx calls
};
```

On page reload, the saved `walletType` is read from `sessionStorage` and the matching adapter is restored — no re-connection prompt needed.

`signTx` delegates to the active adapter and adds toast feedback for common rejection patterns:

```ts
const signTx = async (xdr: string) => {
  return await activeAdapter.signTransaction(xdr, NETWORK_PASSPHRASE);
};
```

### Context API

```ts
interface WalletContextType {
  address:          string | null;   // Connected public key, or null
  xlmBalance:       string | null;   // Formatted XLM balance
  refreshBalance:   () => void;      // Call after a transaction
  connect:          () => Promise<void>;
  disconnect:       () => void;
  signTx:           (xdr: string) => Promise<string>;
  isConnecting:     boolean;
  isAutoConnecting: boolean;         // True during session restore on mount
  isSigning:        boolean;         // True while signTransaction is in flight
  error:            string | null;
  networkMismatch:  boolean;         // True if wallet is on wrong network
  walletNetwork:    string | null;
}
```

---

## Adding a New Wallet Adapter

Follow these four steps to add support for any Stellar-compatible wallet.

### Step 1 — Create the adapter file

```ts
// apps/interface/src/lib/myWalletAdapter.ts
import type { WalletAdapter } from "./walletAdapters";

export const myWalletAdapter: WalletAdapter = {
  name: "My Wallet",

  async connect(): Promise<string> {
    // Call your wallet's SDK to request access
    // Return the user's Stellar public key (G…)
    const publicKey = await myWalletSdk.requestAccess();
    return publicKey;
  },

  async signTransaction(xdr: string, networkPassphrase: string): Promise<string> {
    // Pass the XDR to the wallet for signing
    // Return the signed XDR
    const signed = await myWalletSdk.sign(xdr, { networkPassphrase });
    return signed;
  },

  // Only needed if your wallet has a persistent session to clean up
  async disconnect(): Promise<void> {
    await myWalletSdk.disconnect();
  },
};
```

### Step 2 — Register the adapter in WalletContext

```ts
// apps/interface/src/context/WalletContext.tsx
import { myWalletAdapter } from "@/lib/myWalletAdapter";

const ADAPTERS = {
  freighter: freighterAdapter,
  lobstr:    lobstrAdapter,
  mywallet:  myWalletAdapter,   // ← add here
} satisfies Record<string, WalletAdapter>;
```

Update the `walletType` union type used in `connectWith` and `sessionStorage`:

```ts
type WalletType = "freighter" | "lobstr" | "mywallet";
```

### Step 3 — Add a button to WalletSelectModal

```tsx
// apps/interface/src/components/ui/WalletSelectModal.tsx
<button onClick={() => onSelect("mywallet")} aria-label="Connect with My Wallet">
  <span aria-hidden="true">🔑</span>
  <div>
    <p className="text-sm font-medium text-white">My Wallet</p>
    <p className="text-xs text-gray-400">Browser extension</p>
  </div>
</button>
```

### Step 4 — Add any required environment variables

If your wallet SDK needs an API key or project ID, add it to `.env.example` and `docs/docker.md`:

```bash
# apps/interface/.env.example
NEXT_PUBLIC_MY_WALLET_PROJECT_ID=your_project_id
```

That's it. No other files need to change.

---

## WalletConnect Integration Possibilities

The LOBSTR adapter already uses WalletConnect v2 (`@walletconnect/sign-client`). The same infrastructure can be reused to support any other WalletConnect-compatible Stellar wallet (e.g. Xbull, Rabet mobile, or a future hardware wallet bridge).

### Reusing the WalletConnect client

Extract the `getClient()` singleton into a shared module so multiple adapters share one connection:

```ts
// apps/interface/src/lib/walletConnectClient.ts
import SignClient from "@walletconnect/sign-client";

let _client: Awaited<ReturnType<typeof SignClient.init>> | null = null;

export async function getWalletConnectClient() {
  if (_client) return _client;
  _client = await SignClient.init({
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    metadata: {
      name: "Fund-My-Cause",
      description: "Decentralized crowdfunding on Stellar",
      url: typeof window !== "undefined" ? window.location.origin : "",
      icons: [],
    },
  });
  return _client;
}
```

Each WalletConnect-based adapter then calls `getWalletConnectClient()` instead of initialising its own.

### QR Code modal

For a better UX, replace the `window.open` deep-link with a proper QR code modal. The official [`@walletconnect/modal`](https://docs.walletconnect.com/advanced/walletconnectmodal/about) package renders a modal with a QR code and a list of registered wallets:

```ts
import { WalletConnectModal } from "@walletconnect/modal";

const modal = new WalletConnectModal({
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: ["stellar:testnet", "stellar:pubnet"],
});

// In connect():
if (uri) await modal.openModal({ uri });
const session = await approval();
modal.closeModal();
```

### Required environment variable

```bash
# apps/interface/.env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_project_id>
```

Get a free project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com). Without it, `SignClient.init` will throw and the LOBSTR adapter will fail to connect.

### Stellar WalletConnect namespace

All Stellar wallets on WalletConnect use the `stellar` namespace with the `stellar_signXDR` method. The chain IDs are:

| Network | Chain ID |
|---------|----------|
| Testnet | `stellar:testnet` |
| Mainnet | `stellar:pubnet` |

---

## Testing Adapters

Each adapter can be unit-tested by mocking the underlying SDK:

```ts
// freighterAdapter.test.ts
import { freighterAdapter } from "@/lib/freighterAdapter";
import * as freighterApi from "@stellar/freighter-api";

jest.mock("@stellar/freighter-api");

it("returns address on successful connect", async () => {
  jest.mocked(freighterApi.requestAccess).mockResolvedValue({
    address: "GABC123",
    error: undefined,
  });
  const addr = await freighterAdapter.connect();
  expect(addr).toBe("GABC123");
});

it("throws on freighter error", async () => {
  jest.mocked(freighterApi.requestAccess).mockResolvedValue({
    address: "",
    error: { message: "User rejected" } as never,
  });
  await expect(freighterAdapter.connect()).rejects.toThrow("User rejected");
});
```

For WalletConnect-based adapters, mock `@walletconnect/sign-client` and assert that `connect`, `request`, and `disconnect` are called with the correct arguments.
