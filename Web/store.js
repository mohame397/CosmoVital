import {getRecords as readLocalRecords, saveRecords as writeLocalRecords, validateRecord, mergeRecords, STORAGE_KEY} from './core.js';
import {getMissionState as readLocalMission, saveMissionState as writeLocalMission, validateMissionState, MISSION_STORAGE_KEY} from './mission.js';
import {reconcileAlerts, validateAlerts, acknowledgeAlert, resolveAlert} from './alert-manager.js';

const ALERT_KEY = 'cosmovital-alert-history-v3';
const emptyMission = () => ({schemaVersion:1,cases:[],consultations:[]});
const clone = value => structuredClone(value);

export function createHealthStore() {
  let state={configured:false,status:'local',user:null,profile:null,records:[],missionState:emptyMission(),alerts:[],revision:0,saving:false,lastSync:null,error:''};
  let initialized=false,initialization=null;
  const listeners=new Set();
  const getSnapshot=()=>clone(state);
  const emit=()=>{for(const fn of listeners)fn(getSnapshot())};
  function storage(){
    try{if(globalThis.localStorage)return globalThis.localStorage}catch{}
    throw new Error('Browser storage is unavailable. Keep an exported backup before closing or moving this file.');
  }
  function canonicalRecords(values){
    if(!Array.isArray(values)||values.length>10000)throw new Error('Choose at most 10,000 observations.');
    return values.map(raw=>({...validateRecord(raw),user_id:null}));
  }
  function checkedMission(value,records){
    const next=validateMissionState(value),ids=new Set(records.map(r=>r.id));
    if(ids.size!==records.length)throw new Error('Observation identifiers must be unique.');
    if(next.cases.some(c=>c.recordIds.some(id=>!ids.has(id))))throw new Error('A case has a missing linked observation.');
    return next;
  }
  function usable(){
    if(!initialized)throw new Error(state.error||'Load the saved local workspace before making changes.');
    if(state.error)throw new Error(state.error);
    if(state.saving)throw new Error('A save is already in progress. Wait for confirmation before saving again.');
  }
  async function initialize(){
    if(initialized)return getSnapshot();
    if(initialization)return initialization;
    initialization=(async()=>{
      try{
        const local=storage(),records=canonicalRecords(readLocalRecords()),missionState=checkedMission(readLocalMission(),records);
        const raw=local.getItem(ALERT_KEY),alerts=raw===null?[]:validateAlerts(JSON.parse(raw));
        state={...state,records,missionState,alerts:reconcileAlerts(alerts,records),status:'local',saving:false,error:''};
        initialized=true;emit();return getSnapshot();
      }catch(error){state={...state,status:'error',saving:false,error:error.message};initialized=false;emit();throw error}
    })();
    try{return await initialization}finally{initialization=null}
  }
  async function save(next){
    usable();
    const existingIds=new Set(state.records.map(record=>record.id));
    const records=canonicalRecords(next.records??state.records).map(record=>!existingIds.has(record.id)&&!record.created_at?{...record,created_at:new Date().toISOString()}:record);
    const missionState=checkedMission(next.missionState??state.missionState,records);
    const alerts=validateAlerts(next.alerts??reconcileAlerts(state.alerts,records));
    const local=storage(),keys=[STORAGE_KEY,MISSION_STORAGE_KEY,ALERT_KEY],previous=keys.map(key=>local.getItem(key));
    state.saving=true;emit();
    try{
      let saved;
      try{
        saved=writeLocalRecords(records);
        writeLocalMission(missionState,{replaceCorrupt:next.replaceCorrupt===true});
        local.setItem(ALERT_KEY,JSON.stringify(alerts));
      }catch(error){
        try{keys.forEach((key,i)=>previous[i]===null?local.removeItem(key):local.setItem(key,previous[i]))}
        catch{state={...state,status:'error',saving:false,error:'Save failed and rollback could not complete. Recover an exported backup before further changes.'};initialized=false;emit();throw new Error(state.error)}
        throw error;
      }
      state={...state,records:saved,missionState,alerts,status:'local',saving:false,error:''};emit();return getSnapshot();
    }catch(error){state.saving=false;emit();throw error}
  }
  async function saveRecords(records){return (await save({records})).records}
  async function saveMissionState(missionState){return (await save({missionState,alerts:state.alerts})).missionState}
  async function restoreWorkspace({records,missionState,alerts}){
    const canonical=canonicalRecords(records),mission=checkedMission(missionState,canonical),history=validateAlerts(alerts??reconcileAlerts([],canonical));
    const previous=clone(state),wasInitialized=initialized;
    initialized=true;state={...state,status:'local',error:''};
    try{return await save({records:canonical,missionState:mission,alerts:history,replaceCorrupt:true})}
    catch(error){
      if(state.error!=='Save failed and rollback could not complete. Recover an exported backup before further changes.'){
        state=previous;initialized=wasInitialized;emit();
      }
      throw error;
    }
  }
  async function reloadLocal(){
    if(state.saving)throw new Error('Wait for the current save before reloading local records.');
    initialized=false;return initialize();
  }
  function clearPrivate(){
    if(state.saving)throw new Error('Wait for the current save before clearing the local view.');
    initialized=false;
    state={...state,status:'local',records:[],missionState:emptyMission(),alerts:[],saving:false,error:''};emit();
  }
  return {initialize,refresh:reloadLocal,reloadLocal,getSnapshot,clearPrivate,saveRecords,saveMissionState,restoreWorkspace,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
    getRecords:()=>clone(state.records),getMissionState:()=>clone(state.missionState),getAlerts:()=>clone(state.alerts),
    merge(incoming){return mergeRecords(state.records,canonicalRecords(incoming))},
    async acknowledge(id){return save({alerts:acknowledgeAlert(state.alerts,id)})},
    async resolve(id,reason){return save({alerts:resolveAlert(state.alerts,id,{reason})})}
  };
}
export const healthStore=createHealthStore();
