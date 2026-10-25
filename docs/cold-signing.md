# Cold signing

> Run the online server with a viewing key only; sign on an offline machine with zecpy-cold.

The spending key stays on an offline machine. The online server holds a viewing key: it
syncs, issues invoices, and builds and proves transactions, but cannot spend. The server
can be fully compromised without losing funds.

```text
offline machine                          online server (viewing key only)
ColdSigner(mnemonic).watch_bundle()  ->  Wallet.watch(path, bundle)
                                         pczt = wallet.propose_cold(to, amount)
signer.inspect(pczt); signer.sign()  <-  (proved on the server: no secret needed)
                                     ->  await wallet.broadcast_signed(signed)
```

## 1. Make the key offline

```bash
zecpy-cold --network test new > bundle.json
```

The 24 words go to stderr: write them down. The watch bundle goes to `bundle.json`. It
holds the Unified Full Viewing Key, which cannot spend but reveals the account's whole
history, so keep it confidential.

The same in Python:

```python
from zecpy import ColdSigner

signer, mnemonic = ColdSigner.generate(network="test")
bundle_json = signer.watch_bundle().to_json()
```

## 2. Watch from the server

```python
wallet = await Wallet.watch("./hot", bundle_json, server="https://testnet.zec.rocks:443")
wallet.can_send        # False
```

## 3. Build and prove on the server

```python
pczt = wallet.propose_cold("u1...", 50_000, memo="Refund")
open("refund.pczt", "wb").write(pczt)
```

Orchard and Ironwood proofs need no secret, so the server does the slow part.
`propose_cold_many` takes up to 50 recipients. The same refusals as `send` apply.

## 4. Inspect and sign offline

```bash
zecpy-cold --network test sign refund.pczt refund.signed.pczt
```

```text
Spends   0.01000000 ZEC from this wallet
  PAY        0.00200000 ZEC  to u1... (ironwood)
  change     0.00790000 ZEC  back to this wallet (ironwood)
Leaving  0.00200000 ZEC  plus fee 0.00010000 ZEC
Sign? [y/N]
```

The signer decides which outputs are change by checking each one against its own viewing
key, not by trusting labels the server attached. A compromised server cannot disguise a
payment to itself as change. A PCZT that spends nothing of this signer's is refused.

## 5. Broadcast

```python
txid = await wallet.broadcast_signed(open("refund.signed.pczt", "rb").read())
```

The signed transaction goes out on a Tor circuit of its own. `max_broadcast_delay` works
here too.
