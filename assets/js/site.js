// ZecPy website: section reveals, the request log, the command list, copy buttons.

// Reveal once when an element enters the viewport. Never replays, never leaves content hidden.
(() => {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) { targets.forEach((el) => el.classList.add("is-in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener("load", () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in"); });
  }, 2500));
})();

// The request log: every request each wallet's light server received, from the leak-audit runs.
(() => {
  const body = document.getElementById("log-body");
  const summary = document.getElementById("log-summary");
  const buttons = document.querySelectorAll("[data-wallet]");
  if (!body || !window.REQUESTS) return;
  const scenarios = {
    create: "Create", "first-sync": "First sync", receive: "Receive", restart: "Restart", send: "Send",
  };
  const labels = { public: "Nothing", coarse: "A wide window", broadcast: "A new transaction", identifying: "This wallet" };

  const more = document.getElementById("log-more");
  const phone = matchMedia("(max-width: 47.99em)");
  let current = "zcash-devtool", expanded = false;
  more.addEventListener("click", () => { expanded = true; render(current); });

  function render(name) {
    if (name !== current) expanded = false;
    current = name;
    const data = window.REQUESTS[name];
    // a phone shows the first rows; the rest are one tap away
    const rows = phone.matches && !expanded ? data.rows.slice(0, 8) : data.rows;
    more.hidden = rows.length === data.rows.length;
    more.querySelector("span").textContent = `Show all ${data.rows.length} rows`;
    body.textContent = "";
    let last = null;
    for (const [scenario, method, label, reason, count] of rows) {
      if (last !== null && scenario !== last) {
        const gap = document.createElement("tr");
        gap.className = "gap";
        gap.setAttribute("aria-hidden", "true");
        gap.append(document.createElement("td"));
        gap.firstChild.colSpan = 4;
        body.append(gap);
      }
      const tr = document.createElement("tr");
      if (label === "identifying") tr.className = "is-identifying";
      tr.style.setProperty("--r", String(body.children.length));
      const cells = [
        ["scenario", scenario !== last ? scenarios[scenario] : ""],
        ["method", count > 1 ? `${method} ×${count}` : method],
        ["learn", reason.charAt(0).toUpperCase() + reason.slice(1)],
        ["label", labels[label]],
      ];
      for (const [cls, text] of cells) {
        const td = document.createElement("td");
        td.className = cls;
        td.textContent = text;
        tr.append(td);
      }
      body.append(tr);
      last = scenario;
    }
    summary.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = `${data.identifying} identifying`;
    summary.append(`${name}: `, strong, ` of ${data.total} requests across the same five scenarios.`);
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wallet === name)));
    body.parentElement.parentElement.scrollTop = 0;
  }
  buttons.forEach((b) => b.addEventListener("click", () => render(b.dataset.wallet)));
  render("zcash-devtool");
})();

// The command list: type to filter, arrows or hover to move the selection.
(() => {
  const input = document.getElementById("cmd-search");
  const list = document.getElementById("cmd-list");
  const empty = document.getElementById("cmd-empty");
  if (!input || !list) return;
  const items = [...list.querySelectorAll(".cmd")];
  const visible = () => items.filter((el) => !el.hidden);
  function select(el) {
    items.forEach((i) => i.setAttribute("aria-selected", String(i === el)));
    if (el) input.setAttribute("aria-activedescendant", el.id);
  }
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    items.forEach((el) => { el.hidden = q !== "" && !el.textContent.toLowerCase().includes(q); });
    const v = visible();
    empty.hidden = v.length > 0;
    if (!v.some((el) => el.getAttribute("aria-selected") === "true")) select(v[0] || null);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const v = visible();
    const at = v.findIndex((el) => el.getAttribute("aria-selected") === "true");
    const next = v[(at + (e.key === "ArrowDown" ? 1 : -1) + v.length) % v.length];
    if (next) { select(next); next.scrollIntoView({ block: "nearest" }); }
  });
  items.forEach((el) => {
    el.addEventListener("click", () => select(el));
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) el.addEventListener("mouseenter", () => select(el));
  });
})();

// Copy buttons: copy the text of the element named by data-copy.
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const label = btn.querySelector("span");
    const text = document.getElementById(btn.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = "Copied";
    } catch {
      label.textContent = "Select and copy";
    }
    setTimeout(() => { label.textContent = "Copy"; }, 1800);
  });
});

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// The hero ticker: ZecPy's own requests from the audit, and what each told the server.
(() => {
  const track = document.getElementById("ticker");
  if (!track || !window.REQUESTS) return;
  const learns = { public: "nothing", coarse: "a wide window", broadcast: "a new transaction", identifying: "this wallet" };
  const items = window.REQUESTS.ZecPy.rows.map(([scenario, method, label, , count]) => {
    const el = document.createElement("span");
    el.className = "ticker__item";
    const m = document.createElement("b");
    m.textContent = count > 1 ? `${method} \u00d7${count}` : method;
    const l = document.createElement("i");
    l.textContent = learns[label];
    el.append(scenario.replace("-", " "), m, "server learns", l);
    return el;
  });
  // two copies, so the loop wraps without a seam
  track.append(...items, ...items.map((el) => el.cloneNode(true)));
})();

// Figures that count up once, when they come into view.
(() => {
  const figures = document.querySelectorAll("[data-count]");
  if (calm || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const to = Number(e.target.dataset.count);
      let n = 0;
      e.target.textContent = "0";
      const tick = setInterval(() => { n += 1; e.target.textContent = String(n); if (n >= to) clearInterval(tick); }, 140);
    }
  }, { threshold: 0.4 });
  figures.forEach((el) => io.observe(el));
})();

// The command search types its own suggestions until someone uses it.
(() => {
  const input = document.getElementById("cmd-search");
  if (!input || calm) return;
  const words = ["Find a call", "invoices", "send_many", "pay", "propose_cold", "fetch_memos"];
  let w = 0, i = words[0].length, deleting = true, stopped = false;
  const stop = () => { stopped = true; input.placeholder = "Find a call"; };
  input.addEventListener("focus", stop);
  (function step() {
    if (stopped) return;
    const word = words[w];
    i += deleting ? -1 : 1;
    input.placeholder = word.slice(0, Math.max(0, i)) || "\u200b";
    let wait = deleting ? 45 : 90;
    if (!deleting && i >= word.length) { deleting = true; wait = 1600; }
    else if (deleting && i <= 0) { deleting = false; w = (w + 1) % words.length; wait = 300; }
    setTimeout(step, wait);
  })();
})();

// The slip prints line by line.
document.querySelectorAll(".slip h3, .slip li, .slip .total").forEach((el, i) => el.style.setProperty("--r", String(i)));
