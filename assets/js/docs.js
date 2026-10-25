// ZecPy docs: copy buttons, page filter, mobile menu, on-this-page tracking, entrances.

async function copyText(text, btn) {
  const label = btn.querySelector("span");
  const was = label.textContent;
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = "Copied";
  } catch {
    label.textContent = "Copy failed";
  }
  btn.classList.add("is-done");
  setTimeout(() => { label.textContent = was; btn.classList.remove("is-done"); }, 1600);
}

document.querySelectorAll("[data-copy-code]").forEach((btn) => {
  btn.addEventListener("click", () => copyText(btn.closest(".codeblock").querySelector("code").textContent, btn));
});

document.querySelectorAll("[data-copy-page]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      const res = await fetch(btn.dataset.copyPage);
      await copyText(await res.text(), btn);
    } catch {
      location.href = btn.dataset.copyPage;
    }
  });
});

// Find a page: filters the sidebar by title and description.
(() => {
  const input = document.querySelector("[data-filter]");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(".side__group").forEach((group) => {
      let any = false;
      group.querySelectorAll("li").forEach((li) => {
        const hit = !q || li.firstElementChild.dataset.title.includes(q);
        li.hidden = !hit;
        any ||= hit;
      });
      group.hidden = !any;
    });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const first = document.querySelector(".side__group li:not([hidden]) a");
    if (first) location.href = first.href;
  });
})();

// The menu on narrow screens.
(() => {
  const btn = document.querySelector(".topbar__menu");
  const side = document.getElementById("side");
  if (!btn || !side) return;
  btn.addEventListener("click", () => {
    const open = side.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
    btn.querySelector("span").textContent = open ? "Close" : "Menu";
  });
})();

// On this page: marks the section being read.
(() => {
  const links = [...document.querySelectorAll(".toc a")];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle("is-active", a === byId.get(e.target.id)));
    }
  }, { rootMargin: "0px 0px -70% 0px" });
  document.querySelectorAll(".prose h2[id]").forEach((h) => io.observe(h));
})();

// Entrances: each block of the article rises once as it comes into view.
(() => {
  const blocks = document.querySelectorAll(".prose > *");
  if (!("IntersectionObserver" in window)) { blocks.forEach((el) => el.classList.add("is-in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -6% 0px" });
  blocks.forEach((el) => io.observe(el));
  setTimeout(() => blocks.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-in"); }), 2000);
})();
