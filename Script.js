const form = document.getElementById('searchForm');
const input = document.getElementById('q');
const resultsEl = document.getElementById('results');
const pagerEl = document.getElementById('pager');
const info = document.getElementById('info');

function esc(s){return (s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[m]);}

async function runSearch(q, page=1){
  info.textContent = "Searching...";
  resultsEl.innerHTML = "";
  
  try {
    const url = `${CONFIG.instanceBase}/search?q=${encodeURIComponent(q)}&format=json&pageno=${page-1}`;
    const res = await fetch(url);
    const json = await res.json();
    renderResults(json, q, page);
    info.textContent = "Results from " + CONFIG.instanceBase;
  } catch (err){
    info.textContent = "Search failed";
    resultsEl.innerHTML = `<div style="color:red">Error: ${esc(err.message)}</div>`;
  }
}

function renderResults(json, q, page){
  resultsEl.innerHTML = "";
  pagerEl.innerHTML = "";

  if(!json.results || json.results.length === 0){
    resultsEl.innerHTML = `<div>No results for <b>${esc(q)}</b></div>`;
    return;
  }

  json.results.forEach(r=>{
    resultsEl.innerHTML += `
      <div class="result">
        <div class="title"><a href="${esc(r.url)}" target="_blank">${esc(r.title)}</a></div>
        <div class="link">${esc(r.url)}</div>
        <div class="snippet">${esc(r.content || "")}</div>
      </div>
    `;
  });

  if(page > 1){
    const btn = document.createElement("button");
    btn.textContent = "Previous";
    btn.onclick = ()=>runSearch(q, page-1);
    pagerEl.appendChild(btn);
  }
  if(json.results.length >= CONFIG.perPage){
    const btn2 = document.createElement("button");
    btn2.textContent = "Next";
    btn2.onclick = ()=>runSearch(q, page+1);
    pagerEl.appendChild(btn2);
  }
}

form.onsubmit = e => {
  e.preventDefault();
  const q = input.value.trim();
  if(q) runSearch(q, 1);
};
