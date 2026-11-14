import {METRICS} from './core.js';
import {createDecisionSession,answerDecision,decisionStep} from './decision-tree.js';

export function createDecisionUI(ctx){
 const {t,esc,icon,modal,closeModal,toast}=ctx;
 let active=null,epoch=0,busy=false,saved=false,error='';
 const copy=value=>structuredClone(value);
 const pair=value=>Array.isArray(value)?t(String(value[0]??''),String(value[1]??value[0]??'')):String(value??'');
 const text=value=>esc(pair(value));
 const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}':JSON.stringify(value);
 const button=(action,label,primary=false,disabled=false)=>`<button class="btn ${primary?'btn-primary':'btn-light'}" data-action="decision-${action}" ${disabled?'disabled':''}>${label}</button>`;
 function current(){
  if(!active)throw new Error(t('Open a saved observation before starting a follow-up.','افتح تسجيلًا محفوظًا قبل بدء المتابعة.'));
  const record=ctx.getRecord(active.record.id);
  if(!record||stable(record)!==active.fingerprint)throw new Error(t('This observation changed or was removed. Restart with its current saved version before continuing.','التسجيل اتغيّر أو اتحذف. ابدأ من جديد بنسخته المحفوظة الحالية قبل المتابعة.'));
  return record;
 }
 function sourceDetails(record){
  const stamp=record.measured_at||record.timestamp;
  return `<details class="decision-observation"><summary>${t('The saved observation used here','التسجيل المحفوظ المستخدم هنا')}</summary><dl><div><dt>${t('Actual measurement time','وقت القياس الفعلي')}</dt><dd><time datetime="${esc(stamp)}" dir="ltr">${esc(stamp)}</time></dd></div><div><dt>${t('Source','المصدر')}</dt><dd>${record.source==='manual'?t('Self-entered · unverified','إدخال شخصي · غير متحقق'):t('Imported · unverified','مستورد · غير متحقق')}${record.source_reference?'<br>'+esc(record.source_reference):''}</dd></div><div><dt>${t('Measurement context','ظروف القياس')}</dt><dd>${esc(({resting:t('At rest','في الراحة'),'post-exercise':t('After exercise','بعد المجهود'),other:t('Other','أخرى'),unknown:t('Not recorded','غير مسجّل')})[record.context]||t('Not recorded','غير مسجّل'))}</dd></div></dl><ul>${Object.entries(record.values||{}).map(([key,value])=>`<li>${esc(t(METRICS[key]?.label||key,METRICS[key]?.ar||key))}: <strong dir="ltr">${esc(value)} ${esc(METRICS[key]?.unit||'')}</strong></li>`).join('')}</ul>${record.symptoms?`<p><strong>${t('Saved symptoms','أعراض محفوظة')}: </strong>${esc(record.symptoms)}</p>`:''}${record.notes?`<p><strong>${t('Saved notes','ملاحظات محفوظة')}: </strong>${esc(record.notes)}</p>`:''}<small>${t('The original values and source stay unchanged. Answers below describe what you report now.','القيم والمصدر الأصليان يظلان كما هما. الإجابات التالية تصف ما تُبلّغ عنه الآن.')}</small></details>`;
 }
 function warning(){return `<div class="decision-warning" role="note">${icon('shield')}<p><strong>${t('Severe symptoms take priority.','الأعراض الشديدة لها الأولوية.')}</strong> ${t('If there is severe breathing difficulty, chest pain, sudden stroke signs, or unresponsiveness now, request emergency help or follow the approved mission emergency protocol immediately. Do not wait to finish these questions or repeat a reading.','إذا توجد صعوبة شديدة في التنفس أو ألم بالصدر أو علامات جلطة مفاجئة أو عدم استجابة الآن، اطلب الطوارئ أو اتبع بروتوكول طوارئ المهمة المعتمد فورًا. لا تنتظر إتمام الأسئلة أو إعادة القياس.')}</p></div>`}
 function resultView(result,{preview=false}={}){
  const level=['emergency','urgent','review','info'].includes(result.level)?result.level:'info';
  const sources=(result.sources||[]).filter(source=>{try{const url=new URL(source.url);return url.protocol==='https:'&&!url.username&&!url.password}catch{return false}});
  return `<section class="decision-result decision-${level}" data-decision-level="${level}" ${['emergency','urgent'].includes(level)?'role="alert"':'role="status"'}><span class="eyebrow">${preview?t('GUIDANCE WHILE YOU ANSWER','إرشاد أثناء الإجابة'):t('NEXT STEPS FROM YOUR ANSWERS','الخطوات التالية من إجاباتك')}</span><h3>${text(result.title)}</h3><p>${text(result.summary)}</p>${Array.isArray(result.steps)&&result.steps.length?`<ol class="decision-steps">${result.steps.map(step=>`<li><strong>${text(step.title)}</strong><p>${text(step.body)}</p></li>`).join('')}</ol>`:''}${Array.isArray(result.avoid)&&result.avoid.length?`<div class="decision-avoid"><strong>${t('Keep these limits in mind','التزم بالحدود دي')}</strong><ul>${result.avoid.map(item=>`<li>${text(item)}</li>`).join('')}</ul></div>`:''}${sources.length?`<details class="decision-sources"><summary>${t('Scientific references · links need internet','المراجع العلمية · الروابط تحتاج إنترنت')}</summary><ul>${sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ${icon('external')}</a></li>`).join('')}</ul></details>`:''}</section>`;
 }
 function questionView(step){
  const q=step.question;
  if(!q||!Array.isArray(q.options))throw new Error('The follow-up question is unavailable. Restart the follow-up.');
  return `<section class="decision-question" aria-labelledby="decision-question-label"><div class="decision-progress"><span>${t('Answer only what you know. “Not sure” is allowed.','جاوب بالمعلومات اللي تعرفها فقط. «مش متأكد» اختيار متاح.')}</span>${step.progress?`<span>${esc(step.progress.answered)} / ${esc(step.progress.total)}</span>`:''}</div><h3 id="decision-question-label">${text(q.label)}</h3><p>${text(q.hint)}</p><div class="decision-options">${q.options.map(option=>`<button class="btn btn-light" data-action="decision-answer" data-question="${esc(q.id)}" data-value="${esc(option.value)}" ${busy?'disabled':''}>${text(option.label)}</button>`).join('')}</div></section>`;
 }
 function render(){
  if(!active)return;
  const record=current(),step=decisionStep(record,active.session);
  active.session=copy(step.session||active.session);
  const result=step.result,isResult=step.status==='result';
  if(!result)throw new Error('Follow-up guidance is unavailable. Restart the follow-up.');
  const historical=result.historical||Date.now()-Date.parse(record.measured_at||record.timestamp)>86400000;
  const body=`<div class="decision-flow">${warning()}${sourceDetails(record)}${historical?`<p class="decision-historical">${t('Historical observation: these numbers do not establish your current condition. Current symptoms take priority.','تسجيل قديم: الأرقام دي لا تحدد حالتك الحالية. الأعراض الموجودة الآن لها الأولوية.')}</p>`:''}${!isResult?questionView(step):''}${isResult||['emergency','urgent'].includes(result.level)?resultView(result,{preview:!isResult}):''}${(step.limitations||[]).length?`<div class="decision-limitations">${step.limitations.map(item=>`<p>${text(item)}</p>`).join('')}</div>`:''}${saved?`<div class="decision-saved" role="status">${t('Answers and follow-up were saved in a local case timeline. No clinician was contacted.','تم حفظ الإجابات والمتابعة في تسلسل ملف حالة محلي. لم يتم التواصل مع طبيب.')}<p>${t('Answers are a snapshot at','الإجابات لقطة في وقت')} <time dir="ltr">${esc(active.session.updatedAt)}</time>. ${t('They are not live symptom monitoring or medical clearance. Start a new check if the situation changes.','ليست متابعة حية للأعراض أو تصريحًا طبيًا بالسلامة. ابدأ فحصًا جديدًا لو الوضع اتغيّر.')}</p></div>`:''}${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}<p class="helper-note">${t('This tool organizes general interim guidance. It does not diagnose a condition, prescribe medicine or confirm that a clinician received your information. Answers stay temporary until you choose to save or export them.','الأداة تنظّم إرشادات مؤقتة عامة؛ لا تشخّص حالة ولا تصف دواءً ولا تؤكد استلام طبيب لمعلوماتك. الإجابات مؤقتة حتى تختار حفظها أو تصديرها.')}</p></div>`;
  const footer=`<div class="decision-actions">${button('close',t('Close','إغلاق'),false,busy)}${button('restart',t('Start a new check','ابدأ فحصًا جديدًا'),false,busy)}${button('download',t('Download follow-up · not sent','نزّل المتابعة · لم تُرسل'),false,busy)}${isResult?button('save',busy?t('Saving locally…','جارٍ الحفظ محليًا…'):saved?t('Saved locally','تم الحفظ محليًا'):t('Save answers in a case','احفظ الإجابات في ملف حالة'),true,busy||saved):''}</div>`;
  modal(esc(t('A clear next step, one question at a time.','خطوة تالية واضحة، سؤال بسؤال.')),esc(t('Follow-up for a saved observation · not a diagnosis.','متابعة لتسجيل محفوظ · ليست تشخيصًا.')),body,footer);
 }
 function renderFailure(message){
  if(!active)return;
  modal(esc(t('Follow-up needs attention.','المتابعة تحتاج مراجعة.')),esc(t('Your saved health values have not been changed by these answers.','الإجابات دي لم تغيّر قيمك الصحية المحفوظة.')),`<div class="decision-flow">${warning()}<p class="form-error" role="alert">${esc(message)}</p><p>${t('Close this follow-up, or restart using the observation currently saved on this device.','اقفل المتابعة أو ابدأ من جديد بالتسجيل المحفوظ حاليًا على الجهاز.')}</p></div>`,`<div class="decision-actions">${button('close',t('Close','إغلاق'))}${button('restart',t('Restart with saved observation','ابدأ بالتسجيل المحفوظ'))}</div>`);
 }
 function clearSensitive(){epoch++;active=null;busy=false;saved=false;error=''}
 function open(record){
  clearSensitive();
  const session=createDecisionSession(record);
  active={record:copy(record),fingerprint:stable(record),session};
  try{render()}catch(problem){renderFailure(problem.message)}
 }
 async function action(el){
  const a=el?.dataset?.action;
  if(!a?.startsWith('decision-'))return false;
  try{
   if(busy)throw new Error(t('Wait for the local save to finish.','انتظر اكتمال الحفظ المحلي.'));
   if(a==='decision-close'){clearSensitive();closeModal();return true}
   if(a==='decision-restart'){
    const record=active&&ctx.getRecord(active.record.id);
    if(!record)throw new Error(t('The original observation no longer exists. Close this follow-up.','التسجيل الأصلي لم يعد موجودًا. اقفل المتابعة.'));
    open(record);return true;
   }
   const record=current(),step=decisionStep(record,active.session);
   if(a==='decision-answer'){
    if(step.status!=='question'||el.dataset.question!==step.question?.id)throw new Error(t('This question is no longer current. Use the question shown now.','السؤال ده لم يعد الحالي. استخدم السؤال المعروض الآن.'));
    active.session=answerDecision(record,active.session,String(el.dataset.question),String(el.dataset.value));error='';render();
   }else if(a==='decision-download'){
    const payload={app:'CosmoVital',type:'local-health-followup',schemaVersion:1,deliveryStatus:'not-sent',exported_at:new Date().toISOString(),answeringComplete:step.status==='result',record:copy(record),session:copy(active.session),guidance:copy(step.result),limitations:copy(step.limitations||[])};
    ctx.download(JSON.stringify(payload,null,2),'CosmoVital-follow-up.json','application/json');toast(t('Follow-up download requested. Nothing was sent to a clinician.','طُلب تنزيل المتابعة. لم يُرسل شيء لطبيب.'));
   }else if(a==='decision-save'){
    if(step.status!=='result')throw new Error(t('Answer the current follow-up questions before saving the summary. Emergency help must never wait for this form.','جاوب أسئلة المتابعة الحالية قبل حفظ الملخص. المساعدة الطارئة لا تنتظر النموذج أبدًا.'));
    if(saved)return true;
    const stamp=epoch;busy=true;error='';render();
    try{await ctx.saveFollowUp(copy(record),copy(active.session),copy(step.result));if(stamp!==epoch)return true;current();saved=true;toast(t('Follow-up saved locally. No clinician was contacted.','تم حفظ المتابعة محليًا. لم يتم التواصل مع طبيب.'))}
    finally{if(stamp===epoch)busy=false}
    if(stamp===epoch)render();
   }
  }catch(problem){error=problem.message||t('Unable to complete this follow-up action.','تعذّر إكمال إجراء المتابعة.');if(active)try{render()}catch{renderFailure(error)}else toast(error)}
  return true;
 }
 return {open,action,clearSensitive};
}
