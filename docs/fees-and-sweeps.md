# Preview fees and sweep

> Plan a payment before building it, send exactly what was shown, and empty a wallet with nothing left behind.

## Preview, then send that transaction

```python
plan = wallet.propose("u1...", 50_000, memo="Invoice 12")
plan.fee            # zatoshis
plan.paying_out     # total to recipients
plan.spends         # [(pool, value)] notes it would spend
plan.change         # [(pool, value)] change outputs
plan.crossing_value # value that would become public by crossing pools
plan.target_height

txid = await wallet.send_proposal(plan)
```

`propose` is local: it sends nothing to the server. `send_proposal` builds, signs and
broadcasts exactly the transaction the proposal describes, so the fee paid is the fee
shown. If a note it spends was spent or rolled back since, it raises `WalletError` and
builds nothing. Propose again.

`propose_many` does the same for up to 50 recipients.

## Pool crossings

Each shielded bundle's net value balance is public. When Orchard notes pay an Ironwood
receiver, the Orchard bundle shows value leaving and the Ironwood bundle shows it arriving,
so the amount is on chain. `propose` reports it as `crossing_value`, and the same
`PrivacyError` as `send` applies unless you pass `allow_pool_crossing=True`.
`plan.canonical_crossing` is true for ZIP 318 canonical migrations, which are allowed.

## Sweep a wallet

```python
plan = wallet.propose_sweep("u1...new-wallet")                 # what is spendable now
plan = wallet.propose_sweep("u1...", mode="everything")         # all or nothing
txid = await wallet.send_proposal(plan)
```

The fee is taken out of the amount. `mode="spendable"` leaves notes that are still waiting
for confirmations. `mode="everything"` raises `WalletError` instead of leaving anything
behind, for when the wallet must really end up empty. Sapling notes, which ZecPy only
receives, are not swept.
