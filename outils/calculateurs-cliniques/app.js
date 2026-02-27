const defs = {
  pedi_generic: {
    label: 'Pédiatrique mg/kg/jour (générique)',
    fields: [
      ['poidsKg','Poids (kg)', 'number', ''],
      ['doseMgKgJour','Dose (mg/kg/jour)', 'number',''],
      ['prisesJour','Prises/jour', 'number','2'],
      ['concentration','Concentration suspension (mg/mL)', 'number','']
    ],
    run: v => {
      const total = v.poidsKg*v.doseMgKgJour;
      const dose = total/v.prisesJour;
      const ml = v.concentration? dose/v.concentration : null;
      return `Dose totale/jour: ${total.toFixed(1)} mg\nDose par prise: ${dose.toFixed(1)} mg${ml?`\nVolume par prise: ${ml.toFixed(2)} mL`:''}`;
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
      return `Dose totale: ${mg.toFixed(1)} mg base\nVolume: ${(mg/v.concentration).toFixed(2)} mL`;
    }
  },
  amox_ped: {
    label: 'Amoxicilline pédiatrique',
    fields: [
      ['poidsKg','Poids (kg)','number',''],
      ['doseMgKgJour','Dose cible mg/kg/jour','number','50'],
      ['prisesJour','Prises/jour','number','2'],
      ['concentration','Suspension (mg/mL)','number','50'],
      ['maxJour','Max journalier (mg)','number','4000']
    ],
    run: v => {
      let total = v.poidsKg*v.doseMgKgJour;
      const capped = total>v.maxJour;
      if(capped) total=v.maxJour;
      const dose=total/v.prisesJour;
      return `${capped?'⚠ Dose plafonnée au max journalier\n':''}Dose/jour: ${total.toFixed(0)} mg\nDose/prise: ${dose.toFixed(0)} mg\nVolume/prise: ${(dose/v.concentration).toFixed(2)} mL`;
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
      if(v.inrActuel<v.inrCibleBas) return 'INR sous-cible: considérer hausse prudente (ex. +5 à 10% dose hebdo) + recontrôle rapproché.';
      if(v.inrActuel>v.inrCibleHaut) return 'INR sur-cible: considérer baisse prudente / omission selon protocole local et contexte clinique.';
      return 'INR en cible: maintenir dose actuelle, poursuivre surveillance.';
    }
  },
  methadone: {
    label: 'Méthadone (aide conversion basique)',
    fields: [
      ['doseOpioide','Dose opioïde équivalente (MME/jour)','number',''],
      ['ratio','Ratio conversion choisi','number','10']
    ],
    run: v => `Dose estimée méthadone (approx.): ${(v.doseOpioide/v.ratio).toFixed(1)} mg/jour\n⚠ Conversion méthadone non linéaire: validation clinique stricte requise.`
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
      return `${v.nom||'Médicament'}: ${mg.toFixed(1)} mg${v.concentration?`\nVolume: ${(mg/v.concentration).toFixed(2)} mL`:''}`;
    }
  }
};

const calcType=document.getElementById('calcType');
const calcForm=document.getElementById('calcForm');
const result=document.getElementById('result');

Object.entries(defs).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;calcType.appendChild(o);});

function renderForm(){
  calcForm.innerHTML='';
  defs[calcType.value].fields.forEach(([id,label,type,val])=>{
    const wrap=document.createElement('label');
    wrap.textContent=label;
    const inp=document.createElement('input');
    inp.id=id; inp.type=type; inp.value=val;
    wrap.appendChild(inp);
    calcForm.appendChild(wrap);
  });
}

function getVals(){
  const vals={};
  defs[calcType.value].fields.forEach(([id,,type])=>{
    const raw=document.getElementById(id).value;
    vals[id]=type==='number' ? Number(raw||0) : raw;
  });
  return vals;
}

document.getElementById('btnCalc').onclick=(e)=>{e.preventDefault();try{result.textContent=defs[calcType.value].run(getVals());}catch{result.textContent='Paramètres invalides.';}};
document.getElementById('btnReset').onclick=()=>{renderForm();result.textContent='';};
calcType.onchange=()=>{renderForm();result.textContent='';};
renderForm();
