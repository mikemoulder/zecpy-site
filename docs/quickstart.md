# Quick start

> Create a wallet, take a payment against an invoice, and send ZEC, step by step.

This tutorial builds a tiny shop backend. It creates a wallet, issues an invoice, waits
for the payment and sends a refund. Every call that touches the network is `async`, so
run the snippets inside `asyncio.run(...)` or in an async REPL (`python -m asyncio`).

You need test funds to pay the invoice. Testnet faucets hand out TAZ; when they are down,
the [local devnet](devnet.md) mines as much as you want.

## 1. Create a wallet

```python
from zecpy import Wallet

wallet, mnemonic = await Wallet.create(
    "./shop", network="test", server="https://testnet.zec.rocks:443"
)
print(mnemonic)          # Mnemonic(<24 words, hidden>)
```

The mnemonic is returned once and never written to disk. `print` shows a placeholder;
`mnemonic.reveal()` returns the 24 words so you can store them offline. The wallet
directory holds the database and is created with mode `0700`.

The birthday ZecPy asks the server about is rounded down to a 10,000-block boundary, so
the server cannot tell when the wallet was made.

## 2. Issue an invoice

```python
invoice = wallet.invoices.create(150_000, "order-77")    # 0.0015 ZEC
print(invoice.address)   # a shielded Unified Address used by this invoice only
print(invoice.uri)       # zcash:u1...?amount=0.0015&message=order-77
```

Amounts are integers in zatoshis: 1 ZEC is 100,000,000 zatoshis. Show the URI as a QR
code, or hand it to the payer's wallet. The `reference` must be unique; it is how you
find the invoice again with `wallet.invoices.by_reference("order-77")`.

## 3. Wait for the payment

```python
async for event in wallet.invoices.watch(confirmations=3):
    print(event.state, event.value_zat, event.invoice.reference)
    if event.state == "confirmed" and event.invoice_settled:
        break
```

`watch` syncs the wallet in a loop and yields events as they happen:

| State | Meaning |
|---|---|
| `detected` | In a block, fewer confirmations than required |
| `confirmed` | At least `confirmations` deep |
| `reverted` | A reorg removed the block; it may confirm again later |

Each state is delivered once per payment, and the last one is stored, so a restarted
process does not deliver it twice. `invoice_settled` is true once the confirmed value
covers the invoice amount. Split payments add up.

## 4. Check the balance

```python
await wallet.sync()
b = wallet.balance()
print(b.total, b.spendable, b.pending)     # zatoshis
print(b.orchard, b.ironwood, b.sapling)    # per pool
```

`balance()` reads the local database only. So do `transactions()` and `address()`.

## 5. Send a refund

```python
txid = await wallet.send("u1...", 50_000, memo="Refund for order-77")
```

The transaction spends shielded funds only. It is proved and signed locally, then
published over a Tor circuit used for nothing else. A send takes about 11 seconds on a
4-core machine, and the fee is 10,000 zatoshis.

If the address is transparent-only, the call raises `PrivacyError` before building
anything:

```python
from zecpy import PrivacyError

try:
    await wallet.send("tm...", 50_000)
except PrivacyError as e:
    print(e)    # explains the refusal and the flag that would override it
```

## 6. Open it again later

```python
wallet = Wallet.open("./shop", server="https://testnet.zec.rocks:443",
                     mnemonic=stored_phrase)
```

Without `mnemonic`, the wallet opens watch-only: it syncs, reports balances and issues
invoices, but cannot send.

## Next

- [Accept payments](accept-payments.md) in a real web app, with webhooks.
- [Cold signing](cold-signing.md), so the server never holds a spending key.
- [ZecPy Live](demo.md), to see every request this flow sends.
