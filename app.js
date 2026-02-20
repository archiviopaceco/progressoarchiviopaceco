// app.js
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const fmt = (n) => Number(n).toLocaleString("it-IT");

function pct(part, total){
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return clamp((part / total) * 100, 0, 100);
}

async function loadData(){
  const res = await fetch(`./progress.json?ts=${Date.now()}`);
  if (!res.ok) throw new Error(`Impossibile caricare progress.json (HTTP ${res.status})`);
  return res.json();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function renderProject(p){
  const total = Number(p.total) || 0;
  const partial = Number(p.partial) || 0;    // coverage (>= complete)
  const complete = Number(p.complete) || 0;  // completed subset

  const safeComplete = clamp(complete, 0, total);
  const safePartial = clamp(partial, safeComplete, total);

  const completePct = pct(safeComplete, total);
  const coveragePct = pct(safePartial, total);

  const completeW = completePct;
  const partialOnlyW = clamp(coveragePct - completePct, 0, 100);
  const remainingW = clamp(100 - coveragePct, 0, 100);

  const remaining = Math.max(0, total - safePartial);

  const el = document.createElement("div");
  el.className = "proj";

  el.innerHTML = `
    <div class="projHead">
      <div>
        <div class="projName">${escapeHtml(p.title || "Progetto")}</div>
        <div class="projRange">${escapeHtml(p.range || "")}${p.subtitle ? ` • ${escapeHtml(p.subtitle)}` : ""}</div>
      </div>
      <div class="projRight">
        <div><b>${coveragePct.toFixed(1)}%</b> copertura</div>
        <div><b>${completePct.toFixed(1)}%</b> completati</div>
        <div>${fmt(safePartial)}/${fmt(total)} • rimanenti ${fmt(remaining)}</div>
      </div>
    </div>

    <div class="barWrap" aria-label="Barra di progresso">
      <div class="barRow">
        <div class="seg complete" style="width:${completeW}%"></div>
        <div class="seg partial" style="width:${partialOnlyW}%"></div>
        <div class="seg remaining" style="width:${remainingW}%"></div>
      </div>
    </div>
  `;

  return { el, total, partial: safePartial, complete: safeComplete };
}

async function main(){
  const errEl = document.getElementById("err");
  try{
    const data = await loadData();

    if (!data || !Array.isArray(data.projects)){
      throw new Error("progress.json deve contenere: { title, updated, credit, projects: [...] }");
    }

    document.getElementById("pageTitle").textContent = data.title || "Progetto di indicizzazione — Paceco";
    document.getElementById("updated").textContent = `Ultimo aggiornamento: ${data.updated || "—"}`;
    document.getElementById("credit").textContent = data.credit || "";

    const holder = document.getElementById("projects");
    holder.innerHTML = "";

    let totalAll = 0, partialAll = 0, completeAll = 0;

    for (const p of data.projects){
      const { el, total, partial, complete } = renderProject(p);
      holder.appendChild(el);
      totalAll += total;
      partialAll += partial;
      completeAll += complete;
    }

    const overallCoverage = pct(partialAll, totalAll);
    const overallComplete = pct(completeAll, totalAll);

    document.getElementById("overall").textContent =
      `Totale: ${fmt(partialAll)}/${fmt(totalAll)} (${overallCoverage.toFixed(1)}% copertura) • ${overallComplete.toFixed(1)}% completati`;

  } catch(e){
    errEl.style.display = "block";
    errEl.innerHTML = `<strong>Errore:</strong> ${escapeHtml(e.message || String(e))}`;
  }
}

main();
