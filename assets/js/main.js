// Stated Roots landing page. Vanilla, no dependencies.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ── theme: Golden Hour (light) and High Desert Night (dark) ──
  const toggle = $("#theme-toggle");
  const syncToggle = () => {
    const dark = root.dataset.theme === "dark";
    toggle.setAttribute("aria-label", dark ? "Switch to Golden Hour theme" : "Switch to night theme");
    toggle.setAttribute("aria-pressed", String(dark));
  };
  syncToggle();
  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("sr-theme", next); } catch (e) { /* private mode: theme just isn't remembered */ }
    syncToggle();
  });

  // ── nav: solid once the page scrolls ──
  const nav = $("#nav");
  const onScrollNav = () => { nav.dataset.scrolled = String(window.scrollY > 24); };
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  // ── hero: the study develops into the painting, then the design arrives ──
  const hero = $("#hero-art");
  const steps = $$(".hero-steps [data-step]");
  const card = $("#design-card");
  const setStep = (n) => steps.forEach((li) => li.classList.toggle("on", Number(li.dataset.step) <= n));
  const playHero = () => {
    if (reduce) { setStep(2); card && card.classList.add("in"); return; }
    setStep(0);
    requestAnimationFrame(() => hero.classList.add("hero-go"));
    setTimeout(() => setStep(1), 1500);
    setTimeout(() => { setStep(2); card && card.classList.add("in"); }, 3400);
  };
  const day = $(".hero-day", hero);
  const sketch = $(".hero-sketch", hero);
  Promise.all([day, sketch].map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())))
    .then(playHero);

  // ── scroll reveals ──
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$("[data-reveal]").forEach((el) => io.observe(el));

  // ── the trail draws itself as you travel down the page ──
  const trail = $("#trail");
  const path = $("#trail-path");
  const points = $$(".waypoint", trail);
  const stops = $$(".step");
  if (trail && path) {
    const len = path.getTotalLength();
    path.style.setProperty("--len", len);
    let ticking = false;
    const draw = () => {
      ticking = false;
      const r = trail.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 as the map's top reaches 85% of the viewport, 1 as its bottom passes 55%
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
      path.style.strokeDashoffset = String(len * (1 - p));
      points.forEach((g, i) => {
        const on = p >= Number(g.dataset.at);
        g.classList.toggle("on", on);
        stops[i] && stops[i].classList.toggle("on", on);
      });
    };
    draw();
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
    window.addEventListener("resize", draw);
  }

  // ── the studio: type the prompt, generate, develop the four results ──
  const app = $("#studio-app");
  const promptEl = $("#prompt-text");
  const genBtn = $("#gen-btn");
  const status = $("#gen-status");
  const tiles = $$(".tile", app);
  const PROMPT = promptEl.textContent;
  let run = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const runStudio = async () => {
    const id = ++run;
    tiles.forEach((t) => t.classList.remove("dev"));
    if (reduce) { promptEl.textContent = PROMPT; tiles.forEach((t) => t.classList.add("dev")); status.textContent = "Ready"; return; }
    promptEl.textContent = "";
    status.textContent = "";
    await wait(400);
    for (const ch of PROMPT) {
      if (id !== run) return;
      promptEl.textContent += ch;
      await wait(ch === "," ? 220 : 34 + Math.random() * 40);
    }
    await wait(350);
    genBtn.classList.add("busy");
    status.textContent = "Generating in the High Desert style…";
    await wait(1100);
    genBtn.classList.remove("busy");
    for (const [i, t] of tiles.entries()) {
      if (id !== run) return;
      t.classList.add("dev");
      await wait(i === 0 ? 450 : 380);
    }
    await wait(1600);
    if (id === run) status.textContent = "4 designs ready to refine";
  };
  const studioIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { studioIO.disconnect(); runStudio(); }
  }, { threshold: 0.35 });
  studioIO.observe(app);
  $("#gen-replay").addEventListener("click", runStudio);
  genBtn.addEventListener("click", runStudio);

  // ── the Brand Book: the iron comes down when the record is in view ──
  const ledger = $("#ledger");
  const ledgerIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { ledgerIO.disconnect(); setTimeout(() => ledger.classList.add("stamped"), reduce ? 0 : 700); }
  }, { threshold: 0.5 });
  ledgerIO.observe(ledger);

  // ── waitlist: CTAs preselect the role; signups go to Web3Forms ──
  const form = $("#wl-form");
  const msg = $("#wl-msg");
  $$("a[data-role]").forEach((a) => a.addEventListener("click", () => {
    const radio = form.querySelector(`input[name="role"][value="${a.dataset.role}"]`);
    if (radio) radio.checked = true;
  }));
  // Web3Forms (free plan): each signup is emailed to the Stated Roots inbox.
  // The access key is public by design; it can only send mail to that inbox.
  const WEB3FORMS_KEY = "22e83573-5518-4b7c-b5a5-4c6e7f9e1060";
  const submitBtn = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.botcheck && form.botcheck.checked) return; // honeypot: bots tick hidden boxes
    const email = form.email.value.trim();
    if (!form.email.checkValidity() || !email) { msg.textContent = "Please enter a valid email address."; form.email.focus(); return; }
    const role = (form.querySelector('input[name="role"]:checked') || {}).value || "retailer";
    msg.textContent = "Sending…";
    submitBtn.disabled = true;
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `New Stated Roots waitlist signup (${role})`,
          from_name: "statedroots.com waitlist",
          email,
          role,
          page: location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        msg.textContent = role === "artist"
          ? "Thank you. You're on the artist list; we'll be in touch about founding collections."
          : "You're on the list. We'll be in touch before launch.";
        form.reset();
      } else {
        msg.textContent = "Something went wrong. Please try again in a moment.";
      }
    } catch (err) {
      msg.textContent = "We couldn't reach the signup service. Please try again in a moment.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
