import {METRICS,assessRecord} from './core.js';
import {assessQuality} from './insights.js';

const copy=value=>structuredClone(value);
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function buildMissionEvidence(record,missionState={cases:[]}){
 if(!record||typeof record.id!=='string'||!plain(record.values))return null;
 const linkedCases=(Array.isArray(missionState.cases)?missionState.cases:[]).filter(c=>Array.isArray(c.recordIds)&&c.recordIds.includes(record.id));
 const followUps=[];
 for(const c of linkedCases)for(const event of c.events||[]){
  let value;try{value=JSON.parse(event.text)}catch{continue}
  if(!plain(value)||value.workflow!=='decision-tree'||value.recordId!==record.id||!plain(value.answers))continue;
  followUps.push({caseId:c.id,caseTitle:c.title,eventId:event.id,recordId:record.id,answeredAt:value.answeredAt||event.timestamp,
   measuredAt:value.measured_at||null,answers:copy(value.answers),savedValues:plain(value.values)?copy(value.values):null,
   resultLevel:['info','review','urgent','emergency'].includes(value.resultLevel)?value.resultLevel:null,
   historicalSelfReport:true,diagnosis:false});
 }
 return {record:copy(record),quality:assessQuality(record),referencePrompts:assessRecord(record),linkedCases:copy(linkedCases),followUps};
}

export function createMissionEvidenceUI(ctx){
 const {t,esc,icon}=ctx;let selectedId='';
 const pair=value=>Array.isArray(value)?t(...value):String(value??'');
 const records=()=>ctx.getRecords()||[];
 function selected(){const values=records();if(!selectedId&&values.length)selectedId=values.at(-1).id;return values.find(r=>r.id===selectedId)||null}
 function exact(id){const record=records().find(r=>r.id===id);if(!record)throw new Error(t('This observation no longer exists. Select another saved observation.','التسجيل لم يعد موجودًا. اختار تسجيلًا محفوظًا آخر.'));return record}
 function stamp(value){if(!value)return t('Not recorded','غير مسجّل');try{return new Date(value).toLocaleString(t('en-GB','ar-EG'),{timeZone:ctx.getSettings?.()?.timeZone||'UTC'})}catch{return value}}
 const metricName=key=>t(METRICS[key]?.label||key,METRICS[key]?.ar||key);
 const source=record=>record.source==='manual'?t('Self-entered · unverified','إدخال شخصي · غير متحقق'):record.source==='imported'?t('Imported · unverified','مستورد · غير متحقق'):t('Source unknown','المصدر غير معروف');
 const promptText=(prompt,record)=>{const translated=ctx.promptCopy?.({...prompt,record});return Array.isArray(translated)?translated[1]:prompt.detail};
 const btn=(action,label,id,primary=false)=>`<button class="btn ${primary?'btn-primary':'btn-light'}" data-action="evidence-${action}" ${id?`data-id="${esc(id)}"`:''}>${label}</button>`;
 function header(){return `<div class="page-heading"><div><span class="eyebrow">COSMOVITAL · ${t('EVIDENCE BEFORE INTERPRETATION','الدليل قبل التفسير')}</span><h1>${t('Follow the evidence. Keep the whole story.','اتبع القياس، واحتفظ بالقصة كاملة.')}</h1><p>${t('One saved observation connects its source, context, review prompts and dated follow-up. Nothing here is a live sensor feed or a diagnosis.','تسجيل واحد يربط المصدر والسياق وتنبيهات المراجعة والمتابعة المؤرخة. العرض ليس بث حساس حيًا أو تشخيصًا.')}</p></div><div class="heading-buttons">${btn('record',t('Record an observation','سجّل قياسًا'),'',true)}</div></div>`}
 function step(number,title,body){return `<article class="panel evidence-step"><div class="evidence-step-title"><span aria-hidden="true">${number}</span><h2>${title}</h2></div>${body}</article>`}
 function reading(record){return `<dl class="evidence-meta"><div><dt>${t('Measured at','وقت القياس')}</dt><dd>${esc(stamp(record.measured_at||record.timestamp))}</dd></div><div><dt>${t('Created at','وقت الحفظ')}</dt><dd>${esc(stamp(record.created_at))}</dd></div><div><dt>${t('Source','المصدر')}</dt><dd>${esc(source(record))}</dd></div><div><dt>${t('Observation ID','معرّف التسجيل')}</dt><dd dir="ltr">${esc(record.id)}</dd></div></dl><div class="evidence-values">${Object.entries(record.values).filter(([key,value])=>METRICS[key]&&Number.isFinite(value)).map(([key,value])=>`<div><small>${esc(metricName(key))}</small><strong dir="ltr">${value} <span>${esc(METRICS[key].unit)}</span></strong></div>`).join('')}</div>${record.source_reference?`<p class="evidence-note">${t('Source reference','مرجع المصدر')}: ${esc(record.source_reference)}</p>`:''}${record.notes?`<p class="evidence-note">${t('Recorded note','الملاحظة المسجلة')}: ${esc(record.notes)}</p>`:''}`}
 function context(model){const quality=model.quality;return `<p class="evidence-note">${esc(pair(quality.explanation))}</p><div class="evidence-context"><div><h3>${t('Recorded context','السياق المسجل')}</h3>${quality.known.length?`<ul>${quality.known.map(field=>`<li>${esc(pair(field.label))}: <strong>${esc(pair(field.value))}</strong></li>`).join('')}</ul>`:`<p>${t('No requested context was recorded.','لم تُسجّل معلومات السياق المطلوبة.')}</p>`}</div><div><h3>${t('Still unknown','معلومات غير معروفة')}</h3>${quality.missing.length?`<ul>${quality.missing.map(field=>`<li>${esc(pair(field.label))}</li>`).join('')}</ul>`:`<p>${t('Requested context is present; accuracy remains unverified.','السياق المطلوب موجود؛ الدقة تظل غير متحقق منها.')}</p>`}</div></div>${quality.cautions.map(note=>`<p class="evidence-caution">${esc(pair(note))}</p>`).join('')}<div class="evidence-actions">${btn('context',t('Inspect context & quality','راجع سياق وجودة القياس'),model.record.id)}</div>`}
 function prompts(model){return `<p class="evidence-note">${t('These are the existing broad adult reference prompts for this saved record. A threshold is not a diagnosis, and no prompt does not establish safety. Symptoms take priority.','دي تنبيهات مرجعية عامة للبالغين تخص التسجيل المحفوظ. الحد ليس تشخيصًا، وعدم وجود تنبيه لا يثبت السلامة. الأعراض لها الأولوية.')}</p>${model.referencePrompts.length?`<div class="evidence-prompts">${model.referencePrompts.map(prompt=>`<div><strong>${esc(metricName(prompt.metric==='bp'?'sys':prompt.metric))}</strong><p>${esc(promptText(prompt,model.record))}</p>${prompt.sourceUrl?`<a class="text-link" href="${esc(prompt.sourceUrl)}" target="_blank" rel="noopener noreferrer">${t('Original reference','المرجع الأصلي')}${icon('external')}</a>`:''}</div>`).join('')}</div>`:`<p class="evidence-note">${t('No automatic reference prompt is available for this observation. This does not rule out a problem.','لا يوجد تنبيه مرجعي تلقائي لهذا التسجيل. ده لا يستبعد وجود مشكلة.')}</p>`}<div class="evidence-actions">${btn('followup',t('Ask the follow-up questions','ابدأ أسئلة المتابعة'),model.record.id,true)}</div>`}
 function followUps(model){return `<p class="evidence-note">${t('Saved answers are historical self-reports at the time shown. They are not current symptom checks, evidence of recovery or medical clearance.','الإجابات المحفوظة إقرار شخصي تاريخي في الوقت الموضح. ليست فحصًا للأعراض الحالية أو دليل تعافٍ أو تصريحًا طبيًا.')}</p>${model.followUps.length?`<div class="evidence-followups">${model.followUps.map(item=>`<details><summary>${esc(item.caseTitle)} · ${esc(stamp(item.answeredAt))}</summary><p>${t('Linked case','الملف المرتبط')}: <code dir="ltr">${esc(item.caseId)}</code></p><p>${t('Historical answers','إجابات تاريخية')}:</p><dl>${Object.entries(item.answers).map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(String(value))}</dd></div>`).join('')}</dl><p>${t('No clinician receipt or diagnosis is implied.','لا يُفترض استلام طبيب أو تشخيص.')}</p></details>`).join('')}</div>`:`<p class="evidence-note">${t('No saved Decision Tree answers are linked to this observation yet. Answering alone does not save them; choose “Save answers in a case” explicitly.','لا توجد إجابات متابعة محفوظة مرتبطة بالتسجيل بعد. الإجابة وحدها لا تحفظها؛ اختار «احفظ الإجابات في ملف حالة» باختيار صريح.')}</p>`}<p class="evidence-note">${model.linkedCases.length} ${t('linked organizational case(s). Case status does not establish clinical resolution.','ملفات متابعة مرتبطة. حالة الملف التنظيمية لا تثبت انتهاء المشكلة الطبية.')}</p><div class="evidence-actions">${btn('cases',t('Open case timelines','افتح ملفات المتابعة'),model.record.id)}</div>`}
 function view(){
  const record=selected(),values=[...records()].reverse();
  const intro=header()+`<div class="notice">${icon('info')}<p>${t('This trail uses only your actual saved observations. Missing data remains missing. It does not invent a source, measurement, health score or doctor response.','المسار يستخدم تسجيلاتك الفعلية المحفوظة فقط. المعلومات الناقصة تظل ناقصة. لا يختلق مصدرًا أو قياسًا أو درجة صحة أو رد طبيب.')}</p></div>`;
  if(!values.length)return intro+`<section class="panel panel-pad evidence-empty"><h2>${t('Start with one real observation.','ابدأ بقياس فعلي واحد.')}</h2><p>${t('Enter a measurement with its actual time. The evidence trail will connect it to context and follow-up without generating patient readings.','سجّل قياسًا بوقته الفعلي. المسار هيربطه بالسياق والمتابعة دون توليد قراءات للمستخدم.')}</p>${btn('record',t('Log a reading','سجّل قياسًا'),'',true)}</section>`;
  const list=`<aside class="panel panel-pad evidence-picker" aria-label="${t('Choose an observation','اختار تسجيلًا')}"><h2>${t('Choose the evidence','اختار التسجيل')}</h2>${values.map(item=>`<button data-action="evidence-select" data-id="${esc(item.id)}" class="evidence-pick ${item.id===selectedId?'selected':''}" aria-pressed="${item.id===selectedId}"><time>${esc(stamp(item.measured_at||item.timestamp))}</time><span>${Object.keys(item.values||{}).map(metricName).map(esc).join(' · ')}</span><small>${esc(source(item))}</small></button>`).join('')}</aside>`;
  if(!record)return intro+`<div class="evidence-layout">${list}<section class="panel panel-pad"><p>${t('The selected observation was removed. Select an existing one; this view will not silently retarget your actions.','التسجيل المختار اتحذف. اختار تسجيلًا موجودًا؛ إجراءاتك لا تُنقل لتسجيل آخر تلقائيًا.')}</p></section></div>`;
  const model=buildMissionEvidence(record,ctx.getMissionState());
  return intro+`<div class="evidence-layout">${list}<div class="evidence-chain">${step(1,t('The observation as recorded','القياس كما سُجّل'),reading(record))}${step(2,t('What supports this measurement?','إيه المعلومات اللي بتدعم القياس؟'),context(model))}${step(3,t('Why does it need a review?','ليه يحتاج مراجعة؟'),prompts(model))}${step(4,t('What was reported afterward?','إيه اللي اتسجّل بعد القياس؟'),followUps(model))}${step(5,t('A traceable handover','تقرير له أصل واضح'),`<p class="evidence-note">${t('Download the original reading, context, reference prompts and linked history for a human review. This is a local export; it sends no message and does not mark a concern resolved.','نزّل القياس الأصلي وسياقه والمراجع والمتابعة لمراجعة بشرية. ده تصدير محلي؛ لا يرسل رسالة ولا يعتبر المشكلة محلولة.')}</p><div class="evidence-actions">${btn('export',t('Download evidence handover','نزّل تقرير مسار المتابعة'),record.id,true)}</div>`)}</div></div>`;
 }
 function action(el){
  const action=el?.dataset?.action;if(!action?.startsWith('evidence-'))return false;
  if(action==='evidence-record'){if(ctx.logReading)ctx.logReading();else ctx.navigate('records');return true}
  const record=exact(el.dataset.id);
  if(action==='evidence-select'){selectedId=record.id;ctx.render()}
  else if(action==='evidence-followup')ctx.openFollowUp(record);
  else if(action==='evidence-context')ctx.openContext(record.id);
  else if(action==='evidence-cases')ctx.navigate('cases');
  else if(action==='evidence-export'){
   const model=buildMissionEvidence(record,ctx.getMissionState());
   const payload={app:'CosmoVital',type:'mission-evidence-handoff',schemaVersion:1,exportedAt:new Date().toISOString(),deliveryStatus:'not-sent',diagnosis:false,...model,
    limitations:['Original self-entered/imported observations are not independently verified.','Reference prompts are general adult information, not validated astronaut limits or diagnoses.','Saved follow-up answers are historical self-reports, not current symptoms or medical clearance.','No clinician was contacted and no concern was marked resolved by this export.']};
   ctx.download(JSON.stringify(payload,null,2),'CosmoVital-evidence-handover.json','application/json');
  }
  return true;
 }
 return {view,action};
}
