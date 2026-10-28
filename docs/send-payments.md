# Send and batch payouts

> Single payments, up to 50 recipients in one transaction, payroll from a CSV, and broadcast delays.

## One payment

```python
txid = await wallet.send("u1...", 50_000, memo="Thanks")
```

The transaction spends shielded funds only (Orchard and Ironwood notes). It is proved and
signed locally, and only the finished transaction is sent to the server, over a Tor
circuit used for nothing else.

## Many recipients, one transaction

```python
from zecpy import Payout

txid = await wallet.send_many([
    Payout("u1...ada", 125_000_000, "October salary"),
    Payout("u1...lin",  80_000_000),
    ("u1...kim", 60_000_000, None),            # tuples work too
])
```

Up to 50 recipients. It is cheaper than separate sends, and an observer sees one shielded
transaction instead of a burst whose timing links them. Every payment is checked before
anything is built: one bad entry rejects the batch and names its position.

## Payroll from a CSV

[`examples/payroll.py`](https://github.com/mikemoulder/zecpy/blob/main/examples/payroll.py)
pays a CSV in one transaction, from a hot wallet or through a cold signer:

```text
name,address,amount_zec,memo
Ada,u1...,1.25,October salary
Lin,u1...,0.8,
```

```bash
python examples/payroll.py pay payroll.csv --wallet ./w --server https://zec.rocks:443

# or with the key offline
python examples/payroll.py propose payroll.csv --wallet ./w --server ... --out pay.pczt
zecpy-cold --network main sign pay.pczt pay.signed.pczt
python examples/payroll.py broadcast pay.signed.pczt --wallet ./w --server ...
```

Amounts are converted exactly with `Decimal`; anything finer than one zatoshi is refused.

## Delay the broadcast

```python
await wallet.send(to, amount, max_broadcast_delay=120)
```

The finished transaction is held for a random time, up to that many seconds, taken from
the system CSPRNG. It then does not appear on the network at the moment of the action
that caused it, such as a checkout or a payroll run.

## Refusals

| Raises | When | Override |
|---|---|---|
| `PrivacyError` | A recipient is transparent-only: amount and recipient would be public | `allow_transparent=True` |
| `PrivacyError` | Orchard notes would pay an Ironwood receiver, publishing the crossing amount | `allow_pool_crossing=True` |
| `ValueError` | An address is not valid for this wallet's network | none |
| `WalletError` | The wallet is watch-only | Use [cold signing](cold-signing.md) |

ZIP 318 canonical migrations between pools are allowed without the flag: they have a
fixed shape and fee, and look the same as each other.
