# Errors

> The exception hierarchy, what each one means, and how to handle it.

```text
ZecPyError
├── PrivacyError    a refusal: doing this would reveal something
├── WalletError     the wallet cannot do this right now
└── NetworkError    the light server or Tor failed
```

All are importable from `zecpy`. Messages never include seeds, keys or memo contents.

## PrivacyError

A refusal, not a bug. The message says what would leak and names the flag that overrides
it, when one exists.

| Message starts with | Cause | Override |
|---|---|---|
| refusing to pay a transparent-only address | The amount and recipient would be public | `allow_transparent=True` |
| this payment would move N zatoshis between shielded pools | The crossing amount is public | `allow_pool_crossing=True` |
| the request asks for N zatoshis, more than max_zat | `pay` over budget | Raise the budget in your code, not from the link |
| fetching memos asks the server for transactions by txid | `fetch_memos` without Tor | Open with `tor=True`, or use a local server |
| this mnemonic does not belong to this wallet | `Wallet.open` with the wrong phrase | none |
| this PCZT spends nothing that belongs to this signer | Signing someone else's PCZT | none |

## WalletError

- The account was imported from a viewing key and cannot spend: use
  [cold signing](cold-signing.md).
- A proposal's notes were spent or rolled back since it was made: propose again.
- `propose_sweep(mode="everything")` would leave notes behind: wait for confirmations.

## NetworkError

The server was unreachable, Tor failed to start, or the server answered with something
unusable. Failed Tor circuits are retried on fresh circuits, never directly. Before retrying a
send, sync and check `transactions()` for it.

## ValueError

Bad input: an address not valid for this network, a non-positive invoice amount, a malformed
ZIP-321 request, a request with no amount, `decoys` outside 1 to 31.
