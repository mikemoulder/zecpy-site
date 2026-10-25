---
title: Introduction
group: Getting started
order: 1
description: What ZecPy is, who it is for, and what it looks like in code.
---

ZecPy is a Python SDK for sending and receiving shielded Zcash. It is built for backends,
bots and AI agents: a shop that takes ZEC, a payroll job, an agent that pays a link it was
handed. All cryptography, proving and signing happen in
[librustzcash](https://github.com/zcash/librustzcash), called through a Rust extension.
ZecPy reimplements none of it.

What sets it apart is what the light server learns. A recording proxy between the wallet
and its server logged every request across create, sync, receive, restart and send. It
found **zero requests that identify the wallet**. zcash-devtool, built on the same crates,
sent 7. zingo-cli sent 71.

```python
from zecpy import Wallet

wallet, mnemonic = await Wallet.create(
    "./shop", network="test", server="https://testnet.zec.rocks:443"
)
invoice = wallet.invoices.create(150_000, "order-77")   # its own shielded address
print(invoice.uri)                                       # zcash:...?amount=0.0015

async for event in wallet.invoices.watch(confirmations=3):
    if event.state == "confirmed" and event.invoice_settled:
        ship(event.invoice.reference)                    # exactly once, even across restarts
```

## What you get

- **Invoices** with their own diversified addresses. Payments are matched during local
  trial decryption, with no memo and no request to the server.
- **Sending**: `send` and `send_many` (up to 50 recipients in one transaction), proved and
  signed on your machine.
- **Fee previews**: `propose` shows the fee, the notes spent and the change before anything
  is built.
- **Cold signing**: a server that holds only a viewing key builds and proves the
  transaction. An offline signer signs it.
- **Payment links for agents**: `pay(uri, max_zat=...)` refuses anything over budget.
- **Tor by default**: every sync and every broadcast gets its own isolated circuit, with no
  direct fallback.

## What it refuses to do

Transparent recipients raise `PrivacyError` unless you opt in. ZecPy does not look up
transactions by txid, watch the mempool, or receive to transparent addresses. Memos are
opt-in, and each one is fetched among decoys. The [privacy model](privacy.html) explains
each choice.

## Where to go next

- [Installation](installation.html): `pip install zecpy` on Linux and macOS.
- [Quick start](quickstart.html): create a wallet, take a payment, send one.
- [ZecPy Live](demo.html): watch the server's side of a real run.
- [For AI agents](agents.html): llms.txt, llms-full.txt and a brief to paste.
