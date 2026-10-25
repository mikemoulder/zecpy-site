---
title: Command-line tools
group: Reference
order: 3
description: zecpy-cold, the offline signer, and the leak-audit proxy.
---

## zecpy-cold

The offline signer, installed with the package (also `python -m zecpy.cold`). It never
touches the network. The mnemonic is read from a hidden prompt, or from stdin when piped.

```text
zecpy-cold --network {main,test,regtest} [--account N] [--regtest-heights FILE] COMMAND
```

| Command | Does |
|---|---|
| `new` | Generates a seed offline; prints the 24 words to stderr and the watch bundle to stdout |
| `bundle` | Prints the watch bundle for an existing mnemonic |
| `inspect PCZT` | Describes an unsigned PCZT: what it spends, pays and returns as change |
| `sign PCZT OUT [--yes]` | Shows the description, asks, signs, writes `OUT` |

Without `--yes`, `sign` asks for confirmation, and refuses when stdin is not a terminal.

## The leak-audit proxy

In the SDK repo, for measuring any light wallet:

```bash
python -m tools.leak_audit --listen 127.0.0.1:19167 --upstream 127.0.0.1:19067 \
       [--tls] [--log requests.jsonl]
```

Point a wallet at the listen address. Each request is printed with its label as it
arrives; Ctrl-C prints a summary. `python -m tools.leak_audit.report` regenerates the
privacy report from scripted runs.
