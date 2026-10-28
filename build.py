"""Builds the docs from content/docs/*.md.

    uv run --with markdown python build.py

Writes docs/<page>.html, a clean docs/<page>.md beside each page (llmstxt.org convention),
llms.txt (the index) and llms-full.txt (every page in one file). The landing page,
assets and AGENTS.md are written by hand.
"""

from __future__ import annotations

import html
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
SRC = ROOT / "content" / "docs"
OUT = ROOT / "docs"
REPO = "https://github.com/mikemoulder/zecpy"
DEMO = "https://github.com/mikemoulder/zecpy-demo"
SITE = "https://zecpy.pages.dev"

GROUPS = ["Getting started", "Guides", "Concepts", "Reference", "AI agents"]

# Stroked 24px icons, drawn for this site; GitHub's mark is its own.
ICON_PATHS = {
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
    "book": '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    "file": '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    "copy": '<rect x="9" y="9" width="12" height="12" rx="1"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "terminal": '<path d="m4 17 6-6-6-6M12 19h8"/>',
    "bot": '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 4h6M9 13v2M15 13v2"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "compass": '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    "code": '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    "play": '<path d="M7 4v16l13-8z"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "home": '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
    "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "list": '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
}
GITHUB = (
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>'
)
GROUP_ICON = {"Getting started": "play", "Guides": "compass", "Concepts": "shield", "Reference": "code", "AI agents": "bot"}


def icon(name: str) -> str:
    if name == "github":
        return GITHUB
    return f'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">{ICON_PATHS[name]}</svg>'


@dataclass
class Page:
    slug: str
    title: str
    group: str
    order: int
    description: str
    body: str  # markdown, without front matter

    @property
    def href(self) -> str:
        return f"{self.slug}.html"


def load() -> list[Page]:
    pages = []
    for path in SRC.glob("*.md"):
        text = path.read_text()
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        meta = dict(line.split(": ", 1) for line in m.group(1).splitlines())
        pages.append(Page(path.stem, meta["title"], meta["group"], int(meta["order"]), meta["description"], text[m.end():].strip() + "\n"))
    return sorted(pages, key=lambda p: (GROUPS.index(p.group), p.order))


# ---------- a small highlighter for python and bash ----------

PY_KW = r"\b(?:from|import|as|await|async|for|in|if|elif|else|try|except|return|def|class|with|while|and|or|not|is|None|True|False|global|raise|lambda)\b"
TOKENS = {
    "python": re.compile(rf"(?P<c>#[^\n]*)|(?P<s>\"(?:[^\"\\\n]|\\.)*\"|'(?:[^'\\\n]|\\.)*')|(?P<k>{PY_KW})|(?P<n>\b\d[\d_]*\b)"),
    "bash": re.compile(r"(?P<c>(?<![\w/$])#[^\n]*)|(?P<s>\"(?:[^\"\\\n]|\\.)*\"|'[^'\n]*')|(?P<k>^\s*(?:[\w./-]+=\S+\s+)*[\w./-]+|(?<=&& )[\w./-]+|(?<=\| )[\w./-]+)", re.M),
}


def highlight(code: str, lang: str) -> str:
    rx = TOKENS.get(lang)
    if rx is None:
        return html.escape(code, quote=False)
    out, pos = [], 0
    for m in rx.finditer(code):
        out.append(html.escape(code[pos:m.start()], quote=False))
        out.append(f'<span class="{m.lastgroup}">{html.escape(m.group(), quote=False)}</span>')
        pos = m.end()
    out.append(html.escape(code[pos:], quote=False))
    return "".join(out)


FENCE = re.compile(r'<pre><code class="language-(\w+)">(.*?)</code></pre>', re.S)
PLAIN = re.compile(r"<pre><code>(.*?)</code></pre>", re.S)
LANG_NAME = {"python": "Python", "bash": "Shell", "text": "Text"}


def code_block(lang: str, escaped: str) -> str:
    code = html.unescape(escaped)
    return (
        f'<div class="codeblock" data-ui><div class="codeblock__bar"><span>{icon("terminal") if lang == "bash" else icon("code")}{LANG_NAME.get(lang, lang)}</span>'
        f'<button class="icon-btn" type="button" data-copy-code aria-label="Copy code">{icon("copy")}<span>Copy</span></button></div>'
        f'<pre class="code"><code>{highlight(code.rstrip(), lang)}</code></pre></div>'
    )


def render(md: str) -> tuple[str, list[tuple[str, str]]]:
    conv = markdown.Markdown(extensions=["tables", "fenced_code", "toc", "sane_lists"], extension_configs={"toc": {"permalink": False}})
    body = conv.convert(md)
    body = FENCE.sub(lambda m: code_block(m.group(1), m.group(2)), body)
    body = PLAIN.sub(lambda m: code_block("text", m.group(1)), body)
    # anchors on section headings, tables that scroll on a phone, external links marked
    body = re.sub(r'<h2 id="([^"]+)">(.*?)</h2>', lambda m: f'<h2 id="{m.group(1)}"><a class="anchor" href="#{m.group(1)}" aria-label="Link to this section">{icon("link")}</a>{m.group(2)}</h2>', body)
    body = body.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    body = re.sub(r'<a href="(https?://[^"]+)">(.*?)</a>', lambda m: f'<a class="ext" href="{m.group(1)}">{m.group(2)}{icon("arrow-up-right")}</a>', body)
    body = re.sub(r"<img ", '<img loading="lazy" ', body)
    toc = [(t["id"], t["name"]) for t in conv.toc_tokens if t["level"] == 2]
    return body, toc


# ---------- the page shell ----------

def sidebar(pages: list[Page], current: Page) -> str:
    parts = []
    for g in GROUPS:
        items = [p for p in pages if p.group == g]
        links = "".join(
            f'<li><a href="{p.href}"{" aria-current=\"page\"" if p is current else ""} data-title="{html.escape(p.title.lower())} {html.escape(p.description.lower())}">{html.escape(p.title)}</a></li>'
            for p in items
        )
        parts.append(f'<div class="side__group"><h2>{icon(GROUP_ICON[g])}{g}</h2><ul>{links}</ul></div>')
    return "".join(parts)


def shell(page: Page, pages: list[Page], body: str, toc: list[tuple[str, str]]) -> str:
    i = pages.index(page)
    prev_p = pages[i - 1] if i > 0 else None
    next_p = pages[i + 1] if i + 1 < len(pages) else None
    pager = '<nav class="pager" aria-label="Previous and next">'
    pager += f'<a class="pager__prev" href="{prev_p.href}"><span class="pager__dir">{icon("arrow-left")}Previous</span><span class="pager__title">{html.escape(prev_p.title)}</span></a>' if prev_p else "<span></span>"
    pager += f'<a class="pager__next" href="{next_p.href}"><span class="pager__dir">Next{icon("arrow-right")}</span><span class="pager__title">{html.escape(next_p.title)}</span></a>' if next_p else "<span></span>"
    pager += "</nav>"
    toc_html = "".join(f'<li><a href="#{a}">{html.escape(t)}</a></li>' for a, t in toc)
    title = "ZecPy docs" if page.slug == "index" else f"{page.title} · ZecPy docs"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(page.description)}">
  <link rel="alternate" type="text/markdown" href="{page.slug}.md">
  <link rel="describedby" type="text/plain" href="../llms.txt">
  <script>document.documentElement.classList.add('js')</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@900&family=Red+Hat+Text:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/site.css">
  <link rel="stylesheet" href="../assets/css/docs.css">
</head>
<body class="docs">
<a class="skip" href="#content">Skip to content</a>
<div class="progress" aria-hidden="true"></div>
<header class="topbar">
  <a class="topbar__brand" href="../">ZecPy</a><a class="topbar__section" href="./">Docs</a>
  <nav class="topbar__links" aria-label="Site">
    <a class="iconlink" href="../">{icon("home")}<span>Home</span></a>
    <a class="iconlink" href="demo.html">{icon("play")}<span>Demo</span></a>
    <a class="iconlink" href="../llms.txt">{icon("bot")}<span>llms.txt</span></a>
    <a class="iconlink" href="{REPO}">{icon("github")}<span>GitHub</span></a>
  </nav>
  <button class="icon-btn topbar__menu" type="button" aria-expanded="false" aria-controls="side">{icon("menu")}<span>Menu</span></button>
</header>
<div class="docs__frame">
  <aside class="side" id="side" aria-label="Docs">
    <label class="side__search">{icon("search")}<span class="sr-only">Find a page</span><input type="search" placeholder="Find a page" autocomplete="off" data-filter></label>
    <nav>{sidebar(pages, page)}</nav>
  </aside>
  <main class="article" id="content">
    <p class="crumbs"><a href="./">Docs</a> <span aria-hidden="true">/</span> {page.group}</p>
    <h1>{html.escape(page.title)}</h1>
    <p class="lede">{html.escape(page.description)}</p>
    <div class="actions">
      <button class="iconlink" type="button" data-copy-page="{page.slug}.md">{icon("copy")}<span>Copy as Markdown</span></button>
      <a class="iconlink" href="{page.slug}.md">{icon("file")}<span>View .md</span></a>
    </div>
    <div class="prose">
{body}
    </div>
    {pager}
  </main>
  <nav class="toc" aria-label="On this page">
    {"<h2>" + icon("list") + "On this page</h2><ul>" + toc_html + "</ul>" if toc else ""}
  </nav>
</div>
<script src="../assets/js/docs.js"></script>
</body>
</html>
"""


def md_page(page: Page) -> str:
    # links between pages point at the Markdown twins, so an agent stays in Markdown
    body = re.sub(r"\]\(([\w-]+)\.html(#[\w-]+)?\)", lambda m: f"]({m.group(1)}.md{m.group(2) or ''})", page.body)
    return f"# {page.title}\n\n> {page.description}\n\n{body}"


def llms_index(pages: list[Page]) -> str:
    lines = [
        "# ZecPy",
        "",
        "> ZecPy is a Python SDK for sending and receiving shielded Zcash, built on librustzcash "
        "through a Rust extension. It is private by default: its light server receives no "
        "request that identifies the wallet, sends go over Tor, transparent recipients are "
        "refused, and payments are matched to invoices by diversified address, not by memo.",
        "",
        "Amounts are integers in zatoshis (1 ZEC = 100,000,000). Every network call is async. "
        "`PrivacyError` is a deliberate refusal; do not work around it with `allow_transparent` or "
        "`allow_pool_crossing` unless the user asked for exactly that. Each link below is a clean "
        "Markdown page; llms-full.txt holds all of them in one file.",
        "",
    ]
    for g in GROUPS:
        if g == "Concepts":
            continue
        lines.append(f"## {g}\n")
        for p in pages:
            if p.group == g:
                lines.append(f"- [{p.title}]({SITE}/docs/{p.slug}.md): {p.description}")
        lines.append("")
    lines.append("## Optional\n")
    for p in pages:
        if p.group == "Concepts":
            lines.append(f"- [{p.title}]({SITE}/docs/{p.slug}.md): {p.description}")
    lines.append(f"- [Source code]({REPO}): the SDK, examples, tests and the leak-audit proxy")
    lines.append(f"- [ZecPy Live]({DEMO}): the demo page and its recorded run")
    lines.append(f"- [Everything in one file]({SITE}/llms-full.txt)")
    return "\n".join(lines) + "\n"


def main() -> None:
    pages = load()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    full = [llms_index(pages).split("\n## ")[0].rstrip()]
    for page in pages:
        body, toc = render(page.body)
        (OUT / f"{page.slug}.html").write_text(shell(page, pages, body, toc))
        md = md_page(page)
        (OUT / f"{page.slug}.md").write_text(md)
        full.append(md)
    (ROOT / "llms.txt").write_text(llms_index(pages))
    (ROOT / "llms-full.txt").write_text("\n\n---\n\n".join(full))
    print(f"{len(pages)} pages -> docs/, llms.txt, llms-full.txt")


if __name__ == "__main__":
    main()
