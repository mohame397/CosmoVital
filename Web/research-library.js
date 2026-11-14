import referenceLibrary from './data/reference-library.js';
import {METRICS} from './core.js';

export {referenceLibrary};
export const REFERENCE_VERSION=referenceLibrary.referenceVersion;
const DAY=86400000;
const copy=value=>structuredClone(value);
const phaseCategory=value=>['early-mission','inflight','flight'].includes(value)?'inflight':value;
const trueFlag=value=>value===true||typeof value==='string'&&['true','yes','1'].includes(value.trim().toLowerCase());
const simulated=record=>[record?.simulated,record?.training,record?.synthetic].some(trueFlag)||/simulat|synthetic|demo|training/i.test([record?.source,record?.source_tag,record?.source_type,record?.mode].join(' '));

function selectedPhase(record,entry,options){
 if(options.phase&&!entry.timepoints.some(point=>point.id===options.phase)&&!['preflight','early-mission','inflight','postflight','flight'].includes(options.phase))return {reason:'The requested research phase is unsupported.'};
 const measured=Date.parse(record.measured_at||record.timestamp),start=Date.parse(options.missionStart||'');
 const relativeDay=Number.isFinite(start)?Math.floor((measured-start)/DAY):null;
 const missionDay=relativeDay!==null&&relativeDay>=0?relativeDay+1:null;
 const explicit=options.phase&&entry.timepoints.find(point=>point.id===options.phase);
 const recordCategory=phaseCategory(record.meta?.missionPhase||'unknown');
 const requestedCategory=phaseCategory(options.phase);
 if(['preflight','inflight','postflight'].includes(requestedCategory)&&recordCategory!=='unknown'&&requestedCategory!==recordCategory)return {reason:'The recorded mission phase conflicts with the requested comparison phase.'};
 if(Number.isFinite(start)&&recordCategory==='preflight'&&relativeDay>=0)return {reason:'The recorded preflight phase conflicts with the actual mission time.'};
 if(Number.isFinite(start)&&recordCategory==='inflight'&&relativeDay<0)return {reason:'The recorded in-flight phase conflicts with the actual mission time.'};
 if(explicit){
  if(recordCategory!=='unknown'&&recordCategory!==explicit.phase)return {reason:'The recorded mission phase conflicts with the selected research phase.'};
  if(Number.isFinite(start)){
   if(explicit.phase==='preflight'&&relativeDay>=0)return {reason:'An in-flight measurement cannot be assigned a preflight research reference.'};
   if(explicit.phase==='inflight'&&relativeDay<0)return {reason:'A preflight measurement cannot be assigned an in-flight research reference.'};
   if(explicit.actualFlightDayWindow&&(!missionDay||missionDay<explicit.actualFlightDayWindow[0]||missionDay>explicit.actualFlightDayWindow[1]))return {reason:'The actual mission day falls outside the published acquisition window.'};
   if(explicit.nominalDayRelativeToLaunch!==undefined&&relativeDay!==explicit.nominalDayRelativeToLaunch)return {reason:'The actual preflight day does not match the published nominal timepoint; no unreported window is assumed.'};
   if(explicit.relativeDayWindow&&(relativeDay<explicit.relativeDayWindow[0]||relativeDay>explicit.relativeDayWindow[1]))return {reason:'The actual preflight day is outside the published acquisition period.'};
  }
  return {point:explicit,missionDay,relativeDay,resolution:'explicit-research-phase'};
 }
 const category=phaseCategory(options.phase||recordCategory);
 if(entry.indicator==='sleep'){
  if(category==='postflight')return {reason:'Postflight sleep comparison requires the original first-week post-landing phase to be selected explicitly; launch time does not establish landing time.'};
  if((category==='inflight'||missionDay!==null)&&relativeDay!==null&&relativeDay>=0)return {point:entry.timepoints.find(point=>point.id==='inflight'),missionDay,relativeDay,resolution:'mission-time-and-recorded-phase'};
  if(category==='inflight')return {point:entry.timepoints.find(point=>point.id==='inflight'),missionDay,relativeDay,resolution:'recorded-mission-phase'};
  if(relativeDay!==null&&relativeDay>=-11&&relativeDay<=-1)return {point:entry.timepoints.find(point=>point.id==='L-11'),missionDay,relativeDay,resolution:'mission-time'};
  return {reason:'No compatible sleep research phase was established. Select an original study timepoint explicitly when appropriate.'};
 }
 if(relativeDay!==null){
  const byDay=entry.timepoints.find(point=>point.phase==='preflight'&&point.nominalDayRelativeToLaunch===relativeDay)||entry.timepoints.find(point=>point.actualFlightDayWindow&&missionDay>=point.actualFlightDayWindow[0]&&missionDay<=point.actualFlightDayWindow[1]);
  if(byDay&&recordCategory!=='unknown'&&recordCategory!==byDay.phase)return {reason:'The recorded mission phase conflicts with the measurement time.'};
  if(byDay)return {point:byDay,missionDay,relativeDay,resolution:'actual-mission-time'};
 }
 return {reason:'No compatible published mission-day window was established. Early adaptation is not automatically flight day15.'};
}

function summaryFor(entry,point,posture){
 const row=entry.summaries.find(row=>row.timepoint===point?.id&&(entry.indicator==='sleep'||row.posture===posture));
 if(!row)return null;
 return copy({...row,metric:entry.indicator,unit:entry.measurementUnits,statistic:entry.statisticalMethod,cohortSize:entry.sampleSize,perSummarySampleSize:entry.perSummarySampleSize,datasetIdentifier:entry.datasetIdentifier,sourceUrl:entry.publication.sourceUrl,referenceVersion:entry.referenceVersion,timepointMetadata:point,clinicalSafetyLimit:false});
}

export function matchResearchReference(record,metric,options={}){
 const entry=referenceLibrary.entries.find(entry=>entry.indicator===metric);
 const base={status:'unavailable',label:referenceLibrary.label,referenceVersion:REFERENCE_VERSION,metric,distribution:null,clinicalAssessment:false,clinicalSafetyLimit:false,compatible:false};
 const unavailable=(reason,extra={})=>({...base,message:entry?'Research Reference Unavailable':'NASA Spaceflight Reference: Insufficient Published Data',reason,...extra});
 if(!entry)return unavailable(referenceLibrary.unavailableIndicators.find(item=>item.indicator===metric)?.reason||'No validated numerical human-spaceflight reference was included for this indicator.');
 if(!options||typeof options!=='object'||Array.isArray(options))return unavailable('Research comparison options must be an object.');
 const source=copy({datasetIdentifier:entry.datasetIdentifier,studyTitle:entry.studyTitle,publication:entry.publication,population:entry.population,sampleSize:entry.sampleSize,perSummarySampleSize:entry.perSummarySampleSize,measurementContext:entry.measurementContext,acquisitionMethod:entry.acquisitionMethod,statisticalMethod:entry.statisticalMethod,processingMethod:entry.processingMethod,limitations:entry.limitations,referenceVersion:entry.referenceVersion});
 const metadata={source,sourceUrl:entry.publication.sourceUrl,method:entry.acquisitionMethod,limitations:copy(entry.limitations)};
 if(!record||typeof record!=='object'||!METRICS[metric]||typeof record.values?.[metric]!=='number'||!Number.isFinite(record.values[metric])||record.values[metric]<METRICS[metric].min||record.values[metric]>METRICS[metric].max)return unavailable('An actual valid measurement for this indicator is required.',metadata);
 if(!Number.isFinite(Date.parse(record.measured_at||record.timestamp)))return unavailable('The actual measurement timestamp is missing or invalid.',metadata);
 if(options.demo===true?!simulated(record):simulated(record))return unavailable('Real and simulated observations use separate comparison workspaces.',metadata);
 const selection=selectedPhase(record,entry,options);
 const posture=options.posture||record.meta?.posture||'unknown';
 const summary=summaryFor(entry,selection.point,posture);
 const availableGroupSummary=summary||summaryFor(entry,entry.timepoints.find(point=>point.id===(entry.indicator==='sleep'?'inflight':'FD15')),entry.indicator==='sleep'?'not-applicable':'inflight');
 const details={...metadata,summary:null,availableGroupSummary,phase:selection.point?copy(selection.point):null,missionDay:selection.missionDay??null,posture,observedValue:record.values[metric],unit:entry.measurementUnits};
 if(selection.reason)return unavailable(selection.reason,details);
 if(record.context!==entry.measurementContext)return unavailable(`Measurement context must be ${entry.measurementContext}; different physiological states are not combined.`,details);
 if(entry.indicator!=='sleep'&&posture==='unknown')return unavailable('Record the actual measurement posture before matching this research protocol.',details);
 if(!summary)return unavailable('No published summary exists for this phase and posture combination.',details);
 if(options.contextConfirmed!==true)return unavailable('Review and explicitly confirm the measurement context before research comparison.',details);
 if(record.meta?.signal==='unstable')return unavailable('An unstable signal was recorded. Review the measurement before research comparison.',details);
 if(!entry.acquisitionMethod.verified)return unavailable('The original heart-rate acquisition sensor was not independently verified, so method compatibility is unavailable. Published statistics remain viewable as context.',details);
 const method=[record.meta?.method,record.meta?.device].filter(value=>typeof value==='string').join(' ').toLowerCase();
 const methodMatches=entry.indicator==='sleep'?/actigraph/.test(method):/dinamap/.test(method);
 if(!methodMatches)return unavailable(`Recorded acquisition method does not establish compatibility with ${entry.acquisitionMethod.id}.`,details);
 return {...base,...details,status:'summary-only',message:'Compatible published group summary; no observed research distribution available.',reason:'Only mean and standard deviation were published/transcribed. No participant-level percentile range is available; within/outside-distribution classification is unsupported.',summary,availableGroupSummary:summary,compatible:true,compatibility:{context:true,phase:true,posture:entry.indicator==='sleep'?'not-applicable':true,acquisitionMethod:'recorded-protocol-compatible',population:'individual-comparability-not-established',quality:record.meta?.signal||'unknown'},differenceFromMean:record.values[metric]-summary.mean,phaseResolution:selection.resolution};
}
