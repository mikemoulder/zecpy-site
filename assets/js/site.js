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
  let current = "zcash-devtool", expanded = false;
  more.addEventListener("click", () => { expanded = true; render(current); });

  function render(name) {
    if (name !== current) expanded = false;
    current = name;
    const data = window.REQUESTS[name];
    // the first rows show; the rest are one click away
    const rows = expanded ? data.rows : data.rows.slice(0, 8);
    more.hidden = rows.length === data.rows.length;
    more.querySelector("span").textContent = `Show all ${data.rows.length} rows (${data.total} requests)`;
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
    summary.append(`${name}: `, strong, ` of ${data.total} requests.`);
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wallet === name)));
  }
  buttons.forEach((b) => b.addEventListener("click", () => render(b.dataset.wallet)));
  render("zcash-devtool");
})();

// The API tabs: click or arrow keys pick a call; the panel shows what it does.
(() => {
  const tabs = [...document.querySelectorAll(".api__tab")];
  const panel = document.getElementById("api-panel");
  if (!tabs.length || !panel) return;
  const name = document.getElementById("api-name");
  const desc = document.getElementById("api-desc");
  const code = document.getElementById("api-code");
  function select(tab, focus) {
    tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    panel.setAttribute("aria-labelledby", tab.id);
    name.textContent = tab.textContent;
    desc.textContent = tab.dataset.desc;
    code.textContent = tab.dataset.code;
    panel.classList.remove("is-swapping");
    void panel.offsetWidth;
    panel.classList.add("is-swapping");
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
    });
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
      const el = e.target, to = Number(el.dataset.count), start = performance.now();
      if (to === 0) continue;
      (function frame(now) {
        const t = Math.min(1, (now - start) / 900);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    }
  }, { threshold: 0.4 });
  figures.forEach((el) => io.observe(el));
})();

// The slip prints line by line.
document.querySelectorAll(".slip h3, .slip li, .slip .total").forEach((el, i) => el.style.setProperty("--r", String(i)));
