import {METRICS,assessRecord,validateRecord} from './core.js';
import {summarizeBaseline,comparePersonal} from './personal-baselines.js';
import {matchResearchReference} from './research-library.js';

export const TREND_VERSION='cosmovital-longitudinal-1.0.0';
export const TREND_RULES=Object.freeze({minimumMeasurements:3,minimumUtcDays:3,recentDays:3,minimumRepeatedDays:3,method:'Application review heuristics, not clinically validated trend criteria.'});
const DAY=86400000;
const periods=Object.freeze({'24h':DAY,'7d':7*DAY,'14d':14*DAY,'30d':30*DAY});
const ordinal=new Set(['mood','energy']);
const clone=value=>structuredClone(value);
const number=value=>typeof value==='number'&&Number.isFinite(value);
const truth=value=>value===true||typeof value==='string'&&['true','yes','1'].includes(value.toLowerCase().trim());
const isSimulated=record=>['simulated','synthetic','training'].some(key=>truth(record?.[key]))||[record?.source,record?.source_tag,record?.source_type,record?.mode].some(value=>typeof value==='string'&&/simulat|synthetic|\bdemo\b|training/i.test(value));
const isResearch=record=>[record?.source,record?.source_type,record?.mode].some(value=>typeof value==='string'&&/research|space.weather/i.test(value));
const iso=time=>new Date(time).toISOString();
const dayOf=record=>iso(Date.parse(record.measured_at||record.timestamp)).slice(0,10);
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2};
const hash=text=>{let value=2166136261;for(const letter of text){value^=letter.charCodeAt(0);value=Math.imul(value,16777619)}return (value>>>0).toString(36)};
const known=value=>typeof value==='string'&&value.trim()&&value!=='unknown'?value.trim().toLowerCase():'';

function contextFields(record,metric){
 const fields=['device','method','posture'];
 if(metric==='temp')fields.push('temperatureSite');
 if(metric==='glucose')fields.push('glucoseTiming');
 if(metric==='hrv')fields.push('hrvMethod');
 return Object.fromEntries(fields.map(key=>[key,known(record.meta?.[key])]));
}
function signature(record,metric){return JSON.stringify([record.context,contextFields(record,metric)])}
function sameMethod(a,b,metric){return signature(a,metric)===signature(b,metric)}
function canonical(raw,demo){
 if(!raw||typeof raw!=='object'||!raw.values||!/^[-a-zA-Z0-9_]{1,100}$/.test(raw.id||''))return null;
 if(isResearch(raw)||isSimulated(raw)!==Boolean(demo))return null;
 try{
  const value=validateRecord(demo?{...raw,simulated:false,synthetic:false,training:false,mode:'personal',source_type:undefined,source:'manual',source_tag:['manual','device','crew'].includes(raw.simulatedSourceKind)?raw.simulatedSourceKind:'manual'}:raw);
  return demo?{...value,simulated:true,source_tag:'simulated',simulatedSourceKind:raw.simulatedSourceKind||'manual'}:value;
 }catch{return null}
}
function recordsFor(input,demo){
 const byId=new Map(),conflicts=new Set();
 for(const raw of Array.isArray(input)?input:[]){
  const record=canonical(raw,demo);if(!record)continue;
  if(byId.has(record.id)&&JSON.stringify(byId.get(record.id))!==JSON.stringify(record)){conflicts.add(record.id);continue}
  byId.set(record.id,record);
 }
 return [...byId.values()].filter(record=>!conflicts.has(record.id)).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)||a.id.localeCompare(b.id));
}
function relevantPrompts(record,metric){return assessRecord(record).filter(prompt=>metric==null||prompt.metric===metric||['sys','dia'].includes(metric)&&prompt.metric==='bp')}
function safetyLayer(record,metric){
 const prompts=relevantPrompts(record,metric),medical=prompts.filter(prompt=>!['mood','sleep'].includes(prompt.metric));
 return {status:medical.some(prompt=>prompt.severity==='urgent')?'review-required':medical.length?'reference-review':prompts.length?'information-only':'no-matching-prompt',prompts,immediateThresholdViolation:medical.some(prompt=>prompt.severity==='urgent'),noPromptDoesNotEstablishSafety:true,clinicallyValidatedAstronautThresholds:false,referenceScope:'Broad adult terrestrial references; symptoms and mission procedures take priority.'};
}
function resultCode(layers){
 if(layers.safety.status==='review-required')return 'medical-safety-review-required';
 if(layers.safety.status==='reference-review')return 'medical-reference-review-recommended';
 if(layers.personal.comparison?.available&&layers.personal.comparison.unusual)return 'personal-trend-review-recommended';
 if(layers.research.status==='comparable-distribution'&&layers.research.position==='outside')return 'research-reference-difference-review-context';
 if(layers.personal.baseline?.status==='established')return layers.research.status==='comparable-distribution'?'dual-baseline-monitoring-active':'personal-baseline-monitoring-active';
 return 'insufficient-personal-data';
}
function researchLayer(record,metric,options){
 const matcher=options.researchMatcher||matchResearchReference;
 const research=clone(matcher(record,metric,options)||{status:'unavailable',reason:'Research Reference Unavailable'});
 if(research.status==='comparable-distribution'){
  const distribution=research.distribution;
  if(!distribution||!number(distribution.low)||!number(distribution.high)||distribution.low>distribution.high){research.status='unavailable';research.reason='A validated numerical research distribution is unavailable.';research.distribution=null}
  else research.position=record.values[metric]<distribution.low||record.values[metric]>distribution.high?'outside':'within';
 }
 research.clinicalAssessment=false;
 return research;
}
function evaluateMetric(record,history,metric,options){
 const compatible=history.filter(candidate=>sameMethod(candidate,record,metric));
 const baseline=summarizeBaseline(compatible,{...options,metric,context:record.context,type:options.baselineType||options.type||'preflight',asOf:record.timestamp,currentRecordId:record.id});
 const comparison=comparePersonal(record.values[metric],baseline);
 const layers={safety:safetyLayer(record,metric),research:researchLayer(record,metric,options),personal:{status:baseline.status,baseline,comparison}};
 return {metric,value:record.values[metric],unit:METRICS[metric].unit,context:record.context,layers,resultCode:resultCode(layers),clinicalAssessment:false};
}

export function evaluateMeasurement(raw,history=[],options={}){
 const record=canonical(raw,options.demo),invalid={status:'not-evaluated',reason:'Invalid, incompatible or nonpersonal measurement.',prompts:[],noPromptDoesNotEstablishSafety:true};
 if(!record)return {recordId:raw?.id||null,metrics:{},layers:{safety:invalid,research:{status:'unavailable',reason:'Invalid measurement'},personal:{status:'insufficient'}},resultCode:'invalid-measurement',clinicalAssessment:false};
 const records=recordsFor(history,options.demo),keys=options.metric?[options.metric]:Object.keys(record.values),metrics={};
 for(const metric of keys)if(METRICS[metric]&&number(record.values[metric]))metrics[metric]=evaluateMetric(record,records,metric,options);
 const priority=['medical-safety-review-required','medical-reference-review-recommended','personal-trend-review-recommended','research-reference-difference-review-context','dual-baseline-monitoring-active','personal-baseline-monitoring-active','insufficient-personal-data'];
 const primary=Object.values(metrics).sort((a,b)=>priority.indexOf(a.resultCode)-priority.indexOf(b.resultCode))[0];
 const globalSafety={...safetyLayer(record),scope:'whole-observation'};
 const headline=globalSafety.status==='review-required'?'medical-safety-review-required':globalSafety.status==='reference-review'?'medical-reference-review-recommended':primary?.resultCode||'invalid-measurement';
 return {recordId:record.id,measuredAt:record.timestamp,simulated:Boolean(options.demo),metrics,layers:primary?{...primary.layers,safety:globalSafety}:{safety:globalSafety,research:{status:'unavailable'},personal:{status:'insufficient'}},resultCode:headline,clinicalAssessment:false};
}

function dailyPoints(records,metric){
 const seen=new Set(),days=new Map();
 for(const record of records){
  const identity=JSON.stringify([record.timestamp,record.values[metric],signature(record,metric)]);
  if(seen.has(identity))continue;seen.add(identity);
  const day=dayOf(record);if(!days.has(day))days.set(day,[]);days.get(day).push(record);
 }
 return [...days].sort(([a],[b])=>a.localeCompare(b)).map(([day,values])=>{
  const sorted=values.map(record=>record.values[metric]).sort((a,b)=>a-b);
  return {day,value:ordinal.has(metric)?sorted[Math.ceil(sorted.length*.5)-1]:median(sorted),records:values,
   ...(ordinal.has(metric)?{ordinalMedianInterval:[sorted[Math.floor((sorted.length-1)/2)],sorted[Math.ceil((sorted.length-1)/2)]],categoryCounts:Object.fromEntries([1,2,3,4,5].map(category=>[category,sorted.filter(value=>value===category).length]))}:{})};
 });
}
function directionFor(values){
 if(values.length<3)return 'undetermined';
 if(values.every((value,i)=>!i||value>values[i-1]))return 'increasing';
 if(values.every((value,i)=>!i||value<values[i-1]))return 'decreasing';
 return values.every(value=>value===values[0])?'unchanged':'mixed';
}
function followUp(category){return category==='insufficient'?{en:'Record more measurements with consistent source, method and context. Missing data is not evidence of health.',ar:'سجّل قياسات أكثر بمصدر وطريقة وظروف متسقة. نقص البيانات ليس دليلًا على الصحة.'}:{en:'Review the original readings, measurement conditions and symptoms. Use the existing follow-up questions and request qualified medical review where indicated; this trend is not a diagnosis.',ar:'راجع القراءات الأصلية وظروف القياس والأعراض. استخدم أسئلة المتابعة واطلب مراجعة طبية متخصصة عند الحاجة؛ الاتجاه ليس تشخيصًا.'}}

export function detectHealthTrends(input,options={}){
 const period=options.period||'7d';if(!periods[period])throw new Error('Choose 24h, 7d, 14d or 30d for trend analysis.');
 const asOf=options.asOf||new Date().toISOString();
 const end=typeof asOf==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(asOf)?Date.parse(asOf):NaN;
 if(!Number.isFinite(end))throw new Error('Trend analysis needs a valid ISO asOf timestamp with a time zone.');
 const start=end-periods[period],all=recordsFor(input,options.demo).filter(record=>Date.parse(record.timestamp)<=end),groups=new Map();
 const mission=Date.parse(options.missionStart||''),earlyDays=options.earlyMissionDays??7;
 const calibrationEnd=(options.baselineType||options.type)==='early-mission'&&Number.isFinite(mission)?mission+earlyDays*DAY:null;
 for(const record of all){
  if(Date.parse(record.timestamp)<=start||record.meta?.signal==='unstable'||options.context&&record.context!==options.context)continue;
  if(calibrationEnd!==null&&Date.parse(record.timestamp)<calibrationEnd)continue;
  for(const metric of Object.keys(record.values)){
   if(options.metric&&options.metric!==metric)continue;
   const key=JSON.stringify([metric,signature(record,metric)]);if(!groups.has(key))groups.set(key,{metric,records:[]});groups.get(key).records.push(record);
  }
 }
 const trends=[];
 for(const [key,group]of groups){
  const {metric,records}=group,daily=dailyPoints(records,metric),current=daily.at(-1).records.at(-1),uniqueCount=daily.reduce((sum,point)=>sum+point.records.length,0),recent=daily.slice(-TREND_RULES.recentDays),supporting=recent.flatMap(point=>point.records),values=recent.map(point=>point.value);
  const baselineHistory=all.filter(record=>sameMethod(record,current,metric));
  const baseline=summarizeBaseline(baselineHistory,{...options,metric,context:current.context,type:options.baselineType||options.type||'preflight',asOf:records[0].timestamp,currentRecordId:records[0].id});
  const baselineComparisons=recent.map(point=>comparePersonal(point.value,baseline));
  const safety=safetyLayer(current,metric),research=researchLayer(current,metric,options),direction=directionFor(values),delta=values.length?values.at(-1)-values[0]:null;
  const spread=baseline.status==='established'&&number(baseline.mad)?2*1.4826*baseline.mad:0;
  const meaningful=number(delta)&&Math.abs(delta)>=Math.max(METRICS[metric].step*2,spread);
  const repeatedSafety=recent.filter(point=>point.records.some(record=>relevantPrompts(record,metric).some(prompt=>['urgent','review'].includes(prompt.severity)))).length>=TREND_RULES.minimumRepeatedDays;
  const repeatedPersonal=baselineComparisons.length>=3&&baselineComparisons.every(comparison=>comparison.available&&comparison.unusual);
  const sameSide=repeatedPersonal&&baselineComparisons.every(comparison=>Math.sign(comparison.signedDeviation)===Math.sign(baselineComparisons[0].signedDeviation));
  let category='stable',kind='descriptive-stability';
  if(!['resting','exercise','during-exercise','post-exercise','post-eva','sleep'].includes(current.context)||daily.length<TREND_RULES.minimumUtcDays||supporting.length<TREND_RULES.minimumMeasurements){category='insufficient';kind='insufficient-longitudinal-evidence'}
  else if(safety.status==='review-required'||repeatedSafety){category='needs-attention';kind='repeated-reference-prompts'}
  else if(repeatedPersonal){category='review-recommended';kind=sameSide?'persistent-personal-deviation':'repeated-unusual-readings'}
  else{
   const towardBaseline=baseline.status==='established'&&!ordinal.has(metric)&&values.length>=3&&baselineComparisons.every(item=>item.available)&&values.every((value,i)=>!i||Math.abs(value-baseline.median)<Math.abs(values[i-1]-baseline.median));
   const sustained=meaningful&&['increasing','decreasing'].includes(direction);
   const unfavorable=direction==='decreasing'&&['oxygen','sleep','energy','mood'].includes(metric)||sustained&&['heart','sys','dia','temp','glucose','hrv','eda'].includes(metric);
   if(towardBaseline&&meaningful){category='improving';kind='moving-toward-recorded-baseline'}
   else if(sustained&&unfavorable){category='review-recommended';kind=`sustained-${direction}`}
   else if(ordinal.has(metric)&&metric==='energy'&&recent.every(point=>point.value<=2)){category='needs-attention';kind='repeated-low-energy-self-report'}
   else if(baseline.status!=='established'){category='insufficient';kind='insufficient-personal-baseline'}
  }
  const deduplicationKey=JSON.stringify([TREND_VERSION,key,kind,period]);
  const supportingMeasurements=supporting.map(record=>({id:record.id,timestamp:record.timestamp,value:record.values[metric],context:record.context,source:record.source,source_tag:record.source_tag,simulated:Boolean(options.demo),meta:clone(record.meta)}));
  const reasons=[`${daily.length} UTC day(s), ${uniqueCount} unique observation(s); recent daily medians: ${values.join(' → ')} ${METRICS[metric].unit}.`,category==='insufficient'?'At least 3 distinct UTC dates and a compatible personal baseline are needed for this longitudinal interpretation.':'Prototype rules describe repeated observations; they do not identify disease or establish fitness for duty.'];
  if(period==='24h')reasons.push('The 24-hour view is a short-term observation summary; a three-day longitudinal classification cannot be established in one day. Immediate reference prompts remain independent.');
  const explanation={en:reasons.join(' '),ar:`${daily.length} أيام بتوقيت UTC و${uniqueCount} تسجيلات فريدة؛ وسطاء الأيام الأخيرة: ${values.join(' ← ')} ${METRICS[metric].unit}. ${category==='insufficient'?'التفسير الطولي يحتاج ٣ تواريخ UTC مختلفة وخطًا شخصيًا قابلًا للمقارنة.':'قواعد النموذج تصف تكرار التسجيلات، ولا تشخص مرضًا أو تثبت اللياقة للمهمة.'}${period==='24h'?' عرض ٢٤ ساعة ملخص قصير المدى؛ لا يمكن إثبات اتجاه لثلاثة أيام خلال يوم واحد. التنبيهات المرجعية الفورية مستقلة.':''}`};
  trends.push({id:'trend-'+hash(deduplicationKey),deduplicationKey,version:TREND_VERSION,metric,indicator:{en:METRICS[metric].label,ar:METRICS[metric].ar},unit:METRICS[metric].unit,context:current.context,measurementContext:contextFields(current,metric),category,classification:category,kind,period,windowStart:iso(start),windowEnd:iso(end),calibrationExcludedBefore:calibrationEnd===null?null:iso(calibrationEnd),episodeStart:supporting[0]?.timestamp||null,current:{value:current.values[metric],timestamp:current.timestamp,id:current.id},baseline,research,safety,observedTrend:{direction,first:values[0]??null,last:values.at(-1)??null,delta,days:daily.length,count:uniqueCount,dailySummaries:daily.map(point=>({date:point.day,median:point.value,count:point.records.length,...(point.ordinalMedianInterval?{ordinalMedianInterval:point.ordinalMedianInterval,categoryCounts:point.categoryCounts}:{})}))},supportingMeasurements,supportingRecordIds:supporting.map(record=>record.id),explanation,followUp:followUp(category),simulated:Boolean(options.demo),clinicalAssessment:false,notClinicalDiagnosis:true});
 }
 const sleep=trends.find(trend=>trend.metric==='sleep'&&trend.observedTrend.direction==='decreasing'),energy=trends.find(trend=>trend.metric==='energy'&&(trend.observedTrend.direction==='decreasing'||trend.baseline.status==='established'&&trend.observedTrend.last<trend.baseline.median));
 if(sleep&&energy&&sleep.category!=='insufficient'&&energy.category!=='insufficient'){
  const sharedDays=new Set(sleep.supportingMeasurements.map(point=>point.timestamp.slice(0,10)));
  const overlap=[...new Set(energy.supportingMeasurements.map(point=>point.timestamp.slice(0,10)))].filter(day=>sharedDays.has(day));
  if(overlap.length>=3)for(const trend of [sleep,energy]){trend.concurrentChanges={metric:trend.metric==='sleep'?'energy':'sleep',overlappingUtcDays:overlap,interpretation:{en:'Declining sleep and reduced self-reported energy were observed on overlapping dates. This is temporal co-occurrence, not a causal finding.',ar:'لوحظ انخفاض النوم مع طاقة مُبلّغ عنها أقل في تواريخ مشتركة. ده تزامن زمني وليس إثبات سبب.'}}}
 }
 return trends.sort((a,b)=>['needs-attention','review-recommended','insufficient','improving','stable'].indexOf(a.category)-['needs-attention','review-recommended','insufficient','improving','stable'].indexOf(b.category)||a.metric.localeCompare(b.metric));
}

export function buildHealthEvaluationReport(records,options={}){
 const selected=recordsFor(records,options.demo),latest=selected.at(-1);
 return {app:'CosmoVital',type:'three-layer-trend-report',version:TREND_VERSION,exportedAt:new Date().toISOString(),simulated:Boolean(options.demo),latestEvaluation:latest?evaluateMeasurement(latest,selected,options):null,trends:detectHealthTrends(selected,options),deliveryStatus:'not-sent',clinicalAssessment:false,limitations:['Research reference distributions are not medical safety limits.','Personal and trend rules are descriptive prototype heuristics.','No clinician was contacted; no fitness-for-duty determination was made.']};
}
