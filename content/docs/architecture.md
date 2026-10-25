---
title: How it works
group: Concepts
order: 3
description: A Python API over a Rust core over librustzcash, a sync loop of its own, and the leak-audit proxy that measures it.
---

ZecPy is a Python package with a native Rust core. Python owns the developer-facing API
and the invoice logic. Rust owns everything cryptographic and everything that talks to the
chain, by calling librustzcash.

```text
python/zecpy/     Wallet, invoices, cold signer, async API            (Python)
src/              PyO3 core: sync loop, send, PCZT, Tor connections    (Rust)
                  librustzcash: zcash_client_backend 0.25, zcash_client_sqlite 0.23,
                  orchard 0.16, pczt 0.10, zcash_proofs (bundled Sapling params)
tools/leak_audit/ gRPC proxy that decodes and classifies every request a wallet makes
devnet/           local regtest chain: zebrad 7.0.0 + lightwalletd 0.6.0
```

## The pieces

| Piece | Responsibility |
|---|---|
| `python/zecpy/` | `Wallet`, `Invoices`, `ColdSigner`, typed exceptions and `.pyi` stubs; the invoice store in stdlib `sqlite3` |
| `src/sync.rs` | Compact-block sync and reorg rewind, replacing librustzcash's `sync::run` |
| `src/send.rs` | Proposals, proving with bundled parameters, signing, broadcast, pool-crossing checks |
| `src/net.rs` | Light-server connections: Tor through arti, or direct for loopback only |
| `src/cold.rs` | The offline signer: inspects and signs PCZTs |
| `tools/leak_audit/` | The recording proxy behind the privacy report |

## Its own sync loop

librustzcash's `sync::run` asks for the tree state where the previous sync stopped, which
links sessions, and it queries transparent addresses. ZecPy's loop takes the tip's state
from `GetLatestTreeState`, saves it for the next sync, merges adjacent ranges and splits
batches only at absolute multiples of 1,000. Owning the loop means owning reorgs: ZecPy
compares block hashes at the tip, and the tests reorganise the chain with
`invalidateblock`.

Both findings are filed upstream with fixes: the session-linking request as issue
[#3197](https://github.com/zcash/librustzcash/issues/3197) with PR
[#3198](https://github.com/zcash/librustzcash/pull/3198) (absolute batch boundaries), and
the missed reorg onto a branch that is not yet longer as PR
[#3199](https://github.com/zcash/librustzcash/pull/3199). The goal is for ZecPy to drop its
own loop once upstream covers both. A third bug, zcash-devtool's `pczt sign` skipping
Ironwood spends, is filed as [#266](https://github.com/zcash/zcash-devtool/issues/266) with
fix [#267](https://github.com/zcash/zcash-devtool/pull/267).

## Concurrency

One tokio runtime per process. Async Python methods return awaitables backed by tokio
futures. The wallet database sits behind a mutex; database work and proving run off the
event loop with the GIL released.

## Files in a wallet directory

```text
wallet.db          zcash_client_sqlite database (viewing keys only; no spending key)
invoices.db        invoices and the last emitted state of every payment
zecpy.json         the network, and regtest heights if any
chain_state.bin    tree state at the last synced tip
memo_decoys.txt    decoy candidates and pending memo fetches; as sensitive as wallet.db
tor/               arti state
```

The seed is never written. Seeds, keys and memos are kept out of reprs, logs and exception
messages.
