const STORE_KEY = 'reclamacie.suivis.v1';
const $ = (s) => document.querySelector(s);
const rowsEl = $('#rows');
const tpl = $('#rowTemplate');
const form = $('#entryForm');

let data = load();
let notifiedToday = false;

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function toISO(d) { return new Date(d).toISOString().slice(0,10); }
function addDays(iso, days){ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+Number(days)); return toISO(d); }
function daysDiff(a,b){ const x=new Date(a+'T00:00:00'), y=new Date(b+'T00:00:00'); return Math.round((x-y)/86400000); }
function todayISO(){ return toISO(new Date()); }

function buildFollowups(startDate, intervalDays, count){
  const arr=[];
  for(let i=1;i<=count;i++) arr.push({ idx:i, dueDate:addDays(startDate, intervalDays*i), done:false, doneAt:'' });
  return arr;
}
function progress(item){ const done=item.followups.filter(f=>f.done).length; return `${done}/${item.followups.length}`; }
function nextDue(item){ return item.followups.find(f=>!f.done)?.dueDate || ''; }
function urgency(item){
  if(item.status==='Complété') return 'complete';
  const due = nextDue(item); if(!due) return 'complete';
  const d = daysDiff(due, todayISO());
  if(d < 0) return 'overdue';
  if(d === 0) return 'today';
  if(d <= 7) return 'soon';
  return 'later';
}

function matchesFilter(item){
  const s = $('#search').value.trim().toLowerCase();
  const sf = $('#statusFilter').value;
  const df = $('#dueFilter').value;
  const ini = $('#initialsFilter').value.trim().toLowerCase();
  if(s){
    const hay = [item.rxNumber,item.rxRef,item.acte,item.notes].join(' ').toLowerCase();
    if(!hay.includes(s)) return false;
  }
  if(sf && item.status!==sf) return false;
  const u = urgency(item);
  if(df==='overdue' && u!=='overdue') return false;
  if(df==='today' && u!=='today') return false;
  if(df==='7days' && !['today','soon'].includes(u)) return false;
  if(ini && !(item.initials||'').toLowerCase().includes(ini)) return false;
  return true;
}

function renderKPIs(){
  const k = { total:data.length, overdue:0, today:0, soon:0, done:0 };
  data.forEach(i=>{const u=urgency(i); if(u==='overdue')k.overdue++; if(u==='today')k.today++; if(u==='soon')k.soon++; if(u==='complete')k.done++;});
  $('#kpis').innerHTML = `
    <div class='kpi'><b>${k.total}</b><small>Total suivis</small></div>
    <div class='kpi'><b>${k.overdue}</b><small>En retard</small></div>
    <div class='kpi'><b>${k.today}</b><small>Aujourd'hui</small></div>
    <div class='kpi'><b>${k.done}</b><small>Complétés</small></div>`;
  const alert = $('#alertBox');
  if(k.overdue>0 || k.today>0){
    alert.textContent = `Action: ${k.overdue} en retard, ${k.today} à faire aujourd'hui.`;
    alert.classList.remove('hidden');
    if (!notifiedToday && 'Notification' in window) {
      Notification.requestPermission().then(p=>{ if(p==='granted') new Notification('Suivis cliniques', { body: alert.textContent }); });
      notifiedToday = true;
    }
  } else alert.classList.add('hidden');
}

function renderRows(){
  rowsEl.innerHTML='';
  const list = data.filter(matchesFilter).sort((a,b)=> (nextDue(a)||'9999').localeCompare(nextDue(b)||'9999'));
  for(const item of list){
    const tr = tpl.content.firstElementChild.cloneNode(true);
    tr.querySelector('[data-k="date"]').textContent = item.date;
    tr.querySelector('[data-k="rx"]').textContent = item.rxNumber;
    tr.querySelector('[data-k="ref"]').textContent = item.rxRef || '-';
    tr.querySelector('[data-k="acte"]').textContent = item.acte;
    const due = nextDue(item);
    const dueCell = tr.querySelector('[data-k="due"]');
    dueCell.textContent = due || 'Aucun';
    const u=urgency(item);
    if(u==='overdue') dueCell.innerHTML += ` <span class='badge en-retard'>En retard</span>`;
    if(u==='today') dueCell.innerHTML += ` <span class='badge aujourdhui'>Aujourd'hui</span>`;
    tr.querySelector('[data-k="progress"]').textContent = progress(item);
    tr.querySelector('[data-k="status"]').textContent = item.status;
    tr.querySelector('[data-k="initials"]').textContent = item.initials || '-';
    tr.querySelector('[data-k="notes"]').textContent = item.notes || '-';

    const actionTd = tr.querySelector('.rowActions');
    const b1 = btn('Suivi fait', ()=>markDone(item.id));
    const b2 = btn('Reporter +1j', ()=>reschedule(item.id,1));
    const b3 = btn('Statut', ()=>cycleStatus(item.id));
    const b4 = btn('Supprimer', ()=>remove(item.id));
    b4.classList.add('secondary');
    actionTd.append(b1,b2,b3,b4);
    rowsEl.appendChild(tr);
  }
}
function btn(t,fn){ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.onclick=fn; return b; }

function markDone(id){
  const item=data.find(x=>x.id===id); if(!item) return;
  const f=item.followups.find(x=>!x.done); if(!f) return;
  f.done=true; f.doneAt=todayISO();
  if(item.followups.every(x=>x.done)) item.status='Complété'; else if(item.status==='À faire') item.status='En cours';
  persistAndRender();
}
function reschedule(id,days){ const item=data.find(x=>x.id===id); const f=item?.followups.find(x=>!x.done); if(!f) return; f.dueDate=addDays(f.dueDate,days); if(item.status==='Complété') item.status='En cours'; persistAndRender(); }
function cycleStatus(id){
  const order=['À faire','En cours','Reporté','Complété'];
  const item=data.find(x=>x.id===id); if(!item) return;
  item.status = order[(order.indexOf(item.status)+1)%order.length];
  persistAndRender();
}
function remove(id){ if(!confirm('Supprimer ce suivi?')) return; data = data.filter(x=>x.id!==id); persistAndRender(); }

function persistAndRender(){ save(); renderKPIs(); renderRows(); }

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(form);
  const date=f.get('date');
  const intervalDays=Number(f.get('intervalDays'));
  const plannedCount=Number(f.get('plannedCount'));
  data.push({
    id: uid(),
    createdAt: new Date().toISOString(),
    date,
    rxNumber:String(f.get('rxNumber')).trim(),
    rxRef:String(f.get('rxRef')||'').trim(),
    acte:String(f.get('acte')).trim(),
    intervalDays, plannedCount,
    status:String(f.get('status')),
    initials:String(f.get('initials')||'').toUpperCase().trim(),
    notes:String(f.get('notes')||'').trim(),
    followups: buildFollowups(date, intervalDays, plannedCount)
  });
  form.reset();
  form.intervalDays.value = 7; form.plannedCount.value = 2; form.status.value='À faire';
  persistAndRender();
});

$('#btnSample').onclick = ()=>{
  data.push({ id:uid(), createdAt:new Date().toISOString(), date:todayISO(), rxNumber:'RX-12345', rxRef:'REF-7', acte:'Renouvellement', intervalDays:7, plannedCount:3, status:'À faire', initials:'AM', notes:'TA à revalider', followups:buildFollowups(todayISO(),7,3) });
  persistAndRender();
};

['#search','#statusFilter','#dueFilter','#initialsFilter'].forEach(s=>$(s).addEventListener('input', renderRows));
$('#btnPrint').onclick = ()=>window.print();

function download(name, text, type){
  const blob = new Blob([text], {type});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$('#btnExportJson').onclick = ()=> download(`suivis-${todayISO()}.json`, JSON.stringify(data,null,2), 'application/json');
$('#btnExportCsv').onclick = ()=>{
  const head=['id','date','rxNumber','rxRef','acte','intervalDays','plannedCount','status','initials','notes','nextDue','progress'];
  const lines=[head.join(',')];
  for(const i of data){
    const row=[i.id,i.date,i.rxNumber,i.rxRef,i.acte,i.intervalDays,i.plannedCount,i.status,i.initials,(i.notes||'').replaceAll('"','""'),nextDue(i),progress(i)];
    lines.push(row.map(v=>`"${String(v??'')}"`).join(','));
  }
  download(`suivis-${todayISO()}.csv`, lines.join('\n'), 'text/csv');
};

$('#importFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const txt = await file.text();
  let incoming=[];
  try {
    if(file.name.toLowerCase().endsWith('.json')){
      incoming = JSON.parse(txt);
    } else {
      const lines = txt.split(/\r?\n/).filter(Boolean);
      const cols = lines[0].split(',').map(x=>x.replace(/^"|"$/g,''));
      incoming = lines.slice(1).map(line=>{
        const parts = line.match(/("(?:[^"]|"")*"|[^,]+)/g)?.map(p=>p.replace(/^"|"$/g,'').replaceAll('""','"')) || [];
        const obj = Object.fromEntries(cols.map((c,idx)=>[c,parts[idx]||'']));
        const date = obj.date || todayISO();
        const intervalDays = Number(obj.intervalDays||7), plannedCount=Number(obj.plannedCount||2);
        return {
          id: obj.id || uid(),
          createdAt: new Date().toISOString(),
          date, rxNumber: obj.rxNumber || '', rxRef: obj.rxRef || '', acte: obj.acte || 'Autre',
          intervalDays, plannedCount, status: obj.status || 'À faire', initials: obj.initials || '', notes: obj.notes || '',
          followups: buildFollowups(date, intervalDays, plannedCount)
        };
      });
    }
  } catch { alert('Import invalide. Vérifiez le format JSON/CSV.'); return; }
  if(!Array.isArray(incoming) || !incoming.length){ alert('Aucune donnée importable.'); return; }
  const mode = confirm('OK = Fusionner avec les suivis actuels\nAnnuler = Remplacer complètement');
  data = mode ? [...data, ...incoming] : incoming;
  persistAndRender();
  e.target.value='';
});

persistAndRender();
