---
title: Privacy model
group: Concepts
order: 1
description: What a light server can learn from a ZecPy wallet, how that is measured, and what is still visible.
---

## Threat model

The adversary runs the light server the wallet talks to, or can watch traffic to it. It
sees every request and response and the network address they come from. It cannot break
the cryptography, and it does not see the wallet's database or keys.

Out of scope: an attacker on the machine running ZecPy, and a global network observer.

## How it is measured

`tools/leak_audit` is a gRPC proxy between a wallet and its server. It forwards bytes
unchanged, decodes a copy of every request and labels it:

| Label | Meaning |
|---|---|
| public | Every wallet sends the same request; it says nothing about this one |
| coarse | Reveals something, but only within a deliberately wide window |
| broadcast | Publishes a transaction |
| identifying | Ties the request to this wallet's addresses, transactions or exact history |

Unknown methods are labelled identifying, so the audit fails closed. The devnet test suite
runs a merchant's full cycle through the proxy (create, invoice, receive, confirm, refund,
restart, sync) and asserts that nothing identifying was sent. The same test runs
zcash-devtool through the same proxy as a control, to show the audit catches a leak when
there is one.

| Scenario | ZecPy | zcash-devtool | zingo-cli |
|---|---|---|---|
| Create a new wallet | 0 of 2 | 1 of 2 | 0 of 1 |
| First sync to the tip | 0 of 8 | 2 of 7 | 26 of 36 |
| Receive a payment, sync | 0 of 5 | 2 of 7 | 23 of 34 |
| Restart the process, sync | 0 of 5 | 2 of 7 | 22 of 32 |
| Send a payment | 0 of 1 | 0 of 1 | 0 of 1 |
| **Total identifying** | **0** | **7** | **71** |

This measures request content. zingo-cli sends over the Nym mixnet by default and ZecPy
over Tor; neither is visible to a loopback proxy, so both were measured without them.
zingo-cli and zcash-devtool can receive to transparent addresses, and asking about those
addresses is how a light wallet finds such funds. ZecPy is shielded-only by design.

### On public testnet, over Tor

The same audit ran against `testnet.zec.rocks`, with the proxy reaching the server only
over Tor. It covered a full merchant run: a watch-only shop paid by zcash-devtool, a memo
read, a refund through the cold signer, and an agent paying a link. Across the shop's 108
requests, nothing identified it outside the opt-in memo fetch. That fetch hid the real
payment as the 6th of 8, among 7 other people's transactions. See [Testnet run](testnet-run.html).

## What ZecPy does differently

| Leak | In a typical light wallet | In ZecPy |
|---|---|---|
| Transparent address queries on every sync | Sent by librustzcash's `sync::run` when transparent support is built in | Never sent; the audit asserts their absence on every run |
| Exact birthday (`GetTreeState` at birthday - 1) | Sent at wallet creation | Rounded down to a 10,000-block boundary |
| Where the last sync stopped | `GetTreeState` at every batch start links sessions | The tip's tree state is saved for the next sync; batches split only at multiples of 1,000 |
| Memo and detail fetches by txid | Sent for every received transaction | Off by default; opt-in `fetch_memos` hides each among decoys, over Tor |
| Pool crossings | Built silently; the amount is public | Reported as `crossing_value`; refused unless allowed |
| Payments to transparent addresses | Allowed | Refused unless `allow_transparent=True` |
| Network path linking sync and send | One connection or one circuit for everything | Each sync session and each broadcast on its own isolated Tor circuit; never direct |
| Broadcast timing | Published the moment it is built | Optional random `max_broadcast_delay` |

## What the server still learns

- That a wallet is syncing, and the chain tip it syncs to. Every wallet does this.
- The transaction, when the wallet sends one. It is shielded: amounts, sender and
  recipient are not visible.
- A Tor exit's address, not the wallet's. `tor=False` is an explicit opt-out.
- With `fetch_memos`: `k + 1` transactions near one height, from a fresh circuit.
- One exact-height tree-state request after a reorg, when the wallet rewinds. The audit
  reports it as identifying rather than hiding it.

## Known limitations

- A received payment orphaned by a reorg stays pending until it is mined again. Clearing
  it at expiry would need a `GetTransaction` by txid, which ZecPy does not send.
- Invoice addresses use diversifier indices from 2^80 up, a ZecPy convention. Another
  wallet restored from the same seed finds the payments, but not which invoice each
  belongs to.
- The audit runs on loopback, so it measures content, not the network path. The Tor path
  is tested separately against public testnet.

## Not built, on purpose

| Not done | Why | Where it lives instead |
|---|---|---|
| Transparent receiving and shielding | Needs queries that name the wallet's addresses | zcash-devtool `wallet shield` |
| Memo fetching by default | Every fetch names a txid | Opt-in `fetch_memos()` |
| Mempool watching | `GetMempoolTx` would send the txids the wallet knows | Detection at the next block |
| Status lookups for orphaned payments | `GetTransaction` by txid | Stays pending until re-mined |
| Several accounts, multisig, hardware wallets | Out of scope for a backend SDK | zcash-devtool `zip48`, `pczt` |
