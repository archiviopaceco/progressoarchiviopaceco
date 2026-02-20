function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

async function main() {
  const errEl = document.getElementById("err");
  try {
    // cache-bust so GitHub Pages updates are visible immediately
    const res = await fetch(`./progress.json?ts=${Date.now()}`);
    if (!res.ok) throw new Error(`Could not load progress.json (HTTP ${res.status})`);
    const data = await res.json();

    const done = Number(data.done);
    const total = Number(data.total);

    if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) {
      throw new Error("progress.json must contain numeric fields: done, total (total > 0).");
    }

    const remaining = Math.max(0, total - done);
    const pct = clamp((done / total) * 100, 0, 100);

    document.getElementById("done").textContent = done.toLocaleString();
    document.getElementById("total").textContent = total.toLocaleString();
    document.getElementById("remaining").textContent = remaining.toLocaleString();
    document.getElementById("percent").textContent = `${pct.toFixed(1)}%`;

    const updated = data.updated ? String(data.updated) : "—";
    document.getElementById("updated").textContent = `Last updated: ${updated}`;

    const bar = document.getElementById("bar");
    bar.style.width = `${pct}%`;

    // Simple color ramp without external libs
    // (green-ish when high, orange-ish when low)
    const hue = 20 + (pct * 1.1); // 20..130 approx
    bar.style.background = `hsl(${hue} 70% 45%)`;

  } catch (e) {
    errEl.textContent = e.message || String(e);
  }
}

main();
