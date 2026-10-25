# Troubleshooting

> Build problems, Tor, testnet funds and devnet quirks.

## The build is slow or the machine swaps

The first build compiles librustzcash: about 11 minutes on 4 cores. On machines with
little RAM, linking runs out of memory when many jobs run at once:

```bash
export CARGO_BUILD_JOBS=2
```

## `cargo test` cannot find libpython

On some systems only `libpython3.12.so.1` exists. Symlink it as `libpython3.12.so` in a
scratch directory and run with `LIBRARY_PATH=<that dir> cargo test`.

## The first call takes a few seconds

The first connection to a remote server bootstraps Tor. Its state is kept in the wallet
directory under `tor/`, so later starts are faster.

## NetworkError: Tor failed to start

Check outbound network access. ZecPy will not fall back to a direct connection. If you
accept that the server sees your IP address, pass `tor=False`.

## Testnet faucets are down

Use the [local devnet](devnet.md): it mines blocks on demand and runs every feature
except a real Orchard to Ironwood pool crossing.

## lightwalletd rejects the wallet on devnet

lightwalletd reads height 0 as "unspecified". Mine a few blocks before creating a wallet.

## A payment shows as pending forever

If a reorg orphaned it, it stays pending until it is mined again, because checking its
status would mean looking it up by txid. See [Known limitations](privacy.md#known-limitations).
