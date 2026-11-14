import {METRICS} from './core.js';

const DAY = 86400000, MAX_SVG_POINTS = 1200;
const formatters = new Map(), displayFormatters = new Map(), numberFormatters = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metricConfig = key => key === 'energy' ? (METRICS.energy || {label:'Energy',ar:'الطاقة',unit:'/5',min:1,max:5,color:'#539aab'}) : Object.hasOwn(METRICS,key) ? METRICS[key] : undefined;
function formatter(timeZone) {
  if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
  return formatters.get(timeZone);
}
function partsAt(value, timeZone) {
  const time = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(time)) throw new Error('A valid timestamp is required.');
  return Object.fromEntries(formatter(timeZone).formatToParts(new Date(time)).filter(p => p.type !== 'literal').map(p => [p.type,p.value]));
}
export function dateKey(timestamp, timeZone = 'UTC') {
  const p = partsAt(timestamp, timeZone); return `${p.year}-${p.month}-${p.day}`;
}
export function inZone(timestamp, timeZone = 'UTC', locale = 'en-GB', options = {}) {
  const key=JSON.stringify([timeZone,locale,options]);
  if(!displayFormatters.has(key))displayFormatters.set(key,new Intl.DateTimeFormat(locale,{timeZone,year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short',...options}));
  return displayFormatters.get(key).format(new Date(timestamp));
}
function shiftDay(key, amount) {
  const date = new Date(key + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0,10);
}
function dayStart(key, timeZone) {
  const approximate = Date.parse(key + 'T00:00:00Z'); let lo = approximate - 36 * 3600000, hi = approximate + 36 * 3600000;
  while (lo + 1 < hi) { const mid = Math.floor((lo + hi) / 2); if (dateKey(mid, timeZone) >= key) hi = mid; else lo = mid; }
  return hi;
}
export function localTimeToISO(input, timeZone = 'UTC', {disambiguation = 'reject'} = {}) {
  formatter(timeZone);
  if (typeof input !== 'string') throw new Error('Enter a measurement date and time.');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(input)) {
    const [year,month,day] = input.slice(0,10).split('-').map(Number), clock = input.slice(11,19).split(':').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year,month,0)).getUTCDate() || clock[0] > 23 || clock[1] > 59 || (clock[2] !== undefined && clock[2] > 59)) throw new Error('The measurement date or time does not exist.');
    const d = new Date(input); if (!Number.isFinite(d.getTime())) throw new Error('The measurement time is invalid.'); return d.toISOString();
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(input);
  if (!match) throw new Error('Enter a local date and time or an ISO timestamp with timezone.');
  const [,year,month,day,hour,minute,second = '00'] = match;
  const nominal = Date.UTC(+year,+month-1,+day,+hour,+minute,+second);
  const actual = new Date(nominal);
  if (actual.getUTCFullYear() !== +year || actual.getUTCMonth() !== +month-1 || actual.getUTCDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) throw new Error('The measurement date or time does not exist.');
  const desired = `${year}-${month}-${day}T${hour}:${minute}:${second}`, candidates = new Set();
  for (let offset = -36; offset <= 36; offset += 6) {
    const sample = nominal + offset * 3600000, p = partsAt(sample,timeZone);
    const zoneOffset = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second) - sample;
    const candidate = nominal - zoneOffset, q = partsAt(candidate,timeZone);
    if (`${q.year}-${q.month}-${q.day}T${q.hour}:${q.minute}:${q.second}` === desired) candidates.add(candidate);
  }
  const times = [...candidates].sort((a,b) => a-b);
  if (!times.length) throw new Error('This local time does not exist because of a timezone clock change. Choose an actual time.');
  if (times.length > 1 && disambiguation === 'reject') throw new Error('This local time occurs twice because of a timezone clock change. Use an ISO timestamp with an explicit UTC offset.');
  if (!['reject','earlier','later'].includes(disambiguation)) throw new Error('Choose a valid time disambiguation.');
  return new Date(disambiguation === 'later' ? times.at(-1) : times[0]).toISOString();
}
function isSynthetic(record) {
  return ['training','simulated','synthetic'].some(key => record[key] === true || typeof record[key] === 'string' && /^(true|yes|1)$/i.test(record[key].trim())) || /(?:training|simulat|synthetic|demo)/i.test([record.source,record.source_tag,record.source_type,record.mode,record.dataMode].filter(Boolean).join(' '));
}
function isResearch(record) {
  return [record.research,record.spaceWeather,record.space_weather].some(value=>value===true||typeof value==='string'&&/^(true|yes|1)$/i.test(value.trim())) || /(?:research|space.?weather|published.?summary|nasa|osdr)/i.test([record.source,record.source_tag,record.source_type,record.mode,record.data_category,record.classification].filter(Boolean).join(' '));
}
function belongsToMode(record,dataMode) {
  return !isResearch(record) && (dataMode === 'demo' ? record.simulated === true : !isSynthetic(record));
}
export function availableMetrics(records, {userId,dataMode='personal'} = {}) {
  if (!['personal','demo'].includes(dataMode)) throw new Error('Choose personal or demo chart data.');
  if (!Array.isArray(records)) return [];
  const found = new Set();
  for (const record of records) if (record && typeof record === 'object' && belongsToMode(record,dataMode) && (!userId || record.user_id === userId)) for (const [key,value] of Object.entries(record.values || {})) if (Number.isFinite(value) && metricConfig(key)) found.add(key);
  const keys = [...Object.keys(METRICS),...(!METRICS.energy ? ['energy'] : [])];
  return keys.filter(key => found.has(key)).filter(key => !['sys','dia'].includes(key)).concat(found.has('sys') || found.has('dia') ? ['bp'] : []);
}
function displayConfig(key, prefs) {
  const base = key === 'bp' ? {label:'Blood pressure',ar:'ضغط الدم',unit:'mmHg',color:'#397d97'} : metricConfig(key);
  if (!base) throw new Error('Choose a supported measurement.');
  const temperature = prefs.temperature || prefs.temperatureUnit || prefs.temp;
  const glucose = prefs.glucose || prefs.glucoseUnit;
  const unit = key === 'temp' && ['F','°F'].includes(temperature) ? '°F' : key === 'glucose' && glucose === 'mmol/L' ? 'mmol/L' : base.unit;
  return {...base,unit,convert:value => key === 'temp' && unit === '°F' ? Number((value * 9 / 5 + 32).toPrecision(12)) : key === 'glucose' && unit === 'mmol/L' ? Number((value / 18.0182).toPrecision(12)) : value};
}
const mean = values => values.reduce((sum,value) => sum+value,0) / values.length;
function contextSignature(point, key) {
  const text=value=>typeof value==='string'?value.trim().toLowerCase():'';
  return [point.context || 'unknown',point.meta.device || '',point.meta.method || '',point.meta.posture || 'unknown',point.source || 'unknown',point.sourceTag || 'unknown',key === 'temp' ? point.meta.temperatureSite || 'unknown' : '',key === 'glucose' ? point.meta.glucoseTiming || 'unknown' : '',key === 'hrv' ? point.meta.hrvMethod || 'unknown' : ''].map(text).join('|');
}
function continuousSegments(points,key) {
  const segments=[];let current=[];
  for (const point of points) {
    const previous=current.at(-1),knownContext=!['unknown','other',''].includes(point.context),unstable=point.meta.signal==='unstable';
    const gap=previous && Date.parse(point.date+'T00:00:00Z')-Date.parse(previous.date+'T00:00:00Z')>DAY;
    const compatible=previous && point.time>previous.time && knownContext && !unstable && !['unknown','other',''].includes(previous.context) && previous.meta.signal!=='unstable' && !gap && contextSignature(point,key)===contextSignature(previous,key);
    if(current.length&&!compatible){segments.push(current);current=[]}
    current.push(point);
  }
  if(current.length)segments.push(current);
  return segments;
}
function personalOverlay(raw,series,metric,config) {
  const input=metric==='bp'?raw?.[series.key]:raw;
  if(!series.points.length||!input||typeof input!=='object'||input.status&&input.status!=='established'||input.clinicalThreshold===true||input.origin==='research'||input.mean!==undefined||['mood','energy'].includes(series.key))return null;
  const {median,range}=input;
  if(!Number.isFinite(median)||!range||!Number.isFinite(range.low)||!Number.isFinite(range.high)||range.low>range.high||median<range.low||median>range.high)return null;
  const context=input.context||input.contextFingerprint?.context;
  if(context&&series.points.some(point=>point.context!==context))return null;
  if(input.contextFingerprint){
    for(const [key,value]of Object.entries(input.contextFingerprint)){
      if(key==='context'||!value||value==='unknown')continue;
      if(series.points.some(point=>String(point.meta[key]||'').trim().toLowerCase()!==String(value).trim().toLowerCase()))return null;
    }
  }
  const canonicalUnit=metricConfig(series.key).unit;
  if(input.unit&&![canonicalUnit,config.unit].includes(input.unit))return null;
  const convert=input.unit===config.unit?value=>value:config.convert;
  return {metric:series.key,median:convert(median),range:{low:convert(range.low),high:convert(range.high)},unit:config.unit,context:context||null,origin:'personal-history',clinicalThreshold:false};
}
function canAverage(key, points) {
  if (!points.length || ['sleep','mood','energy'].includes(key)) return false;
  if (key === 'glucose' && points.some(p => !p.meta.glucoseTiming || p.meta.glucoseTiming === 'unknown')) return false;
  if (key === 'temp' && points.some(p => !p.meta.temperatureSite || p.meta.temperatureSite === 'unknown')) return false;
  return new Set(points.map(p => contextSignature(p,key))).size === 1;
}
function summary(key, points) {
  const values = points.map(p => p.value), average = canAverage(key,points) ? mean(values) : null;
  return {count:points.length,average,min:values.length ? Math.min(...values) : null,max:values.length ? Math.max(...values) : null,latest:points.at(-1) || null,
    distribution:['mood','energy'].includes(key) ? Object.fromEntries([...new Set(values)].sort((a,b) => a-b).map(value => [value,values.filter(v => v === value).length])) : null};
}
function warning(id,en,ar) { return {id,en,ar}; }
function extract(records, metric, config, timeZone, userId, dataMode) {
  let invalidCount = 0; const points = [], seen = new Set(), keys = metric === 'bp' ? ['sys','dia'] : [metric];
  for (const [index,r] of records.entries()) {
    if (!r || typeof r !== 'object' || !belongsToMode(r,dataMode) || userId && r.user_id !== userId) continue;
    const timestamp = r.measured_at || r.timestamp, time = Date.parse(timestamp);
    for (const key of keys) {
      const value = r.values?.[key]; if (value === undefined || value === null || value === '') continue;
      if (!Number.isFinite(time) || typeof value !== 'number' || !Number.isFinite(value)) { invalidCount++; continue; }
      const dedupe = r.id ? `${r.id}:${key}` : `index:${index}:${key}`;
      if (seen.has(dedupe)) { invalidCount++; continue; } seen.add(dedupe);
      points.push({id:r.id || null,recordId:r.id || null,metric:key,time,timestamp:new Date(time).toISOString(),date:dateKey(time,timeZone),value:config.convert(value),rawValue:value,unit:config.unit,
        source:r.source || r.data_source || 'unknown',sourceTag:r.source_tag || 'unknown',simulatedSourceKind:r.simulatedSourceKind || r.simulated_source || '',simulated:dataMode==='demo',sourceReference:r.source_reference || '',context:r.context || 'unknown',meta:{...(r.meta || {})},notes:r.notes || ''});
    }
  }
  points.sort((a,b) => a.time-b.time || String(a.recordId).localeCompare(String(b.recordId)) || a.metric.localeCompare(b.metric));
  return {points,invalidCount};
}
export function buildChartModel(records, metric, {range = '7',timeZone = 'UTC',now = Date.now(),unitPreferences = {},userId,dataMode='personal',personalBaseline=null} = {}) {
  if (!Array.isArray(records)) throw new Error('Chart records must be an array.');
  if (!['personal','demo'].includes(dataMode)) throw new Error('Choose personal or demo chart data.');
  if (!['24','7','30','all'].includes(String(range))) throw new Error('Choose 24 hours, 7 days, 30 days, or all history.');
  range = String(range); now = typeof now === 'string' ? Date.parse(now) : Number(now);
  if (!Number.isFinite(now)) throw new Error('The chart reference time is invalid.');
  formatter(timeZone); const config = displayConfig(metric,unitPreferences), extracted = extract(records,metric,config,timeZone,userId,dataMode);
  const today = dateKey(now,timeZone), all = extracted.points.filter(p => p.time <= now);
  const start = range === '24' ? now-DAY : range === 'all' ? all[0]?.time ?? now : dayStart(shiftDay(today,-(Number(range)-1)),timeZone);
  const points = all.filter(p => p.time >= start), mode = ['sleep','mood','energy'].includes(metric) ? metric : range === '24' || range === 'all' ? 'raw' : 'daily';
  const keys = metric === 'bp' ? ['sys','dia'] : [metric];
  const series = keys.map(key => ({key,label:metric === 'bp' ? METRICS[key].label : config.label,ar:metric === 'bp' ? METRICS[key].ar : config.ar,color:metric === 'bp' ? key === 'sys' ? '#347fa1' : '#389786' : config.color,points:points.filter(p => p.metric === key)}));
  for(const item of series)item.segments=['sleep','mood','energy'].includes(metric)?[]:continuousSegments(item.points,item.key);
  const personalBaselines=series.map(item=>personalOverlay(personalBaseline,item,metric,config)).filter(Boolean);
  const days = [];
  if (['7','30'].includes(range)) for (let offset = -(Number(range)-1); offset <= 0; offset++) {
    const key = shiftDay(today,offset), begin = dayStart(key,timeZone), end = dayStart(shiftDay(key,1),timeZone), dayPoints = points.filter(p => p.date === key);
    days.push({date:key,start:begin,end,points:dayPoints,count:metric === 'bp' ? new Set(dayPoints.map(p => p.recordId || p.timestamp)).size : dayPoints.length,
      summaries:Object.fromEntries(keys.map(k => [k,summary(k,dayPoints.filter(p => p.metric === k))]))});
  }
  const stats = {count:metric === 'bp' ? new Set(points.map(p => p.recordId || p.timestamp)).size : points.length,numericCount:points.length,
    ...metric !== 'bp' ? summary(metric,points) : {average:null,min:null,max:null,latest:points.at(-1) || null,distribution:null},
    series:Object.fromEntries(series.map(s => [s.key,summary(s.key,s.points)]))};
  const warnings = [];
  if(dataMode==='demo')warnings.push(warning('simulated','SIMULATED CREW DATA — separate from real personal readings and authentic research.','بيانات طاقم مُحاكاة — منفصلة عن القياسات الشخصية الحقيقية والأبحاث الأصلية.'));
  if(points.length&&!['sleep','mood','energy'].includes(metric))warnings.push(warning('connections','Lines connect consecutive actual observations only within consistent recorded conditions. Unknown activity, context or method switches, unstable signals, equal timestamps and missing calendar days break the line. Lines do not imply continuous monitoring or inferred readings.','الخطوط تصل القياسات الفعلية المتتالية داخل ظروف مسجلة متسقة فقط. النشاط المجهول وتغيّر السياق أو الطريقة والإشارة غير المستقرة والتوقيت المتطابق والأيام الناقصة تقطع الخط. لا تعني الخطوط رصدًا مستمرًا أو قياسات مفترضة.'));
  if (extracted.invalidCount) warnings.push(warning('invalid','Invalid or repeated identifiers were excluded from this chart; saved records were not changed.','تم استبعاد مدخلات غير صالحة أو معرفات مكررة من الرسم دون تغيير السجل المحفوظ.'));
  if (metric === 'sleep') warnings.push(warning('sleep-periods','Each bar is one recorded sleep duration. Periods are not summed or treated as complete nights.','كل عمود مدة نوم مسجلة منفصلة؛ لا تُجمع الفترات ولا تُفترض ليالي كاملة.'));
  if (['mood','energy'].includes(metric)) warnings.push(warning('ordinal','Scores are ordinal self-reports. Counts and recorded levels are shown; a continuous mean or medical interpretation is not inferred.','الدرجات تقييمات شخصية ترتيبية. تُعرض المستويات والأعداد دون متوسط مستمر أو تفسير طبي.'));
  if (points.length && !['sleep','mood','energy'].includes(metric) && series.some(s => s.points.length && !canAverage(s.key,s.points))) warnings.push(warning('context-average','An average is withheld where recorded methods, sources, activity contexts, temperature sites, or glucose timing cannot be combined consistently. Inspect the original readings.','يُحجب المتوسط إذا تعذّر الجمع المتسق للطرق أو المصادر أو ظروف النشاط أو موضع الحرارة أو توقيت السكر. راجع القراءات الأصلية.'));
  if (points.some(p => !p.meta.device || !p.meta.method || p.context === 'unknown')) warnings.push(warning('missing-context','Some device, method or activity details are missing. Recorded differences are descriptive, not evidence of a clinical change.','بعض معلومات الجهاز أو الطريقة أو النشاط ناقصة. الفروق وصفية وليست دليلًا على تغير طبي.'));
  if (points.some(p => p.meta.signal === 'unstable')) warnings.push(warning('signal','One or more observations have a user-reported unstable signal. No sensor accuracy is verified.','يوجد تسجيل بإشارة غير مستقرة حسب المستخدم، ولم يتم التحقق من دقة الجهاز.'));
  const duration = now-start, previousPoints = range === 'all' ? [] : all.filter(p => p.time >= start-duration && p.time < start);
  const previousSeries = Object.fromEntries(keys.map(key => [key,summary(key,previousPoints.filter(p => p.metric === key))]));
  const differences = {};
  for (const key of keys) {
    const current = stats.series[key], previous = previousSeries[key], combined = [...points,...previousPoints].filter(p => p.metric === key);
    const comparable = current.count >= 3 && previous.count >= 3 && current.average !== null && previous.average !== null && canAverage(key,combined) && combined.every(p => p.meta.device && p.meta.method && p.context !== 'unknown' && p.meta.signal !== 'unstable');
    differences[key] = {available:comparable,delta:comparable ? current.average-previous.average : null,percent:comparable && previous.average !== 0 ? (current.average-previous.average)/Math.abs(previous.average)*100 : null};
  }
  return {metric,simulated:dataMode==='demo',dataMode,personalBaselines,label:config.label,ar:config.ar,unit:config.unit,color:config.color,range,timeZone,start,end:now,mode,points,days,series,stats,previous:{start:start-duration,end:start,points:previousPoints,series:previousSeries,differences},warnings,invalidCount:extracted.invalidCount};
}
function number(value, locale, digits = 2) {if(value===null||value===undefined)return '—';const key=locale+'|'+digits;if(!numberFormatters.has(key))numberFormatters.set(key,new Intl.NumberFormat(locale,{maximumFractionDigits:digits}));return numberFormatters.get(key).format(value)}
function sample(points) { if (points.length <= MAX_SVG_POINTS) return points; return Array.from({length:MAX_SVG_POINTS},(_,i) => points[Math.round(i*(points.length-1)/(MAX_SVG_POINTS-1))]); }
function svgChart(model,lang,locale,compact=false) {
  const t = (en,ar) => lang === 'ar' ? ar : en, w = compact?390:760,h = compact?285:310,pad = {left:compact?44:55,right:compact?14:22,top:24,bottom:48}, iw = w-pad.left-pad.right, ih = h-pad.top-pad.bottom;
  const vals = model.points.map(point => point.value).concat((model.personalBaselines||[]).flatMap(item=>[item.median,item.range.low,item.range.high]));
  let low = Math.min(...vals),high = Math.max(...vals);
  if (['mood','energy'].includes(model.metric)) { low = metricConfig(model.metric).min; high = metricConfig(model.metric).max; }
  else if (model.metric === 'sleep') { low = 0; high = Math.max(1,high*1.1); }
  else { const margin = Math.max((high-low)*.12,Math.abs(high)*.01,.1); low = Math.max(0,low-margin); high += margin; }
  if (high === low) high = low+1;
  const x = time => pad.left + (model.end === model.start ? .5 : (time-model.start)/(model.end-model.start))*iw;
  const y = value => pad.top + ih - (value-low)/(high-low)*ih;
  const timeCache=new Map();
  const exactTime=timestamp=>{if(!timeCache.has(timestamp))timeCache.set(timestamp,inZone(timestamp,model.timeZone,locale));return timeCache.get(timestamp)};
  const source = point => point.simulated?t('Simulated '+(point.simulatedSourceKind||'crew'),'مصدر طاقم مُحاكى'):t(point.source === 'manual' ? 'Self-entered' : point.source === 'imported' ? 'Imported, unverified' : 'Unknown source',point.source === 'manual' ? 'إدخال شخصي' : point.source === 'imported' ? 'مستورد، غير متحقق' : 'مصدر غير معروف');
  const original = point => metricConfig(point.metric).unit !== model.unit ? ' · '+t('Original: ','الأصل: ')+number(point.rawValue,locale,20)+' '+metricConfig(point.metric).unit : '';
  const tooltip = point => `${exactTime(point.timestamp)} · ${point.timestamp} · ${number(point.value,locale,20)} ${model.unit}${original(point)} · ${source(point)} · ${point.sourceTag} · ${point.context}${point.meta.device ? ' · '+point.meta.device : ''}`;
  const ordinal=['mood','energy'].includes(model.metric);
  const tickValues=ordinal?[1,2,3,4,5]:Array.from({length:5},(_,i)=>low+(high-low)*i/4);
  const ticks = tickValues.map(value=>{const yy=y(value);return `<line x1="${pad.left}" x2="${w-pad.right}" y1="${yy}" y2="${yy}" stroke="#e7efef" stroke-dasharray="3 4"/><text x="${pad.left-9}" y="${yy+4}" text-anchor="end">${esc(number(value,locale,ordinal?0:1))}</text>`}).join('');
  let tickTimes;
  if (model.days.length) tickTimes = [...new Set(compact?[0,Math.floor((model.days.length-1)/2),model.days.length-1]:[0,Math.floor((model.days.length-1)/3),Math.floor((model.days.length-1)*2/3),model.days.length-1])].map(i => model.days[i].start);
  else {const count=compact?3:5;tickTimes=Array.from({length:count},(_,i)=>model.start+(model.end-model.start)*i/(count-1))}
  const labels = tickTimes.map(time => `<text x="${x(time)}" y="${h-18}" text-anchor="middle">${esc(new Intl.DateTimeFormat(locale,{timeZone:model.timeZone,...model.range === '24' ? {hour:'2-digit',minute:'2-digit'} : {day:'numeric',month:'short'}}).format(time))}</text>`).join('');
  const overlays=(model.personalBaselines||[]).map(item=>{const color=model.series.find(series=>series.key===item.metric)?.color||'#657e95';return `<g class="health-personal-baseline" data-baseline-metric="${esc(item.metric)}" aria-label="${esc(t('Descriptive personal baseline, not a medical safety range','خط أساس شخصي وصفي، وليس مجال أمان طبي'))}"><rect class="health-baseline-band" x="${pad.left}" y="${y(item.range.high)}" width="${iw}" height="${Math.max(.5,y(item.range.low)-y(item.range.high))}" fill="${color}" fill-opacity=".08"/><line class="health-baseline-median" x1="${pad.left}" x2="${w-pad.right}" y1="${y(item.median)}" y2="${y(item.median)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="7 5"/><title>${esc(t('Personal median','الوسيط الشخصي')+': '+number(item.median,locale)+' '+item.unit+' · '+t('Descriptive recorded interval','مجال وصفي مسجل')+': '+number(item.range.low,locale)+'–'+number(item.range.high,locale))}</title></g>`}).join('');
  const marker=(point,series)=>{
    const px=x(point.time),py=y(point.value),boxWidth=Math.min(310,w-pad.left-pad.right),boxHeight=86,tx=Math.min(w-pad.right-boxWidth,Math.max(pad.left,px+10)),ty=py>boxHeight+pad.top?py-boxHeight-10:Math.min(h-pad.bottom-boxHeight,py+12);
    const shape=model.metric==='sleep'?`<rect class="health-chart-bar" x="${px-3}" y="${py}" width="6" height="${Math.max(.5,y(0)-py)}" rx="2" fill="${series.color}"/>`:`<circle class="health-chart-point" cx="${px}" cy="${py}" r="3.5" fill="${series.color}" stroke="white" stroke-width="1.3"/>`;
    const text=[`${t(series.label,series.ar)}: ${number(point.value,locale,20)} ${model.unit}`,exactTime(point.timestamp),point.timestamp,`${point.context} · ${source(point)}`];
    return `<g class="health-chart-marker" tabindex="0" aria-label="${esc(tooltip(point))}"><title>${esc(tooltip(point))}</title><circle class="health-chart-hit" cx="${px}" cy="${py}" r="11" fill="transparent" aria-hidden="true"/>${shape}<g class="health-chart-tooltip" aria-hidden="true" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})"><rect width="${boxWidth}" height="${boxHeight}" rx="7"/>${text.map((line,index)=>`<text x="10" y="${17+index*19}" style="fill:var(--ink,#244c5b)">${esc(line)}</text>`).join('')}</g></g>`;
  };
  const layers = model.series.map(series => {
    const lines=(series.segments||[]).filter(segment=>segment.length>1).map(segment=>`<path class="health-chart-line" data-series="${esc(series.key)}" d="${segment.map((point,index)=>(index?'L':'M')+x(point.time).toFixed(2)+','+y(point.value).toFixed(2)).join(' ')}" fill="none" stroke="${series.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    return lines+sample(series.points).map(point=>marker(point,series)).join('');
  }).join('');
  const description=t('Small markers are actual recorded observations. Lines connect comparable observations in chronological order. Missing days and incompatible contexts break the line. Sleep uses individual bars; ordinal self-reports retain categorical levels. Original readings follow below.','العلامات الصغيرة قياسات فعلية مسجلة. تصل الخطوط القياسات القابلة للمقارنة بترتيب زمني. الأيام الناقصة والسياقات غير المتوافقة تقطع الخط. النوم أعمدة منفصلة، والتقييمات الترتيبية تحتفظ بفئاتها. القراءات الأصلية متاحة بالأسفل.');
  return `<svg class="health-chart-svg${compact?' health-chart-compact':''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t(model.label,model.ar)+' · '+model.unit+' · '+model.stats.count+' '+t('recorded observations','تسجيلات فعلية')+' · '+model.timeZone)}" direction="ltr"><title>${esc(t(model.label,model.ar))}</title><desc>${esc(description)}</desc>${ticks}${labels}${overlays}${layers}<text x="${pad.left}" y="12">${esc(model.unit)}</text></svg>${low > 0 ? `<p class="health-chart-scale">${esc(t('The vertical axis starts at ','المحور الرأسي يبدأ من ')+number(low,locale)+' '+model.unit+t(' to show observed variation; it is not a clinical threshold.',' لإظهار التغيّر المسجّل؛ ليست عتبة طبية.'))}</p>` : ''}`;
}
export function renderHealthChart(model, {lang = 'en',locale = lang === 'ar' ? 'ar-EG' : 'en-GB',compact=false} = {}) {
  if (!model || !Array.isArray(model.points)) throw new Error('A chart model is required.');
  const t = (en,ar) => lang === 'ar' ? ar : en;
  const renderStats = (key,stats) => `<section class="health-chart-stat-group" aria-label="${esc(key === 'sys' || key === 'dia' ? t(METRICS[key].label,METRICS[key].ar) : t(model.label,model.ar))}">${model.metric === 'bp' ? `<h3>${esc(t(METRICS[key].label,METRICS[key].ar))}</h3>` : ''}<dl class="health-chart-stats">${[[t('Average','المتوسط'),stats.average],[t('Minimum','أقل قيمة'),stats.min],[t('Maximum','أعلى قيمة'),stats.max],[t('Reading count','عدد القراءات'),stats.count]].filter(([label,value]) => label !== t('Average','المتوسط') || value !== null).map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(number(value,locale))}${label === t('Reading count','عدد القراءات') ? '' : `<small>${esc(model.unit)}</small>`}</dd></div>`).join('')}<div><dt>${t('Most recent','آخر قراءة')}</dt><dd>${stats.latest ? esc(number(stats.latest.value,locale))+'<small>'+esc(model.unit)+'</small>' : '—'}</dd>${stats.latest ? `<small>${esc(inZone(stats.latest.timestamp,model.timeZone,locale))}</small>` : ''}</div></dl>${model.previous.differences[key]?.available ? `<p class="health-period-difference">${t('Difference of means from previous equal-duration period: ','فرق المتوسطين عن الفترة السابقة المساوية في المدة: ')}<strong dir="ltr">${model.previous.differences[key].delta > 0 ? '+' : ''}${esc(number(model.previous.differences[key].delta,locale))} ${esc(model.unit)}</strong> · ${t('descriptive only','وصف حسابي فقط')}</p>` : model.range !== 'all' && model.points.length ? `<p class="health-chart-scale">${t('Previous-period comparison unavailable: at least three readings per period and consistent recorded context are required.','مقارنة الفترة السابقة غير متاحة: يلزم ثلاث قراءات بكل فترة مع اتساق السياق المسجّل.')}</p>` : ''}</section>`;
  const groups = model.days.length ? model.days : model.points.length ? [{date:null,points:model.points,count:model.stats.count,summaries:model.stats.series}] : [];
  const rawRows = points => points.map(point => `<tr><td><time datetime="${esc(point.timestamp)}">${esc(inZone(point.timestamp,model.timeZone,locale))}</time></td>${model.metric === 'bp' ? `<td>${esc(t(METRICS[point.metric].label,METRICS[point.metric].ar))}</td>` : ''}<td dir="ltr">${esc(number(point.value,locale,20))} ${esc(model.unit)}${metricConfig(point.metric).unit !== model.unit ? '<small>'+t('Original: ','الأصل: ')+esc(number(point.rawValue,locale,20))+' '+esc(metricConfig(point.metric).unit)+'</small>' : ''}</td><td>${esc(point.simulated?t('Simulated crew','طاقم مُحاكى'):t(point.source === 'manual' ? 'Self-entered' : point.source === 'imported' ? 'Imported · unverified' : 'Unknown',point.source === 'manual' ? 'إدخال شخصي' : point.source === 'imported' ? 'مستورد · غير متحقق' : 'غير معروف'))} · ${esc(point.simulated?point.simulatedSourceKind||'simulated':point.sourceTag)}${point.meta.device ? '<br>'+esc(point.meta.device) : ''}</td><td>${esc(point.context)}${point.metric === 'glucose' ? ' · '+esc(point.meta.glucoseTiming || 'unknown') : point.metric === 'temp' ? ' · '+esc(point.meta.temperatureSite || 'unknown') : ''}</td></tr>`).join('');
  const details = groups.map(day => `<details class="health-chart-day"><summary>${esc(day.date || t('All original readings in this view','كل القراءات الأصلية في العرض'))} <span>${day.count ? esc(number(day.count,locale))+' '+t('observations','تسجيلات') : t('No observations · missing data','لا قياسات · بيانات ناقصة')}</span></summary>${day.points.length ? `<div class="health-chart-day-summary">${Object.entries(day.summaries).map(([key,s]) => `${model.metric === 'bp' ? esc(t(METRICS[key].label,METRICS[key].ar))+': ' : ''}${s.average !== null ? t('Mean','متوسط')+' '+esc(number(s.average,locale))+' · ' : ''}${t('Min','أقل')} ${esc(number(s.min,locale))} · ${t('Max','أعلى')} ${esc(number(s.max,locale))} ${esc(model.unit)} · ${s.count} ${t('readings','قراءات')}`).join('<br>')}</div><div class="health-chart-table-wrap"><table><caption>${esc(t('Original observations · ','القياسات الأصلية · ')+model.timeZone)}</caption><thead><tr><th>${t('Actual measurement time','وقت القياس الفعلي')}</th>${model.metric === 'bp' ? '<th>'+t('Parameter','المؤشر')+'</th>' : ''}<th>${t('Value','القيمة')}</th><th>${t('Source','المصدر')}</th><th>${t('Context','السياق')}</th></tr></thead><tbody>${rawRows(day.points)}</tbody></table></div>` : `<p>${t('No measurements were recorded for this day. No values have been inferred.','لا توجد قياسات مسجلة لهذا اليوم، ولم يتم افتراض قيم.')}</p>`}</details>`).join('');
  const distribution = model.stats.distribution ? `<div class="health-chart-distribution" aria-label="${t('Recorded score distribution','توزيع الدرجات المسجلة')}">${Object.entries(model.stats.distribution).map(([value,count]) => `<div><span>${esc(value)} ${esc(model.unit)}</span><progress max="${model.stats.count}" value="${count}" aria-label="${esc(value+': '+count)}"></progress><strong>${count}</strong></div>`).join('')}</div>` : '';
  return `<div class="health-chart" data-chart-mode="${model.simulated?'demo':'personal'}" data-chart-metric="${esc(model.metric)}" data-chart-range="${esc(model.range)}"><div class="health-chart-description"><span>${esc(t(model.label,model.ar))} · ${esc(model.unit)}</span><span>${esc(model.timeZone)} · ${model.range === '24' ? t('Last 24 hours','آخر ٢٤ ساعة') : model.range === 'all' ? t('All recorded history','كل السجل') : t('Last '+model.range+' calendar days','آخر '+model.range+' أيام تقويمية')}</span></div>${model.points.length ? svgChart(model,lang,locale,compact) : `<div class="health-chart-empty" role="status"><strong>${t('No measurements in this period.','لا توجد قياسات في الفترة دي.')}</strong><p>${t('Record an actual measurement or choose another period. Missing readings are not replaced with zero.','سجّل قياسًا فعليًا أو اختار فترة أخرى. القراءات الناقصة لا تُستبدل بصفر.')}</p></div>`}${model.series.map(s => renderStats(s.key,model.stats.series[s.key])).join('')}${model.points.length ? `<p class="health-chart-legend">${model.series.map(s => `<span><i style="background:${s.color}"></i>${esc(t(s.label,s.ar))}</span>`).join('')}<span>${['sleep','mood','energy'].includes(model.metric)?t('Actual recorded bars or categorical levels; no continuous interpolation','أعمدة مسجلة أو مستويات فئوية فعلية؛ دون استيفاء مستمر'):t('Small markers: actual readings · lines: comparable chronological observations','علامات صغيرة: قراءات فعلية · خطوط: قياسات زمنية قابلة للمقارنة')}</span></p>` : ''}${model.series.some(s => s.points.length > MAX_SVG_POINTS) ? `<p class="health-chart-scale">${t('The SVG displays a subset of actual points for performance. Every original reading remains available below and in history.','يعرض الرسم جزءًا من النقاط الفعلية لتحسين الأداء. كل القراءات الأصلية متاحة بالأسفل وفي السجل.')}</p>` : ''}${model.personalBaselines?.length?`<p class="health-baseline-description">${t('Dashed line: personal median · shading: descriptive personal history interval, not a safety range. Published NASA research summaries are shown separately.','خط متقطع: الوسيط الشخصي · التظليل: مجال وصفي للتاريخ الشخصي وليس مجال أمان. ملخصات أبحاث ناسا تُعرض بشكل منفصل.')}</p>`:''}${distribution}${model.warnings.map(item => `<p class="health-chart-warning">${esc(lang === 'ar' ? item.ar : item.en)}</p>`).join('')}<details class="health-chart-observations"><summary>${t('Inspect dates and original readings','راجع التواريخ والقراءات الأصلية')}</summary>${details || `<p>${t('No data in the selected period.','لا توجد بيانات في الفترة المختارة.')}</p>`}</details><p class="health-chart-scale">${t('Display scales are chosen for readability and are not validated medical limits. A chart is not a diagnosis.','مقاييس العرض للوضوح وليست حدودًا طبية معتمدة. الرسم ليس تشخيصًا.')}</p></div>`;
}
