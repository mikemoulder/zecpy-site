# Accept payments

> Invoices with their own shielded addresses, exactly-once payment events, and a checkout API with signed webhooks.

Each invoice gets the address at its own diversifier index. When the wallet scans a block
and decrypts a note, the database records which address received it, so a payment maps to
its invoice without a memo and without asking the server anything.

## Create invoices

```python
invoice = wallet.invoices.create(amount_zat=150_000, reference="order-77")
invoice.id, invoice.address, invoice.uri
```

| Field | Meaning |
|---|---|
| `id` | Row id in `invoices.db`, next to the wallet |
| `reference` | Your order id; unique |
| `amount_zat` | Amount due |
| `address` | A shielded Unified Address used by this invoice only |
| `uri` | A ZIP-321 `zcash:` URI for QR codes and wallet deep links |

Invoice addresses come from diversifier indices starting at 2^80, far above anything
`wallet.address()` reaches, so no invoice address is ever handed out twice.

## React to payments

`watch` is the simple form. It syncs, polls and sleeps in a loop:

```python
async for event in wallet.invoices.watch(confirmations=3, poll_interval=10.0):
    if event.state == "confirmed" and event.invoice_settled:
        await fulfil(event.invoice.reference)
    elif event.state == "reverted":
        await hold(event.invoice.reference)     # a reorg removed it; do not ship
```

If you already sync somewhere else, call `poll` after each sync instead:

```python
await wallet.sync()
for event in wallet.invoices.poll(confirmations=3):
    ...
```

Every `PaymentEvent` carries `state`, `invoice`, `txid`, `pool`, `value_zat`, `height`,
`confirmations` and `invoice_paid_zat`, the confirmed total paid to the invoice so far.
`invoice_settled` is `invoice_paid_zat >= invoice.amount_zat`.

## Check where an invoice stands

```python
status = wallet.invoices.status(wallet.invoices.by_reference("order-77"))
status.state            # "unpaid", "pending", "partial" or "paid"
status.confirmed_zat, status.pending_zat
```

## A checkout API with no spending key

The SDK repo ships a one-file FastAPI service,
[`examples/checkout`](https://github.com/mikemoulder/zecpy/tree/main/examples/checkout).
The server imports a watch bundle (viewing key only), so a compromised server cannot
spend. Refunds go out as PCZTs for the [cold signer](cold-signing.md).

```bash
ZECPY_WALLET=./checkout-wallet ZECPY_WATCH_BUNDLE=bundle.json \
ZECPY_SERVER=https://testnet.zec.rocks:443 \
ZECPY_WEBHOOK_URL=https://shop.example/hook ZECPY_WEBHOOK_SECRET=change-me \
uvicorn examples.checkout.app:app --port 8000

curl -X POST localhost:8000/invoices -H 'content-type: application/json' \
     -d '{"amount_zat": 150000, "reference": "order-77"}'
```

It sends `payment.detected`, `payment.confirmed` and `payment.reverted` webhooks, each
once per payment and state, signed with HMAC-SHA256. Verify them like this:

```python
import hashlib, hmac

def verify(secret: bytes, body: bytes, header: str) -> bool:
    expected = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

## Why not memos

Matching by memo needs the full transaction, fetched by txid, which tells the server which
transactions are yours. Diversified addresses match during trial decryption, which happens
on your machine. That is why invoices never need `fetch_memos`.
