const DAY=86400000;
export function missionStartUTC(value){
 if(!value)return null;
 if(typeof value!=='string')throw new Error('Mission start must be an ISO date.');
 const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T00:00:00.000Z':value;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(date))throw new Error('Mission start requires an explicit time zone.');
 const [year,month,day]=value.slice(0,10).split('-').map(Number);
 if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())throw new Error('Mission start date does not exist.');
 const time=Date.parse(date);if(!Number.isFinite(time))throw new Error('Mission start is invalid.');
 return new Date(time).toISOString();
}
export function normalizeMissionConfig(input={}){
 const config={missionName:'Deep Space Simulation',start:'',missionSimulation:true,rollingDays:14,earlyMissionDays:7,baselineType:'preflight',baselineContext:'resting',communicationDelayMinutes:12,...input};
 config.missionName=String(config.missionName||'').trim().slice(0,80)||'Deep Space Simulation';
 if(config.start)missionStartUTC(config.start);
 for(const [key,min,max] of [['rollingDays',7,14],['earlyMissionDays',3,14],['communicationDelayMinutes',0,120]]){
  const value=Number(config[key]);if(!Number.isFinite(value)||!Number.isInteger(value)||value<min||value>max)throw new Error(`${key} must be a whole number from ${min} to ${max}.`);config[key]=value;
 }
 if(!['preflight','early-mission','rolling'].includes(config.baselineType))throw new Error('Choose an available baseline period.');
 if(!['resting','exercise','post-exercise','post-eva','sleep'].includes(config.baselineContext))throw new Error('Choose a known baseline context.');
 config.missionSimulation=config.missionSimulation!==false;
 return config;
}
export function buildMissionStatus(settings={},now=new Date().toISOString()){
 const config=normalizeMissionConfig(settings),current=Date.parse(now);
 if(!Number.isFinite(current))throw new Error('Current time is invalid.');
 const start=missionStartUTC(config.start),elapsed=start?current-Date.parse(start):null;
 return {missionName:config.missionName,missionStart:start,utc:new Date(current).toISOString(),simulatedMission:config.missionSimulation,
  state:elapsed===null?'unconfigured':elapsed<0?'preflight':'in-flight',missionDay:elapsed===null||elapsed<0?null:Math.floor(elapsed/DAY)+1,
  elapsedMilliseconds:elapsed===null||elapsed<0?null:elapsed,elapsedDays:elapsed===null||elapsed<0?null:Math.floor(elapsed/DAY),
  elapsedHours:elapsed===null||elapsed<0?null:Math.floor(elapsed%DAY/3600000),elapsedMinutes:elapsed===null||elapsed<0?null:Math.floor(elapsed%3600000/60000),
  untilStartMilliseconds:elapsed!==null&&elapsed<0?-elapsed:null,
  communication:{simulation:true,oneWayMinutes:config.communicationDelayMinutes,transmitted:false,localAlertsDelayed:false}};
}
