const KG_PER_LB = 0.45359237;

const defs = {
  pedi: {
    label: 'Pédiatrique',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lb']]},
      {id:'dose',label:'Dose',type:'number',value:''},
      {id:'doseMode',label:'Type dose',type:'select',value:'day',options:[['day','mg/kg/jr'],['dose','mg/kg/dose']]},
      {id:'prises',label:'Prises / jour',type:'number',value:'4'},
      {id:'concMg',label:'Concentration: mg',type:'number',value:''},
      {id:'concMl',label:'Concentration: mL',type:'number',value:''}
    ],
    run:v => runWeightDose(v)
  },

  pyrantel: {
    label: 'Pyrantel',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lb']]},
      {id:'mgBaseKg',label:'Dose mg base/kg',type:'number',value:'11'},
      {id:'tabletMg',label:'Comprimé (mg)',type:'number',value:'125'},
      {id:'concMg',label:'Liquide: mg',type:'number',value:'50'},
      {id:'concMl',label:'Liquide: mL',type:'number',value:'1'}
    ],
    run:v => {
      const kg = toKg(v.poids, v.unit);
      const totalMg = kg * v.mgBaseKg;
      const tablets = totalMg / Math.max(0.001, v.tabletMg);
      const roundedQuarter = Math.round(tablets * 4) / 4;
      const mgPerMl = v.concMg / Math.max(0.001, v.concMl);
      const ml = totalMg / mgPerMl;
      return out([
        ['Poids (kg)', kg.toFixed(2)],
        ['Dose totale', `${totalMg.toFixed(1)} mg base`],
        ['Suggestion comprimés', `${roundedQuarter.toFixed(2)} comprimé(s) de ${v.tabletMg} mg (arrondi au 1/4)`],
        ['Option liquide', `${ml.toFixed(2)} mL`],
      ]);
    }
  },

  abx_ped: {
    label: 'Antibiotique pédiatrique',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lb']]},
      {id:'dose',label:'Dose',type:'number',value:'50'},
      {id:'doseMode',label:'Type dose',type:'select',value:'day',options:[['day','mg/kg/jr'],['dose','mg/kg/dose']]},
      {id:'prises',label:'Prises / jour',type:'number',value:'2'},
      {id:'concMg5',label:'Suspension: mg / 5 mL',type:'number',value:'250'},
      {id:'maxJour',label:'Max journalier (mg) (optionnel)',type:'number',value:''}
    ],
    run:v => {
      const kg = toKg(v.poids, v.unit);
      const prises = Math.max(1, v.prises || 1);
      let dosePer = v.doseMode === 'day' ? (kg * v.dose) / prises : kg * v.dose;
      let totalDay = dosePer * prises;
      let notes=[];
      if (v.maxJour && totalDay > v.maxJour) {
        totalDay = v.maxJour;
        dosePer = totalDay / prises;
        notes.push('⚠ Dose plafonnée au maximum journalier indiqué.');
      }
      const mlPerDose = (dosePer * 5) / Math.max(0.001, v.concMg5);
      return out([
        ['Poids (kg)', kg.toFixed(2)],
        ['Dose/jour', `${totalDay.toFixed(1)} mg`],
        ['Dose/prise', `${dosePer.toFixed(1)} mg`],
        ['Volume/prise', `${mlPerDose.toFixed(2)} mL`],
      ], notes, notes.length?'warn':'ok');
    }
  },

  warfarin: {
    label: 'Warfarine (ajustement)',
    fields: [
      {id:'inr',label:'INR actuel',type:'number',value:''},
      {id:'targetLow',label:'INR cible bas',type:'number',value:'2.0'},
      {id:'targetHigh',label:'INR cible haut',type:'number',value:'3.0'},
      {id:'weeklyDose',label:'Dose hebdo actuelle (mg)',type:'number',value:''}
    ],
    run:v => {
      const inr = v.inr;
      const weekly = v.weeklyDose;
      if (!weekly) return out([], ['Entrer une dose hebdomadaire pour calculer l’ajustement.'],'warn');
      let pct = 0, msg='';
      if (inr < 1.5) { pct = +15; msg='INR très sous-cible'; }
      else if (inr < v.targetLow) { pct = +10; msg='INR sous-cible'; }
      else if (inr <= v.targetHigh) { pct = 0; msg='INR en cible'; }
      else if (inr <= 3.5) { pct = -10; msg='INR légèrement élevé'; }
      else if (inr < 5) { pct = -15; msg='INR élevé (considérer omission ponctuelle selon protocole)'; }
      else { return out([], ['⚠ INR ≥ 5: évaluation clinique urgente / protocole local requis.'],'warn'); }

      const newWeekly = weekly * (1 + pct/100);
      return out([
        ['Évaluation', msg],
        ['Ajustement proposé', `${pct>0?'+':''}${pct}% dose hebdo`],
        ['Nouvelle dose hebdo estimée', `${newWeekly.toFixed(2)} mg`],
      ], ['Validation clinique + contexte patient obligatoires.'], pct===0?'ok':'warn');
    }
  },

  custom: {
    label: 'Autre médicament',
    fields: [
      {id:'poids',label:'Poids',type:'number',value:''},
      {id:'unit',label:'Unité poids',type:'select',value:'kg',options:[['kg','kg'],['lb','lb']]},
      {id:'dose',label:'Dose',type:'number',value:''},
      {id:'doseMode',label:'Type dose',type:'select',value:'day',options:[['day','mg/kg/jr'],['dose','mg/kg/dose']]},
      {id:'prises',label:'Prises / jour',type:'number',value:'2'},
      {id:'concMg',label:'Concentration: mg (optionnel)',type:'number',value:''},
      {id:'concMl',label:'Concentration: mL (optionnel)',type:'number',value:''}
    ],
    run:v => runWeightDose(v)
  }
};

const calcType=document.getElementById('calcType');
const calcForm=document.getElementById('calcForm');
const result=document.getElementById('result');

Object.entries(defs).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;calcType.appendChild(o);});

function toKg(w, unit){ return unit==='lb' ? w*KG_PER_LB : w; }

function runWeightDose(v){
  const kg = toKg(v.poids, v.unit);
  const prises = Math.max(1, v.prises || 1);
  const dosePer = v.doseMode === 'day' ? (kg*v.dose)/prises : kg*v.dose;
  const total = dosePer*prises;
  const rows = [
    ['Poids (kg)', kg.toFixed(2)],
    ['Dose/jour', `${total.toFixed(2)} mg`],
    ['Dose/prise', `${dosePer.toFixed(2)} mg`]
  ];
  if(v.concMg && v.concMl){
    const mgPerMl = v.concMg/Math.max(0.001,v.concMl);
    rows.push(['Volume/prise', `${(dosePer/mgPerMl).toFixed(2)} mL`]);
  }
  return out(rows);
}

function fieldMeta(f){ return f; }

function renderForm(){
  calcForm.innerHTML='';
  defs[calcType.value].fields.forEach((f)=>{
    const m=fieldMeta(f);
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
