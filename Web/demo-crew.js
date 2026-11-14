import {METRICS} from './core.js';

export const DEMO_STORAGE_KEY='cosmovital-demo-crew-v1';
export const DEMO_SCHEMA_VERSION=1;
const day=86400000;
const copy=value=>structuredClone(value);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const contexts=['resting','exercise','post-exercise','post-eva','sleep','other','unknown'];
const validTime=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value));

export function createDemoCrew({now=Date.now()}={}){
 const clock=new Date(now);if(!Number.isFinite(+clock))throw new Error('Invalid demonstration clock.');
 const today=Date.UTC(clock.getUTCFullYear(),clock.getUTCMonth(),clock.getUTCDate());
 const start=today-60*day,createdAt=clock.toISOString(),records=[];
 for(let offset=-35;offset<60;offset++){
  const time=start+offset*day,drift=Math.max(0,offset-51),noise=[0,1,-1,1,0,-1,0][(offset+35)%7];
  const stamp=new Date(time+9*3600000).toISOString(),key=stamp.slice(0,10);
  const meta={device:'Simulated crew monitor',method:'Simulated Dinamap XL brachial-cuff protocol',repeat:'yes',signal:'stable',glucoseTiming:'fasting',temperatureSite:'oral',hrvMethod:'RMSSD',missionPhase:offset<0?'preflight':offset<7?'early-mission':'inflight',posture:offset<0?'seated':'inflight'};
  records.push({id:'demo-rest-'+key,timestamp:stamp,measured_at:stamp,created_at:createdAt,source:'simulated',source_tag:'simulated',simulated:true,simulated_source:['device','manual','crew'][(offset+35)%3],simulatedSourceKind:['device','manual','crew'][(offset+35)%3],context:'resting',meta,values:{heart:65+noise+drift*4,oxygen:Math.round(98-drift*.7),sys:114+noise+drift*3,dia:72+noise+drift,temp:Math.round((36.6+noise*.1)*10)/10,glucose:91+noise,hrv:52+noise-drift*3,mood:Math.max(1,4-Math.floor(drift/3)),energy:Math.max(1,4-Math.floor(drift/3))},notes:'SIMULATED crew data for software demonstration. Not a NASA participant observation.',symptoms:drift>=6?'Simulated fatigue report; no diagnosis.':'',source_reference:'CosmoVital deterministic simulated crew scenario v1'});
  const sleepAt=new Date(time+8*3600000).toISOString();
  records.push({id:'demo-sleep-'+key,timestamp:sleepAt,measured_at:sleepAt,created_at:createdAt,source:'simulated',source_tag:'simulated',simulated:true,simulated_source:'device',simulatedSourceKind:'device',context:'sleep',meta:{...meta,device:'Simulated actigraphy watch',method:'actigraphy'},values:{sleep:Math.round((7.9+noise*.1-drift*.35)*10)/10},notes:'SIMULATED sleep duration; sleep quality is not measured.',symptoms:'',source_reference:'CosmoVital deterministic simulated crew scenario v1'});
  if(offset>=0&&offset%7===0){const exerciseAt=new Date(time+15*3600000).toISOString();records.push({id:'demo-exercise-'+key,timestamp:exerciseAt,measured_at:exerciseAt,created_at:createdAt,source:'simulated',source_tag:'simulated',simulated:true,simulated_source:'device',simulatedSourceKind:'device',context:'exercise',meta:{...meta,method:'Simulated exercise monitor'},values:{heart:115+noise},notes:'SIMULATED exercise reading. Excluded from resting baselines.',symptoms:'',source_reference:'CosmoVital deterministic simulated crew scenario v1'})}
 }
 records.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 return {schemaVersion:1,simulation:true,active:true,createdAt,mission:{name:'Deep Space Crew Simulation',start:new Date(start).toISOString(),fictional:true},records,followUps:[]};
}

export function validateDemoCrew(raw){
 if(!plain(raw)||raw.schemaVersion!==1||raw.simulation!==true||typeof raw.active!=='boolean'||!validTime(raw.createdAt)||!plain(raw.mission)||!validTime(raw.mission.start)||raw.mission.fictional!==true||typeof raw.mission.name!=='string'||raw.mission.name.length>120)throw new Error('Invalid simulated crew workspace.');
 if(!Array.isArray(raw.records)||raw.records.length>5000||!Array.isArray(raw.followUps)||raw.followUps.length>500)throw new Error('Invalid simulated crew records.');
 const ids=new Set();
 for(const record of raw.records){
  if(!plain(record)||typeof record.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(record.id)||ids.has(record.id)||record.simulated!==true||record.source_tag!=='simulated'||record.source!=='simulated'||!validTime(record.timestamp)||record.timestamp!==record.measured_at||!contexts.includes(record.context)||!plain(record.values)||!plain(record.meta)||!['manual','device','crew'].includes(record.simulated_source))throw new Error('Invalid or mixed real/simulated crew observation.');
  ids.add(record.id);
  if(!Object.keys(record.values).length)throw new Error('A simulated observation needs a value.');
  for(const [key,value]of Object.entries(record.values)){const metric=METRICS[key];if(!metric||typeof value!=='number'||!Number.isFinite(value)||value<metric.min||value>metric.max||metric.step===1&&!Number.isInteger(value))throw new Error('Invalid simulated measurement: '+key)}
  if((record.values.sys===undefined)!==(record.values.dia===undefined)||record.values.sys!==undefined&&record.values.sys<=record.values.dia)throw new Error('Invalid simulated blood pressure.');
  if(typeof record.notes!=='string'||record.notes.length>2000||typeof record.symptoms!=='string'||record.symptoms.length>2000)throw new Error('Invalid simulated observation notes.');
 }
 for(const item of raw.followUps){
  if(!plain(item)||item.simulated!==true||!ids.has(item.recordId)||!validTime(item.answeredAt)||!plain(item.answers)||Object.keys(item.answers).some(key=>!['warningSigns','rechecked','persistent','notes'].includes(key))||Object.entries(item.answers).some(([key,value])=>key==='notes'?typeof value!=='string'||value.length>2000:!['yes','no','unknown'].includes(value)))throw new Error('Invalid simulated follow-up.');
 }
 return copy(raw);
}

export function addDemoObservation(raw,values,{now=Date.now()}={}){
 const demo=validateDemoCrew(raw),at=new Date(values.timestamp||now);
 if(!Number.isFinite(+at)||+at>+new Date(now)+300000)throw new Error('Choose an actual simulated scenario timestamp, not a future reading.');
 const selected={};for(const [key,value]of Object.entries(values.values||{})){if(value!==null&&value!==undefined&&!(typeof value==='string'&&!value.trim())){if(!['number','string'].includes(typeof value))throw new Error('A simulated value must be numeric.');selected[key]=typeof value==='number'?value:Number(value)}}
 const previous=[...demo.records].reverse().find(record=>record.context===(values.context||'resting'))||demo.records.at(-1);
 const id='demo-entered-'+(+at).toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const timestamp=at.toISOString();
 demo.records.push({...copy(previous),id,timestamp,measured_at:timestamp,created_at:new Date(now).toISOString(),values:selected,context:values.context||'resting',simulated_source:values.simulated_source||'manual',simulatedSourceKind:values.simulated_source||'manual',notes:'SIMULATED user-entered demonstration observation. '+String(values.notes||'').slice(0,1000),symptoms:'',meta:{...previous.meta,missionPhase:+at<Date.parse(demo.mission.start)?'preflight':'inflight'}});
 demo.records.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 return validateDemoCrew(demo);
}

export function readDemoCrew(storage=globalThis.localStorage){const raw=storage?.getItem(DEMO_STORAGE_KEY);if(raw==null)return null;return validateDemoCrew(JSON.parse(raw))}
export function saveDemoCrew(value,storage=globalThis.localStorage){const checked=validateDemoCrew(value);if(!storage)throw new Error('Local storage unavailable; export a report before closing.');storage.setItem(DEMO_STORAGE_KEY,JSON.stringify(checked));return checked}
export function clearDemoCrew(storage=globalThis.localStorage){if(!storage)throw new Error('Local storage unavailable.');storage.removeItem(DEMO_STORAGE_KEY)}
