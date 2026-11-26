/* Executive read-only supervisor workspace. No account impersonation or database writes. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) api.mount(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const norm = value => String(value ?? '').trim().toLowerCase();
  const text = value => String(value ?? '').trim();
  const list = value => Array.isArray(value) ? value : [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const privateKey = /password|token|secret|api.?key|correct(index|text|answer)|answerkey|contentBase64/i;
  function sanitize(value) {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== 'object' || typeof value.toDate === 'function') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKey.test(key)).map(([key,v]) => [key,sanitize(v)]));
  }
  function refs(value) {
    if (Array.isArray(value)) return value.flatMap(refs);
    if (value && typeof value === 'object') return [value.id,value.uid,value.email,value.username,value.teacherEmail,value.value].flatMap(refs);
    return norm(value) ? [norm(value)] : [];
  }
  const identities = record => refs([record?.id,record?.uid,record?.authUid,record?.email,record?.username,record?.teacherEmail,record?.code,record?._keys]);
  const assigned = supervisor => refs([supervisor.assignedTeacherEmails,supervisor.assignedTeacherIds,supervisor.assignedTeachers]);
  function scopeTeachers(supervisor, teachers) {
    if (norm(supervisor.supervisorType) !== 'supervisor') return teachers;
    const allow = new Set(assigned(supervisor));
    return teachers.filter(t => identities(t).some(key => allow.has(key)));
  }
  function mergeTeachers(teachers, users) {
    const result=[],index=new Map();
    for(const row of [...teachers,...users.filter(u=>norm(u.role)==='teacher')]){
      const keys=identities(row),matches=[...new Set(keys.map(k=>index.get(k)).filter(Boolean))];
      const target=matches[0]||{};
      if(!matches.length)result.push(target);
      for(const data of [...matches.slice(1),row]){
        for(const [key,value] of Object.entries(data)){
          if(key==='_keys')continue;
          if(key==='assignments')target.assignments=[...new Map([...list(target.assignments),...list(value)].map(a=>[JSON.stringify(a),a])).values()];
          else if(target[key]==null||target[key]==='')target[key]=value;
        }
      }
      target._keys=[...new Set([...identities(target),...matches.flatMap(identities),...keys])];
      matches.slice(1).forEach(other=>result.splice(result.indexOf(other),1));
      target._keys.forEach(k=>index.set(k,target));
    }
    return result;
  }
  function makeContext(supervisor, teachers) {
    const scoped = scopeTeachers(supervisor, teachers);
    return {supervisor,teachers:scoped,restricted:norm(supervisor.supervisorType)==='supervisor',teacherKeys:new Set(scoped.flatMap(identities)),classes:scoped.flatMap(t => list(t.assignments))};
  }
  const optIn = new Set(['gradeSheetPrint','blankGradeSheet','gradeImprovement','retestNotices','studentFollowupView','englishActivitiesManage','questionBanksView']);
  function canSee(supervisor, permission) {
    if (!permission) return true;
    return optIn.has(permission) ? supervisor.permissions?.[permission] === true : supervisor.permissions?.[permission] !== false;
  }
  function inClass(row, context) {
    if (!context.restricted) return true;
    return context.classes.some(a => text(a.grade) === text(row.grade) && text(a.section) === text(row.section));
  }
  function ownedBy(row, supervisor) {
    const own = new Set(identities(supervisor));
    return refs([row.supervisorEmail,row.supervisorId,row.supervisorUid,row.createdBy,row.createdByEmail,row.updatedBy]).some(v => own.has(v));
  }
  function teacherMatch(row, context) {
    return refs([row.teacherEmail,row.teacherUsername,row.teacherId,row.teacherUid,row.ownerEmail,row.createdBy,row.senderEmail,row.recipientEmail,row.teachers,row.teacherIds]).some(k => context.teacherKeys.has(k));
  }
  function scopeRecords(kind, rows, context) {
    if (['trainingCourses','supervisionWeeklyPlans','supervisionWeeklyLogs'].includes(kind)) return rows.filter(r => ownedBy(r,context.supervisor));
    if (kind === 'staffSharedFiles') return rows.filter(r => refs([r.senderEmail,r.recipientEmail]).some(k => identities(context.supervisor).includes(k)));
    if (kind === 'staffDocumentationRequests') return rows.filter(r => identities(context.supervisor).includes(norm(r.owner)));
    if (!context.restricted) return rows;
    if (kind === 'teachers') return scopeTeachers(context.supervisor,rows);
    if (kind === 'grades') return rows.filter(r => teacherMatch(r,context) || context.classes.some(a => text(a.grade)===text(r.grade) && text(a.section)===text(r.section) && text(a.subjectId)===text(r.subjectId)));
    if (kind === 'students' || kind === 'studentClassAttendance' || kind === 'studentFollowupEvents' || kind === 'guidanceIncidents' || kind === 'weeklyPlans') return rows.filter(r => inClass(r,context));
    if (kind === 'subjects') return rows.filter(r => context.classes.some(a => text(a.subjectId) === text(r.id)));
    if (kind === 'tests') return rows.filter(r => list(r.classes).some(c => context.classes.some(a => text(a.grade)===text(c.grade) && text(a.section)===text(c.section) && text(a.subjectId)===text(r.subjectId))));
    if (kind === 'examSchedules') return rows.filter(r => teacherMatch(r,context) || list(r.classes).some(c => inClass(c,context)) || (r.grade && inClass(r,context)));
    return rows.filter(r => teacherMatch(r,context) || ownedBy(r,context.supervisor));
  }
  function phone(value) { let p=text(value).replace(/\D/g,''); if(p.startsWith('00966'))p=p.slice(2); if(/^05\d{8}$/.test(p))p='966'+p.slice(1); if(/^5\d{8}$/.test(p))p='966'+p; return p; }
  function matchVisitAccount(supervisor, accounts) {
    const links=refs([supervisor.followUpId,supervisor.followUpSupervisorId,supervisor.visitSupervisorId]);
    if(links.length){const matches=accounts.filter(a=>identities(a).some(id=>links.includes(id)));return matches.length===1?matches[0]:null;}
    const p=phone(supervisor.phone||supervisor.mobile);
    if(p){const matches=accounts.filter(a=>[a.username,a.phone,a.mobile].some(x=>phone(x)===p));if(matches.length)return matches.length===1?matches[0]:null;}
    const name=norm(supervisor.name);if(!name)return null;
    const matches=accounts.filter(a=>norm(a.name)===name);return matches.length===1?matches[0]:null;
  }
  function visitScore(row) {
    const value=row.finalScore;
    if(value==null||String(value).trim()==='')return '—';
    const score=Number(value);
    return Number.isFinite(score)?score+' / 100':'—';
  }
  function teacherDisplayName(value, teachers) {
    const keys=refs(value),raw=text(typeof value==='object'?(value?.name||value?.email||value?.id):value);
    const isName=v=>/[A-Za-z\u0621-\u064A]/.test(text(v))&&!/@/.test(text(v));
    const phoneKey=v=>/^[+\d\s()-]+$/.test(text(v))&&phone(v).length>=9?phone(v):'';
    const matched=teachers.filter(t=>identities(t).some(k=>keys.includes(k))||[t.phone,t.mobile,...identities(t)].some(k=>phoneKey(k)&&keys.some(ref=>phoneKey(ref)===phoneKey(k))));
    const names=[...new Set(matched.map(t=>[t.name,t.fullName,t.displayName,t.teacherName].find(isName)).filter(Boolean))];
    if(names.length===1)return names[0];
    if(!matched.length&&isName(raw))return raw;
    return 'اسم المعلم غير متاح';
  }
  function readOnly(store) {
    return Object.freeze({collection(name){const ref=store.collection(name);return Object.freeze({get:()=>ref.get(),doc(id){return Object.freeze({get:()=>ref.doc(id).get()})}});}});
  }
  const groups=['الخدمات الرئيسية','التحليل والمتابعة','التوجيه والتدريب','البيانات والسجلات'];
  const modules = [
    ['remote','متابعة التعلّم عن بُعد','🎓',0,'','remoteSessions','الحصص والحضور'],
    ['weekly','متابعة الخطة الأسبوعية','📅',0,'','weeklyPlans','خطط رواد الفصول'],
    ['visits','الزيارات الفنية','📋',0,'','visits','الزيارات والتقارير الفنية'],
    ['activities','تقارير الأنشطة','🎯',0,'activitiesView','activities','التقارير وحالة الاعتماد'],
    ['banks','متابعة بنوك الأسئلة','📚',0,'questionBanksView','questionBankSheets','أوراق العمل المرفوعة'],
    ['english','أنشطة اللغة الإنجليزية','🎧',0,'','englishActivities','الأنشطة ونتائج التدريب'],
    ['analysis','تحليل النتائج','📊',1,'analysisView','grades','نتائج الطلاب والفصول'],
    ['comparison','مقارنة النتائج','📈',1,'comparisonView','grades','المقارنة بين الفصول والمواد'],
    ['blank','كشف فارغ مرن','🗒️',1,'blankGradeSheet','students','عرض وطباعة كشف الطلاب'],
    ['improvements','تحسين الدرجات','📈',1,'gradeImprovement','grades','سجل محاولات التحسين'],
    ['retests','مستحقو إعادة الاختبار','🔁',1,'retestNotices','grades','حصر الطلاب حسب حد الدرجة'],
    ['gradeSheet','كشف الدرجات','🖨️',1,'gradeSheetPrint','grades','الدرجات المرصودة والغياب'],
    ['followup','متابعة الطلاب','📌',1,'studentFollowupView','studentFollowupEvents','الملاحظات والحضور والمتابعة'],
    ['monitoring','حالة الرصد','📋',1,'monitoringView','grades','متابعة الدرجات المرصودة حسب الاختبار'],
    ['support','الطلاب المحتاجون للدعم','👥',1,'supportStudentsView','grades','النتائج التي تحتاج متابعة'],
    ['examMonitoring','متابعة الاختبارات الإلكترونية','📝',1,'examMonitoringView','examAttempts','المحاولات والنتائج'],
    ['onlineExams','الاختبارات الإلكترونية','🧪',1,'onlineExamsManage','onlineExams','بيانات الاختبارات والاستهداف'],
    ['top','أوائل الطلاب','🏆',1,'topStudentsView','grades','ترتيب الطلاب حسب نتائجهم'],
    ['report','تقرير الطالب الشامل','📄',1,'studentReportView','students','بيانات الطالب ونتائجه ومتابعته'],
    ['archive','الأرشيف','🗂️',1,'archiveView','archives','السجلات المؤرشفة'],
    ['guidance','التوجيه الطلابي','🧭',2,'guidanceView','guidanceIncidents','الحالات والإجراءات المسجلة'],
    ['files','الملفات والتوثيق','📁',2,'staffFilesView','staffSharedFiles','الطلبات والملفات المتبادلة'],
    ['training','متابعة أعمال الإشراف','🎓',2,'trainingManage','trainingCourses','أعمال المشرف والشواهد والتقرير الأسبوعي'],
    ['students','الطلاب','👨‍🎓',3,'studentsView','students','بيانات الطلاب والفصول'],
    ['teachers','المعلمون','👨‍🏫',3,'teachersView','teachers','المعلمون والإسنادات'],
    ['subjects','المواد','📚',3,'subjectsView','subjects','المواد المسندة'],
    ['tests','الاختبارات','🧾',3,'testsView','tests','الاختبارات الحالية'],
    ['schedules','جداول الاختبارات','🗓️',3,'examSchedulesView','examSchedules','الجداول والأيام'],
    ['messages','سجل الرسائل','📨',3,'messagesView','messageLogs','رسائل أولياء الأمور']
  ].map(([id,title,icon,group,permission,source,hint])=>({id,title,icon,group,permission,source,hint}));
  const labels = {
    name:'الاسم',title:'العنوان',studentName:'الطالب',studentCode:'كود الطالب',code:'الكود',teacherName:'المعلم',teacherEmail:'المعلم',teacherIds:'المعلمون',supervisorName:'المشرف',supervisorEmail:'حساب المشرف',username:'اسم المستخدم',email:'الحساب',phone:'الجوال',mobile:'الجوال',guardianPhone:'جوال ولي الأمر',grade:'الصف',section:'الشعبة',stage:'المرحلة',subjectName:'المادة',specialty:'التخصص',specialization:'التخصص',fullMark:'الدرجة الكاملة',mark:'الدرجة',originalMark:'الدرجة الأصلية',attemptMark:'درجة المحاولة',approvedMark:'الدرجة المعتمدة',beforeMark:'الدرجة السابقة',attemptNumber:'رقم المحاولة',attendance:'الحضور',status:'الحالة',date:'التاريخ',visitDate:'تاريخ الزيارة',startDate:'تاريخ البداية',endDate:'تاريخ النهاية',createdAt:'تاريخ التسجيل',updatedAt:'آخر تحديث',sentAt:'تاريخ الإرسال',submittedAt:'تاريخ التسليم',uploadedAt:'تاريخ الرفع',publishedAt:'تاريخ النشر',weekNumber:'رقم الأسبوع',week:'الأسبوع',from:'من',to:'إلى',description:'الوصف',details:'التفاصيل',notes:'الملاحظات',note:'الملاحظة',reason:'السبب',action:'الإجراء',message:'الرسالة',testName:'الاختبار',examName:'الاختبار',category:'التصنيف',type:'النوع',kind:'النوع',location:'المكان',time:'الوقت',start:'البداية',end:'النهاية',topic:'الموضوع',score:'النتيجة',finalScore:'درجة الزيارة من 100',totalScore:'مجموع التقييم',rating:'التقدير',recommendations:'التوصيات',strengths:'نقاط القوة',weaknesses:'جوانب التحسين',improvementPoints:'جوانب التحسين',visitNumber:'رقم الزيارة',visitType:'نوع الزيارة',teacherCode:'كود المعلم',period:'الحصة',lesson:'الدرس',lessonTitle:'عنوان الدرس',classes:'الفصول',assignments:'الإسنادات',teachers:'المعلمون',teacherNames:'أسماء المعلمين',teacherOutcomes:'نتائج متابعة المعلمين',days:'الأيام',day:'اليوم',dayName:'اليوم',periods:'الحصص',lessons:'الدروس',content:'المحتوى',homework:'الواجب',objectives:'الأهداف',outcomes:'النواتج',materialUrl:'رابط المادة',fileUrl:'رابط الملف',url:'الرابط',videoUrl:'رابط الفيديو',reviewNote:'ملاحظة المراجعة',reviewStatus:'حالة المراجعة',senderName:'المرسل',recipientName:'المستلم',fileName:'اسم الملف',fileSize:'حجم الملف',courseTitle:'العمل الإشرافي',courseId:'مرجع العمل',progress:'التقدم',signatureName:'اسم الموقّع',signedAt:'تاريخ التوقيع',acknowledgedAt:'تاريخ الاطلاع',readAt:'تاريخ الاطلاع',published:'النشر',visibleToParent:'ظاهر لولي الأمر',active:'التفعيل',problemType:'نوع المشكلة',customProblem:'وصف المشكلة',place:'المكان',counselorName:'الموجه',incidentNumber:'رقم الحالة',reference:'المرجع',student:'الطالب',students:'الطلاب',eventType:'نوع المتابعة',count:'العدد',assignedCount:'عدد المكلفين',receivedCount:'المستلم',researchStatus:'حالة الأبحاث',researchDate:'تاريخ متابعة الأبحاث',isPublished:'النشر',dayNotes:'ملاحظات الأيام',dates:'التواريخ',generalSupervisor:'المشرف العام',generalDirector:'المدير العام',improvementHistory:'سجل التحسين',leaderName:'رائد الفصل',weekStartDate:'بداية الأسبوع',weekEndDate:'نهاية الأسبوع',contentByDay:'محتوى الأيام',sunday:'الأحد',monday:'الاثنين',tuesday:'الثلاثاء',wednesday:'الأربعاء',thursday:'الخميس',evidenceUrl:'رابط الشاهد',evidence:'الشاهد',summary:'الملخص',durationMinutes:'مدة الاختبار بالدقائق',publishAt:'موعد النشر',deadline:'نهاية الإتاحة',maxAttempts:'المحاولات المسموحة',targetType:'الاستهداف',targetStudents:'الطلاب المستهدفون',subject:'المادة',total:'الإجمالي',typeLabel:'نوع السجل',executorName:'المنفذ',activityName:'النشاط',reviewedAt:'تاريخ المراجعة',meetingType:'نوع الاجتماع',dayLabel:'اليوم',attendanceStatus:'حالة الحضور',result:'النتيجة',evaluation:'التقييم',criteria:'بنود التقييم',items:'البنود',educationalValue:'القيمة التربوية',weekPersonality:'شخصية الأسبوع',principalName:'مدير المدرسة',eventKind:'نوع العمل',structuredEvidence:'شواهد العمل',detailSections:'محاور العمل',text:'التفاصيل',contentType:'تصنيف العمل',meetingNumber:'رقم الاجتماع',meetingAgendaText:'محضر الاجتماع',meetingRecommendationsText:'توصيات الاجتماع',targetTeacherEmails:'المعلمون المستهدفون',targetSpecialties:'التخصصات المستهدفة',meetingSigned:'توقيع المحضر',meetingSignatureName:'اسم الموقّع',meetingSignedAt:'وقت التوقيع',meetingMinutesViewed:'الاطلاع على المحضر',courseAcknowledged:'الاطلاع على الدورة',activitySigned:'التوقيع على العمل',activitySignatureName:'اسم الموقّع',activitySignedAt:'وقت التوقيع',completed:'مكتمل',visitCount:'مرات الاطلاع',activityType:'نوع العمل',activityTypes:'أنواع الأعمال',implementation:'التنفيذ',implementationDetails:'تفاصيل التنفيذ',teacherResponse:'استجابة المعلم',attachmentUrl:'رابط المرفق',meetingAgenda:'محاور الاجتماع',agenda:'المحاور',decisions:'القرارات',followup:'المتابعة',followUp:'المتابعة',followupNotes:'ملاحظات المتابعة',month:'الشهر',value:'القيمة',label:'البند',degree:'الدرجة',max:'الحد الأعلى'
  };
  const statusLabels={submitted:'مرسل للمراجعة',reviewed:'تمت المراجعة',revision_requested:'معاد للتعديل',published:'منشور',draft:'مسودة',approved:'معتمد',rejected:'غير معتمد',pending:'قيد المتابعة',complete:'مكتمل',completed:'مكتمل',partial:'جزئي',none:'لم يتم',present:'حاضر',absent:'غائب',not_recorded:'لم يُرصد',cancelled:'ملغى',scheduled:'مجدول',course:'دورة',meeting:'اجتماع',research:'أبحاث',training:'تدريب',all:'الجميع',selected:'معلمون محددون'};
  function dateText(v) { if(!v)return '—';try {const d=typeof v.toDate==='function'?v.toDate():v.seconds?new Date(v.seconds*1000):new Date(v);return Number.isNaN(d.getTime())?text(v):new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeZone:'Asia/Riyadh'}).format(d);}catch{return '—';} }
  function cell(v) { if(v===true)return 'نعم';if(v===false)return 'لا';if(v===0)return '0';if(v==null||v==='')return '—';if(typeof v==='object'&&!Array.isArray(v))return v.toDate||v.seconds?dateText(v):text(v.name||v.title||'—');return statusLabels[v]||String(v); }
  const classText = x => [x.grade,x.section].filter(Boolean).join(' / ') || '—';
  const sourceColumns={
    students:[['الكود',r=>r.code||r.id],['الطالب',r=>r.name],['الصف',r=>r.grade],['الشعبة',r=>r.section],['جوال ولي الأمر',r=>r.guardianPhone||r.phone]],
    teachers:[['المعلم',r=>r.name],['الحساب',r=>r.email||r.username||r.id],['الجوال',r=>r.phone||r.mobile],['الإسنادات',r=>list(r.assignments).map(a=>[a.subjectName,classText(a)].filter(Boolean).join(' — ')).join('، ')]],
    subjects:[['المادة',r=>r.name],['المرحلة',r=>r.stage],['الصف',r=>r.grade]],
    tests:[['الاختبار',r=>r.name],['المادة',r=>r.subjectName],['الدرجة الكاملة',r=>r.fullMark],['التاريخ',r=>r.date],['الفصول',r=>list(r.classes).map(classText).join('، ')],['ولي الأمر',r=>r.visibleToParent===true?'ظاهر':'مخفي']],
    grades:[['الطالب',r=>r.studentName],['الكود',r=>r.studentCode],['الفصل',classText],['المادة',r=>r.subjectName],['الاختبار',r=>r.testName],['الدرجة',r=>r.attendance==='absent'?'غائب':(r.mark??'لم يُرصد')],['الدرجة الكاملة',r=>r.fullMark],['المعلم',r=>r.teacherName]],
    messageLogs:[['المعلم',r=>r.teacherName],['الطالب',r=>r.studentName],['الفصل',classText],['المادة',r=>r.subjectName],['التاريخ',r=>dateText(r.sentAt)],['الرسالة',r=>r.message]],
    activities:[['النشاط',r=>r.title||r.activityName],['المنفذ',r=>r.executorName||r.teacherName],['التاريخ',r=>r.date||dateText(r.createdAt)],['الحالة',r=>r.status],['الفصول',r=>list(r.classes).map(classText).join('، ')]],
    trainingCourses:[['العمل الإشرافي',r=>r.title],['النوع',r=>r.contentType||r.eventKind||r.kind||r.type],['التاريخ',r=>r.startDate||r.date],['الشواهد',r=>r.materialUrl||r.fileUrl?'مرفق متاح':r.structuredEvidence||list(r.detailSections).length||r.meetingAgendaText?'شاهد مسجل':'—']],
    supervisionWeeklyPlans:[['الأسبوع',r=>r.weekNumber],['التخصص',r=>r.specialty],['من',r=>r.from],['إلى',r=>r.to],['المشرف',r=>r.supervisorName]],
    supervisionWeeklyLogs:[['التاريخ',r=>r.date],['البند',r=>r.category],['المعلمون',r=>list(r.teacherNames).join('، ')],['الملاحظة',r=>r.note]],
    trainingProgress:[['المعلم',r=>r.teacherName||r.teacherEmail],['العمل الإشرافي',r=>r.courseTitle],['الحالة',r=>r.meetingSigned||r.activitySigned?'تم التوقيع':r.courseAcknowledged||r.meetingMinutesViewed?'تم الاطلاع':r.status],['الاطلاع',r=>dateText(r.readAt||r.acknowledgedAt||r.lastVisitAt)],['التوقيع',r=>dateText(r.signedAt||r.meetingSignedAt||r.activitySignedAt)]],
    examSchedules:[['اسم الجدول',r=>r.name],['الأيام',r=>list(r.days).length],['آخر تحديث',r=>dateText(r.updatedAt)],['ولي الأمر',r=>r.visibleToParent===false?'مخفي':'ظاهر']],
    visits:[['المعلم',r=>r.teacherName],['التاريخ',r=>r.visitDate||r.date],['رقم الزيارة',r=>r.visitNumber],['المادة',r=>r.subjectName||r.subject],['المشرف',r=>r.supervisorName],['درجة الزيارة',visitScore]],
    dailySupervisorReports:[['المشرف',r=>r.supervisorName],['التاريخ',r=>r.date],['العنوان',r=>r.title||r.reportTitle],['الملخص',r=>r.summary||r.notes]],
    monthlyEvaluations:[['المعلم',r=>r.teacherName],['الشهر',r=>r.month],['النتيجة',r=>r.totalScore||r.score],['المشرف',r=>r.supervisorName]],
    weeklyPlans:[['رائد الفصل',r=>r.leaderName],['المرحلة',r=>r.stage],['الفصل',classText],['الأسبوع',r=>r.weekNumber],['آخر تحديث',r=>dateText(r.updatedAt||r.createdAt)]],
    guidanceIncidents:[['الطالب',r=>r.studentName],['الفصل',classText],['المشكلة',r=>r.problemType==='أخرى'?r.customProblem:r.problemType],['التاريخ',r=>r.date],['الموجه',r=>r.counselorName],['الحالة',r=>r.status]],
    staffSharedFiles:[['الملف',r=>r.title||r.fileName],['المرسل',r=>r.senderName||r.senderEmail],['المستلم',r=>r.recipientName||r.recipientEmail],['التصنيف',r=>r.category],['الحالة',r=>r.reviewStatus],['التاريخ',r=>dateText(r.uploadedAt)]],
    staffDocumentationRequests:[['الطلب',r=>r.title],['التصنيف',r=>r.category],['موعد التسليم',r=>r.dueDate],['المعلمون',r=>list(r.teacherIds).length]],
    remoteSessions:[['الحصة',r=>r.topic||r.title],['المعلم',r=>r.teacherName],['المادة',r=>r.subject],['الفصل',classText],['التاريخ',r=>r.date],['الحالة',r=>r.status]],
    examAttempts:[['الطالب',r=>r.studentName],['الفصل',classText],['الاختبار',r=>r.examName],['المادة',r=>r.subjectName],['المعلم',r=>r.teacherName],['الدرجة',r=>r.mark],['التسليم',r=>dateText(r.submittedAt)]],
    onlineExams:[['الاختبار',r=>r.name],['المادة',r=>r.subjectName],['المعلم',r=>r.teacherName],['المدة بالدقائق',r=>r.durationMinutes],['الدرجة الكاملة',r=>r.fullMark],['الحالة',r=>r.active===false?'موقوف':r.status||'متاح']],
    studentFollowupEvents:[['الطالب',r=>r.studentName],['الفصل',classText],['نوع المتابعة',r=>r.type||r.category],['الملاحظة',r=>r.note||r.notes],['المعلم',r=>r.teacherName],['التاريخ',r=>r.date||dateText(r.createdAt)]],
    questionBankSheets:[['ورقة العمل',r=>r.title||r.name],['المعلم',r=>r.teacherName],['المادة',r=>r.subjectName],['الفصل',classText],['التاريخ',r=>r.date||dateText(r.createdAt)]],
    englishActivities:[['النشاط',r=>r.title||r.name],['النوع',r=>r.type],['الصف',r=>r.grade],['الحالة',r=>r.status||r.active],['المعلم',r=>r.teacherName]],
    archives:[['الأرشيف',r=>r.name||r.title],['التاريخ',r=>dateText(r.createdAt)],['السنة',r=>r.year||r.academicYear]],
    studentClassAttendance:[['الطالب',r=>r.studentName],['الفصل',classText],['المعلم',r=>r.teacherName],['التاريخ',r=>r.date],['الحصة',r=>r.period],['الحضور',r=>r.attendance||r.status]],
    englishActivityResults:[['الطالب',r=>r.studentName],['النشاط',r=>r.activityTitle||r.activityName],['النتيجة',r=>r.score],['التاريخ',r=>dateText(r.createdAt||r.submittedAt)]],
    remoteAttendance:[['الطالب',r=>r.studentName],['الفصل',classText],['الحالة',r=>r.status||r.attendance],['التاريخ',r=>r.date||dateText(r.createdAt)]]
  };
  function mount(win) {
    const doc=win.document,$=id=>doc.getElementById(id);
    const configs={rased:{apiKey:'AIzaSyAfgSV-6_IMkXncgPWxY69omKfvFtGakgk',authDomain:'results2026-7c0dd.firebaseapp.com',projectId:'results2026-7c0dd'},visits:{apiKey:'AIzaSyBNFrPNCuQefOXHTCmiiKSBjgPLUy5Ug4U',authDomain:'follow-up-2026.firebaseapp.com',projectId:'follow-up-2026'},weekly:{apiKey:'AIzaSyBYxW_pdFvE1VZyDoTok4-EutPe6oigJhY',authDomain:'weekly-plan-3a743.firebaseapp.com',projectId:'weekly-plan-3a743'}};
    const stores={},cache=new Map();let detailVersion=0;let profiles=[],teacherRecords=[],selected=null,context=null,currentModule=null,currentSource='',currentRows=[],visibleRows=[],page=1,printing=false,viewVersion=0,choiceVersion=0,authorized=false;
    function store(key){if(!stores[key]){const name='executive-'+key;const app=win.firebase.apps?.find(a=>a.name===name)||win.firebase.initializeApp(configs[key],name);stores[key]=readOnly(app.firestore());}return stores[key];}
    async function read(source,project='rased',refresh=false){const key=project+':'+source;if(refresh)cache.delete(key);if(!cache.has(key)){const promise=store(project).collection(source).get().then(s=>s.docs.map(d=>({...sanitize(d.data()),id:d.id})));cache.set(key,promise);promise.catch(()=>{if(cache.get(key)===promise)cache.delete(key);});}return cache.get(key);}
    function auth(key){const v=win.sessionStorage.getItem(key);if(win.sessionStorage.getItem('rasedTabAuthReady')==='1')return v||'';return v||win.localStorage.getItem(key)||'';}
    function notice(message,error=false){$('workspaceStatus').textContent=message;$('workspaceStatus').classList.toggle('error',error);}
    function roleLabel(p){return text(p.accountTitle)||{supervisor:'مشرف تخصص',general_supervisor:'مشرف عام',manager:'مدير إشراف'}[norm(p.supervisorType)]||'مشرف عام';}
    function renderDirectory(){const query=norm($('supervisorSearch').value),type=$('supervisorTypeFilter').value;const rows=profiles.filter(p=>(!type||norm(p.supervisorType||'general_supervisor')===type)&&(!query||norm([p.name,p.username,p.email,p.specialty,p.subjectName].join(' ')).includes(query)));$('directoryCount').textContent=rows.length+' مشرف';$('supervisorCards').innerHTML=rows.map(p=>`<article class="supervisor-account"><div class="account-heading"><div class="avatar" aria-hidden="true">${esc(text(p.name||p.id).slice(0,1))}</div><div><h3>${esc(p.name||p.id)}</h3><div class="muted">${esc(p.specialty||p.subjectName||roleLabel(p))}</div></div><span class="badge ${p.active===false?'inactive':''}">${p.active===false?'حساب موقوف':esc(roleLabel(p))}</span></div><div class="account-meta"><span>👤 ${esc(p.username||p.email||p.id)}</span><span>👨‍🏫 ${norm(p.supervisorType)==='supervisor'?new Set(assigned(p)).size+' إسناد مسجل':'نطاق إشراف عام'}</span><span>🗂️ ${modules.filter(m=>canSee(p,m.permission)).length} قسم متاح في بوابته</span></div><button class="btn-primary open-supervisor" data-supervisor="${esc(p.id)}">عرض لوحة المشرف ←</button></article>`).join('')||'<div class="empty-state">لا يوجد مشرفون مطابقون للبحث.</div>';$('supervisorCards').querySelectorAll('[data-supervisor]').forEach(b=>b.onclick=()=>choose(b.dataset.supervisor));}
    async function init(){try{const user=norm(auth('currentUserEmail')||auth('currentUser'));if(!user||norm(auth('currentUserRole'))!=='supervisor'){win.location.href='index.html';return;}
      const snap=await store('rased').collection('users').doc(user).get();const actor=snap.exists?sanitize(snap.data()):{};
      if(norm(actor.role)!=='supervisor'||norm(actor.supervisorType)!=='executive_viewer'||actor.active===false){win.location.href='index.html';return;}
      authorized=true;$('viewerName').textContent=actor.name||'الحساب الإداري';$('viewerTitle').textContent=text(actor.accountTitle)||'المدير العام';doc.title=$('viewerTitle').textContent+' | متابعة حسابات المشرفين — راصد';const users=await read('users');profiles=users.filter(p=>norm(p.role)==='supervisor'&&norm(p.supervisorType)!=='executive_viewer');
      $('directoryStatus').textContent='اختاري المشرف لعرض لوحته وأعماله. جميع الأقسام هنا للمشاهدة والطباعة فقط.';$('directoryRefresh').disabled=false;renderDirectory();
    }catch(e){$('directoryStatus').textContent=errorText(e);$('directoryStatus').classList.add('error');$('directoryRefresh').disabled=false;}}
    function errorText(e){return /resource-exhausted|quota/i.test(e?.code||e?.message||'')?'تعذر التحميل بسبب بلوغ حد استخدام قاعدة البيانات. أعيدي المحاولة لاحقًا.':/permission-denied/i.test(e?.code||'')?'تعذر الوصول إلى البيانات بصلاحيات الحساب الحالية.':'تعذر تحميل البيانات. تحققي من الاتصال ثم أعيدي المحاولة.';}
    async function choose(id){
      if(!authorized)return;
      const profile=profiles.find(p=>p.id===id);
      if(!profile)return;
      const version=++choiceVersion;
      ++viewVersion;++detailVersion;
      $('recordDialog').close();selected=profile;context=null;currentModule=null;
      currentRows=[];visibleRows=[];page=1;
      $('supervisorDirectory').hidden=true;$('supervisorWorkspace').hidden=false;
      $('modulePanel').hidden=true;$('supervisorModules').innerHTML='';
      $('selectedName').textContent=profile.name||profile.id;
      $('selectedRole').textContent=roleLabel(profile);
      $('selectedSpecialty').textContent=profile.specialty||profile.subjectName||'إشراف عام';
      $('selectedTeacherCount').textContent='—';$('selectedModuleCount').textContent='—';
      $('selectedScope').textContent='جارٍ تحميل إسنادات المشرف...';
      notice('جارٍ تحميل بيانات المشرف وأعماله المسجلة...');
      try{
        const [teachers,users]=await Promise.all([read('teachers'),read('users')]);
        if(version!==choiceVersion)return;
        teacherRecords=mergeTeachers(teachers,users);
        context=makeContext(profile,teacherRecords);
        $('selectedTeacherCount').textContent=context.teachers.length;
        $('selectedModuleCount').textContent=modules.filter(m=>canSee(profile,m.permission)).length;
        const missing=assigned(profile).filter(k=>!context.teacherKeys.has(k));
        $('selectedScope').textContent=(context.restricted?'المعلمون المسندون لهذا المشرف وفصولهم':'نطاق إشراف عام')+
          (missing.length?' • توجد إسنادات لا تطابق سجل معلم؛ قد تكون بعض البيانات غير مكتملة.':'')+' • عرض وطباعة فقط';
        renderModules();
        await open(canSee(profile,'trainingManage')?'training':'teachers');
      }catch(e){if(version!==choiceVersion)return;notice(errorText(e)+' استخدم تحديث بيانات المشرف لإعادة المحاولة.',true);}
    }
    function renderModules(){ $('supervisorModules').innerHTML=groups.map((g,i)=>{const allowed=modules.filter(m=>m.group===i&&canSee(selected,m.permission));return allowed.length?`<section class="supervisor-dashboard-group"><h3 class="supervisor-dashboard-group-title">${g}</h3><div class="supervisor-dashboard-grid">${allowed.map(m=>`<button class="supervisor-dashboard-tool" data-module="${m.id}"><span>${m.icon}</span><strong>${m.title}</strong><small>${m.hint}</small></button>`).join('')}</div></section>`:'';}).join('');$('supervisorModules').querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>open(b.dataset.module)); }
    function enrich(rows){const teachers=new Map(teacherRecords.flatMap(t=>identities(t).map(k=>[k,t])));return rows.map(r=>{const t=teachers.get(norm(r.teacherEmail||r.teacherId));return {...r,teacherName:r.teacherName?teacherDisplayName(r.teacherName,teacherRecords):t?teacherDisplayName(t.id,teacherRecords):r.teacherName};});}
    async function getRows(module,source){
      if(module.id==='visits'){const accounts=await read('supervisors','visits');const linked=matchVisitAccount(selected,accounts);if(!linked)throw Object.assign(Error('لم يتم العثور على ربط فريد لحساب الزيارات لهذا المشرف. لا تُعرض بيانات مشرف آخر.'),{viewerMessage:true});
        const rows=await read(source,'visits');if(norm(linked.role)==='admin')return rows;if(norm(linked.role)==='general_supervisor'&&source==='dailySupervisorReports')return rows;return rows.filter(r=>refs([r.supervisorId,r.supervisorUid,r.createdBy]).some(k=>identities(linked).includes(k)));}
      if(module.id==='weekly'){const rows=await read('weeklyPlans','weekly');return scopeRecords('weeklyPlans',rows.filter(r=>r.documentType!=='fixedSchedule'&&Number(r.weekNumber)>=1&&Number(r.weekNumber)<=18),context);}
      if(source==='remoteAttendance'){const sessions=scopeRecords('remoteSessions',await read('remoteSessions'),context),ids=new Map(sessions.map(r=>[r.id,r]));return (await read(source)).filter(r=>ids.has(r.sessionId)).map(r=>{const session=ids.get(r.sessionId);return {...r,teacherName:r.teacherName||session.teacherName,grade:r.grade||session.grade,section:r.section||session.section,date:r.date||session.date};});}
      if(['studentFollowupEvents','studentClassAttendance','guidanceIncidents'].includes(source)){const students=await read('students'),ids=new Map(students.map(r=>[norm(r.code||r.id),r]));const records=(await read(source)).flatMap(r=>source==='studentClassAttendance'&&Array.isArray(r.entries)?r.entries.map((entry,i)=>({...r,...entry,id:r.id+':'+i,entries:undefined})): [r]);return scopeRecords(source,records.map(r=>{const st=ids.get(norm(r.studentCode||r.studentId));return {...r,studentName:r.studentName||st?.name,grade:r.grade||st?.grade,section:r.section||st?.section};}),context);}
      if(source==='teachers')return context.teachers;
      if(source==='trainingProgress'){const courses=await read('trainingCourses');const own=new Map(scopeRecords('trainingCourses',courses,context).map(x=>[x.id,x]));return enrich((await read(source)).filter(r=>own.has(r.courseId)).map(r=>({...r,courseTitle:r.courseTitle||own.get(r.courseId)?.title})));}
      if(source==='grades'){const [rows,tests,students]=await Promise.all([read('grades'),read('tests'),read('students')]);const testMap=new Map(tests.map(x=>[x.id,x])),studentMap=new Map(students.map(x=>[norm(x.code||x.id),x]));return scopeRecords('grades',rows.map(r=>{const t=testMap.get(r.testId),s=studentMap.get(norm(r.studentCode));return {...r,studentName:r.studentName||s?.name,grade:r.grade??s?.grade,section:r.section??s?.section,subjectId:r.subjectId||t?.subjectId,subjectName:r.subjectName||t?.subjectName,fullMark:r.fullMark??t?.fullMark,testName:r.testName||t?.name};}),context).filter(r=>!context.restricted||inClass(r,context));}
      return scopeRecords(source,enrich(await read(source)),context);
    }
    function tabsFor(m){if(m.id==='remote')return [['remoteSessions','الحصص'],['remoteAttendance','حضور الطلاب']];if(m.id==='english')return [['englishActivities','الأنشطة'],['englishActivityResults','نتائج التدريب']];if(m.id==='followup')return [['studentFollowupEvents','ملاحظات المتابعة'],['studentClassAttendance','الحضور والغياب']];if(m.id==='training')return [['trainingCourses','الأعمال والشواهد'],['trainingProgress','اطلاع وتوقيع المعلمين'],['supervisionWeeklyPlans','التقارير الأسبوعية'],['supervisionWeeklyLogs','سجل المتابعة']];if(m.id==='visits')return [['visits','الزيارات'],['monthlyEvaluations','التقييمات الشهرية'],['dailySupervisorReports','تقارير المشرفين']];if(m.id==='files')return [['staffSharedFiles','الملفات المتبادلة'],['staffDocumentationRequests','طلبات التوثيق']];return [[m.source,m.title]];}
    async function open(id,source){if(!context)return;const m=modules.find(x=>x.id===id);if(!m||!canSee(selected,m.permission))return;const tabs=tabsFor(m);source=source||tabs[0][0];if(!tabs.some(t=>t[0]===source))return;const version=++viewVersion;currentModule=m;currentSource=source;currentRows=[];visibleRows=[];page=1;$('modulePanel').hidden=false;$('moduleTitle').textContent=m.title;$('moduleSubtitle').textContent='حساب المشرف: '+(selected.name||selected.id)+' • مشاهدة فقط';$('moduleBody').innerHTML='<div class="empty-state">جارٍ تحميل البيانات...</div>';$('sectionSummary').innerHTML='';$('moduleSearch').value='';$('gradeFilter').innerHTML='<option value="">كل الصفوف</option>';$('sectionFilter').innerHTML='<option value="">كل الشعب</option>';$('teacherFilter').innerHTML='<option value="">كل المعلمين</option>';$('testFilter').innerHTML='<option value="">كل الاختبارات</option>';$('thresholdBox').hidden=!['retests','support'].includes(id);$('moduleTabs').innerHTML=tabs.length>1?tabs.map(([s,title])=>`<button class="subtab ${s===source?'active':''}" data-source="${s}">${title}</button>`).join(''):'';$('moduleTabs').querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>open(id,b.dataset.source));$('modulePanel').scrollIntoView({behavior:'smooth',block:'start'});notice('جارٍ تحميل '+m.title+'...');
      try{const rows=await getRows(m,source);if(version!==viewVersion)return;currentRows=rows;fillFilters();render();notice('تم تحميل '+m.title+' للمشرف '+(selected.name||selected.id)+'.');}
      catch(e){if(version!==viewVersion)return;$('moduleBody').innerHTML='<div class="empty-state error">'+esc(e.viewerMessage?e.message:errorText(e))+'</div>';$('sectionSummary').innerHTML='';notice(e.viewerMessage?e.message:errorText(e),true);}}
    function fillFilters(){function fill(id,values,title){$(''+id).innerHTML='<option value="">'+title+'</option>'+[...new Set(values.filter(x=>x!=null&&x!==''))].sort((a,b)=>text(a).localeCompare(text(b),'ar')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}fill('gradeFilter',currentRows.map(r=>r.grade),'كل الصفوف');fill('sectionFilter',currentRows.map(r=>r.section),'كل الشعب');fill('teacherFilter',currentRows.map(r=>r.teacherName),'كل المعلمين');fill('testFilter',currentRows.map(r=>r.testName||r.examName),'كل الاختبارات');['gradeFilter','sectionFilter','teacherFilter','testFilter'].forEach(id=>{$(id).parentElement.hidden=$(id).options.length<=1;});}
    function filtered(){const q=norm($('moduleSearch').value),g=$('gradeFilter').value,s=$('sectionFilter').value,t=$('teacherFilter').value,exam=$('testFilter').value;return currentRows.filter(r=>(!g||text(r.grade)===g)&&(!s||text(r.section)===s)&&(!t||r.teacherName===t)&&(!exam||(r.testName||r.examName)===exam)&&(!q||norm(searchText(r)).includes(q)));}
    function searchText(r){return Object.entries(r).filter(([k,v])=>labels[k]&&typeof v!=='object').map(([,v])=>v).join(' ');}
    function gradeValue(r){if(r.attendance==='absent'||r.mark===null||r.mark===undefined||r.mark==='')return null;const n=Number(r.mark),full=Number(r.fullMark);return Number.isFinite(n)&&full>0?100*n/full:null;}
    function render(){if(!currentModule)return;let rows=filtered();const m=currentModule;
      if(['support','retests'].includes(m.id)){const threshold=Number($('threshold').value);rows=rows.filter(r=>{const p=gradeValue(r);return p!==null&&p<=threshold;});}
      if(m.id==='improvements')rows=rows.filter(r=>list(r.improvementHistory).length);
      visibleRows=rows;const nums=rows.map(gradeValue).filter(x=>x!==null);$('sectionSummary').innerHTML=`<div><b>${rows.length}</b><span>سجل مطابق</span></div>`+(currentSource==='grades'?`<div><b>${nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length)+'٪':'—'}</b><span>متوسط النتائج المرصودة</span></div><div><b>${rows.filter(x=>x.attendance==='absent').length}</b><span>غياب مسجل</span></div>`:'');
      if(['analysis','comparison','top','monitoring'].includes(m.id))return renderAnalysis(rows,m.id);
      if(currentSource==='teachers')return renderTeacherCards(rows);
      const columns=m.id==='blank'?[['الكود',r=>r.code||r.id],['الطالب',r=>r.name],['الفصل',classText],['ملاحظات',()=> '']]:sourceColumns[currentSource]||[['العنوان',r=>r.title||r.name||r.fileName],['التاريخ',r=>dateText(r.createdAt||r.date)],['الحالة',r=>r.status]];
      renderTable(rows,columns);
    }
    function renderTable(rows,columns){const pages=Math.max(1,Math.ceil(rows.length/50));page=Math.min(page,pages);const offset=printing?0:(page-1)*50;const subset=printing?rows:rows.slice(offset,offset+50);$('moduleBody').innerHTML=`<div class="table"><table><thead><tr><th>#</th>${columns.map(([title])=>'<th>'+title+'</th>').join('')}<th class="no-print">التفاصيل</th></tr></thead><tbody>${subset.map((r,i)=>`<tr><td>${offset+i+1}</td>${columns.map(([,get])=>'<td>'+esc(cell(get(r)))+'</td>').join('')}<td class="no-print"><button class="btn-light" data-detail="${offset+i}">عرض التفاصيل</button></td></tr>`).join('')||`<tr><td colspan="${columns.length+2}" class="empty-state">لا توجد سجلات مطابقة ضمن هذا القسم والنطاق.</td></tr>`}</tbody></table></div><div class="pagination no-print"><button id="prevPage" class="btn-light" ${page<=1?'disabled':''}>السابق</button><span>صفحة ${page} من ${pages}</span><button id="nextPage" class="btn-light" ${page>=pages?'disabled':''}>التالي</button></div>`;$('moduleBody').querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(rows[Number(b.dataset.detail)]));$('prevPage').onclick=()=>{page--;render();};$('nextPage').onclick=()=>{page++;render();};}
    function renderTeacherCards(rows){$('moduleBody').innerHTML='<div class="teacher-account-grid">'+rows.map((t,i)=>`<article class="supervisor-account"><h3>${esc(t.name||t.id)}</h3><div class="muted">${esc(t.email||t.username||t.id)}</div><div>${esc(t.phone||t.mobile||'—')}</div><div class="assignment-list">${list(t.assignments).map(a=>'<div>📚 '+esc(a.subjectName||'مادة')+' — '+esc(classText(a))+'</div>').join('')||'لا توجد إسنادات مسجلة'}</div><button class="btn-light" data-detail="${i}">عرض بيانات المعلم وإسناداته</button></article>`).join('')+'</div>';if(!rows.length)$('moduleBody').innerHTML='<div class="empty-state">لا يوجد معلمون ضمن إسنادات هذا المشرف.</div>';$('moduleBody').querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(rows[Number(b.dataset.detail)]));}
    function renderAnalysis(rows,kind){const valid=rows.filter(r=>gradeValue(r)!==null),map=new Map();valid.forEach(r=>{const key=kind==='top'?text(r.studentCode):kind==='comparison'?classText(r):text(r.testName||r.testId);if(!map.has(key))map.set(key,{name:kind==='top'?r.studentName:kind==='comparison'?classText(r):r.testName,count:0,sum:0});const x=map.get(key);x.count++;x.sum+=gradeValue(r);});const totals=[...map.values()].sort((a,b)=>b.sum/b.count-a.sum/a.count);$('moduleBody').innerHTML='<div class="table"><table><thead><tr><th>#</th><th>'+(kind==='top'?'الطالب':kind==='comparison'?'الفصل':'الاختبار')+'</th><th>درجات مرصودة</th><th>المتوسط</th></tr></thead><tbody>'+totals.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.name||'غير مسمى')}</td><td>${r.count}</td><td><div class="result-meter"><span style="width:${Math.max(0,Math.min(100,r.sum/r.count))}%"></span></div>${(r.sum/r.count).toFixed(1)}٪</td></tr>`).join('')+(totals.length?'':'<tr><td colspan="4" class="empty-state">لا توجد درجات مرصودة قابلة للتحليل.</td></tr>')+'</tbody></table></div><p class="muted">المتوسط من الدرجات المرصودة المعروضة فقط؛ لا يُحسب الغياب أو السجل بلا درجة صفرًا.</p>';}
    function detailHtml(value,depth=0){if(depth>7)return '<p class="muted">تفاصيل متداخلة إضافية.</p>'; if(Array.isArray(value))return value.map((x,i)=>`<section class="detail-item"><h4>${i+1}</h4>${typeof x==='object'?detailHtml(x,depth+1):esc(cell(x))}</section>`).join('');if(!value||typeof value!=='object')return esc(cell(value));return Object.entries(value).filter(([key])=>labels[key]&&!privateKey.test(key)).map(([key,v])=>{if(v==null||v==='')return '';if(['targetTeacherEmails','teacherIds','teachers','teacherNames','teacherEmail'].includes(key))v=Array.isArray(v)?v.map(ref=>teacherDisplayName(ref,teacherRecords)):teacherDisplayName(v,teacherRecords);if(v&&typeof v==='object'&&!v.toDate&&!v.seconds)return `<section class="detail-group"><h4>${labels[key]}</h4>${detailHtml(v,depth+1)}</section>`;const val=key==='finalScore'?visitScore({finalScore:v}):cell(v);let content=esc(val);if(/Url$|^url$/.test(key)){try{const url=new URL(v);content=['https:','http:'].includes(url.protocol)?`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">فتح المرفق ↗</a>`:'رابط غير متاح';}catch{content='رابط غير متاح';}}return `<div class="detail-field"><b>${labels[key]}</b><div>${content}</div></div>`;}).join('');}
    async function detail(row){
      const version=++detailVersion,detailModule=currentModule,detailSource=currentSource;
      $('detailTitle').textContent=row.title||row.name||row.studentName||row.teacherName||'تفاصيل السجل';
      $('detailBody').innerHTML=detailHtml(row)||'<div class="empty-state">لا توجد تفاصيل إضافية مسجلة.</div>';$('recordDialog').showModal();
      if(detailModule?.id==='report'&&detailSource==='students'){
        const sections=[['grades','نتائج الطالب','gradesView'],['studentClassAttendance','الحضور والغياب','studentsView'],['studentFollowupEvents','ملاحظات المتابعة','studentFollowupView'],['guidanceIncidents','التوجيه الطلابي','guidanceView']];
        for(const [source,title,permission]of sections){
          if(!canSee(selected,permission))continue;
          try{const rows=await getRows(detailModule,source);if(!$('recordDialog').open||version!==detailVersion)return;
            const own=rows.filter(g=>refs([g.studentCode,g.studentId]).includes(norm(row.code||row.id)));
            $('detailBody').insertAdjacentHTML('beforeend','<section class="detail-group"><h3>'+title+'</h3>'+(own.length?own.map(g=>'<div class="detail-item">'+detailHtml(g)+'</div>').join(''):'<p class="muted">لا توجد سجلات مسجلة لهذا الطالب في هذا القسم.</p>')+'</section>');
          }catch(e){if(version!==detailVersion)return;$('detailBody').insertAdjacentHTML('beforeend','<section class="detail-group"><h3>'+title+'</h3><p class="error">'+esc(errorText(e))+'</p></section>');}
        }
      }
      if(detailSource==='staffSharedFiles'){
        const button=doc.createElement('button');button.className='btn-light no-print';button.textContent='تنزيل الملف';
        button.onclick=async()=>{button.disabled=true;try{const snapshot=await store('rased').collection('staffSharedFiles').doc(row.id).get();if(version!==detailVersion)return;const data=snapshot.exists?snapshot.data():null;
          if(!data||!scopeRecords('staffSharedFiles',[data],context).length)throw Error('not available');
          const type=text(data.fileType);if(!/^(application\/(pdf|msword|vnd\.|octet-stream)|image\/(png|jpeg|webp))/.test(type)||!data.contentBase64||data.contentBase64.length>2000000)throw Error('unsupported file');
          const bytes=Uint8Array.from(win.atob(data.contentBase64),c=>c.charCodeAt(0)),url=win.URL.createObjectURL(new win.Blob([bytes],{type}));
          const link=doc.createElement('a');link.href=url;link.download=text(data.fileName)||'ملف';link.click();win.setTimeout(()=>win.URL.revokeObjectURL(url),30000);button.textContent='تم تجهيز التنزيل';
        }catch(e){button.textContent='تعذر تنزيل الملف';}finally{button.disabled=false;}};$('detailBody').appendChild(button);
      }
    }
    function back(){++detailVersion;++choiceVersion;++viewVersion;$('recordDialog').close();selected=null;context=null;currentModule=null;$('supervisorWorkspace').hidden=true;$('supervisorDirectory').hidden=false;}
    function logout(){['currentUser','currentUserEmail','currentUserName','currentUserRole','currentUserType','currentUserPermissions'].forEach(k=>{win.sessionStorage.removeItem(k);win.localStorage.removeItem(k);});win.sessionStorage.setItem('rasedTabAuthReady','1');win.location.href='index.html';}
    $('supervisorSearch').oninput=renderDirectory;$('supervisorTypeFilter').onchange=renderDirectory;$('directoryRefresh').onclick=async()=>{cache.clear();await init();};$('refreshSupervisor').onclick=()=>{cache.clear();if(selected)return choose(selected.id);};$('backToDirectory').onclick=back;$('logout').onclick=logout;$('refreshModule').onclick=()=>{if(currentModule){cache.delete((currentModule.id==='weekly'?'weekly':currentModule.id==='visits'?'visits':'rased')+':'+currentSource);open(currentModule.id,currentSource);}else if(selected)choose(selected.id);};$('printModule').onclick=()=>{doc.body.classList.remove('printing-record');printing=true;render();win.print();};$('printDetails').onclick=()=>{doc.body.classList.add('printing-record');win.print();};win.addEventListener?.('beforeprint',()=>{printing=true;render();});win.addEventListener?.('afterprint',()=>{printing=false;render();doc.body.classList.remove('printing-record');});$('closeDetails').onclick=()=>{++detailVersion;$('recordDialog').close();};$('recordDialog').addEventListener('close',()=>{++detailVersion;});$('recordDialog').onclick=e=>{if(e.target===$('recordDialog'))$('recordDialog').close();};['moduleSearch','gradeFilter','sectionFilter','teacherFilter','testFilter','threshold'].forEach(id=>{$(id).addEventListener(id==='moduleSearch'?'input':'change',()=>{page=1;render();});});$('clearModuleFilters').onclick=()=>{['moduleSearch','gradeFilter','sectionFilter','teacherFilter','testFilter'].forEach(id=>$(id).value='');page=1;render();};const ready=init();return Object.freeze({ready});
  }
  return {mount,mergeTeachers,visitScore,teacherDisplayName,sanitize,scopeTeachers,makeContext,inClass,scopeRecords,ownedBy,matchVisitAccount,canSee,readOnly,modules};
});

