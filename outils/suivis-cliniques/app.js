const STORE_KEY = 'reclamacie.suivis.v1'; // fallback / migration key
const DB_NAME = 'SuivisCliniquesDB';
const DB_VERSION = 1;
const STORE_NAME = 'suivis';

const $ = (s) => document.querySelector(s);
const rowsEl = $('#rows');
const tpl = $('#rowTemplate');
const form = $('#entryForm');
const toolbar = $('#bulkToolbar');

let selectedIds = new Set();
let notifiedToday = false;
let db; // IndexedDB instance

// ────────────────────────────────────────────────
// IndexedDB Setup
// ────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function load() {
  return new Promise((resolve) => {
    openDB()
      .then(() => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => {
          console.warn("IndexedDB getAll failed, falling back to localStorage");
          try {
            resolve(JSON.parse(localStorage.getItem(STORE_KEY)) || []);
          } catch {
            resolve([]);
          }
        };
      })
      .catch(() => {
        console.warn("IndexedDB open failed, using localStorage");
        try {
          resolve(JSON.parse(localStorage.getItem(STORE_KEY)) || []);
        } catch {
          resolve([]);
        }
      });
  });
}

function save() {
  openDB()
    .then(() => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear(); // remove old entries
      data.forEach(item => store.add(item));
      tx.oncomplete = () => console.log("Data saved to IndexedDB");
      tx.onerror = (e) => {
        console.error("IndexedDB save error:", e.target.error);
        // fallback
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
      };
    })
    .catch((err) => {
      console.error("IndexedDB open failed on save:", err);
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    });
}

function setDefaultFormDate() {
  if (form?.date) form.date.value = todayISO();
}

let dataPromise = load().then(loaded => {
  data = loaded.map(normalizeEntry);
  setDefaultFormDate();
  persistAndRender();
});

function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function toISO(d) { return new Date(d).toISOString().slice(0, 10); }
function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + Number(days));
  return toISO(d);
}
function daysDiff(a, b) {
  if (!a || !b) return 9999;
  const x = new Date(a + 'T00:00:00');
  const y = new Date(b + 'T00:00:00');
  if (isNaN(x.getTime()) || isNaN(y.getTime())) return 9999;
  return Math.round((x - y) / 86400000);
}
function todayISO() { return toISO(new Date()); }

function buildFollowups(startDate, intervalDays, count, doneCount = 0) {
  const arr = [];
  for (let i = 1; i <= count; i++) {
    const isDone = i <= doneCount;
    arr.push({
      idx: i,
      dueDate: addDays(startDate, intervalDays * i),
      done: isDone,
      doneAt: isDone ? startDate : ''   // approximation during import
    });
  }
  return arr;
}

function normalizeEntry(i) {
  const date = i.date || todayISO();
  const intervalDays = Math.max(1, Number(i.intervalDays || 7));
  let plannedCount = Math.max(1, Number(i.plannedCount || 2));

  let followups = i.followups || [];

  if (Array.isArray(followups) && followups.length > 0) {
    followups = followups.map(f => ({
      idx: Number(f.idx) || 0,
      dueDate: String(f.dueDate || ''),
      done: !!f.done,
      doneAt: String(f.doneAt || '')
    })).filter(f => f.dueDate);
  } else {
    let doneCount = 0;
    if (i.progress && typeof i.progress === 'string') {
      const match = i.progress.trim().match(/^(\d+)\/(\d+)$/);
      if (match) {
        doneCount = parseInt(match[1], 10);
        const progressTotal = parseInt(match[2], 10);
        plannedCount = Math.max(plannedCount, progressTotal);
      }
    }
    followups = buildFollowups(date, intervalDays, plannedCount, doneCount);
  }

  return {
    id: i.id || uid(),
    createdAt: i.createdAt || new Date().toISOString(),
    date,
    rxNumber: String(i.rxNumber || '').trim(),
    rxRef: String(i.rxRef || '').trim(),
    acte: String(i.acte || 'autre').trim(),
    intervalDays,
    plannedCount,
    status: String(i.status || 'À faire'),
    initials: String(i.initials || '').toUpperCase().trim(),
    notes: String(i.notes || '').trim(),
    followups
  };
}

function progress(item) {
  const length = item.followups.length;
  const done = item.followups.filter(f => f.done).length;
  return length ? `${done}/${length}` : 'N/A';
}

function nextDue(item) { return item.followups.find(f => !f.done)?.dueDate || ''; }

function urgency(item) {
  if (item.status === 'Complété') return 'complete';
  const due = nextDue(item); if (!due) return 'complete';
  const d = daysDiff(due, todayISO());
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 7) return 'soon';
  return 'later';
}

function statusClass(status) {
  if (status === 'Complété') return 'status-complete';
  if (status === 'En cours') return 'status-progress';
  if (status === 'Reporté') return 'status-postponed';
  return 'status-todo';
}

function askDays(promptText = 'Combien de jours ?', defaultDays = 7) {
  const raw = prompt(promptText, String(defaultDays));
  if (raw === null) return null;
  const days = Math.floor(Number(raw));
  if (!Number.isFinite(days) || days < 1) {
    alert('Veuillez entrer un nombre entier positif.');
    return null;
  }
  return days;
}

function dupKey(i) { return `${i.rxNumber}|${i.rxRef}|${i.acte}|${i.date}`.toLowerCase(); }

function findDuplicate(i) {
  const key = dupKey(i);
  return data.find(d => dupKey(d) === key && d.status !== 'Complété');
}

function matchesFilter(item) {
  const s = $('#search').value.trim().toLowerCase();
  const sf = $('#statusFilter').value;
  const df = $('#dueFilter').value;
  const ini = $('#initialsFilter').value.trim().toLowerCase();
  const af = $('#acteFilter').value;
  if (s) {
    const hay = [item.rxNumber, item.rxRef, item.acte, item.notes].join(' ').toLowerCase();
    if (!hay.includes(s)) return false;
  }
  if (sf && item.status !== sf) return false;
  const u = urgency(item);
  if (df === 'overdue' && u !== 'overdue') return false;
  if (df === 'today' && u !== 'today') return false;
  if (df === '7days' && !['today', 'soon'].includes(u)) return false;
  if (ini && !(item.initials || '').toLowerCase().includes(ini)) return false;
  if (af && item.acte !== af) return false;
  return true;
}

function renderKPIs() {
  const k = { total: data.length, overdue: 0, today: 0, soon: 0, done: 0 };
  data.forEach(i => {
    const u = urgency(i);
    if (u === 'overdue') k.overdue++;
    if (u === 'today') k.today++;
    if (u === 'soon') k.soon++;
    if (u === 'complete') k.done++;
  });
  $('#kpis').innerHTML = `
    <div class='kpi'><b>${k.total}</b><small>Total</small></div>
    <div class='kpi'><b>${k.overdue}</b><small>En retard</small></div>
    <div class='kpi'><b>${k.today}</b><small>Aujourd'hui</small></div>
    <div class='kpi'><b>${k.done}</b><small>Complétés</small></div>`;
  const alert = $('#alertBox');
  if (k.overdue > 0 || k.today > 0) {
    alert.textContent = `Action requise : ${k.overdue} en retard, ${k.today} à faire aujourd'hui.`;
    alert.classList.remove('hidden');
    if (!notifiedToday && 'Notification' in window) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification('Suivis cliniques', { body: alert.textContent });
      });
      notifiedToday = true;
    }
  } else alert.classList.add('hidden');
}

function updateToolbar() {
  const count = selectedIds.size;
  if (count === 0) {
    toolbar.classList.add('hidden');
    $('#selectAll').checked = false;
    return;
  }
  toolbar.classList.remove('hidden');
  $('#selectedCount').textContent = count;
  $('#btnBulkEdit').disabled = count !== 1;
  $('#btnBulkDelete').disabled = count === 0;
}

function toggleSelectAll(checked) {
  const checkboxes = rowsEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    const tr = cb.closest('tr');
    const id = cb.dataset.id;
    if (checked) {
      selectedIds.add(id);
      tr.classList.add('selected');
    } else {
      selectedIds.delete(id);
      tr.classList.remove('selected');
    }
  });
  updateToolbar();
}

function clearSelection() {
  selectedIds.clear();
  updateToolbar();
  renderRows();
}

function getSelectedItems() {
  return data.filter(item => selectedIds.has(item.id));
}

function renderRows() {
  rowsEl.innerHTML = '';
  selectedIds.clear();
  const list = data.filter(matchesFilter).sort((a, b) => (nextDue(a) || '9999').localeCompare(nextDue(b) || '9999'));

  list.forEach(item => {
    const tr = tpl.content.firstElementChild.cloneNode(true);
    tr.classList.add('selectable-row');

    const cbTd = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.id = item.id;
    cbTd.appendChild(cb);
    tr.insertBefore(cbTd, tr.firstChild);

    tr.querySelector('[data-k="date"]').textContent = item.date;
    tr.querySelector('[data-k="rx"]').textContent = item.rxNumber;
    tr.querySelector('[data-k="ref"]').textContent = item.rxRef || '';
    tr.querySelector('[data-k="acte"]').textContent = item.acte;
    const due = nextDue(item);
    const dueCell = tr.querySelector('[data-k="due"]');
    const dDiff = daysDiff(due, todayISO());
    dueCell.textContent = due ? `${due} (${dDiff > 0 ? `+${dDiff}j` : dDiff < 0 ? `${-dDiff}j` : '0j'})` : '-';
    const u = urgency(item);
    if (u === 'overdue') dueCell.innerHTML += ` <span class='badge en-retard'>Retard</span>`;
    if (u === 'today') dueCell.innerHTML += ` <span class='badge aujourdhui'>Aujourd'hui</span>`;
    tr.querySelector('[data-k="progress"]').textContent = progress(item);
    const statusEl = tr.querySelector('[data-k="status"]');
    statusEl.textContent = item.status;
    statusEl.className = `badge ${statusClass(item.status)}`;
    tr.querySelector('[data-k="initials"]').textContent = item.initials || '';
    const notesEl = tr.querySelector('[data-k="notes"]');
    notesEl.textContent = item.notes || '';
    notesEl.contentEditable = 'true';
    notesEl.title = 'Cliquer pour modifier';
    notesEl.addEventListener('blur', () => updateNotes(item.id, notesEl.textContent));

    tr.addEventListener('click', e => {
      if (e.target.type === 'checkbox' || e.target.isContentEditable) return;
      cb.checked = !cb.checked;
      if (cb.checked) {
        selectedIds.add(item.id);
        tr.classList.add('selected');
      } else {
        selectedIds.delete(item.id);
        tr.classList.remove('selected');
      }
      updateToolbar();
      $('#selectAll').checked = selectedIds.size === list.length && list.length > 0;
    });

    cb.addEventListener('change', e => {
      if (e.target.checked) {
        selectedIds.add(item.id);
        tr.classList.add('selected');
      } else {
        selectedIds.delete(item.id);
        tr.classList.remove('selected');
      }
      updateToolbar();
      $('#selectAll').checked = selectedIds.size === list.length && list.length > 0;
    });

    rowsEl.appendChild(tr);
  });

  updateToolbar();
}

// ────────────────────────────────────────────────
// Bulk actions
// ────────────────────────────────────────────────

$('#btnBulkMarkDone').onclick = () => {
  const items = getSelectedItems();
  if (!items.length) return;

  const note = prompt('Note de complétion (facultatif) :', '');
  if (note === null) return;

  const doneDate = todayISO();

  items.forEach(item => {
    const next = item.followups.find(f => !f.done);
    if (next) {
      next.done = true;
      next.doneAt = doneDate;
      if (note?.trim()) {
        item.notes = (item.notes ? item.notes + '\n' : '') + `[${doneDate}] ${note.trim()}`;
      }
      if (item.followups.every(f => f.done)) item.status = 'Complété';
      else item.status = 'En cours';
    }
  });

  persistAndRender();
  clearSelection();
};

$('#btnBulkAdd').onclick = () => {
  const items = getSelectedItems();
  if (!items.length) return;

  const days = askDays('Nouveau suivi dans combien de jours ?', 7);
  if (days === null) return;

  items.forEach(item => {
    const lastF = item.followups[item.followups.length - 1];
    const lastDue = lastF ? (lastF.done ? lastF.doneAt : lastF.dueDate) : item.date;
    const newDue = addDays(lastDue, days);
    const newIdx = item.followups.length + 1;
    item.followups.push({ idx: newIdx, dueDate: newDue, done: false, doneAt: '' });
    item.plannedCount++;
    if (item.status === 'Complété') item.status = 'En cours';
  });

  persistAndRender();
  clearSelection();
};

$('#btnBulkRemove').onclick = () => {
  const items = getSelectedItems();
  if (!items.length) return;

  if (!confirm(`Supprimer le dernier suivi non effectué sur ${items.length} dossier(s) ?`)) return;

  items.forEach(item => {
    const lastF = item.followups[item.followups.length - 1];
    if (lastF && !lastF.done) {
      item.followups.pop();
      item.plannedCount = Math.max(0, item.plannedCount - 1);
      const undone = item.followups.filter(f => !f.done).length;
      if (undone === 0) {
        if (confirm(`Aucun suivi restant sur un dossier. Le marquer comme complété ?`)) {
          item.status = 'Complété';
        }
      }
    }
  });

  persistAndRender();
  clearSelection();
};

$('#btnBulkReport').onclick = () => {
  const items = getSelectedItems();
  if (!items.length) return;

  const days = askDays('Reporter le prochain suivi de combien de jours ?', 1);
  if (days === null) return;

  items.forEach(item => {
    const f = item.followups.find(x => !x.done);
    if (f) f.dueDate = addDays(f.dueDate, days);
    if (item.status === 'Complété') item.status = 'En cours';
  });

  persistAndRender();
  clearSelection();
};

$('#btnBulkEdit').onclick = () => {
  const items = getSelectedItems();
  if (items.length !== 1) {
    alert("La modification ne peut être effectuée que sur un seul élément sélectionné.");
    return;
  }
  editItem(items[0].id);
  clearSelection();
};

$('#btnBulkDelete').onclick = () => {
  const items = getSelectedItems();
  if (!items.length) return;

  const count = items.length;
  if (!confirm(`Supprimer définitivement ${count} suivi(s) sélectionné(s) ? Cette action est irréversible.`)) return;

  const idsToRemove = new Set(selectedIds);
  data = data.filter(item => !idsToRemove.has(item.id));

  persistAndRender();
  clearSelection();
  alert(`${count} suivi(s) supprimé(s).`);
};

$('#btnBulkFinish').onclick = () => {
  const items = getSelectedItems();
  if (!items.length) return;

  if (!confirm(`Clore ${items.length} série(s) de suivis ? Tous les suivis restants seront considérés comme effectués.`)) return;

  const note = prompt('Note finale pour la clôture (facultatif) :', '');
  if (note === null) return;

  const doneDate = todayISO();

  items.forEach(item => {
    item.followups.forEach(f => {
      if (!f.done) {
        f.done = true;
        f.doneAt = doneDate;
      }
    });
    item.status = 'Complété';
    if (note?.trim()) {
      item.notes = (item.notes ? item.notes + '\n' : '') + `[${doneDate} – Clôture] ${note.trim()}`;
    }
  });

  persistAndRender();
  clearSelection();
};

$('#selectAll').onchange = e => toggleSelectAll(e.target.checked);

// Form submit
form.addEventListener('submit', e => {
  e.preventDefault();
  const editingId = form.dataset.editing;
  const f = new FormData(form);

  if (editingId) {
    const item = data.find(x => x.id === editingId);
    if (!item) return;
    item.date = f.get('date');
    item.rxNumber = String(f.get('rxNumber')).trim();
    item.rxRef = String(f.get('rxRef') || '').trim();
    item.acte = String(f.get('acte')).trim();
    const newInterval = Math.max(1, Number(f.get('intervalDays')));
    const newCount = Math.max(1, Number(f.get('plannedCount')));
    item.status = String(f.get('status'));
    item.initials = String(f.get('initials') || '').toUpperCase().trim();
    item.notes = String(f.get('notes') || '').trim();

    if (newInterval !== item.intervalDays || newCount !== item.plannedCount) {
      if (confirm('Les modifications d’intervalle ou de nombre de suivis entraîneront une régénération des dates futures (suivis complétés conservés). Continuer ?')) {
        const doneFollowups = item.followups.filter(f => f.done).sort((a, b) => a.idx - b.idx);
        const undoneCount = Math.max(0, newCount - doneFollowups.length);
        const lastDate = doneFollowups.length ? doneFollowups[doneFollowups.length - 1].doneAt || item.date : item.date;
        const newFollowups = buildFollowups(lastDate, newInterval, undoneCount).map((f, i) => ({
          ...f,
          idx: doneFollowups.length + i + 1
        }));
        item.followups = [...doneFollowups, ...newFollowups];
        item.intervalDays = newInterval;
        item.plannedCount = newCount;
        if (item.followups.every(x => x.done)) item.status = 'Complété';
        else if (item.followups.some(x => x.done)) item.status = 'En cours';
      }
    }
    persistAndRender();
    cancelEdit();
    return;
  }

  const entry = normalizeEntry({
    id: uid(),
    createdAt: new Date().toISOString(),
    date: f.get('date'),
    rxNumber: String(f.get('rxNumber')).trim(),
    rxRef: String(f.get('rxRef') || '').trim(),
    acte: String(f.get('acte')).trim(),
    intervalDays: Number(f.get('intervalDays')),
    plannedCount: Number(f.get('plannedCount')),
    status: String(f.get('status')),
    initials: String(f.get('initials') || '').toUpperCase().trim(),
    notes: String(f.get('notes') || '').trim()
  });

  const dup = findDuplicate(entry);
  if (dup) {
    const ok = confirm(`Doublon probable détecté (Rx ${dup.rxNumber}, acte ${dup.acte}, date ${dup.date}). Ajouter malgré tout ?`);
    if (!ok) return;
  }

  data.push(entry);
  form.reset();
  setDefaultFormDate();
  form.intervalDays.value = 7;
  form.plannedCount.value = 2;
  form.status.value = 'À faire';
  persistAndRender();
});

// ────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────

function updateNotes(id, value) {
  const item = data.find(x => x.id === id);
  if (!item) return;
  item.notes = String(value || '').trim();
  save();
}

function editItem(id) {
  const item = data.find(x => x.id === id);
  if (!item) return;
  form.date.value = item.date;
  form.rxNumber.value = item.rxNumber;
  form.rxRef.value = item.rxRef;
  form.acte.value = item.acte;
  form.intervalDays.value = item.intervalDays;
  form.plannedCount.value = item.plannedCount;
  form.status.value = item.status;
  form.initials.value = item.initials;
  form.notes.value = item.notes;
  form.dataset.editing = id;
  $('#submitBtn').textContent = 'Sauvegarder modifications';
  $('#btnCancelEdit').classList.remove('hidden');
}

function cancelEdit() {
  form.reset();
  setDefaultFormDate();
  form.intervalDays.value = 7;
  form.plannedCount.value = 2;
  form.status.value = 'À faire';
  form.dataset.editing = '';
  $('#submitBtn').textContent = 'Ajouter le suivi';
  $('#btnCancelEdit').classList.add('hidden');
}

function persistAndRender() {
  save();
  renderKPIs();
  renderRows();
}

function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────
// Buttons
// ────────────────────────────────────────────────

$('#btnExportJson').onclick = () => {
  download(`suivis-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json');
};

$('#btnExportCsv').onclick = () => {
  const head = ['id','date','rxNumber','rxRef','acte','intervalDays','plannedCount','status','initials','notes','nextDue','progress'];
  const lines = [head.join(',')];
  data.forEach(i => {
    const row = [
      i.id,
      i.date,
      i.rxNumber,
      i.rxRef,
      i.acte,
      i.intervalDays,
      i.plannedCount,
      i.status,
      i.initials,
      (i.notes || '').replaceAll('"', '""'),
      nextDue(i),
      progress(i)
    ];
    lines.push(row.map(v => `"${String(v ?? '')}"`).join(','));
  });
  download(`suivis-${todayISO()}.csv`, lines.join('\n'), 'text/csv');
};

$('#btnResolveOverdue').onclick = () => {
  const days = askDays('Reporter de combien de jours ?', 1);
  if (days === null) return;
  const overdue = data.filter(i => urgency(i) === 'overdue' && i.status !== 'Complété');
  if (!overdue.length) {
    alert('Aucun suivi en retard à rattraper.');
    return;
  }
  const ok = confirm(`Reporter le prochain suivi de ${overdue.length} dossier(s) de ${days} jour(s) ?`);
  if (!ok) return;
  overdue.forEach(i => {
    const f = i.followups.find(x => !x.done);
    if (f) f.dueDate = addDays(f.dueDate, days);
    if (i.status === 'Complété') i.status = 'En cours';
  });
  persistAndRender();
};

$('#btnDeduplicate').onclick = () => {
  const seen = new Map();
  let removed = 0;
  data = data.filter(item => {
    const key = dupKey(item);
    if (!seen.has(key)) {
      seen.set(key, item.id);
      return true;
    }
    removed++;
    return false;
  });
  persistAndRender();
  alert(removed ? `${removed} doublon(s) retiré(s).` : 'Aucun doublon détecté.');
};

$('#btnPrint').onclick = () => window.print();

$('#btnResetAll').onclick = () => {
  const ok = confirm('Attention : cette action supprimera définitivement toutes les données locales sur cet appareil. Confirmer ?');
  if (!ok) return;
  data = [];
  save(); // clear IndexedDB
  localStorage.removeItem(STORE_KEY);
  setDefaultFormDate();
  persistAndRender();
};

// Filters live update
['#search', '#statusFilter', '#dueFilter', '#initialsFilter', '#acteFilter'].forEach(s =>
  $(s).addEventListener('input', () => {
    clearSelection();
    renderRows();
  })
);

// Import
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const txt = await file.text();
  let incoming = [];
  try {
    if (file.name.toLowerCase().endsWith('.json')) {
      incoming = JSON.parse(txt).map(normalizeEntry);
    } else {
      const rows = [];
      let row = [];
      let field = '';
      let inQuote = false;
      let i = 0;

      while (i < txt.length) {
        const char = txt[i];
        if (char === '"') {
          if (inQuote && txt[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuote = !inQuote;
          i++;
          continue;
        }
        if (char === ',' && !inQuote) {
          row.push(field.trim().replace(/^"|"$/g, '').replaceAll('""', '"'));
          field = '';
          i++;
          continue;
        }
        if ((char === '\n' || char === '\r') && !inQuote) {
          if (field || row.length > 0) {
            row.push(field.trim().replace(/^"|"$/g, '').replaceAll('""', '"'));
            if (row.some(v => v.trim() !== '')) rows.push(row);
          }
          row = [];
          field = '';
          if (char === '\r' && txt[i + 1] === '\n') i++;
          i++;
          continue;
        }
        field += char;
        i++;
      }

      if (field || row.length > 0) {
        row.push(field.trim().replace(/^"|"$/g, '').replaceAll('""', '"'));
        if (row.some(v => v.trim() !== '')) rows.push(row);
      }

      if (rows.length < 1) throw new Error("aucune ligne valide");

      const headers = rows[0];
      incoming = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = (row[idx] ?? '').trim();
        });
        return normalizeEntry(obj);
      });
    }
  } catch (err) {
    console.error("Erreur import :", err);
    alert('Erreur lors de l’importation.\nVérifiez le format.\n\nDétail : ' + (err.message || 'erreur inconnue'));
    return;
  }

  if (!Array.isArray(incoming) || incoming.length === 0) {
    alert('Aucune entrée valide.');
    return;
  }

  const mode = confirm('Souhaitez-vous fusionner ces données avec les suivis existants ?\n(Annuler = remplacer complètement)');
  let merged = mode ? [...data, ...incoming] : incoming;

  const before = merged.length;
  const map = new Map();
  merged.forEach(item => {
    if (!map.has(dupKey(item))) map.set(dupKey(item), item);
  });
  merged = Array.from(map.values());
  const deduped = before - merged.length;

  data = merged;
  persistAndRender();

  alert(`Import terminé : ${incoming.length} entrée(s), ${deduped} doublon(s) ignoré(s).`);
  e.target.value = '';
});

// Sample
$('#btnSample').onclick = () => {
  const sample = normalizeEntry({
    id: uid(),
    createdAt: new Date().toISOString(),
    date: todayISO(),
    rxNumber: 'RX-12345',
    rxRef: 'REF-7',
    acte: 'ajustement',
    intervalDays: 7,
    plannedCount: 3,
    status: 'À faire',
    initials: 'AM',
    notes: 'TA à revalider'
  });
  data.push(sample);
  persistAndRender();
};

// Init – data is loaded asynchronously, render when ready
dataPromise.then(() => {
  setDefaultFormDate();
  persistAndRender();
});
