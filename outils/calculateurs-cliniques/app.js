const KG_PER_LB = 0.45359237;

const defs = {
  pedi: {
    label: 'Pédiatrique',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lbs']]},
      {id:'dose',label:'Dose',type:'number',value:''},
      {id:'prises',label:'Prises / jour',type:'number',value:'4'},
      {id:'concMode',label:'Concentration',type:'select',value:'mgml',options:[['mgml','mg/mL'],['mg5ml','mg/5mL']]},
      {id:'concMg',label:'Concentration: mg',type:'number',value:''},
      {id:'concVol',label:'Concentration: volume (mL)',type:'number',value:'1'}
    ],
    run:v => {
      const kg = toKg(v.poids, v.unit);
      const prises = Math.max(1, v.prises || 1);
      const dosePer = kg * v.dose; // mg/kg/dose only
      const totalDay = dosePer * prises;
      const mgPerMl = v.concMg / Math.max(0.001, v.concVol);
      const mlDose = dosePer / Math.max(0.0001, mgPerMl);
      return out([
        ['Dose par jour', `${Math.round(totalDay)} mg`],
        ['Dose par prise', `${Math.round(dosePer)} mg`],
        ['Volume par prise', `${round1(mlDose).toFixed(1)} mL`],
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
    run:v => {
      const kg = toKg(v.poids, v.unit);
      const totalMg = kg * v.mgBaseKg;
      const tabletsOne = roundQuarter(totalMg / 125);
      const tabletsFull = roundQuarter((totalMg * 2) / 125);
      const mlOne = totalMg / (250/5); // 250 mg / 5mL
      const mlFull = mlOne * 2;
      return out([
        ['Posologie comprimés (dose unique)', `${tabletsOne.toFixed(2)} comprimé(s) de 125 mg`],
        ['Total comprimés traitement complet (J0 + J14)', `${tabletsFull.toFixed(2)} comprimé(s)`],
        ['Posologie liquide (dose unique)', `${round1(mlOne).toFixed(1)} mL (250 mg/5mL)`],
        ['Total liquide traitement complet (J0 + J14)', `${round1(mlFull).toFixed(1)} mL`],
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
      {id:'concMg5',label:'Suspension mg / 5mL',type:'number',value:'250'},
      {id:'duree','label':'Durée traitement (jours)','type':'number','value':'7'}
    ],
    run:v => {
      const kg = toKg(v.poids, v.unit);
      const prises = Math.max(1, v.prises || 1);
      const dosePerMg = v.doseMode === 'day' ? (kg * v.dose) / prises : kg * v.dose;
      const doseDayMg = dosePerMg * prises;
      const mlPerDose = (dosePerMg * 5) / Math.max(0.001, v.concMg5);
      const totalMl = mlPerDose * prises * Math.max(1, v.duree || 1);
      return out([
        ['Dose quotidienne', `${Math.round(doseDayMg)} mg`],
        ['Dose par prise', `${round1(mlPerDose).toFixed(1)} mL (${Math.round(dosePerMg)} mg)`],
        ['Total mL traitement', `${round1(totalMl).toFixed(1)} mL`],
      ]);
    }
  },

  warfarin: {
    label: 'Warfarine (ajustement)',
    fields: [
      {id:'inr',label:'INR actuel',type:'number',value:''},
      {id:'targetLow',label:'INR cible bas',type:'number',value:'2.0'},
      {id:'targetHigh',label:'INR cible haut',type:'number',value:'3.0'},
      {id:'dailyDose',label:'Dose journalière actuelle (mg)',type:'number',value:''},
      {id:'factor',label:'Facteur de variation identifié ?',type:'select',value:'non',options:[['non','Non'],['oui','Oui']]}
    ],
    run:v => {
      const inr=v.inr;
      const hasFactor = v.factor === 'oui';
      if (inr < 1.5 && !hasFactor) {
        return out([], [
          'Suggestion',
          '• Dose de charge × 2–3 jours puis INR dans 1 semaine',
          '• Aviser MD — Considérer HFPM (INR dans 3–4 jours)',
          '• Augmenter dose de 15–20%'
        ], 'warn');
      }
      if (inr < v.targetLow) {
        return out([], [hasFactor
          ? 'INR sous-cible avec facteur identifié: corriger le facteur puis recontrôler INR.'
          : 'INR sous-cible: considérer hausse de 10–15% et recontrôle rapproché.'], 'warn');
      }
      if (inr <= v.targetHigh) {
        return out([], ['INR en cible: maintenir dose actuelle, surveillance habituelle.'], 'ok');
      }
      if (inr <= 3.5) {
        return out([], ['INR légèrement élevé: considérer baisse de 5–10% et recontrôle.'], 'warn');
      }
      return out([], ['INR élevé: protocole local / avis médical requis.'], 'warn');
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
      {id:'concMg',label:'Concentration: mg',type:'number',value:''},
      {id:'concMl',label:'Concentration: mL',type:'number',value:''}
    ],
    run:v => {
      const kg = toKg(v.poids, v.unit);
      const prises = Math.max(1, v.prises || 1);
      const dosePer = v.doseMode === 'day' ? (kg*v.dose)/prises : kg*v.dose;
      const totalDay = dosePer*prises;
      const rows=[
        ['Dose par jour', `${Math.round(totalDay)} mg`],
        ['Dose par prise', `${Math.round(dosePer)} mg`],
      ];
      if(v.concMg && v.concMl){
        const mgPerMl = v.concMg/Math.max(0.001,v.concMl);
        const mlDose = dosePer/mgPerMl;
        const totalMl = mlDose * prises * Math.max(1, v.duree || 1);
        rows.push(['Volume par prise', `${round1(mlDose).toFixed(1)} mL`]);
        rows.push(['Total mL traitement', `${round1(totalMl).toFixed(1)} mL`]);
      }
      return out(rows);
    }
  }
};

const calcType=document.getElementById('calcType');
const calcForm=document.getElementById('calcForm');
const result=document.getElementById('result');
const refCard=document.getElementById('refCard');

Object.entries(defs).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;calcType.appendChild(o);});

function toKg(w, unit){ return unit==='lb' ? w*KG_PER_LB : w; }
function round1(n){ return Math.round(n*10)/10; }
function roundQuarter(n){ return Math.round(n*4)/4; }

function renderForm(){
  calcForm.innerHTML='';
  defs[calcType.value].fields.forEach((m)=>{
    const wrap=document.createElement('label');
    wrap.textContent=m.label;
    let inp;
    if(m.type==='select'){
      inp=document.createElement('select');
      (m.options||[]).forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;inp.appendChild(o);});
      inp.value=m.value;
    }else{
      inp=document.createElement('input');
      inp.type=m.type;
      inp.value=m.value;
    }
    inp.id=m.id;
    wrap.appendChild(inp);
    calcForm.appendChild(wrap);
  });
  if(refCard) refCard.style.display = calcType.value==='pedi' ? 'block' : 'none';
}

function getVals(){
  const vals={};
  defs[calcType.value].fields.forEach((m)=>{
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
document.getElementById('btnReset').onclick=()=>{renderForm();result.textContent='';};
calcType.onchange=()=>{renderForm();result.textContent='';};
renderForm();
