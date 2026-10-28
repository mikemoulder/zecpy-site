# Installation

> One pip install on Linux and macOS, or a build from source.

```bash
pip install zecpy
```

Prebuilt wheels cover Linux x86_64 and macOS on Apple silicon, Python 3.10 or newer. Other
platforms build from source (below). Nothing compiles on your machine: the wheel carries librustzcash, Tor (arti),
SQLite and the Sapling proving parameters, and links only the C runtime. Each wheel is
installed and smoke-tested on its own platform in CI, including a testnet wallet synced
over Tor.

## Requirements for a source build

Only needed on other platforms, or to work on ZecPy itself.

| Need | Version | Notes |
|---|---|---|
| Python | 3.10 or newer | Tested on 3.10, 3.12 and 3.13 |
| Rust | stable toolchain | Tested with 1.99. Install with [rustup](https://rustup.rs) |
| RAM | 8 GB is enough | On small machines set `CARGO_BUILD_JOBS=2` so linking does not swap |

## Build from source

The first build compiles librustzcash: 11 to 19 minutes on a 4-core machine.

```bash
git clone https://github.com/mikemoulder/zecpy && cd zecpy
uv venv .venv && . .venv/bin/activate        # or: python -m venv .venv
uv pip install -e '.[dev,examples]'
```

`pip install -e .` works the same if you do not use uv. The extras are optional: `dev`
brings the test tools and `examples` brings FastAPI for the checkout example.

## Check it

```bash
python -c "import zecpy; print(zecpy.__all__)"
```

That prints the public names: `Wallet`, `ColdSigner`, `Invoice`, `PrivacyError` and the
rest. The offline signer is installed as a command too:

```bash
zecpy-cold --help
```

## Choose a light server

ZecPy talks to a lightwalletd or Zaino server. Remote servers are reached over Tor, and the
first connection bootstraps Tor, which takes a few seconds.

| Network | `network=` | Example server |
|---|---|---|
| Testnet | `"test"` | `https://testnet.zec.rocks:443` |
| Mainnet | `"main"` | `https://zec.rocks:443` |
| Local devnet | `"regtest"` | `http://127.0.0.1:19067` (see [Local devnet](devnet.md)) |

Servers on loopback are always reached directly. `tor=False` turns Tor off for a remote
server, and then the server sees your IP address. That is an explicit opt-out; ZecPy never
falls back to it on its own.

## Run the tests

```bash
devnet/up.sh <a uregtest1... address for block rewards>
pytest -q                 # unit tests and the devnet suite
pytest -m network         # Tor and public testnet
```
