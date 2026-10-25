# ZecPy website

The website and documentation for [ZecPy](https://github.com/xerodahdev/zecpy), a Python
SDK for shielded Zcash. Static files, no framework.

```text
index.html            landing page
docs/                 generated: one .html and one .md per page
content/docs/*.md     the docs source (edit these)
llms.txt              generated index for language models (llmstxt.org format)
llms-full.txt         generated: every docs page in one file
AGENTS.md             instructions for agents working in a repo that uses ZecPy
assets/               css, js, images, the demo recording
build.py              Markdown to docs/, llms.txt, llms-full.txt
```

## Build and preview

```bash
uv run --no-project --with markdown python build.py
python -m http.server 8000
```

## Where the content comes from

- The request log on the landing page (`assets/js/requests.js`) is generated from the
  leak-audit runs in the SDK repo, `docs/privacy-report/*.jsonl`, recorded 2026-10-24.
- Screenshots and the video are captured from ZecPy Live
  ([zecpy-demo](https://github.com/xerodahdev/zecpy-demo)) replaying its recorded run.
- Every API detail in the docs is taken from `python/zecpy/` and `src/` in the SDK.
