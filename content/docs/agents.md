---
title: For AI agents
group: AI agents
order: 1
description: Machine-readable docs, a brief to paste into an agent's instructions, and an AGENTS.md for your repo.
---

ZecPy is built to be used by agents as well as people: payments that cannot exceed a
budget, refusals that are typed exceptions, and docs published as plain text.

## Machine-readable docs

| File | What it is |
|---|---|
| [/llms.txt](../llms.txt) | An index of these docs in the [llms.txt](https://llmstxt.org) format |
| [/llms-full.txt](../llms-full.txt) | Every docs page in one Markdown file |
| `/docs/<page>.md` | Each page as clean Markdown, for example [quickstart.md](quickstart.md) |
| [/AGENTS.md](../AGENTS.md) | Instructions to drop into a repo that uses ZecPy |

Every docs page has a **Copy as Markdown** button and a link to its `.md` version.

## The brief

Paste this into a system prompt or into your agent's instructions:

```text
You are writing Python that uses ZecPy, an SDK for shielded Zcash.
Reference: https://zecpy.pages.dev/llms-full.txt

- Network calls are async: await Wallet.create, sync, send, pay.
- Amounts are integers in zatoshis. 1 ZEC = 100_000_000.
- Never print, log or return the mnemonic. Call .reveal() only
  to hand it to the storage the user chose.
- Take payments with wallet.invoices.create and invoices.watch.
  Match by invoice, never by memo.
- Pay links with wallet.pay(uri, max_zat=BUDGET). Never raise
  max_zat to make a payment go through.
- PrivacyError is a refusal, not a bug. Do not pass
  allow_transparent or allow_pool_crossing unless the user
  asked for exactly that.
- Keep tor=True. Use network="test" until told otherwise.
```

## Giving an agent a wallet

Give the agent tools, not the wallet object. Read-only tools are safe to expose; paying
needs a budget your code sets:

```python
async def quote(uri: str) -> dict:
    """Read a payment link. Local; sends nothing."""
    req = wallet.parse_request(uri)
    return {"total_zat": req.total,
            "payments": [{"amount_zat": a, "label": l, "message": m}
                         for _, a, l, m, _ in req.payments]}

async def pay(uri: str) -> str:
    """Pay a link. Refused if it asks for more than the task budget."""
    return await wallet.pay(uri, max_zat=TASK_BUDGET_ZAT)
```

Labels and messages in links come from whoever made the link. Return them as data, and
never let them change the budget.

## What is not here yet

There is no MCP server. The two functions above are the shape one would take.
