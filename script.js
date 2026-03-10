// ========================= UTILITIES =========================
let cpuAlgo = 'fcfs', pageAlgo = 'fifo', diskAlgo = 'fcfs', memAlgo = 'first';
let cpuProcCount = 0;

const COLORS = [
  '#00e5ff','#7c3aed','#10b981','#f59e0b','#ef4444',
  '#06b6d4','#8b5cf6','#34d399','#fcd34d','#f87171',
  '#e879f9','#a3e635'
];

function showTab(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.target.classList.add('active');
}

function parseNums(str) {
  return str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
}

function clearLog(containerId) {
  document.getElementById(containerId).innerHTML = '';
}

// ========================= CPU SCHEDULING =========================

function togglePriorityCol(show) {
  document.getElementById('priority-col-header').style.display = show ? '' : 'none';
  document.querySelectorAll('.priority-col').forEach(td => td.style.display = show ? '' : 'none');
}

function selectCPUAlgo(btn, algo) {
  cpuAlgo = algo;
  document.querySelectorAll('#tab-cpu .algo-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.background = '';
    b.style.color = '';
    b.style.borderColor = '';
  });
  btn.classList.add('selected');
  document.getElementById('rr-quantum-wrap').style.display = algo === 'rr' ? 'block' : 'none';
  togglePriorityCol(algo === 'priority' || algo === 'priority_p');
}

function addCPURow(at = 0, bt = 0, pr = 1) {
  const tbody = document.getElementById('cpu-tbody');
  const id = ++cpuProcCount;
  const color = COLORS[(id - 1) % COLORS.length];
  const row = document.createElement('tr');
  row.id = 'cpu-row-' + id;
  row.innerHTML = `
    <td><span style="display:inline-flex;align-items:center;gap:6px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;"></span>P${id}
    </span></td>
    <td><input type="number" value="${at}" min="0" id="at-${id}"></td>
    <td><input type="number" value="${bt}" min="1" id="bt-${id}"></td>
    <td class="priority-col" style="display:none;"><input type="number" value="${pr}" min="1" id="pr-${id}"></td>
    <td><button class="btn btn-sm" style="background:transparent;color:var(--accent5);clip-path:none;"
        onclick="document.getElementById('cpu-row-${id}').remove()">✕</button></td>
  `;
  tbody.appendChild(row);
}

function loadCPUExample() {
  document.getElementById('cpu-tbody').innerHTML = '';
  cpuProcCount = 0;
  const ex = [[0,5,3],[1,3,1],[2,8,4],[3,6,2],[4,4,2]];
  ex.forEach(([a, b, p]) => addCPURow(a, b, p));
}

function getCPUProcesses() {
  const rows = document.getElementById('cpu-tbody').querySelectorAll('tr');
  return Array.from(rows).map((r, i) => ({
    id: 'P' + (i + 1),
    at: +r.querySelector('[id^="at-"]').value,
    bt: +r.querySelector('[id^="bt-"]').value,
    pr: +r.querySelector('[id^="pr-"]').value,
    color: COLORS[i % COLORS.length]
  }));
}

function runCPU() {
  const procs = getCPUProcesses();
  if (!procs.length) return alert('Add at least one process!');

  let gantt = [], metrics = [], steps = '';

  if      (cpuAlgo === 'fcfs')       { [gantt, metrics, steps] = fcfs(procs); }
  else if (cpuAlgo === 'sjf')        { [gantt, metrics, steps] = sjf(procs); }
  else if (cpuAlgo === 'srtf')       { [gantt, metrics, steps] = srtf(procs); }
  else if (cpuAlgo === 'rr')         { [gantt, metrics, steps] = rr(procs, +document.getElementById('rr-quantum').value); }
  else if (cpuAlgo === 'priority')   { [gantt, metrics, steps] = priority(procs); }
  else if (cpuAlgo === 'priority_p') { [gantt, metrics, steps] = priorityPreemptive(procs); }

  renderCPUResults(gantt, metrics, steps, procs);
}

// --- FCFS ---
function fcfs(procs) {
  const p = [...procs].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  let time = 0, gantt = [], steps = '';
  const results = {};

  p.forEach(pr => {
    if (time < pr.at) { gantt.push({label:'IDLE', start:time, end:pr.at, color:'#1e2130'}); time = pr.at; }
    const start = time, end = time + pr.bt;
    gantt.push({label: pr.id, start, end, color: pr.color});
    results[pr.id] = {at:pr.at, bt:pr.bt, ct:end, tat:end-pr.at, wt:end-pr.at-pr.bt, rt:start-pr.at};
    steps += `<div class="step-item">t=${start}: <strong>${pr.id}</strong> starts → CT=${end}, WT=${end-pr.at-pr.bt}</div>`;
    time = end;
  });
  return [gantt, results, steps];
}

// --- SJF (Non-Preemptive) ---
function sjf(procs) {
  const p = procs.map(x => ({...x, remaining: x.bt}));
  let time = 0, done = 0, gantt = [], steps = '', results = {};
  const n = p.length;
  let visited = new Array(n).fill(false);

  while (done < n) {
    const available = p.filter((x, i) => !visited[i] && x.at <= time);
    if (!available.length) {
      const nextAt = Math.min(...p.filter((x, i) => !visited[i]).map(x => x.at));
      gantt.push({label:'IDLE', start:time, end:nextAt, color:'#1e2130'});
      time = nextAt; continue;
    }
    available.sort((a, b) => a.bt - b.bt || a.at - b.at);
    const pr = available[0];
    const idx = p.indexOf(pr);
    const start = time, end = time + pr.bt;
    gantt.push({label: pr.id, start, end, color: pr.color});
    results[pr.id] = {at:pr.at, bt:pr.bt, ct:end, tat:end-pr.at, wt:end-pr.at-pr.bt, rt:start-pr.at};
    steps += `<div class="step-item">t=${start}: <strong>${pr.id}</strong> (BT=${pr.bt}) selected → CT=${end}</div>`;
    visited[idx] = true;
    done++;
    time = end;
  }
  return [gantt, results, steps];
}

// --- SRTF (Preemptive SJF) ---
function srtf(procs) {
  const p = procs.map(x => ({...x, rem:x.bt, started:false, rt:0, done:false}));
  let time = 0, gantt = [], steps = '', results = {}, last = null;
  const maxTime = procs.reduce((s, x) => s + x.bt, 0) + Math.max(...procs.map(x => x.at));
  let done = 0;

  while (done < p.length && time < maxTime + 50) {
    const avail = p.filter(x => !x.done && x.at <= time);
    if (!avail.length) { time++; continue; }
    avail.sort((a, b) => a.rem - b.rem || a.at - b.at);
    const pr = avail[0];
    if (!pr.started) { pr.rt = time - pr.at; pr.started = true; }
    if (last !== pr.id) {
      if (gantt.length && gantt[gantt.length-1].label === pr.id) gantt[gantt.length-1].end++;
      else gantt.push({label:pr.id, start:time, end:time+1, color:pr.color});
      last = pr.id;
    } else {
      gantt[gantt.length-1].end++;
    }
    pr.rem--;
    if (pr.rem === 0) {
      pr.done = true; done++;
      const ct = time + 1;
      results[pr.id] = {at:pr.at, bt:pr.bt, ct, tat:ct-pr.at, wt:ct-pr.at-pr.bt, rt:pr.rt};
      steps += `<div class="step-item">t=${ct}: <strong>${pr.id}</strong> completes → CT=${ct}, WT=${ct-pr.at-pr.bt}</div>`;
    }
    time++;
  }
  return [gantt, results, steps];
}

// --- Priority Preemptive ---
function priorityPreemptive(procs) {
  const p = procs.map(x => ({...x, rem:x.bt, started:false, rt:0, done:false}));
  let time = 0, gantt = [], steps = '', results = {}, last = null;
  let done = 0;
  const maxTime = procs.reduce((s, x) => s + x.bt, 0) + Math.max(...procs.map(x => x.at)) + 10;

  while (done < p.length && time <= maxTime) {
    const avail = p.filter(x => !x.done && x.at <= time);
    if (!avail.length) {
      const nextAt = Math.min(...p.filter(x => !x.done).map(x => x.at));
      if (gantt.length && gantt[gantt.length-1].label === 'IDLE') gantt[gantt.length-1].end = nextAt;
      else gantt.push({label:'IDLE', start:time, end:nextAt, color:'#1e2130'});
      time = nextAt; last = null; continue;
    }
    avail.sort((a, b) => a.pr - b.pr || a.at - b.at || a.id.localeCompare(b.id));
    const pr = avail[0];

    if (!pr.started) { pr.rt = time - pr.at; pr.started = true; }

    if (last !== pr.id) {
      if (last && last !== 'IDLE') {
        steps += `<div class="step-item">t=${time}: <span class="tag-miss">PREEMPTED</span> → <strong>${pr.id}</strong> (Pri=${pr.pr}) takes over</div>`;
      } else {
        steps += `<div class="step-item">t=${time}: <strong>${pr.id}</strong> (Pri=${pr.pr}) starts running</div>`;
      }
      if (gantt.length && gantt[gantt.length-1].label === pr.id) gantt[gantt.length-1].end++;
      else gantt.push({label:pr.id, start:time, end:time+1, color:pr.color});
      last = pr.id;
    } else {
      gantt[gantt.length-1].end++;
    }

    pr.rem--;
    if (pr.rem === 0) {
      pr.done = true; done++;
      const ct = time + 1;
      results[pr.id] = {at:pr.at, bt:pr.bt, ct, tat:ct-pr.at, wt:ct-pr.at-pr.bt, rt:pr.rt};
      steps += `<div class="step-item">t=${ct}: <strong>${pr.id}</strong> <span class="tag-hit">COMPLETES</span> → CT=${ct}, TAT=${ct-pr.at}, WT=${ct-pr.at-pr.bt}</div>`;
      last = null;
    }
    time++;
  }
  return [gantt, results, steps];
}

// --- Round Robin ---
function rr(procs, q) {
  const p = procs.map(x => ({...x, rem:x.bt, started:false, rt:0, done:false}));
  p.sort((a, b) => a.at - b.at);
  let time = 0, queue = [], gantt = [], steps = '', results = {};
  let idx = 0;
  const n = p.length;

  while (p.filter(x => !x.done).length > 0) {
    while (idx < n && p[idx].at <= time) { queue.push(p[idx++]); }
    if (!queue.length) {
      if (idx < n) { time = p[idx].at; while (idx < n && p[idx].at <= time) queue.push(p[idx++]); }
      else break;
    }
    const pr = queue.shift();
    if (!pr.started) { pr.rt = time - pr.at; pr.started = true; }
    const run = Math.min(q, pr.rem);
    const start = time;
    time += run; pr.rem -= run;
    gantt.push({label:pr.id, start, end:time, color:pr.color});
    while (idx < n && p[idx].at <= time) queue.push(p[idx++]);
    if (pr.rem > 0) { queue.push(pr); }
    else {
      pr.done = true;
      results[pr.id] = {at:pr.at, bt:pr.bt, ct:time, tat:time-pr.at, wt:time-pr.at-pr.bt, rt:pr.rt};
      steps += `<div class="step-item">t=${time}: <strong>${pr.id}</strong> finishes → CT=${time}</div>`;
    }
  }
  return [gantt, results, steps];
}

// --- Priority (Non-Preemptive) ---
function priority(procs) {
  const p = [...procs];
  let time = 0, done = 0, gantt = [], steps = '', results = {};
  let visited = new Array(p.length).fill(false);

  while (done < p.length) {
    const avail = p.map((x, i) => ({...x, i})).filter(x => !visited[x.i] && x.at <= time);
    if (!avail.length) {
      const nxt = Math.min(...p.filter((_, i) => !visited[i]).map(x => x.at));
      gantt.push({label:'IDLE', start:time, end:nxt, color:'#1e2130'}); time = nxt; continue;
    }
    avail.sort((a, b) => a.pr - b.pr || a.at - b.at);
    const pr = avail[0];
    const start = time, end = time + pr.bt;
    visited[pr.i] = true; done++;
    gantt.push({label:pr.id, start, end, color:pr.color});
    results[pr.id] = {at:pr.at, bt:pr.bt, ct:end, tat:end-pr.at, wt:end-pr.at-pr.bt, rt:start-pr.at};
    steps += `<div class="step-item">t=${start}: <strong>${pr.id}</strong> (Pri=${pr.pr}) runs → CT=${end}</div>`;
    time = end;
  }
  return [gantt, results, steps];
}

// --- Render CPU Results ---
function renderCPUResults(gantt, metrics, steps, procs) {
  document.getElementById('cpu-results').style.display = 'block';

  const gc = document.getElementById('cpu-gantt');
  const gt = document.getElementById('cpu-times');
  const totalTime = gantt[gantt.length-1]?.end || 1;
  gc.innerHTML = '';
  gt.innerHTML = '';

  gantt.forEach(g => {
    const pct = ((g.end - g.start) / totalTime * 100);
    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.style.cssText = `background:${g.color};width:${Math.max(pct,2)}%;min-width:30px;color:${g.label==='IDLE'?'#64748b':'#0a0c10'};font-size:10px;`;
    block.textContent = g.label;
    gc.appendChild(block);
  });

  gantt.forEach(g => {
    const pct = ((g.end - g.start) / totalTime * 100);
    const t = document.createElement('div');
    t.style.cssText = `width:${Math.max(pct,2)}%;min-width:30px;font-size:9px;color:var(--text-dim);text-align:left;padding-left:2px;`;
    t.textContent = g.start;
    gt.appendChild(t);
  });
  const last = document.createElement('span');
  last.style.cssText = 'font-size:9px;color:var(--text-dim);';
  last.textContent = totalTime;
  gt.appendChild(last);

  const tbody = document.getElementById('cpu-metrics-body');
  tbody.innerHTML = '';
  let totalTAT = 0, totalWT = 0, totalRT = 0, n = 0;

  procs.forEach(pr => {
    const m = metrics[pr.id];
    if (!m) return;
    n++;
    totalTAT += m.tat; totalWT += m.wt; totalRT += m.rt;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="color:${pr.color}">${pr.id}</td><td>${m.at}</td><td>${m.bt}</td><td>${m.ct}</td><td>${m.tat}</td><td>${m.wt}</td><td>${m.rt}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('cpu-avg-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">AVG TURNAROUND TIME</div><div class="metric-value">${(totalTAT/n).toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">AVG WAITING TIME</div><div class="metric-value">${(totalWT/n).toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">AVG RESPONSE TIME</div><div class="metric-value">${(totalRT/n).toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">THROUGHPUT</div><div class="metric-value">${(n/gantt[gantt.length-1].end).toFixed(3)}</div></div>
  `;

  clearLog('cpu-steps');
  document.getElementById('cpu-steps').innerHTML = steps;
  document.getElementById('cpu-results').scrollIntoView({behavior:'smooth'});
}

// Initialize CPU
loadCPUExample();

// ========================= PAGE REPLACEMENT =========================

function selectPageAlgo(btn, algo) {
  pageAlgo = algo;
  document.querySelectorAll('#tab-page .algo-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function loadPageExample() {
  document.getElementById('page-string').value = '7 0 1 2 0 3 0 4 2 3 0 3 2';
  document.getElementById('page-frames').value = '3';
}

function runPage() {
  const pages = parseNums(document.getElementById('page-string').value);
  const frames = +document.getElementById('page-frames').value;
  if (!pages.length || frames < 1) return alert('Invalid input!');

  let result;
  if      (pageAlgo === 'fifo')    result = pageReplace_FIFO(pages, frames);
  else if (pageAlgo === 'lru')     result = pageReplace_LRU(pages, frames);
  else                             result = pageReplace_Optimal(pages, frames);

  renderPageResults(result, pages, frames);
}

function pageReplace_FIFO(pages, frames) {
  let memory = [], queue = [], faults = 0, hits = 0, steps = [];
  pages.forEach((page, t) => {
    if (memory.includes(page)) {
      hits++;
      steps.push({t, page, frames:[...memory], result:'HIT', evicted:null});
    } else {
      faults++;
      let evicted = null;
      if (memory.length < frames) memory.push(page);
      else { evicted = queue.shift(); memory[memory.indexOf(evicted)] = page; }
      queue.push(page);
      steps.push({t, page, frames:[...memory], result:'MISS', evicted});
    }
  });
  return {steps, faults, hits, frames};
}

function pageReplace_LRU(pages, frames) {
  let memory = [], usage = [], faults = 0, hits = 0, steps = [];
  pages.forEach((page, t) => {
    const idx = memory.indexOf(page);
    if (idx !== -1) {
      hits++;
      usage[idx] = t;
      steps.push({t, page, frames:[...memory], result:'HIT', evicted:null});
    } else {
      faults++;
      let evicted = null;
      if (memory.length < frames) { memory.push(page); usage.push(t); }
      else {
        const lruIdx = usage.indexOf(Math.min(...usage));
        evicted = memory[lruIdx];
        memory[lruIdx] = page; usage[lruIdx] = t;
      }
      steps.push({t, page, frames:[...memory], result:'MISS', evicted});
    }
  });
  return {steps, faults, hits, frames};
}

function pageReplace_Optimal(pages, frames) {
  let memory = [], faults = 0, hits = 0, steps = [];
  pages.forEach((page, t) => {
    if (memory.includes(page)) {
      hits++;
      steps.push({t, page, frames:[...memory], result:'HIT', evicted:null});
    } else {
      faults++;
      let evicted = null;
      if (memory.length < frames) memory.push(page);
      else {
        let farthest = -1, victim = -1;
        memory.forEach((m, i) => {
          const next = pages.indexOf(m, t + 1);
          const dist = next === -1 ? Infinity : next;
          if (dist > farthest) { farthest = dist; victim = i; }
        });
        evicted = memory[victim];
        memory[victim] = page;
      }
      steps.push({t, page, frames:[...memory], result:'MISS', evicted});
    }
  });
  return {steps, faults, hits, frames};
}

function renderPageResults(result, pages, frameCount) {
  document.getElementById('page-results').style.display = 'block';

  const {steps, faults, hits} = result;
  const total = pages.length;
  const faultRate = (faults / total * 100).toFixed(1);
  const hitRate   = (hits   / total * 100).toFixed(1);

  document.getElementById('page-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">PAGE FAULTS</div><div class="metric-value" style="color:var(--accent5)">${faults}</div></div>
    <div class="metric"><div class="metric-label">PAGE HITS</div><div class="metric-value" style="color:var(--accent3)">${hits}</div></div>
    <div class="metric"><div class="metric-label">FAULT RATE</div><div class="metric-value">${faultRate}%</div></div>
    <div class="metric"><div class="metric-label">HIT RATE</div><div class="metric-value">${hitRate}%</div></div>
  `;

  const table = document.getElementById('page-step-table');
  let headers = '<tr><th>STEP</th><th>PAGE</th>';
  for (let i = 0; i < frameCount; i++) headers += `<th>FRAME ${i+1}</th>`;
  headers += '<th>RESULT</th></tr>';

  let rows = '';
  steps.forEach((s, i) => {
    const isHit = s.result === 'HIT';
    rows += `<tr><td>${i+1}</td><td style="font-weight:700;color:var(--accent)">${s.page}</td>`;
    for (let f = 0; f < frameCount; f++) {
      const val = s.frames[f] !== undefined ? s.frames[f] : '-';
      const isNew = !isHit && s.frames[f] === s.page;
      rows += `<td class="${isNew ? 'miss-cell' : ''}" style="${val===s.page&&isNew?'font-weight:700':''}">${val}</td>`;
    }
    rows += `<td class="${isHit?'hit-cell':'miss-cell'}">${isHit?'✓ HIT':'✗ MISS'}</td></tr>`;
  });
  table.innerHTML = headers + rows;

  document.getElementById('page-steps').innerHTML = steps.map((s, i) =>
    `<div class="step-item">Step ${i+1}: Page <strong>${s.page}</strong> →
    <span class="${s.result==='HIT'?'tag-hit':'tag-miss'}">${s.result}</span>
    ${s.evicted ? ` (Evicted: ${s.evicted})` : ''} | Frames: [${s.frames.join(', ')}]</div>`
  ).join('');

  document.getElementById('page-results').scrollIntoView({behavior:'smooth'});
}

// ========================= DISK SCHEDULING =========================

function selectDiskAlgo(btn, algo) {
  diskAlgo = algo;
  document.querySelectorAll('#tab-disk .algo-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('disk-dir-wrap').style.display = ['scan','cscan','look'].includes(algo) ? 'block' : 'none';
}

function loadDiskExample() {
  document.getElementById('disk-queue').value = '98 183 37 122 14 124 65 67';
  document.getElementById('disk-head').value  = '53';
  document.getElementById('disk-size').value  = '200';
}

function runDisk() {
  const queue = parseNums(document.getElementById('disk-queue').value);
  const head  = +document.getElementById('disk-head').value;
  const size  = +document.getElementById('disk-size').value;
  const dir   =  document.getElementById('disk-dir').value;
  if (!queue.length) return alert('Enter disk request queue!');

  let seq = [], seek = 0, steps = '';

  if      (diskAlgo === 'fcfs')  [seq, seek, steps] = disk_fcfs(queue, head);
  else if (diskAlgo === 'sstf')  [seq, seek, steps] = disk_sstf(queue, head);
  else if (diskAlgo === 'scan')  [seq, seek, steps] = disk_scan(queue, head, size, dir);
  else if (diskAlgo === 'cscan') [seq, seek, steps] = disk_cscan(queue, head, size, dir);
  else                           [seq, seek, steps] = disk_look(queue, head, dir);

  renderDiskResults([head, ...seq], seek, steps, size);
}

function disk_fcfs(queue, head) {
  let cur = head, seek = 0, steps = '';
  const seq = [...queue];
  seq.forEach(c => {
    const d = Math.abs(c - cur);
    steps += `<div class="step-item"><strong>${cur}</strong> → <strong>${c}</strong> : Seek = ${d}</div>`;
    seek += d; cur = c;
  });
  return [seq, seek, steps];
}

function disk_sstf(queue, head) {
  let cur = head, rem = [...queue], seq = [], seek = 0, steps = '';
  while (rem.length) {
    rem.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
    const next = rem.shift();
    const d = Math.abs(next - cur);
    steps += `<div class="step-item"><strong>${cur}</strong> → <strong>${next}</strong> (closest) : Seek = ${d}</div>`;
    seek += d; cur = next; seq.push(next);
  }
  return [seq, seek, steps];
}

function disk_scan(queue, head, size, dir) {
  let cur   = head;
  let left  = queue.filter(x => x < head).sort((a, b) => b - a);
  let right = queue.filter(x => x >= head).sort((a, b) => a - b);
  let seq = [], seek = 0, steps = '', prev = cur;

  if (dir === 'right') {
    [...right, ...(left.length ? [0] : []), ...left].forEach(c => {
      if (c === 0 && !queue.includes(0)) {
        const d = Math.abs(0 - prev); seek += d;
        steps += `<div class="step-item"><strong>${prev}</strong> → <strong>0</strong> (disk end) : Seek = ${d}</div>`;
        seq.push(0); prev = 0; return;
      }
      const d = Math.abs(c - prev); seek += d;
      steps += `<div class="step-item"><strong>${prev}</strong> → <strong>${c}</strong> : Seek = ${d}</div>`;
      seq.push(c); prev = c;
    });
  } else {
    [...left, ...(right.length ? [size-1] : []), ...right.reverse()].forEach(c => {
      const d = Math.abs(c - prev); seek += d;
      steps += `<div class="step-item"><strong>${prev}</strong> → <strong>${c}</strong> : Seek = ${d}</div>`;
      seq.push(c); prev = c;
    });
  }
  return [seq, seek, steps];
}

function disk_cscan(queue, head, size, dir) {
  let right = queue.filter(x => x >= head).sort((a, b) => a - b);
  let left  = queue.filter(x => x < head).sort((a, b) => a - b);
  let seq = [], seek = 0, steps = '', prev = head;

  const order = dir === 'right'
    ? [...right, size-1, 0, ...left]
    : [...left.reverse(), 0, size-1, ...right.reverse()];

  order.forEach(c => {
    const d = Math.abs(c - prev);
    if (c === size-1 || c === 0) {
      steps += `<div class="step-item"><strong>${prev}</strong> → <strong>${c}</strong> (disk boundary, jump to start) : Seek = ${d}</div>`;
    } else {
      steps += `<div class="step-item"><strong>${prev}</strong> → <strong>${c}</strong> : Seek = ${d}</div>`;
    }
    seek += d; seq.push(c); prev = c;
  });
  return [seq, seek, steps];
}

function disk_look(queue, head, dir) {
  let right = queue.filter(x => x >= head).sort((a, b) => a - b);
  let left  = queue.filter(x => x < head).sort((a, b) => b - a);
  let seq = [], seek = 0, steps = '', prev = head;

  const order = dir === 'right' ? [...right, ...left] : [...left, ...right];
  order.forEach(c => {
    const d = Math.abs(c - prev); seek += d;
    steps += `<div class="step-item"><strong>${prev}</strong> → <strong>${c}</strong> : Seek = ${d}</div>`;
    seq.push(c); prev = c;
  });
  return [seq, seek, steps];
}

function renderDiskResults(sequence, seek, steps, diskSize) {
  document.getElementById('disk-results').style.display = 'block';

  const canvas = document.getElementById('disk-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const margin = 50;
  const chartW = W - margin * 2;
  const toX = v => margin + (v / diskSize) * chartW;

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const x = margin + (i / 10) * chartW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  ctx.fillStyle = '#64748b'; ctx.font = '10px Space Mono';
  [0, Math.round(diskSize/4), Math.round(diskSize/2), Math.round(3*diskSize/4), diskSize].forEach(v => {
    ctx.fillText(v, toX(v) - 10, H - 5);
  });

  const stepH = (H - 30) / Math.max(sequence.length - 1, 1);

  ctx.beginPath();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  sequence.forEach((v, i) => {
    const x = toX(v), y = 15 + i * stepH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  sequence.forEach((v, i) => {
    const x = toX(v), y = 15 + i * stepH;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#f59e0b' : '#7c3aed';
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px Space Mono';
    ctx.fillText(v, x + 6, y + 4);
  });

  document.getElementById('disk-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">TOTAL SEEK TIME</div><div class="metric-value">${seek}</div></div>
    <div class="metric"><div class="metric-label">AVG SEEK TIME</div><div class="metric-value">${(seek/(sequence.length-1)).toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">REQUESTS SERVED</div><div class="metric-value">${sequence.length-1}</div></div>
    <div class="metric"><div class="metric-label">SEQUENCE</div><div class="metric-value" style="font-size:11px;color:var(--text-dim)">${sequence.join(' → ')}</div></div>
  `;

  document.getElementById('disk-steps').innerHTML = steps;
  document.getElementById('disk-results').scrollIntoView({behavior:'smooth'});
}

// ========================= BANKER'S ALGORITHM =========================
let bankerBuilt = false;

function buildBankerTable() {
  const n = +document.getElementById('bnk-procs').value;
  const m = +document.getElementById('bnk-res').value;
  bankerBuilt = true;

  const resLabels = ['A','B','C','D','E','F'].slice(0, m);
  const th = resLabels.map(r => `<th>${r}</th>`).join('');

  const allocRows = Array.from({length: n}, (_, i) =>
    `<tr><td style="color:var(--accent)">P${i}</td>
    ${Array.from({length: m}, (_, j) =>
      `<td><input type="number" id="alloc-${i}-${j}" value="0" min="0" style="width:44px;"></td>`
    ).join('')}</tr>`
  ).join('');

  const maxRows = Array.from({length: n}, (_, i) =>
    `<tr><td style="color:var(--accent2)">P${i}</td>
    ${Array.from({length: m}, (_, j) =>
      `<td><input type="number" id="max-${i}-${j}" value="0" min="0" style="width:44px;"></td>`
    ).join('')}</tr>`
  ).join('');

  document.getElementById('banker-tables').innerHTML = `
    <div class="bnk-matrix-wrap">
      <div class="bnk-matrix-block">
        <div class="bnk-matrix-label" style="color:var(--accent)">ALLOCATION MATRIX</div>
        <div style="overflow-x:auto;">
          <table><thead><tr><th>PROC</th>${th}</tr></thead><tbody>${allocRows}</tbody></table>
        </div>
      </div>
      <div class="bnk-matrix-block">
        <div class="bnk-matrix-label" style="color:var(--accent2)">MAXIMUM MATRIX</div>
        <div style="overflow-x:auto;">
          <table><thead><tr><th>PROC</th>${th}</tr></thead><tbody>${maxRows}</tbody></table>
        </div>
      </div>
    </div>`;
}

function loadBankerExample() {
  document.getElementById('bnk-procs').value = 5;
  document.getElementById('bnk-res').value   = 3;
  buildBankerTable();

  const alloc = [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]];
  const max   = [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]];
  alloc.forEach((row, i) => row.forEach((v, j) => document.getElementById(`alloc-${i}-${j}`).value = v));
  max.forEach((row, i)   => row.forEach((v, j) => document.getElementById(`max-${i}-${j}`).value   = v));
  document.getElementById('bnk-available').value = '3 3 2';
}

function runBanker() {
  if (!bankerBuilt) { buildBankerTable(); return; }
  const n = +document.getElementById('bnk-procs').value;
  const m = +document.getElementById('bnk-res').value;

  const alloc = [], max = [], need = [];
  const avail = parseNums(document.getElementById('bnk-available').value);
  if (avail.length !== m) return alert(`Please enter exactly ${m} available resources.`);

  for (let i = 0; i < n; i++) {
    alloc.push(Array.from({length: m}, (_, j) => +document.getElementById(`alloc-${i}-${j}`).value));
    max.push(  Array.from({length: m}, (_, j) => +document.getElementById(`max-${i}-${j}`).value));
    need.push(max[i].map((v, j) => v - alloc[i][j]));
  }

  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      if (need[i][j] < 0) return alert(`P${i}: Allocation > Maximum for resource ${j}!`);

  const work = [...avail], finish = new Array(n).fill(false);
  const safeSeq = [];
  let steps = '';

  let found = true;
  while (found && safeSeq.length < n) {
    found = false;
    for (let i = 0; i < n; i++) {
      if (finish[i]) continue;
      if (need[i].every((v, j) => v <= work[j])) {
        steps += `<div class="step-item">P${i} can proceed: Need [${need[i].join(',')}] ≤ Work [${work.join(',')}] → <span class="tag-hit">ALLOCATE</span> → Work becomes [${work.map((v,j) => v+alloc[i][j]).join(',')}]</div>`;
        need[i].forEach((_, j) => work[j] += alloc[i][j]);
        finish[i] = true;
        safeSeq.push(i);
        found = true;
      }
    }
  }

  const isSafe = safeSeq.length === n;
  const output = document.getElementById('banker-output');

  if (isSafe) {
    output.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span class="tag tag-green">✓ SAFE STATE</span>
        <span style="font-size:13px;color:var(--text)">The system is in a safe state.</span>
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">SAFE SEQUENCE:</div>
      <div class="safe-sequence">
        ${safeSeq.map((p, i) => `<div class="seq-proc">P${p}</div>${i < safeSeq.length-1 ? '<span class="seq-arrow">→</span>' : ''}`).join('')}
      </div>`;
  } else {
    const stuck = Array.from({length: n}, (_, i) => i).filter(i => !finish[i]);
    output.innerHTML = `
      <div class="unsafe-box">
        ✗ UNSAFE STATE — Deadlock may occur!<br><br>
        Processes that cannot complete: ${stuck.map(p => `P${p}`).join(', ')}<br>
        These processes are stuck waiting for resources.
      </div>`;
  }

  document.getElementById('banker-steps').innerHTML = steps;
  document.getElementById('banker-results').style.display = 'block';

  // ---- Combined Process Resource Table ----
  const resLabels = ['A','B','C','D','E','F'].slice(0, m);

  // Build header
  let headHTML = `<th>PROC</th>`;
  ['ALLOCATION','MAXIMUM','NEED'].forEach(group => {
    resLabels.forEach(r => {
      headHTML += `<th style="color:${group==='ALLOCATION'?'var(--accent)':group==='MAXIMUM'?'var(--accent2)':'var(--accent4)'}">${group}<br><span style="font-size:9px;">${r}</span></th>`;
    });
  });
  resLabels.forEach(r => {
    headHTML += `<th style="color:var(--accent3)">AVAIL<br><span style="font-size:9px;">${r}</span></th>`;
  });
  document.getElementById('banker-combined-head').innerHTML = headHTML;

  // Recalculate need for display (original need before banker modifies work)
  const dispNeed = Array.from({length: n}, (_, i) =>
    Array.from({length: m}, (_, j) =>
      +document.getElementById(`max-${i}-${j}`).value - +document.getElementById(`alloc-${i}-${j}`).value
    )
  );
  const dispAlloc = Array.from({length: n}, (_, i) =>
    Array.from({length: m}, (_, j) => +document.getElementById(`alloc-${i}-${j}`).value)
  );
  const dispMax = Array.from({length: n}, (_, i) =>
    Array.from({length: m}, (_, j) => +document.getElementById(`max-${i}-${j}`).value)
  );

  let bodyHTML = '';
  for (let i = 0; i < n; i++) {
    const inSafe = safeSeq.includes(i);
    bodyHTML += `<tr>
      <td style="color:var(--accent);font-weight:700;">P${i}</td>
      ${dispAlloc[i].map(v => `<td style="color:var(--accent)">${v}</td>`).join('')}
      ${dispMax[i].map(v => `<td style="color:var(--accent2)">${v}</td>`).join('')}
      ${dispNeed[i].map(v => `<td style="color:var(--accent4)">${v}</td>`).join('')}
      ${avail.map(v => `<td style="color:var(--accent3)">${v}</td>`).join('')}
    </tr>`;
  }
  document.getElementById('banker-combined-body').innerHTML = bodyHTML;

  document.getElementById('banker-results').scrollIntoView({behavior:'smooth'});
}

// ========================= MEMORY ALLOCATION =========================

function selectMemAlgo(btn, algo) {
  memAlgo = algo;
  document.querySelectorAll('#tab-memory .algo-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function loadMemExample() {
  document.getElementById('mem-blocks').value = '100 500 200 300 600';
  document.getElementById('mem-procs').value  = '212 417 112 426';
}

function runMemory() {
  const blocks = parseNums(document.getElementById('mem-blocks').value);
  const procs  = parseNums(document.getElementById('mem-procs').value);
  if (!blocks.length || !procs.length) return alert('Enter block and process sizes!');

  const blockState = blocks.map((size, i) => ({id:i, size, free:size, proc:null}));
  const results = [], steps = [];

  procs.forEach((psize, pi) => {
    let chosen = -1;

    if (memAlgo === 'first') {
      chosen = blockState.findIndex(b => b.free >= psize);
    } else if (memAlgo === 'best') {
      let best = Infinity;
      blockState.forEach((b, i) => { if (b.free >= psize && b.free-psize < best) { best = b.free-psize; chosen = i; }});
    } else {
      let worst = -1;
      blockState.forEach((b, i) => { if (b.free >= psize && b.free > worst) { worst = b.free; chosen = i; }});
    }

    if (chosen !== -1) {
      const waste = blockState[chosen].free - psize;
      results.push({proc:`P${pi+1}`, psize, block:`Block ${chosen+1}`, bsize:blockState[chosen].size, waste, status:'ALLOCATED'});
      steps.push(`<div class="step-item">P${pi+1} (${psize}KB) → <span class="tag-hit">Block ${chosen+1}</span> (${blockState[chosen].size}KB) | Wasted: ${waste}KB</div>`);
      blockState[chosen].free -= psize;
      blockState[chosen].proc = pi + 1;
    } else {
      results.push({proc:`P${pi+1}`, psize, block:'-', bsize:'-', waste:'-', status:'NOT ALLOCATED'});
      steps.push(`<div class="step-item">P${pi+1} (${psize}KB) → <span class="tag-miss">NO FIT FOUND</span></div>`);
    }
  });

  const visual = document.getElementById('memory-visual');
  visual.innerHTML = '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;letter-spacing:1px;">MEMORY BLOCKS</div>';

  const maxSize = Math.max(...blocks);
  blockState.forEach((b, i) => {
    const usedPct = ((b.size - b.free) / b.size * 100).toFixed(1);
    const div = document.createElement('div');
    div.className = 'mem-block ' + (b.proc ? 'mem-allocated' : 'mem-free');
    div.style.cssText = `height:${Math.max(35, b.size/maxSize*80)}px;`;
    div.innerHTML = `
      <div style="flex:1;">Block ${i+1} — ${b.size}KB
        ${b.proc ? `<span class="tag tag-green">P${b.proc} (${b.size-b.free}KB)</span>` : ''}
        ${b.free < b.size && b.free > 0 ? `<span class="tag tag-amber">Wasted: ${b.free}KB</span>` : ''}
      </div>`;
    div.style.setProperty('--fill', usedPct + '%');
    visual.appendChild(div);
  });

  document.getElementById('memory-tbody').innerHTML = results.map(r => `
    <tr>
      <td style="color:var(--accent)">${r.proc}</td>
      <td>${r.psize}</td>
      <td>${r.block}</td>
      <td>${r.bsize}</td>
      <td style="color:${r.waste>0?'var(--accent4)':'var(--accent3)'}">${r.waste}</td>
      <td><span class="tag ${r.status==='ALLOCATED'?'tag-green':'tag-red'}">${r.status}</span></td>
    </tr>`).join('');

  const totalWaste = results.reduce((s, r) => s + (+r.waste || 0), 0);
  const allocated  = results.filter(r => r.status === 'ALLOCATED').length;

  document.getElementById('memory-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">PROCESSES ALLOCATED</div><div class="metric-value" style="color:var(--accent3)">${allocated}/${procs.length}</div></div>
    <div class="metric"><div class="metric-label">TOTAL WASTED SPACE</div><div class="metric-value" style="color:var(--accent4)">${totalWaste} KB</div></div>
    <div class="metric"><div class="metric-label">ALGORITHM</div><div class="metric-value" style="font-size:14px">${memAlgo.toUpperCase()} FIT</div></div>
  `;

  document.getElementById('memory-steps').innerHTML = steps.join('');
  document.getElementById('memory-results').style.display = 'block';
  document.getElementById('memory-results').scrollIntoView({behavior:'smooth'});
}

// ========================= INITIALIZE =========================
buildBankerTable();
loadBankerExample();
loadMemExample();
