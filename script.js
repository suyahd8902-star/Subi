// script.js - robust Searx frontend: cycles public instances, handles CORS/timeouts and pageno fallbacks.

const form = document.getElementById('searchForm');
const input = document.getElementById('q');
const resultsEl = document.getElementById('results');
const pagerEl = document.getElementById('pager');
const info = document.getElementById('info');

function esc(s){ return (s||'').toString()
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function buildUrl(base, q, pageno) {
  try {
    const u = new URL('/search', base);
    u.searchParams.set('q', q);
    u.searchParams.set('format', 'json');
    // pageno: many instances use 0-based pageno; we will pass the number directly
    u.searchParams.set('pageno', String(Math.max(0, pageno-1)));
    return u.toString();
  } catch (e) {
    return null;
  }
}

function timeoutPromise(ms, promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(()=>reject(new Error('timeout')), ms))
  ]);
}

// Try a single instance; returns json or throws
async function tryInstance(instanceBase, q, page) {
  const urlsToTry = [
    buildUrl(instanceBase, q, page),                  // pageno = page-1
    // also try an explicit 0-based pageno as fallback (some instances behave differently)
    (() => { try { const u = new URL('/search', instanceBase); u.searchParams.set('q', q); u.searchParams.set('format','json'); u.searchParams.set('pageno','0'); return u.toString(); } catch(e){ return null; } })()
  ].filter(Boolean);

  let lastErr = null;
  for (const url of urlsToTry) {
    try {
      const resp = await timeoutPromise(CONFIG.timeoutMs, fetch(url, {mode:'cors'}));
      if (!resp.ok) {
        lastErr = new Error('HTTP ' + resp.status + ' from ' + instanceBase);
        continue;
      }
      const json = await resp.json();
      // basic validation
      if (Array.isArray(json.results)) return json;
      // some instances may wrap differently — accept any object with 'results' OR 'query' fields
      if (json && (json.results || json.error || json.query)) return json;
      lastErr = new Error('Unexpected JSON shape from ' + instanceBase);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('No usable response from ' + instanceBase);
}

// Main: try each configured instance until success
async function fetchFromInstances(q, page=1) {
  const tried = [];
  for (const inst of (CONFIG.instances || [])) {
    tried.push(inst);
    try {
      const json = await tryInstance(inst, q, page);
      return { json, usedInstance: inst, tried };
    } catch (err) {
      // continue to next instance
      console.warn('Instance failed:', inst, err && err.message);
      continue;
    }
  }
  throw new Error('All instances failed: ' + tried.join(', '));
}

// UI: render results and paging
function renderResults(json, q, page, usedInstance) {
  resultsEl.innerHTML = '';
  pagerEl.innerHTML = '';

  const arr = Array.isArray(json.results) ? json.results : (json.results || json.data || []);
  if (!arr || arr.length === 0) {
    resultsEl.innerHTML = `<div class="info">No results for <strong>${esc(q)}</strong> (instance: ${esc(usedInstance)})</div>`;
    return;
  }

  arr.forEach(item => {
    const title = item.title || item.name || '(no title)';
    const link = item.url || item.link || '#';
    const snippet = item.content || item.snippet || item.description || '';
    const engine = item.engine ? ` · ${item.engine}` : '';
    const html = `
      <article class="result">
        <div class="title"><a href="${esc(link)}" target="_blank" rel="noopener">${esc(title)}</a></div>
        <div class="link">${esc(link)}${esc(engine)}</div>
        <div class="snippet">${esc(snippet)}</div>
      </article>
    `;
    resultsEl.insertAdjacentHTML('beforeend', html);
  });

  // pager heuristics
  if (page > 1) {
    const btn = document.createElement('button'); btn.textContent = 'Previous'; btn.onclick = ()=>runSearch(q, page-1);
    pagerEl.appendChild(btn);
  }
  if (arr.length >= (CONFIG.perPage || 10)) {
    const btn2 = document.createElement('button'); btn2.textContent = 'Next'; btn2.onclick = ()=>runSearch(q, page+1);
    pagerEl.appendChild(btn2);
  }
}

async function runSearch(q, page=1) {
  info.textContent = 'Searching...';
  resultsEl.innerHTML = '';
  pagerEl.innerHTML = '';
  try {
    const {json, usedInstance} = await fetchFromInstances(q, page);
    renderResults(json, q, page, usedInstance);
    info.textContent = `Showing results from ${usedInstance}`;
  } catch (err) {
    console.error(err);
    info.textContent = 'Search failed: ' + (err && err.message);
    resultsEl.innerHTML = `<div style="color:red">Error: ${esc(err && err.message)}</div>
      <div style="margin-top:8px;color:#666">Try a different instance in config.js or deploy a proxy (instructions in README).</div>`;
  }
}

form.onsubmit = e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  runSearch(q, 1);
};
