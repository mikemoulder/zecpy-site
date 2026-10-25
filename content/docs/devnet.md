---
title: Local devnet
group: Guides
order: 7
description: A private regtest chain (zebrad and lightwalletd) for development, tests and the demo.
---

The SDK repo includes a local regtest chain bound to loopback. It gives unlimited test
funds, blocks on demand and a light server you control, so tests can reproduce reorgs and
record exactly what the server sees. Every upgrade through NU6.3 (Ironwood) is active from
block 1.

## Binaries

Put these in `~/.zecpy-dev/bin`, or point `ZECPY_DEV` somewhere else:

| Binary | Version | Source |
|---|---|---|
| `zebrad` | 7.0.0 | ZcashFoundation/zebra release, SHA-256 verified |
| `lightwalletd` | 0.6.0 | zcash/lightwalletd `v0.6.0` |
| `zcash-devtool` | `0b3436b` | zcash/zcash-devtool, `--features regtest_support` |

## Use it

```bash
devnet/up.sh <uregtest1... address for block rewards>
devnet/mine.sh 101         # coinbase matures after 100 blocks, about 2.5 s per block
devnet/down.sh             # stop, keep state
devnet/down.sh --wipe      # stop and start over next time
```

The light server listens on `http://127.0.0.1:19067` (plaintext, loopback only), so ZecPy
connects directly, without Tor.

## Wallets on devnet

Regtest needs the activation heights passed in:

```python
heights = {"overwinter": 1, "sapling": 1, "blossom": 1, "heartwood": 1, "canopy": 1,
           "nu5": 1, "nu6": 1, "nu6_1": 1, "nu6_2": 1, "nu6_3": 1}

wallet, mnemonic = await Wallet.create(
    "./dev-wallet", network="regtest", server="http://127.0.0.1:19067",
    regtest_heights=heights,
)
```

`zecpy-cold` takes the same heights as a JSON file: `--regtest-heights heights.json`.

## Gotchas

- lightwalletd reads height 0 as "no height given". Mine a few blocks before creating a
  wallet.
- A wallet made on this chain only works on this chain. `down.sh --wipe` invalidates it.
- Regtest activates Ironwood at block 1, so it never holds Orchard notes. A real pool
  crossing cannot be built there.
