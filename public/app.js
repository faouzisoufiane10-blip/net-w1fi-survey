(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const API_BASE = window.location.origin;

  /* ---------- Chips (connection type) ---------- */
  $$(".chips").forEach((group) => {
    const hidden = $(`input[name="${group.dataset.name}"]`);
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      $$(".chip", group).forEach((c) => c.classList.remove("is-active"));
      btn.classList.add("is-active");
      hidden.value = btn.dataset.value;
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  /* ---------- Star ratings ---------- */
  $$(".rating").forEach((rating) => {
    const stars = $$(".star", rating);
    const hidden = $(`input[name="${rating.dataset.name}"]`);
    let current = 0;

    const paint = (n) => stars.forEach((s, i) => s.classList.toggle("is-on", i < n));

    stars.forEach((star, i) => {
      star.addEventListener("mouseenter", () => paint(i + 1));
      star.addEventListener("click", () => {
        current = i + 1;
        hidden.value = current;
        hidden.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
    rating.addEventListener("mouseleave", () => paint(current));
  });

  /* ---------- Form submission ---------- */
  const form = $("#surveyForm");
  const status = $("#formStatus");
  const submitBtn = $("#submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form__status";
    status.textContent = "";

    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) {
      if (v === "" || v == null) continue;
      if (["downloadSpeed", "uploadSpeed", "monthlyCost"].includes(k)) {
        payload[k] = Number(v);
      } else if (["reliabilityRating", "speedRating", "valueRating", "supportRating"].includes(k)) {
        payload[k] = Number(v);
      } else if (k === "wouldRecommend") {
        payload[k] = true;
      } else {
        payload[k] = v;
      }
    }
    if (!("wouldRecommend" in payload)) payload.wouldRecommend = false;

    submitBtn.disabled = true;
    status.textContent = "Submitting…";
    status.className = "form__status";

    try {
      const res = await fetch(`${API_BASE}/api/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      status.textContent = "Thank you. Your response is live.";
      status.className = "form__status ok";
      form.reset();
      $$(".chip").forEach((c) => c.classList.remove("is-active"));
      $$(".rating .star").forEach((s) => s.classList.remove("is-on"));

      loadDashboard();
      loadHeroStats();
    } catch (err) {
      status.textContent = err.message;
      status.className = "form__status err";
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* ---------- Dashboard ---------- */
  const fmt = (n, d = 1) => (n == null || Number.isNaN(n) ? "—" : Number(n).toFixed(d));

  async function loadDashboard() {
    const tbody = $("#ispTable tbody");
    try {
      const [summaryRes, ispRes] = await Promise.all([
        fetch(`${API_BASE}/api/summary`),
        fetch(`${API_BASE}/api/summary?group_by=isp`),
      ]);
      const summary = await summaryRes.json();
      const ispData = await ispRes.json();
      const byIsp = ispData.byIsp || [];

      const total = summary.totalResponses || 0;
      if (total === 0) {
        $("#dashEmpty").hidden = false;
        $("#dashBody").style.opacity = "0.4";
      } else {
        $("#dashEmpty").hidden = true;
        $("#dashBody").style.opacity = "1";
      }

      $("#mTotal").textContent = total;
      $("#mRecommend").textContent = summary.recommendCount != null ? `${summary.recommendCount} (${summary.recommendPct}%)` : "—";
      $("#mDownload").innerHTML = `${fmt(summary.averages.downloadMbps)}<small>Mbps</small>`;
      $("#mUpload").innerHTML = `${fmt(summary.averages.uploadMbps)}<small>Mbps</small>`;
      $("#mCost").textContent = fmt(summary.averages.monthlyCost, 2);

      const bars = { reliability: "avgReliability", speed: "avgSpeed", value: "avgValue", support: "avgSupport" };
      Object.entries(bars).forEach(([key, src]) => {
        const val = summary.averages[key] || 0;
        const bar = $(`.bar[data-target="${key}"]`);
        if (bar) {
          bar.querySelector(".bar__fill").style.width = `${(val / 5) * 100}%`;
          bar.querySelector(".bar__val").textContent = fmt(val);
        }
      });

      tbody.innerHTML = byIsp.length
        ? byIsp
            .map(
              (r) => `<tr>
                <td><strong>${escapeHtml(r.isp)}</strong></td>
                <td class="num">${r.count}</td>
                <td class="num">${fmt(r.avgReliability)}</td>
                <td class="num">${fmt(r.avgSpeed)}</td>
                <td class="num">${fmt(r.avgValue)}</td>
                <td class="num">${fmt(r.avgDownload)}</td>
                <td class="num">${r.count ? Math.round((r.recommendCount / r.count) * 100) : 0}%</td>
              </tr>`,
            )
            .join("")
        : `<tr><td colspan="7" style="text-align:center;color:var(--ink-faint);padding:32px">No data yet.</td></tr>`;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--accent);padding:32px">Couldn't load data.</td></tr>`;
    }
  }

  async function loadHeroStats() {
    try {
      const res = await fetch(`${API_BASE}/api/summary`);
      const s = await res.json();
      $("#statTotal").textContent = s.totalResponses || 0;
      $("#statRecommend").textContent = s.totalResponses ? `${s.recommendPct}%` : "—";
      $("#statAvgReliability").textContent = s.averages?.reliability ? fmt(s.averages.reliability) : "—";
    } catch {
      /* leave dashes */
    }
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  loadDashboard();
  loadHeroStats();
})();
