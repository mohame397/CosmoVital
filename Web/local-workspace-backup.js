import {normalizeMissionConfig} from './mission-status.js';
export const WORKSPACE_STORAGE_KEYS=Object.freeze(['cosmovital-records-v1','cosmovital-mission-v2','cosmovital-alert-history-v3','cosmovital-settings-v1','cosmovital-dual-baseline-v1','cosmovital-demo-crew-v1']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validateWorkspaceSettings(raw){
 if(!object(raw))throw new Error('Backup settings must be an object.');
 const allowed=['name','environment','start','timeZone','temperatureUnit','glucoseUnit','missionName','missionSimulation','rollingDays','earlyMissionDays','baselineType','baselineContext','communicationDelayMinutes','theme'];
 if(Object.keys(raw).some(key=>!allowed.includes(key)))throw new Error('Backup settings contain unsupported fields.');
 if(raw.missionSimulation!==undefined&&typeof raw.missionSimulation!=='boolean')throw new Error('Backup simulation label must be a boolean.');
 for(const key of ['rollingDays','earlyMissionDays','communicationDelayMinutes'])if(raw[key]!==undefined&&(typeof raw[key]!=='number'||!Number.isInteger(raw[key])))throw new Error('Backup analysis settings must be numeric whole numbers.');
 const value={...normalizeMissionConfig(raw)};
 if(typeof value.name!=='string'||!value.name.trim()||value.name.length>40)throw new Error('Backup display name is invalid.');
 if(!['station','spacecraft','lunar','mars'].includes(value.environment))throw new Error('Backup mission environment is invalid.');
 if(typeof value.timeZone!=='string')throw new Error('Backup time zone is required.');
 try{new Intl.DateTimeFormat('en',{timeZone:value.timeZone})}catch{throw new Error('Backup time zone is invalid.')}
 if(!['°C','°F'].includes(value.temperatureUnit)||!['mg/dL','mmol/L'].includes(value.glucoseUnit))throw new Error('Backup measurement units are invalid.');
 if(value.theme!==undefined&&!['dark','light'].includes(value.theme))throw new Error('Backup color theme is invalid.');
 return {...value,name:value.name.trim(),theme:value.theme||'dark'};
}
export function completeWorkspaceBackup(state,settings,extensions){
 return {app:'CosmoVital',schemaVersion:4,exportedAt:new Date().toISOString(),records:structuredClone(state.records),missionState:structuredClone(state.missionState),alerts:structuredClone(state.alerts),settings:validateWorkspaceSettings(settings),localExtensions:structuredClone(extensions)};
}
export async function restoreCompleteWorkspace(payload,{store,storage,settings,validateExtensions,restoreExtensions,reloadExtensions}){
 if(!object(payload))throw new Error('Choose a complete workspace backup.');
 const nextSettings=payload.settings===undefined?settings:validateWorkspaceSettings(payload.settings);
 if(payload.localExtensions!==undefined)await validateExtensions(payload.localExtensions);
 const before=WORKSPACE_STORAGE_KEYS.map(key=>[key,storage.getItem(key)]);
 try{
  const result=await store.restoreWorkspace(payload);
  if(payload.settings!==undefined)storage.setItem('cosmovital-settings-v1',JSON.stringify(nextSettings));
  if(payload.localExtensions!==undefined)await restoreExtensions(payload.localExtensions);
  reloadExtensions?.();
  return {state:result,settings:nextSettings};
 }catch(error){
  try{for(const [key,value] of before)value===null?storage.removeItem(key):storage.setItem(key,value);await store.reloadLocal();reloadExtensions?.()}
  catch{throw new Error('Workspace restoration failed and rollback could not complete. Keep your exported backup and avoid further changes.')}
  throw error;
 }
}
