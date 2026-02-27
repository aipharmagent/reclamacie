const KG_PER_LB = 0.45359237;
const round1 = n => Math.round(n*10)/10;
const toKg = (w,u) => u==='lb' ? w*KG_PER_LB : w;

let lastCopyText = '';

const defs = {
  pedi: {
    label: 'Pédiatrique',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lbs']]},
      {id:'dose',label:'Dose (mg/kg/dose)',type:'number',value:''},
      {id:'concPair',label:'Concentration',type:'concPair',value:'',mode:'mg5ml',options:[['mgml','mg/mL'],['mg5ml','mg/5mL']]}
    ],
    run:v=>{
      const kg=toKg(v.poids,v.unit);
      const doseMg = kg * v.dose;
      const doseDay = doseMg * 4; // q6h standard
      const mgPerMl = v.concMode==='mg5ml' ? v.conc/5 : v.conc;
      const mlDose = doseMg / Math.max(0.0001, mgPerMl);
      return out([
        ['Dose quotidienne', `${Math.round(doseDay)} mg`],
        ['Dose par prise', `${round1(mlDose).toFixed(1)} mL (${Math.round(doseMg)} mg)`]
      ]);
    }
  },

  pyrantel: {
    label: 'Pyrantel',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lbs']]},
      {id:'mgBaseKg',label:'Dose mg base/kg',type:'number',value:'11'}
    ],
    run:v=>{
      const kg=toKg(v.poids,v.unit);
      const dose=kg*v.mgBaseKg;
      const compDose=Math.round((dose/125)*4)/4;
      const compTotal=Math.round((dose*2/125)*4)/4;
      const mlDose=dose/50; // 250mg/5mL
      const mlTotal=mlDose*2;
      return out([
        ['Posologie comprimé', `${compDose.toFixed(2)} comprimé(s) de 125 mg`],
        ['Posologie liquide', `${round1(mlDose).toFixed(1)} mL (250 mg/5mL)`],
        ['Total traitement (J0 + J14) comprimés', `${compTotal.toFixed(2)} comprimé(s)`],
        ['Total traitement (J0 + J14) liquide', `${round1(mlTotal).toFixed(1)} mL`]
      ]);
    }
  },

  abx_ped: {
    label: 'Antibiotique pédiatrique',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lbs']]},
      {id:'dose',label:'Dose',type:'number',value:'50'},
      {id:'doseMode',label:'Type dose',type:'select',value:'day',options:[['day','mg/kg/jr'],['dose','mg/kg/dose']]},
      {id:'prises',label:'Prises / jour',type:'number',value:'2'},
      {id:'concMg5',label:'Suspension (mg/5mL)',type:'number',value:'250'},
      {id:'duree',label:'Durée traitement (jours)',type:'number',value:'7'}
    ],
    run:v=>{
      const kg=toKg(v.poids,v.unit), prises=Math.max(1,v.prises||1);
      const dosePer=v.doseMode==='day' ? (kg*v.dose)/prises : kg*v.dose;
      const doseDay=dosePer*prises;
      const mlPer=(dosePer*5)/Math.max(0.0001,v.concMg5);
      const totalMl=mlPer*prises*Math.max(1,v.duree||1);
      return out([
        ['Dose quotidienne', `${Math.round(doseDay)} mg`],
        ['Dose par prise', `${round1(mlPer).toFixed(1)} mL (${Math.round(dosePer)} mg)`],
        ['Total mL traitement', `${round1(totalMl).toFixed(1)} mL`]
      ]);
    }
  },

  warfarin: {
    label: 'Warfarine (ajustement)',
    fields: [
      {id:'target',label:'Cible INR',type:'select',value:'23',options:[['23','2.0–3.0'],['2535','2.5–3.5']]},
      {id:'inr',label:'INR actuel',type:'number',value:''},
      {id:'weekly',label:'Dose hebdo actuelle (mg)',type:'number',value:''},
      {id:'variation',label:'Facteur de variation identifié ?',type:'select',value:'non',options:[['oui','Oui'],['non','Non']]},
      {id:'nextInr',label:'Prochain INR (YYYY-MM-DD)',type:'text',value:''}
    ],
    run:v=>{
      const i=v.inr, t23=v.target==='23', varId=v.variation==='oui', wk=v.weekly;
      let suggestion='', pct='', doseTxt='idem';
      if(varId){
        if(t23){
          if(i<=1.5)suggestion='Dose de charge × 3 jours puis INR dans 1 semaine; Aviser MD; Considérer HFPM — INR dans 3 jours';
          else if(i<=1.79)suggestion='Dose de charge × 2 jours puis INR dans 1–2 semaines; Aviser MD; Considérer HFPM — INR dans 3 jours';
          else if(i<=1.99)suggestion='Dose de charge × 1 jour puis INR dans 4 semaines';
          else if(i<=3.09)suggestion='INR thérapeutique — continuer même dose; INR dans 4 semaines';
          else if(i<=3.39)suggestion='INR supra-thérapeutique — continuer même dose; INR dans 2–4 semaines';
          else if(i<=3.79)suggestion='Omettre une dose ou continuer à monitorer; INR dans 1–2 semaines';
          else if(i<=4.59)suggestion='Omettre une dose; INR dans 1 semaine';
          else suggestion='Omettre 2 doses; INR dans 1 semaine';
        } else {
          if(i<=1.5)suggestion='Dose de charge × 3 jours puis INR dans 1 semaine; Aviser MD; Considérer HFPM — INR dans 3 jours';
          else if(i<=1.99)suggestion='Dose de charge × 2 jours puis INR dans 1 semaine; Aviser MD; Considérer HFPM — INR dans 3 jours';
          else if(i<=2.29)suggestion='Dose de charge × 1 jour; INR dans 1–2 semaines';
          else if(i<=2.49)suggestion='Dose de charge × 1 jour; INR dans 2–4 semaines';
          else if(i<=3.59)suggestion='INR thérapeutique — continuer même dose; INR dans 4 semaines';
          else if(i<=3.99)suggestion='INR supra-thérapeutique — continuer même dose; INR dans 2–4 semaines';
          else if(i<=4.49)suggestion='Omettre une dose ou continuer à monitorer; INR dans 1 semaine';
          else if(i<=5.39)suggestion='Omettre une dose; INR dans 1 semaine; Aviser MD';
          else suggestion='Omettre 2 doses; Diriger vers MD — INR dans 2 jours';
        }
      } else {
        if(t23){
          if(i<=1.5){suggestion='Dose de charge × 2–3 jours puis INR dans 1 semaine; Aviser MD — Considérer HFPM (INR dans 3–4 jours); Augmenter dose de 15–20%'; pct='15–20%';}
          else if(i<=1.79){suggestion='Dose de charge × 2 jours puis INR dans 1–2 semaines; Aviser MD — Considérer HFPM; Augmenter dose de 10–12,5%'; pct='10–12,5%';}
          else if(i<=1.99){suggestion='Dose de charge × 1 jour puis INR dans 2–4 semaines; Augmenter dose de 5–7,5%'; pct='5–7,5%';}
          else if(i<=3.09){suggestion='INR thérapeutique — continuer même dose; INR dans 4 semaines';}
          else if(i<=3.39){suggestion='INR supra-thérapeutique — continuer même dose; INR dans 2–4 semaines';}
          else if(i<=3.79){suggestion='INR supra-thérapeutique; Diminuer dose de 5%'; pct='-5%';}
          else if(i<=4.59){suggestion='Omettre 1 dose et INR dans 1 semaine; Diminuer dose de 5–7,5%'; pct='-5 à -7,5%';}
          else {suggestion='Omettre 2 doses et INR dans 2 jours; Diminuer dose de 10–15%'; pct='-10 à -15%';}
        } else {
          if(i<=1.5){suggestion='Dose de charge × 3 jours puis INR dans 1 semaine; Aviser MD — HFPM (INR dans 3–4 jours); Augmenter dose de 15–20%'; pct='15–20%';}
          else if(i<=1.89){suggestion='Dose de charge × 2 jours puis INR dans 1 semaine; Aviser MD — HFPM; Augmenter dose de 10–12,5%'; pct='10–12,5%';}
          else if(i<=2.29){suggestion='Dose de charge × 1 jour puis INR dans 2 semaines; Augmenter dose de 7,5–10%'; pct='7,5–10%';}
          else if(i<=2.49){suggestion='INR sub-thérapeutique; INR dans 2–4 semaines; Augmenter dose de 3–5%'; pct='3–5%';}
          else if(i<=3.59){suggestion='INR thérapeutique — continuer même dose; INR dans 4 semaines';}
          else if(i<=3.99){suggestion='INR supra-thérapeutique — continuer même dose; INR dans 2–4 semaines';}
          else if(i<=4.49){suggestion='Omettre 1 dose et INR dans 1 semaine; Diminuer dose de 2,5–5%'; pct='-2,5 à -5%';}
          else if(i<=5.39){suggestion='Omettre 1 dose et INR dans 1 semaine; Aviser MD; Diminuer dose de 5–7,5%'; pct='-5 à -7,5%';}
          else {suggestion='Omettre 2 doses et INR dans 2 jours; Diriger vers MD; Diminuer dose de 10–15%'; pct='-10 à -15%';}
        }
      }

      const rows=[];
      if(pct) rows.push(['Ajustement dose', pct]);
      if(wk && pct){ doseTxt = applyPctRange(wk,pct); rows.push(['Dose hebdo cible (approx.)', doseTxt]); }

      const cls = classifyWarfarin(i,t23);
      const cibleTxt = t23 ? '2-3' : '2,5-3,5';
      const date = todayYmd();
      const nextInr = v.nextInr || 'YYYY-MM-DD';
      const oneLine = suggestion.replace(/\s*;\s*/g, ' ').replace(/\s+/g,' ').trim();
      lastCopyText = `${date}: INR = ${num1(i)} (${cls}). Cible: (${cibleTxt}). ${oneLine}. Dose: ${doseTxt || 'idem'}. Prochain INR le ${nextInr}.`;

      return out(rows, suggestion.split(';').map(s=>s.trim()).filter(Boolean), 'warn');
    }
  },

  custom: {
    label: 'Autre médicament',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lbs']]},
      {id:'dose',label:'Dose',type:'number',value:''},
      {id:'doseMode',label:'Type dose',type:'select',value:'day',options:[['day','mg/kg/jr'],['dose','mg/kg/dose']]},
      {id:'prises',label:'Prises / jour',type:'number',value:'2'},
      {id:'duree',label:'Durée traitement (jours)',type:'number',value:'7'},
      {id:'concMg',label:'Concentration',type:'number',value:''},
      {id:'concMl',label:'Unité concentration (mL)',type:'number',value:''}
    ],
    run:v=>{
      const kg=toKg(v.poids,v.unit), prises=Math.max(1,v.prises||1);
      const dosePer=v.doseMode==='day' ? (kg*v.dose)/prises : kg*v.dose;
      const day=dosePer*prises;
      const rows=[['Dose par jour',`${Math.round(day)} mg`],['Dose par prise',`${Math.round(dosePer)} mg`]];
      if(v.concMg && v.concMl){
        const mgml=v.concMg/Math.max(0.0001,v.concMl);
        const mlDose=dosePer/mgml;
        const totalMl=mlDose*prises*Math.max(1,v.duree||1);
        rows.push(['Volume par prise',`${round1(mlDose).toFixed(1)} mL`]);
        rows.push(['Total mL traitement',`${round1(totalMl).toFixed(1)} mL`]);
      }
      return out(rows);
    }
  }
};

const calcType=document.getElementById('calcType');
const calcForm=document.getElementById('calcForm');
const result=document.getElementById('result');
const refCard=document.getElementById('refCard');
const btnCopy=document.getElementById('btnCopy');

Object.entries(defs).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;calcType.appendChild(o);});

function num1(n){ return Number(n).toFixed(1).replace('.',','); }
function todayYmd(){ return new Date().toISOString().slice(0,10); }

function classifyWarfarin(inr,t23){
  if(t23){ if(inr<2) return 'sous-thérapeutique'; if(inr<=3) return 'thérapeutique'; return 'surthérapeutique'; }
  if(inr<2.5) return 'sous-thérapeutique'; if(inr<=3.5) return 'thérapeutique'; return 'surthérapeutique';
}

function applyPctRange(wk,p){
  const m=p.match(/-?\d+[\.,]?\d*/g);
  if(!m||!m.length) return 'idem';
  const nums=m.map(x=>parseFloat(x.replace(',','.'))/100);
  if(nums.length===1){const r=wk*(1+nums[0]);return `${r.toFixed(2)} mg/sem`;}
  const a=wk*(1+nums[0]), b=wk*(1+nums[1]);
  return `${Math.min(a,b).toFixed(2)} – ${Math.max(a,b).toFixed(2)} mg/sem`;
}

function renderForm(){
  calcForm.innerHTML='';
  defs[calcType.value].fields.forEach((m)=>{
    const wrap=document.createElement('label');
    wrap.textContent=m.label;
    wrap.dataset.id=m.id;
    let inp;
    if(m.type==='select'){
      inp=document.createElement('select');
      (m.options||[]).forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;inp.appendChild(o);});
      inp.value=m.value;
      inp.id=m.id;
      wrap.appendChild(inp);
    }else if(m.type==='concPair'){
      const row=document.createElement('div');
      row.style.display='grid';
      row.style.gridTemplateColumns='1fr auto';
      row.style.gap='8px';
      const val=document.createElement('input');
      val.type='number'; val.id='conc'; val.value=m.value||'';
      const mode=document.createElement('select');
      mode.id='concMode';
      (m.options||[]).forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;mode.appendChild(o);});
      mode.value=m.mode||'mg5ml';
      row.appendChild(val); row.appendChild(mode);
      wrap.appendChild(row);
    }else{
      inp=document.createElement('input');
      inp.type=m.type;
      inp.value=m.value;
      inp.id=m.id;
      wrap.appendChild(inp);
    }
    calcForm.appendChild(wrap);
  });
  if(refCard) refCard.style.display = calcType.value==='pedi' ? 'block' : 'none';
  if(btnCopy) btnCopy.style.display = calcType.value==='warfarin' ? 'inline-block' : 'none';
}

function getVals(){
  const vals={};
  defs[calcType.value].fields.forEach((m)=>{
    if(m.type==='concPair'){
      vals.conc = Number((document.getElementById('conc')||{}).value||0);
      vals.concMode = (document.getElementById('concMode')||{}).value || 'mg5ml';
      return;
    }
    const raw=document.getElementById(m.id).value;
    vals[m.id]=m.type==='number' ? Number(raw||0) : raw;
  });
  return vals;
}

function out(rows=[],notes=[],level='ok'){
  const body = rows.map(([k,v])=>`<div><b>${k}:</b> ${v}</div>`).join('');
  const nts = (notes||[]).map(n=>`<div class="n ${level}">${n}</div>`).join('');
  return `<div class="cardR">${body}${nts}</div>`;
}

document.getElementById('btnCalc').onclick=(e)=>{
  e.preventDefault();
  try{result.innerHTML=defs[calcType.value].run(getVals());}
  catch{result.textContent='Paramètres invalides.';}
};
document.getElementById('btnReset').onclick=()=>{renderForm();result.textContent='';lastCopyText='';};
if(btnCopy){
  btnCopy.onclick=async()=>{
    if(!lastCopyText){result.textContent='Calculez d’abord.';return;}
    try{ await navigator.clipboard.writeText(lastCopyText); btnCopy.textContent='Copié ✓'; setTimeout(()=>btnCopy.textContent='Copier',1200);}catch{ result.textContent='Copie impossible.'; }
  };
}
calcType.onchange=()=>{renderForm();result.textContent='';lastCopyText='';};
renderForm();
