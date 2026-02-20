// app.js
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const fmt = (n) => Number(n).toLocaleString("it-IT");

function pct(part, total){
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return clamp((part / total) * 100, 0, 100);
}

function parseRangeKey(range){
  // expects "1682–1743" or "1682-1743"
  const s = String(range || "").replace("—", "-").replace("–","-");
  const m = s.match(/(\d{3,4})\s*-\s*(\d{3,4})/);
  if (!m) return { a: 999999, b: 999999 };
  return { a: Number(m[1]), b: Number(m[2]) };
}

async function loadData(){
  const res = await fetch(`./progress.json?ts=${Date.now()}`);
  if (!res.ok) throw new Error(`Impossibile caricare progress.json (HTTP ${res.status})`);
  return res.json();
}

function sortProjects(projects, mode){
  const arr = [...projects];

  const byName = (a,b) => String(a.title).localeCompare(String(b.title), "it");
  const byRange = (a,b) => {
    const ra = parseRangeKey(a.range), rb = parseRangeKey(b.range);
    return (ra.a - rb.a) || (ra.b - rb.b) || byName(a,b);
  };
  const byComplete = (a,b) => pct(a.complete, a.total) - pct(b.complete, b.total);
  const byCoverage = (a,b) => pct(a.partial, a.total) - pct(b.partial, b.total);
  const byRemaining = (a,b) => (a.total - a.partial) - (b.total - b.partial);

  switch(mode){
    case "range_desc": return arr.sort((a,b)=>-byRange(a,b));
    case "complete_desc": return arr.sort((a,b)=>-byComplete(a,b));
    case "coverage_desc": return arr.sort((a,b)=>-byCoverage(a,b));
    case "remaining_asc": return arr.sort(byRemaining);
    case "name_asc": return arr.sort(byName);
    case "range_asc":
    default: return arr.sort(byRange);
  }
}

function render(projects, meta){
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (const p of projects){
    const total = Number(p.total) || 0;
    const partial = Number(p.partial) || 0;     // "Parzialmente" (coverage)
    const complete = Number(p.complete) || 0;   // "Completamente"
    const remaining = Math.max(0, total - partial);

    const completePct = pct(complete, total);
    const coveragePct = pct(partial, total);

    const completeW = clamp(completePct, 0, 100);
    const partialOnlyW = clamp(coveragePct - completePct, 0, 100);
    const remainingW = clamp(100 - coveragePct, 0, 100);

    const el = document.createElement("article");
    el.className = "proj";
    el.dataset.q = `${p.title || ""} ${p.range || ""} ${p.subtitle || ""}`.toLowerCase();

    el.innerHTML = `
      <div class="projTop">
        <div>
          <div class="projTitle">${escapeHtml(p.title || "Progetto")}</div>
          <div class="range">${escapeHtml(p.range || "")}${p.subtitle ? ` • ${escapeHtml(p.subtitle)}` : ""}</div>
        </div>
        <div class="projMeta">
          <div><b>${coveragePct.toFixed(1)}%</b> copertura</div>
          <div><b>${completePct.toFixed(1)}%</b> completati</div>
          <div>${fmt(partial)} / ${fmt(total)} • rimanenti ${fmt(remaining)}</div>
        </div>
      </div>

      <div class="barWrap" aria-label="Barra di progresso (completati + parziali + rimanenti)">
        <div class="barRow">
          <div class="seg complete" style="width:${completeW}%"></div>
          <div class="seg partial" style="width:${partialOnlyW}%"></div>
          <div class="seg remaining" style="width:${remainingW}%"></div>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="label">Parzialmente</div>
          <div class="value">${fmt(partial)}<span style="font-size:12px;font-weight:750;color:rgba(255,255,255,.62)">/${fmt(total)}</span></div>
        </div>
        <div class="stat">
          <div class="label">Completamente</div>
          <div class="value">${fmt(complete)}<span style="font-size:12px;font-weight:750;color:rgba(255,255,255,.62)">/${fmt(total)}</span></div>
        </div>
        <div class="stat">
          <div class="label">Copertura</div>
          <div class="value">${coveragePct.toFixed(1)}%</div>
        </div>
        <div class="stat">
          <div class="label">Completati</div>
          <div class="value">${completePct.toFixed(1)}%</div>
        </div>
      </div>

      <div class="projFoot">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="badge"><i class="p" aria-hidden="true"></i>Parziale</span>
          <span class="badge"><i class="c" aria-hidden="true"></i>Completo</span>
        </div>
        <div>${escapeHtml(p.note || "")}</div>
      </div>
    `;

    grid.appendChild(el);
  }

  // Pills + footer
  document.getElementById("pillProjects").textContent = fmt(meta.count);

  document.getElementById("pillCompletePct").textContent =
    `${meta.completePct.toFixed(1)}%`;

  document.getElementById("pillCoveragePct").textContent =
    `${meta.coveragePct.toFixed(1)}%`;

  document.getElementById("credit").textContent =
    meta.credit || "";

  document.getElementById("updated").textContent =
    `Ultimo aggiornamento: ${meta.updated || "—"}`;
}

function applyFilter(){
  const q = document.getElementById("q").value.trim().toLowerCase();
  const cards = document.querySelectorAll(".proj");
  let shown = 0;

  for (const c of cards){
    const hay = c.dataset.q || "";
    const ok = !q || hay.includes(q);
    c.style.display = ok ? "" : "none";
    if (ok) shown++;
  }
  document.getElementById("pillProjects").textContent = fmt(shown);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

async function main(){
  const errEl = document.getElementById("err");
  try{
    const data = await loadData();

    if (!data || !Array.isArray(data.projects)){
      throw new Error("progress.json deve contenere: { updated, credit, projects: [...] }");
    }

    const projects = data.projects.map(p => ({
      title: p.title ?? "Progetto",
      range: p.range ?? "",
      subtitle: p.subtitle ?? "",
      total: Number(p.total) || 0,
      partial: Number(p.partial) || 0,
      complete: Number(p.complete) || 0,
      note: p.note ?? ""
    }));

    const totalAll = projects.reduce((a,p)=>a+p.total, 0);
    const partialAll = projects.reduce((a,p)=>a+p.partial, 0);
    const completeAll = projects.reduce((a,p)=>a+p.complete, 0);

    const meta = {
      updated: data.updated || "",
      credit: data.credit || "",
      count: projects.length,
      coveragePct: pct(partialAll, totalAll),
      completePct: pct(completeAll, totalAll),
    };

    const sortSel = document.getElementById("sort");
    const draw = () => {
      const sorted = sortProjects(projects, sortSel.value);
      render(sorted, meta);
      applyFilter();
    };

    draw();

    document.getElementById("q").addEventListener("input", applyFilter);
    sortSel.addEventListener("change", draw);

  } catch (e){
    errEl.style.display = "block";
    errEl.innerHTML = `<strong>Errore:</strong> ${escapeHtml(e.message || String(e))}`;
  }
}

main();
