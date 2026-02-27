const defs = {
  pedi_generic: {
    label: 'Pédiatrique mg/kg/jour (générique)',
    fields: [
      ['poidsKg','Poids (kg)','number',''],
      ['doseMgKgJour','Dose (mg/kg/jour)','number',''],
      ['prisesJour','Prises/jour','number','2'],
      ['concentration','Concentration suspension (mg/mL)','number','']
    ],
    run: v => {
      const total = v.poidsKg*v.doseMgKgJour;
      const dose = total/Math.max(1,v.prisesJour);
      const ml = v.concentration? dose/v.concentration : null;
      return out([
        ['Dose totale/jour', `${total.toFixed(1)} mg`],
        ['Dose par prise', `${dose.toFixed(1)} mg`],
        ...(ml ? [['Volume par prise', `${ml.toFixed(2)} mL`]] : [])
      ]);
    }
  },
  pyrantel: {
    label: 'Pyrantel (11 mg base/kg)',
    fields: [
      ['poidsKg','Poids (kg)','number',''],
      ['mgBaseKg','Dose mg base/kg','number','11'],
      ['concentration','Concentration (mg/mL)','number','50']
    ],
    run: v => {
      const mg = v.poidsKg*v.mgBaseKg;
      return out([
        ['Dose totale', `${mg.toFixed(1)} mg base`],
        ['Volume', `${(mg/Math.max(0.0001,v.concentration)).toFixed(2)} mL`]
      ]);
    }
  },
  abx_ped: {
    label: 'Antibiotique pédiatrique (preset)',
    fields: [
      {id:'molecule',label:'Molécule',type:'select',value:'amox',options:[
        ['amox','Amoxicilline'],['cephalexin','Céphalexine'],['azithro','Azithromycine']
      ]},
      ['poidsKg','Poids (kg)','number',''],
      ['prisesJour','Prises/jour','number','2'],
      ['concentration','Suspension (mg/mL)','number','50']
    ],
    run: v => {
      const presets={
        amox:{mgkg:50,max:4000},
        cephalexin:{mgkg:50,max:4000},
        azithro:{mgkg:10,max:500}
      };
      const p=presets[v.molecule]||presets.amox;
      let total=v.poidsKg*p.mgkg;
      let warn='';
      if(total>p.max){total=p.max;warn='⚠ Dose plafonnée au maximum usuel.'}
      const prises = Math.max(1, v.prisesJour || (v.molecule==='azithro'?1:2));
      const dose=total/prises;
      const ml=dose/Math.max(0.0001,v.concentration);
      return out([
        ['Molécule', labelFor('abx_ped','molecule',v.molecule)],
        ['Dose cible', `${p.mgkg} mg/kg/jour`],
        ['Dose/jour', `${total.toFixed(0)} mg`],
        ['Dose/prise', `${dose.toFixed(0)} mg`],
        ['Volume/prise', `${ml.toFixed(2)} mL`],
      ], warn ? [warn] : []);
    }
  },
  warfarin: {
    label: 'Warfarine (aide structurée)',
    fields: [
      ['inrActuel','INR actuel','number',''],
      ['inrCibleBas','INR cible bas','number','2.0'],
      ['inrCibleHaut','INR cible haut','number','3.0'],
      ['doseHebdo','Dose hebdo actuelle (mg)','number','']
    ],
    run: v => {
      if(v.inrActuel<v.inrCibleBas) return out([],['INR sous-cible: considérer hausse prudente (+5 à 10% dose hebdo) et recontrôle rapproché.'],'warn');
      if(v.inrActuel>v.inrCibleHaut) return out([],['INR sur-cible: considérer baisse prudente / omission selon protocole local et contexte clinique.'],'warn');
      return out([],['INR en cible: maintenir dose actuelle et poursuivre surveillance.'],'ok');
    }
  },
  methadone: {
    label: 'Méthadone (aide conversion basique)',
    fields: [
      ['doseOpioide','Dose opioïde équivalente (MME/jour)','number',''],
      ['ratio','Ratio conversion choisi','number','10']
    ],
    run: v => out([
      ['Dose estimée méthadone', `${(v.doseOpioide/Math.max(1,v.ratio)).toFixed(1)} mg/jour`]
    ],['⚠ Conversion méthadone non linéaire: validation clinique stricte requise.'],'warn')
  },
  custom: {
    label: 'Autre médicament (mg/kg)',
    fields: [
      ['nom','Nom','text',''],
      ['poidsKg','Poids (kg)','number',''],
      ['doseMgKg','Dose mg/kg','number',''],
      ['concentration','Concentration mg/mL (optionnel)','number','']
    ],
    run: v => {
      const mg=v.poidsKg*v.doseMgKg;
      const rows=[[v.nom||'Médicament',`${mg.toFixed(1)} mg`]];
      if(v.concentration) rows.push(['Volume',`${(mg/v.concentration).toFixed(2)} mL`]);
      return out(rows);
    }
  }
};

const calcType=document.getElementById('calcType');
const calcForm=document.getElementById('calcForm');
const result=document.getElementById('result');
let lastHtml='';

Object.entries(defs).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;calcType.appendChild(o);});

function labelFor(calc,id,value){
  const f=defs[calc].fields.find(x=> (Array.isArray(x)?x[0]:x.id)===id);
  if(!f || Array.isArray(f)) return value;
  const m=(f.options||[]).find(o=>o[0]===value);
  return m?m[1]:value;
}

function fieldMeta(f){
  if(Array.isArray(f)) return {id:f[0],label:f[1],type:f[2],value:f[3]};
  return f;
}

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
  defs[calcType.value].fields.forEach((f)=>{
    const m=fieldMeta(f);
    const raw=document.getElementById(m.id).value;
    vals[m.id]=m.type==='number' ? Number(raw||0) : raw;
  });
  return vals;
}

function out(rows=[],notes=[],level='ok'){
  const body = rows.map(([k,v])=>`<div><b>${k}:</b> ${v}</div>`).join('');
  const nts = (notes||[]).map(n=>`<div class="n ${level}">${n}</div>`).join('');
  const html = `<div class="cardR">${body}${nts}</div>`;
  lastHtml = html;
  return html;
}

document.getElementById('btnCalc').onclick=(e)=>{
  e.preventDefault();
  try{result.innerHTML=defs[calcType.value].run(getVals());}
  catch{result.textContent='Paramètres invalides.';}
};
document.getElementById('btnReset').onclick=()=>{renderForm();result.textContent='';};
document.getElementById('btnPrint').onclick=()=>{
  if(!lastHtml){result.textContent='Calculez d’abord.';return;}
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Résumé calcul</title><style>body{font-family:Inter,Arial;padding:20px}.cardR{border:1px solid #d7deea;border-radius:8px;padding:10px}.n.warn{color:#b14a00;font-weight:700}</style></head><body>${lastHtml}<p style="font-size:12px;color:#666">Validation clinique finale requise.</p></body></html>`);
  w.document.close(); w.print();
};
calcType.onchange=()=>{renderForm();result.textContent='';};
renderForm();
