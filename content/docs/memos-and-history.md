---
title: Memos and history
group: Guides
order: 6
description: Read transaction history locally, and fetch received memos only when you opt in, among decoys and over Tor.
---

## History is local

```python
for tx in wallet.transactions(since=0):          # newest first
    print(tx.txid, tx.status, tx.net_value, tx.fee, tx.confirmations)
    for out in tx.outputs:
        print(" ", out.direction, out.pool, out.value, out.address)

tx = wallet.transaction("ab12...")                # or None
```

Both read the local database only: listing history sends nothing to the server. Memos the
wallet sent are included. Output reprs hide memo contents; read `out.memo` (text) or
`out.memo_bytes` when you need them.

`tx.memo_pending` is true when a received note's memo is not known yet, and
`tx.pool_crossing_value` shows any amount the transaction published by crossing pools.

## Received memos are opt-in

Compact blocks carry only the first 52 bytes of each note ciphertext, so a received memo
needs the full transaction, requested by txid. A server that sees one txid fetched soon
after it was mined learns that a light wallet received in it. So nothing fetches memos
unless you call:

```python
report = await wallet.fetch_memos(decoys=7, max_delay=10.0)
report.fetched, report.waiting, report.unavailable
```

When you do:

1. **Only what is needed.** Only transactions holding a received shielded note whose memo
   is unknown. Not the funding transactions of transparent inputs.
2. **Never alone.** Each real txid is fetched with `decoys` others (1 to 31, default 7):
   non-coinbase transactions with shielded outputs within 100 blocks, taken from compact
   blocks the wallet already downloaded.
3. **No rank tell.** The decoys are a window of consecutive candidates, offset so the real
   transaction's rank is uniform. A unit test checks this over 5,000 draws.
4. **Wait rather than go out bare.** A payment without enough candidates stays `waiting`.
5. **Separate circuit, random time.** Each batch uses its own Tor circuit after a random
   delay of up to `max_delay` seconds, in shuffled order.

Without Tor, to a remote server, it raises `PrivacyError`.
