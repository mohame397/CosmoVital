import {validateRecord,assessRecord,statusFor} from './core.js';
import {SYMPTOM_QUESTIONS,buildGuidance} from './guidance.js';

const pair=(en,ar)=>[en,ar];
const copy=value=>structuredClone(value);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const HEART_SOURCE=Object.freeze({label:'American Heart Association · Resting heart rate',url:'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates'});
const choices=(entries)=>entries.map(([value,en,ar])=>({value,label:pair(en,ar)}));
const yesNoUnknown=()=>choices([['yes','Yes','نعم'],['no','No','لا'],['unknown','Not sure / unknown','غير متأكد / غير معروف']]);
const warnings=SYMPTOM_QUESTIONS.map(q=>({id:q.key,label:copy(q.label),hint:copy(q.hint),options:yesNoUnknown()}));
const contextQuestions=[
 {id:'currentness',label:pair('Does this saved measurement concern the situation you are dealing with now?','هل القياس المحفوظ يخص الحالة التي تتعامل معها الآن؟'),hint:pair('Check the actual measurement time. A past reading cannot establish your current condition. Current warning signs always take priority.','راجع وقت القياس الفعلي. القراءة القديمة لا تحدد حالتك الآن، وعلامات الخطر الحالية لها الأولوية دائمًا.'),options:choices([['current','Current concern','مشكلة حالية'],['historical','Past event / historical reading','حدث سابق / قراءة تاريخية'],['unknown','Not sure','غير متأكد']])},
 {id:'activity',label:pair('What was the activity context when the measurement was taken?','ما ظروف النشاط وقت أخذ القياس؟'),hint:pair('The 60–100 bpm reference is a broad adult resting reference, not an exercise target or a diagnosis. Your answer does not rewrite the original observation.','مرجع ٦٠–١٠٠ نبضة/دقيقة عام للبالغين في الراحة، وليس هدفًا أثناء التمرين أو تشخيصًا. إجابتك لا تعدّل التسجيل الأصلي.'),options:choices([['resting','At rest','في الراحة'],['post-exercise','After exercise / exertion','بعد تمرين / مجهود'],['other','Other activity','نشاط آخر'],['unknown','Unknown / not recorded','غير معروف / لم يُسجّل']])},
 {id:'device',label:pair('Do you know the device or measurement source?','هل تعرف الجهاز أو مصدر القياس؟'),hint:pair('Record a source only if known. Knowing the device does not independently verify its accuracy.','سجّل المصدر فقط إذا كان معروفًا. معرفة الجهاز لا تثبت دقته بصورة مستقلة.'),options:choices([['known','Device / source is known','الجهاز / المصدر معروف'],['unknown','Unknown / not available','غير معروف / غير متاح']])},
 {id:'signal',label:pair('Was the signal or measurement stable according to the device instructions?','هل كانت الإشارة أو القراءة مستقرة وفق تعليمات الجهاز؟'),hint:pair('Movement, fit and the measurement method may affect the reading. Do not delay medical help to investigate a device.','الحركة والتثبيت وطريقة القياس قد تؤثر على القراءة. لا تؤخر المساعدة الطبية لفحص جهاز.'),options:choices([['stable','Reported stable','مستقرة حسب الملاحظة'],['unstable','Unstable / uncertain signal','غير مستقرة / إشارة غير موثوقة'],['unknown','Unknown / not checked','غير معروف / لم يُفحص']])},
 {id:'rechecked',label:pair('Has another measurement actually been taken?','هل أُخذ قياس آخر بالفعل؟'),hint:pair('This answer does not create a new reading or prove improvement. Record any actual new value and its own time separately. Rechecking must not delay help.','الإجابة لا تنشئ قراءة جديدة ولا تثبت التحسن. سجّل أي قيمة جديدة فعلية مع وقتها منفصلًا. إعادة القياس لا تؤخر المساعدة.'),options:yesNoUnknown()},
 {id:'persistent',label:pair('Is the concern continuing, recurring, or still worrying you?','هل المشكلة مستمرة أو متكررة أو ما زالت تقلقك؟'),hint:pair('Arrange professional review for continuing symptoms or concerns. If warning signs appear, use emergency services or the approved mission procedure immediately.','رتّب مراجعة مختص للأعراض أو القلق المستمر. إذا ظهرت علامات خطر، استخدم الطوارئ أو إجراء المهمة المعتمد فورًا.'),options:yesNoUnknown()}
];
const questions=[...warnings,...contextQuestions];
const LIMITATIONS=[
 pair('This is a deterministic follow-up checklist, not diagnosis, prescribing, treatment approval or medical clearance.','هذه قائمة متابعة محددة الخطوات، وليست تشخيصًا أو وصف أدوية أو اعتماد علاج أو تصريحًا طبيًا بالسلامة.'),
 pair('Answers describe the time they were entered. A saved session is historical self-report, not current symptom monitoring; start a new check to reassess now.','الإجابات تصف وقت إدخالها. الجلسة المحفوظة إقرار شخصي تاريخي وليست مراقبة للأعراض الحالية؛ ابدأ فحصًا جديدًا لإعادة التقييم الآن.'),
 pair('Unknown is not the same as absent. Exercise, a repeat measurement, or completing the questions never proves a concern has resolved.','غير معروف لا يعني غير موجود. المجهود أو إعادة القياس أو إكمال الأسئلة لا يثبت انتهاء المشكلة.'),
 pair('Current warning signs and approved mission procedures take priority. Never wait to finish these questions or recheck a device before getting urgent help.','علامات الخطر الحالية وإجراءات المهمة المعتمدة لها الأولوية. لا تنتظر إكمال الأسئلة أو إعادة فحص الجهاز قبل طلب المساعدة العاجلة.')
];
function instant(value){const n=typeof value==='number'?value:Date.parse(value);if(!Number.isFinite(n))throw new Error('Choose a valid follow-up time.');return new Date(n).toISOString()}
function recordOf(raw){if(!plain(raw)||typeof raw.id!=='string'||!raw.id)throw new Error('Choose an existing saved observation for follow-up.');return validateRecord(raw)}
const fingerprint=record=>JSON.stringify(record);
function checked(record,raw){
 if(!plain(raw)||raw.schemaVersion!==1||raw.id!=='decision-'+record.id||raw.recordId!==record.id||raw.recordFingerprint!==fingerprint(record)||!plain(raw.answers))throw new Error('This follow-up does not match the saved observation, or the observation changed. Start a new check.');
 if(Object.keys(raw).some(k=>!['schemaVersion','id','recordId','recordFingerprint','startedAt','updatedAt','answers'].includes(k)))throw new Error('Unknown follow-up session field.');
 const startedAt=instant(raw.startedAt),updatedAt=instant(raw.updatedAt);
 if(Date.parse(updatedAt)<Date.parse(startedAt))throw new Error('The follow-up update precedes its start.');
 let gap=false;for(const question of questions){if(!own(raw.answers,question.id))gap=true;else if(gap)throw new Error('Saved follow-up answers skip an earlier question. Start a new check.')}
 for(const [key,value]of Object.entries(raw.answers)){
  const q=questions.find(item=>item.id===key);if(!q||!q.options.some(option=>option.value===value))throw new Error('Invalid follow-up answer: '+key);
 }
 return {schemaVersion:1,id:raw.id,recordId:raw.recordId,recordFingerprint:raw.recordFingerprint,startedAt,updatedAt,answers:{...raw.answers}};
}

export function needsDecisionFollowUp(raw){
 try{const record=recordOf(raw);return assessRecord(record).some(a=>['review','urgent'].includes(a.severity))||record.context==='unknown'&&statusFor('heart',record.values.heart)==='review'}catch{return false}
}
export function createDecisionSession(raw,{now=Date.now()}={}){
 const record=recordOf(raw),at=instant(now);
 return {schemaVersion:1,id:'decision-'+record.id,recordId:record.id,recordFingerprint:fingerprint(record),startedAt:at,updatedAt:at,answers:{}};
}
export function validateDecisionSession(rawRecord,session){return checked(recordOf(rawRecord),session)}

function withContext(record,session,now){
 const answers=session.answers,result=buildGuidance(record,answers,now);
 if(own(record.values,'heart')&&!result.sources.some(source=>source.url===HEART_SOURCE.url))result.sources.push({...HEART_SOURCE});
 if(result.level==='emergency')return result;
 const add=(code,title,body)=>{if(!result.reasonCodes.includes(code))result.reasonCodes.push(code);result.steps.push({title,body})};
 if(answers.currentness==='historical')add('followup-historical',pair('Keep the original time visible','احتفظ بوقت القياس الأصلي ظاهرًا'),pair('You described this as a past event. It does not establish your current condition. Current symptoms take priority; record a new measurement only if actually taken.','وصفت التسجيل كحدث سابق، وهو لا يحدد حالتك الآن. الأعراض الحالية لها الأولوية؛ سجّل قياسًا جديدًا فقط إذا أُخذ بالفعل.'));
 if(answers.currentness==='unknown')add('followup-currentness-unknown',pair('Currentness is unknown','حداثة الحالة غير معروفة'),pair('The recorded timestamp is available, but you have not confirmed whether this concern is current. Do not treat the old number as live monitoring or assume the concern has ended.','وقت التسجيل متاح، لكنك لم تؤكد هل المشكلة حالية. لا تعتبر الرقم مراقبة حية ولا تفترض انتهاء المشكلة.'));
 if(answers.currentness==='current'&&result.historical)add('followup-time-conflict',pair('Check the time and the current concern','راجع وقت القياس والمشكلة الحالية'),pair('You reported a current concern, but the saved observation is historical. Keep the original timestamp and describe the current symptoms separately; do not relabel an old measurement as newly taken.','أبلغت عن مشكلة حالية لكن التسجيل تاريخي. احتفظ بوقته الأصلي وصف الأعراض الحالية منفصلًا؛ لا تغيّر وصف قياس قديم إلى قياس جديد.'));
 if(answers.activity&&answers.activity!==record.context)add('followup-context-differs',pair('The original activity context remains unchanged','ظروف النشاط الأصلية لم تتغيّر'),pair('Your follow-up answer differs from the saved context. Review or explicitly correct the original record if it was inaccurate. This checklist does not rewrite it or apply a resting interpretation to an unknown or exercise reading.','إجابة المتابعة تختلف عن ظروف النشاط المحفوظة. راجع التسجيل الأصلي أو صحّحه باختيار صريح إذا كان غير دقيق. القائمة لا تعدّله ولا تطبّق تفسير الراحة على قراءة مجهولة الظروف أو بعد مجهود.'));
 if(answers.activity==='post-exercise')add('followup-after-exercise',pair('Exercise does not provide medical clearance','المجهود لا يثبت السلامة الطبية'),pair('A broad resting reference is not an exercise target. Reporting exercise does not explain away symptoms or prove recovery. Discuss concerns or repeated changes with a medical professional.','مرجع الراحة العام ليس هدفًا أثناء التمرين. الإبلاغ عن مجهود لا يفسّر الأعراض تلقائيًا ولا يثبت التعافي. ناقش القلق أو التغيرات المتكررة مع مختص طبي.'));
 if(answers.activity==='unknown')add('followup-activity-unknown',pair('Activity remains unknown','ظروف النشاط ما زالت غير معروفة'),pair('Do not assume this reading was taken at rest. The broad adult resting heart-rate reference cannot establish the meaning of an unknown-context reading.','لا تفترض أن القياس أُخذ في الراحة. مرجع نبض البالغين العام في الراحة لا يحدد معنى قراءة مجهولة الظروف.'));
 if(answers.device==='unknown')add('followup-source-unknown',pair('Retain missing source information','احتفظ بكون المصدر غير معروف'),pair('The measurement source is unknown or unavailable. Add the device and method only when known; the application cannot independently verify accuracy.','مصدر القياس غير معروف أو غير متاح. أضف الجهاز والطريقة فقط عند معرفتهما؛ التطبيق لا يستطيع التحقق من الدقة بصورة مستقلة.'));
 if(answers.device==='known'&&!record.meta.device)add('followup-source-details-missing',pair('Add known source details explicitly','أضف تفاصيل المصدر المعروفة باختيارك'),pair('You reported knowing the source, but the original device field is blank. If appropriate, correct the record with the known source; this answer does not invent device details.','أبلغت عن معرفة المصدر، لكن خانة الجهاز الأصلية فارغة. صحّح التسجيل بالمصدر المعروف عند اللزوم؛ الإجابة لا تختلق تفاصيل جهاز.'));
 if(answers.signal==='unstable'||answers.signal==='unknown')add('followup-signal-'+answers.signal,pair('Measurement stability has limitations','استقرار القياس له حدود'),pair('The signal was reported unstable or was not checked. Follow the actual device instructions if safe. Do not delay medical contact to inspect a device; a different number does not cancel warning symptoms.','أُبلغ عن إشارة غير مستقرة أو لم تُفحص. اتبع تعليمات الجهاز الفعلي إن كان آمنًا. لا تؤخر التواصل الطبي لفحص جهاز؛ اختلاف الرقم لا يلغي علامات الخطر.'));
 if(answers.rechecked==='yes')add('followup-repeat-reported',pair('A repeat answer is not another reading','الإجابة عن الإعادة ليست قراءة أخرى'),pair('You reported another measurement, but no value or timestamp was collected by this question. Save the actual reading separately. Improvement or resolution has not been established.','أبلغت عن قياس آخر لكن السؤال لم يجمع قيمة أو وقتًا. سجّل القراءة الفعلية منفصلة. لم يثبت التحسن أو انتهاء المشكلة.'));
 if(answers.rechecked==='no'||answers.rechecked==='unknown')add('followup-repeat-unconfirmed',pair('Recheck only without delaying appropriate help','أعد القياس فقط دون تأخير المساعدة المناسبة'),pair('A repeat measurement is not confirmed. If safe and consistent with your approved care or mission procedure, follow the device measurement instructions and record the actual time. Do not postpone medical contact while collecting numbers.','إعادة القياس غير مؤكدة. إذا كان آمنًا ومتسقًا مع خطة رعايتك أو إجراء المهمة المعتمد، اتبع تعليمات القياس وسجّل الوقت الفعلي. لا تؤجل التواصل الطبي لجمع أرقام.'));
 if(answers.persistent==='yes')add('followup-concern-persists',pair('Request review of the continuing concern','اطلب مراجعة المشكلة المستمرة'),pair('You report a continuing, recurring or worrying concern. Contact your clinician or crew medical lead and share the dated observations and answers. Current warning signs require emergency help rather than completion of this checklist.','أبلغت عن مشكلة مستمرة أو متكررة أو مقلقة. تواصل مع طبيبك أو مسؤول طب الطاقم وشارك القياسات والإجابات المؤرخة. علامات الخطر الحالية تحتاج الطوارئ بدل استكمال القائمة.'));
 if(answers.persistent==='no'||answers.persistent==='unknown')add('followup-no-clearance',pair('No automated all-clear','لا يوجد تأكيد آلي للسلامة'),pair('A concern reported absent or uncertain does not prove clinical recovery. This checklist cannot decide fitness for duty or replace professional assessment; seek advice for symptoms or concerns regardless of the reading.','الإبلاغ عن غياب القلق أو عدم التأكد لا يثبت التعافي الطبي. القائمة لا تحدد اللياقة للعمل ولا تستبدل تقييم المختص؛ اطلب المشورة للأعراض أو القلق مهما كانت القراءة.'));
 return result;
}

export function decisionStep(rawRecord,rawSession,{now=Date.now()}={}){
 const record=recordOf(rawRecord),session=checked(record,rawSession),at=instant(now),result=withContext(record,session,Date.parse(at));
 const pending=result.level==='emergency'?null:questions.find(q=>!own(session.answers,q.id))||null;
 const question=pending?copy(pending):null;if(question?.id==='activity'&&!own(record.values,'heart'))question.hint=pair('Describe the activity context at the actual measurement time. Your answer does not rewrite the original observation or establish medical safety.','صف ظروف النشاط وقت القياس الفعلي. إجابتك لا تعدّل التسجيل الأصلي ولا تثبت السلامة الطبية.');
 return {status:pending?'question':'result',question,result,session,recordId:record.id,answeredAt:session.updatedAt,progress:{answered:Object.keys(session.answers).length,total:questions.length},limitations:copy(LIMITATIONS)};
}
export function answerDecision(rawRecord,rawSession,questionId,value,{now=Date.now()}={}){
 const model=decisionStep(rawRecord,rawSession,{now});
 if(!model.question||model.question.id!==questionId)throw new Error('This question is not the current follow-up step. Reopen the current check.');
 if(!model.question.options.some(option=>option.value===value))throw new Error('Choose one of the explicit follow-up answers.');
 const updatedAt=instant(now);if(Date.parse(updatedAt)<Date.parse(model.session.startedAt))throw new Error('The answer time precedes the follow-up start.');
 return {...model.session,updatedAt,answers:{...model.session.answers,[questionId]:value}};
}
export function serializeDecisionSession(rawRecord,rawSession,{consent=false,now=Date.now()}={}){
 if(consent!==true)throw new Error('Explicit consent is required before saving follow-up answers locally.');
 const record=recordOf(rawRecord),session=checked(record,rawSession);
 return JSON.stringify({app:'CosmoVital',type:'decision-followup',schemaVersion:1,recordId:record.id,savedAt:instant(now),session});
}
