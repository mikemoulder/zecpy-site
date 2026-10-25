---
title: Installation
group: Getting started
order: 2
description: Requirements, building from source, and checking the install.
---

ZecPy ships as source for now: no wheel is published yet. The build compiles librustzcash
once, which takes about 11 minutes on a 4-core machine.

## Requirements

| Need | Version | Notes |
|---|---|---|
| OS | Linux | macOS and Windows wheels are not built yet |
| Python | 3.10 or newer | Tested on 3.12 |
| Rust | stable toolchain | Tested with 1.99. Install with [rustup](https://rustup.rs) |
| RAM | 8 GB is enough | On small machines set `CARGO_BUILD_JOBS=2` so linking does not swap |

## Build and install

```bash
git clone https://github.com/xerodahdev/zecpy && cd zecpy
uv venv .venv && . .venv/bin/activate        # or: python -m venv .venv
uv pip install -e '.[dev,examples]'
```

`pip install -e .` works the same if you do not use uv. On Debian and Ubuntu,
`python -m venv` needs `apt install python3-venv` first. The extras are optional: `dev`
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
| Local devnet | `"regtest"` | `http://127.0.0.1:19067` (see [Local devnet](devnet.html)) |

Servers on loopback are always reached directly. `tor=False` turns Tor off for a remote
server, and then the server sees your IP address. That is an explicit opt-out; ZecPy never
falls back to it on its own.

## Run the tests

```bash
devnet/up.sh <a uregtest1... address for block rewards>
pytest -q                 # unit tests and the devnet suite
pytest -m network         # Tor and public testnet
```
