# API reference

> Every public class, method and field in the zecpy package.

Amounts are integers in zatoshis (1 ZEC = 100,000,000). Methods marked **local** send
nothing to the server. Everything that touches the network is `async`.

The privacy flags on paying methods default to off, and both refusals raise
`PrivacyError`:

- `allow_transparent=False`: pay a transparent-only recipient.
- `allow_pool_crossing=False`: move value between shielded pools in public.

## Wallet

### Wallet.create

```python
await Wallet.create(path, *, network, server, tor=True, regtest_heights=None)
    -> tuple[Wallet, Mnemonic]
```

Creates a wallet directory with a fresh 24-word seed. `network` is `"main"`, `"test"` or
`"regtest"`. The mnemonic is returned once and stored nowhere. Raises `FileExistsError` if
a wallet already exists at `path`.

### Wallet.restore

```python
await Wallet.restore(path, mnemonic, *, network, server, birthday=None, tor=True,
                     regtest_heights=None) -> Wallet
```

Recreates a wallet from its mnemonic. Without `birthday` it scans the whole chain.

### Wallet.watch

```python
await Wallet.watch(path, bundle, *, server, birthday=None, tor=True,
                   regtest_heights=None) -> Wallet
```

A watch-only wallet from a `WatchBundle` or its JSON. It syncs, reports balances, issues
invoices and builds unsigned transactions, but cannot spend.

### Wallet.open

```python
Wallet.open(path, *, server, mnemonic=None, tor=True) -> Wallet
```

Opens an existing wallet directory. Without the mnemonic it is watch-only. A mnemonic that
does not belong to the wallet raises `PrivacyError`.

### Properties

| Name | Type | Meaning |
|---|---|---|
| `path` | `Path` | The wallet directory |
| `network` | `str` | `"main"`, `"test"` or `"regtest"` |
| `can_send` | `bool` | False for watch-only wallets |
| `invoices` | `Invoices` | The invoice book, stored in `invoices.db` |

### Chain and state

| Method | Returns | Notes |
|---|---|---|
| `await sync()` | `int` | Scans to the tip; returns the synced height |
| `balance()` | `Balance` | Local |
| `address()` | `str` | Local; a fresh Unified Address with shielded receivers only |
| `transactions(since=0)` | `list[Transaction]` | Local; newest first |
| `transaction(txid)` | `Transaction` or `None` | Local |
| `await fetch_memos(*, decoys=7, max_delay=10.0)` | `MemoReport` | Opt-in; Tor; see [Memos](memos-and-history.md) |

### Paying

| Method | Returns | Notes |
|---|---|---|
| `await send(to, amount_zat, memo=None, *, flags, max_broadcast_delay=0.0)` | txid | |
| `await send_many(payments, *, flags, max_broadcast_delay=0.0)` | txid | Up to 50 `Payout`s or tuples |
| `propose(to, amount_zat, memo=None, *, flags)` | `Proposal` | Local |
| `propose_many(payments, *, flags)` | `Proposal` | Local |
| `propose_sweep(to, memo=None, *, mode="spendable", flags)` | `Proposal` | Local; `mode` is `"spendable"` or `"everything"` |
| `await send_proposal(proposal, *, max_broadcast_delay=0.0)` | txid | Sends exactly that proposal |
| `parse_request(uri)` | `PaymentRequest` | Local; ZIP-321 |
| `await pay(uri, *, max_zat, flags, max_broadcast_delay=0.0)` | txid | `max_zat` is required |

### Cold signing

| Method | Returns | Notes |
|---|---|---|
| `propose_cold(to, amount_zat, memo=None, *, flags)` | `bytes` | An unsigned, proved PCZT |
| `propose_cold_many(payments, *, flags)` | `bytes` | Up to 50 recipients |
| `await broadcast_signed(signed_pczt, *, max_broadcast_delay=0.0)` | txid | On its own Tor circuit |

## Invoices

| Method | Returns | Notes |
|---|---|---|
| `create(amount_zat, reference)` | `Invoice` | A fresh shielded address; `reference` unique |
| `get(invoice_id)` | `Invoice` | `KeyError` if missing |
| `by_reference(reference)` | `Invoice` | `KeyError` if missing |
| `status(invoice)` | `InvoiceStatus` | |
| `paid_zat(invoice)` | `int` | Confirmed value received |
| `poll(confirmations=3)` | `list[PaymentEvent]` | Call after `sync()` |
| `async watch(confirmations=3, poll_interval=10.0)` | async iterator of `PaymentEvent` | Syncs in a loop |

## Data types

**Invoice**: `id`, `reference`, `amount_zat`, `address`, `created_at`, and `uri`, a ZIP-321
URI.

**PaymentEvent**: `state` (`"detected"`, `"confirmed"` or `"reverted"`), `invoice`, `txid`,
`pool`, `value_zat`, `height`, `confirmations`, `invoice_paid_zat`, and `invoice_settled`.

**InvoiceStatus**: `invoice`, `state` (`"unpaid"`, `"pending"`, `"partial"` or `"paid"`),
`confirmed_zat`, `pending_zat`.

**Balance**: `total`, `spendable`, `pending`, `sapling`, `orchard`, `ironwood`,
`chain_tip`, `scanned_height`.

**Transaction**: `txid`, `status`, `mined_height`, `confirmations`, `block_time`,
`expiry_height`, `net_value`, `fee`, `pool_crossing_value`, `memo_count`, `memo_pending`,
`outputs`.

**TxOutput**: `pool`, `output_index`, `direction`, `value`, `address`, `diversifier_index`,
`memo`, `memo_bytes`. The repr hides memo contents.

**Proposal**: `fee`, `paying_out`, `payments`, `spends`, `change`, `crossing_value`,
`canonical_crossing`, `target_height`.

**PaymentRequest**: `payments` as `(address, amount_zat, label, message, has_memo)` tuples,
and `total`.

**MemoReport**: `fetched`, `waiting`, `unavailable`.

**Payout**: `Payout(address, amount_zat, memo=None)`, a frozen dataclass.

**Mnemonic**: prints as `Mnemonic(<24 words, hidden>)`; `reveal()` returns the phrase.

## ColdSigner

```python
ColdSigner(mnemonic, *, network, account=0, regtest_heights=None)
ColdSigner.generate(*, network, account=0, regtest_heights=None) -> (ColdSigner, Mnemonic)
```

| Method | Returns | Notes |
|---|---|---|
| `watch_bundle()` | `WatchBundle` | For `Wallet.watch` |
| `inspect(pczt)` | `Summary` | Spending, outputs with change found by key, fee |
| `sign(pczt)` | `bytes` | Refuses a PCZT that spends nothing of this signer's |

**WatchBundle**: `network`, `ufvk`, `seed_fingerprint`, `account`; `to_json()` and
`WatchBundle.from_json(text)`. It cannot spend but reveals the account's history.

## Errors

See [Errors](errors.md).
