const assert=require('node:assert/strict'),fs=require('node:fs');
const V=require('../rased/executive-viewer.js');
assert.equal(V.visitScore({finalScore:94}),'94 / 100');
assert.equal(V.visitScore({finalScore:0}),'0 / 100');
assert.equal(V.visitScore({finalScore:'87.5'}),'87.5 / 100');
assert.equal(V.visitScore({}),'—');
assert.equal(V.visitScore({finalScore:''}),'—');
const namedTeachers=[{id:'0500000001',name:'معلم الرياضيات',email:'one@test'},{id:'other',phone:'0500000002',name:'معلم العلوم'}];
assert.equal(V.teacherDisplayName('0500000001',namedTeachers),'معلم الرياضيات');
assert.equal(V.teacherDisplayName('966500000002',namedTeachers),'معلم العلوم');
assert.equal(V.teacherDisplayName('one@test',namedTeachers),'معلم الرياضيات');
assert.equal(V.teacherDisplayName('أحمد محمد',namedTeachers),'أحمد محمد');
assert.equal(V.teacherDisplayName('0500000099',namedTeachers),'اسم المعلم غير متاح');
const a={id:'sup-a',role:'supervisor',supervisorType:'supervisor',assignedTeacherEmails:['a@test'],permissions:{studentsView:true,teachersView:true,gradesView:true,activitiesView:false}};
const b={id:'sup-b',role:'supervisor',supervisorType:'supervisor',assignedTeacherIds:['t-b'],permissions:{}};
const teachers=[{id:'t-a',email:'a@test',name:'أ',assignments:[{subjectId:'math',grade:'3',section:'أ'}]},{id:'t-b',email:'b@test',name:'ب',assignments:[{subjectId:'science',grade:'4',section:'ب'}]}];
assert.deepEqual(V.scopeTeachers(a,teachers).map(x=>x.id),['t-a']);
assert.deepEqual(V.scopeTeachers(b,teachers).map(x=>x.id),['t-b']);
assert.equal(V.scopeTeachers({...a,assignedTeacherEmails:[]},teachers).length,0);
assert.equal(V.scopeTeachers({...a,supervisorType:'general_supervisor'},teachers).length,2);
const context=V.makeContext(a,teachers);
assert.equal(V.canSee(a,'activitiesView'),false);assert.equal(V.canSee(a,'blankGradeSheet'),false);assert.equal(V.canSee({...a,permissions:{blankGradeSheet:true}},'blankGradeSheet'),true);
assert.equal(V.inClass({grade:'3',section:'أ'},context),true);assert.equal(V.inClass({grade:'4',section:'ب'},context),false);
assert.equal(V.ownedBy({createdBy:'sup-a'},a),true);assert.equal(V.ownedBy({createdBy:'sup-b'},a),false);
assert.deepEqual(V.scopeRecords('students',[{name:'أ',grade:'3',section:'أ'},{name:'ب',grade:'4',section:'ب'}],context).map(x=>x.name),['أ']);
assert.deepEqual(V.scopeRecords('trainingCourses',[{createdBy:'sup-a',title:'خاص أ'},{createdBy:'sup-b',title:'خاص ب'}],context).map(x=>x.title),['خاص أ']);
const mixed=V.makeContext({...a,assignedTeacherEmails:['a@test','b@test']},teachers);
assert.equal(V.scopeRecords('tests',[{id:'leak',subjectId:'science',classes:[{grade:'3',section:'أ'}]}],mixed).length,0,'subject/class must match one assignment');
assert.equal(V.scopeRecords('grades',[{subjectId:'science',grade:'3',section:'أ'}],mixed).length,0,'grade tuple must not cross unrelated assignments');
const safe=V.sanitize({name:'أ',password:'secret',nested:{loginPassword:'secret',correctText:'secret',token:'secret',notes:'سليم'},correctIndex:1});
assert(!JSON.stringify(safe).includes('secret'));assert.equal(safe.nested.notes,'سليم');
assert.equal(V.matchVisitAccount(a,[{id:'x',name:'نفس الاسم'},{id:'y',name:'نفس الاسم'}]),null);
assert.equal(V.matchVisitAccount({...a,phone:'0501234567'},[{id:'f1',username:'966501234567'},{id:'f2',username:'0501234567'}]),null);
assert.equal(V.matchVisitAccount({...a,phone:'0501234567'},[{id:'f1',username:'966501234567'}]).id,'f1');
assert(V.modules.length>=25);assert(new Set(V.modules.map(x=>x.id)).size===V.modules.length);
const reads=[];const r=V.readOnly({collection:n=>({get:async()=>{reads.push(n);return {docs:[]}},doc:id=>({get:async()=>({exists:false})}),add(){throw Error('write')}})});
assert.equal(r.collection('users').add,undefined);assert.equal(r.collection('users').doc('a').update,undefined);assert.equal(r.batch,undefined);
const page=fs.readFileSync(__dirname+'/../rased/executive-dashboard.html','utf8');assert(page.includes('supervisorDirectory'));assert(page.includes('supervisorWorkspace'));assert(!page.includes('مسار المتابعة'));assert(!page.includes('changePassword'));
const workflow=fs.readFileSync(__dirname+'/../.github/workflows/sync-rased.yml','utf8');assert(workflow.includes("--exclude 'executive-dashboard.html'"));assert(workflow.includes("--exclude 'executive-viewer.js'"));
console.log('PASS: supervisor scopes, permissions, empty assignments, ownership, sensitive fields, ambiguous visit mapping, module coverage, no database writes, directory/workspace and sync protection.');

// Test the browser controller with an in-memory DOM and database, without signing in as another account.
class Element {
 constructor(){this.value='';this.textContent='';this.hidden=false;this.open=false;this.listeners={};this.dataset={};this.parentElement={hidden:false};this.classList={toggle(){},add(){}};this._html='';}
 set innerHTML(v){this._html=v;this.options=[...v.matchAll(/<option\b/g)];this.nodes=[...v.matchAll(/data-(supervisor|module|source|detail)="([^"]*)"/g)].map(m=>{const e=new Element();e.dataset[m[1]]=m[2];return e;});}
 get innerHTML(){return this._html;}
 querySelectorAll(){return this.nodes||[];}
 addEventListener(k,fn){this.listeners[k]=fn;}
 scrollIntoView(){}
 showModal(){this.open=true;}
 close(){this.open=false;this.listeners.close?.();}
 insertAdjacentHTML(_,html){this._html+=html;}
}
async function browserSession(role='supervisor',actorType='executive_viewer',accountTitle='',options={}){
 const els={},writes=[],reads=[],printEvents=[];
 const users=[{id:'boss',name:'viewer',role:'supervisor',supervisorType:actorType,accountTitle,password:'NEVER_RENDER'},a,b];
 const data={users,teachers,students:[{id:'s-a',name:'طالب أ',grade:'3',section:'أ'},{id:'s-b',name:'طالب ب',grade:'4',section:'ب'}],remoteSessions:[{id:'remote-a',teacherEmail:'a@test',grade:'3',section:'أ',topic:'حصة أ'},{id:'remote-b',teacherEmail:'b@test',grade:'4',section:'ب',topic:'حصة ب'}],remoteAttendance:[{id:'ra',sessionId:'remote-a',studentName:'طالب أ',status:'present'},{id:'rb',sessionId:'remote-b',studentName:'طالب ب',status:'present'}],studentClassAttendance:[{id:'att-a',teacherEmail:'a@test',grade:'3',section:'أ',date:'2026-11-19',entries:[{studentCode:'s-a',studentName:'طالب أ',status:'present'}]}],studentFollowupEvents:[{id:'event-a',teacherEmail:'a@test',studentCode:'s-a',note:'متابعة خاصة بأ'}],guidanceIncidents:[{id:'guide-a',studentCode:'s-a',problemType:'ملاحظة توجيهية أ'}],trainingCourses:[{id:'c-a',createdBy:'sup-a',title:'عمل أ',targetTeacherEmails:['a@test']},{id:'c-b',createdBy:'sup-b',title:'عمل ب'}]};
 if(options.users)users.push(...options.users);Object.assign(data,options.data||{});
 const storage={getItem:k=>({currentUserEmail:'boss',currentUserRole:role,rasedTabAuthReady:'1'}[k]||null),setItem(...x){writes.push(x)},removeItem(...x){writes.push(x)}};
 const events={};const win={addEventListener:(type,fn)=>events[type]=fn,document:{body:{classList:{add(k){printEvents.push(k)},remove(){}}},getElementById:id=>els[id]??=new Element()},sessionStorage:storage,localStorage:storage,location:{href:''},firebase:{apps:[],initializeApp(config,name){return {name,firestore:()=>({collection:collection=>({get:async()=>{reads.push(collection);await options.beforeRead?.(collection,name);return {docs:((name==='executive-weekly'?options.weeklyData:data)?.[collection]||[]).map(d=>({id:d.id,data:()=>d}))}},doc:id=>({get:async()=>{reads.push(collection+'/'+id);const d=(data[collection]||[]).find(x=>x.id===id);return {exists:!!d,data:()=>d}}})})})}}},print(){printEvents.push('print')}};
 const mounted=V.mount(win);await mounted.ready;return {win,els,writes,reads,printEvents,data,events};
}
module.exports=(async()=>{
 const denied=await browserSession('teacher');assert.equal(denied.win.location.href,'index.html');assert.equal(denied.reads.length,0);
 const invalid=await browserSession('supervisor','general_supervisor');assert.equal(invalid.win.location.href,'index.html');assert.deepEqual(invalid.reads,['users/boss']);
 const named=await browserSession('supervisor','executive_viewer','المشرف العام');assert.equal(named.els.viewerTitle.textContent,'المشرف العام');
 const director=await browserSession('supervisor','executive_viewer','مديرة المجمعات التعليمية');assert.equal(director.els.viewerTitle.textContent,'مديرة المجمعات التعليمية');
 const s=await browserSession();assert.equal(s.els.viewerTitle.textContent,'المدير العام');assert.equal(s.els.supervisorCards.querySelectorAll().length,2);assert(!s.els.supervisorCards.innerHTML.includes('NEVER_RENDER'));
 await s.els.supervisorCards.querySelectorAll()[0].onclick();assert.equal(s.win.location.href,'','selection stays in executive workspace');assert.equal(s.els.moduleTitle.textContent,'متابعة أعمال الإشراف');assert.equal(s.els.selectedName.textContent,'sup-a');
 const studentsButton=s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='students');await studentsButton.onclick();assert(s.els.moduleBody.innerHTML.includes('طالب أ'));assert(!s.els.moduleBody.innerHTML.includes('طالب ب'));
 await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='training').onclick();assert(s.els.moduleBody.innerHTML.includes('عمل أ'));assert(!s.els.moduleBody.innerHTML.includes('عمل ب'));await s.els.moduleBody.querySelectorAll()[0].onclick();assert(s.els.detailBody.innerHTML.includes('>أ</section>'));assert(!s.els.detailBody.innerHTML.includes('a@test'));s.els.printDetails.onclick();assert.deepEqual(s.printEvents,['printing-record','print']);s.els.closeDetails.onclick();
 await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='remote').onclick();await s.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='remoteAttendance').onclick();assert(s.els.moduleBody.innerHTML.includes('طالب أ'));assert(!s.els.moduleBody.innerHTML.includes('طالب ب'));
 await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='report').onclick();await s.els.moduleBody.querySelectorAll()[0].onclick();assert(s.els.detailBody.innerHTML.includes('الحضور والغياب'));assert(s.els.detailBody.innerHTML.includes('2026-11-19'),'class-session attendance must be linked to student');assert(s.els.detailBody.innerHTML.includes('ملاحظة توجيهية أ'));assert(!s.els.detailBody.innerHTML.includes('متابعة خاصة بأ'),'follow-up permission defaults to denied');
 s.els.backToDirectory.onclick();await s.els.supervisorCards.querySelectorAll()[1].onclick();await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='students').onclick();assert(s.els.moduleBody.innerHTML.includes('طالب ب'));assert(!s.els.moduleBody.innerHTML.includes('طالب أ'));assert.deepEqual(s.writes,[]);
 const merged=V.mergeTeachers([{id:'t-a',name:'معلم أ',assignments:[]}],[{id:'account-a',role:'teacher',teacherEmail:'t-a',email:'a@test',assignments:[{grade:'3',section:'أ',subjectId:'math'}]}]);
 assert.equal(merged.length,1);assert.equal(merged[0].name,'معلم أ');assert.equal(merged[0].assignments.length,1);assert.equal(V.scopeTeachers({...a,assignedTeacherEmails:['account-a']},merged).length,1);
 const accountOnly=await browserSession('supervisor','executive_viewer','',{users:[{id:'a@test',role:'teacher',name:'معلم من الحسابات',assignments:[{grade:'3',section:'أ'}]}],data:{teachers:[]}});
 await accountOnly.els.supervisorCards.querySelectorAll()[0].onclick();assert.equal(accountOnly.els.selectedTeacherCount.textContent,1);await accountOnly.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='teachers').onclick();assert(accountOnly.els.moduleBody.innerHTML.includes('معلم من الحسابات'));
 const many=Array.from({length:65},(_,i)=>({id:'work-'+i,createdBy:'sup-a',title:'work-number-'+i,eventKind:'course',contentType:'متابعة الانتظار',detailSections:[{label:'الشاهد',text:'محتوى الشاهد'}]}));
 const printingSession=await browserSession('supervisor','executive_viewer','',{data:{trainingCourses:many}});
 await printingSession.els.supervisorCards.querySelectorAll()[0].onclick();assert(!printingSession.els.moduleBody.innerHTML.includes('work-number-64'));assert(printingSession.els.moduleBody.innerHTML.includes('متابعة الانتظار'),'show actual supervision category');assert(printingSession.els.moduleBody.innerHTML.includes('شاهد مسجل'),'recognize structured evidence without attachment');printingSession.els.printModule.onclick();assert(printingSession.els.moduleBody.innerHTML.includes('work-number-64'),'print includes all 65 rows');printingSession.events.afterprint();assert(!printingSession.els.moduleBody.innerHTML.includes('work-number-64'),'screen pagination restored');
 printingSession.events.beforeprint();assert(printingSession.els.moduleBody.innerHTML.includes('work-number-64'),'browser print also includes all rows');printingSession.events.afterprint();
 await printingSession.els.moduleBody.querySelectorAll()[0].onclick();assert(printingSession.els.detailBody.innerHTML.includes('محتوى الشاهد'));
 const weekly=await browserSession('supervisor','executive_viewer','',{data:{supervisionWeeklyPlans:[{id:'wa',supervisorEmail:'sup-a',specialty:'تقرير أ'},{id:'wb',supervisorEmail:'sup-b',specialty:'تقرير ب'}],supervisionWeeklyLogs:[{id:'la',supervisorEmail:'sup-a',note:'سجل أ'},{id:'lb',supervisorEmail:'sup-b',note:'سجل ب'}],trainingProgress:[{id:'pa',courseId:'c-a',teacherEmail:'a@test',meetingSigned:true},{id:'pb',courseId:'c-b',teacherEmail:'b@test',meetingSigned:true}]}});
 await weekly.els.supervisorCards.querySelectorAll()[0].onclick();await weekly.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='supervisionWeeklyPlans').onclick();assert(weekly.els.moduleBody.innerHTML.includes('تقرير أ'));assert(!weekly.els.moduleBody.innerHTML.includes('تقرير ب'));
 await weekly.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='supervisionWeeklyLogs').onclick();assert(weekly.els.moduleBody.innerHTML.includes('سجل أ'));assert(!weekly.els.moduleBody.innerHTML.includes('سجل ب'));
 await weekly.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='trainingProgress').onclick();assert(weekly.els.moduleBody.innerHTML.includes('عمل أ'));assert(!weekly.els.moduleBody.innerHTML.includes('عمل ب'));

 // Follow-up must match teacher ownership even when two teachers share the same class.
 const shared=await browserSession('supervisor','executive_viewer','',{data:{users:[{id:'boss',name:'viewer',role:'supervisor',supervisorType:'executive_viewer'},{...a,permissions:{...a.permissions,studentFollowupView:true}},b],teachers:[teachers[0],{...teachers[1],assignments:teachers[0].assignments}],studentFollowupEvents:[{id:'own',teacherEmail:'a@test',grade:'3',section:'أ',studentCode:'s-a',category:'خاص بمعلم أ'},{id:'foreign',teacherEmail:'b@test',grade:'3',section:'أ',studentCode:'s-a',category:'خاص بمعلم ب'}],studentClassAttendance:[{id:'owner-att',teacherEmail:'a@test',grade:'3',section:'أ',entries:[{studentCode:'s-a',status:'حاضر أ'}]},{id:'foreign-att',teacherEmail:'b@test',grade:'3',section:'أ',entries:[{studentCode:'s-a',status:'غائب ب'}]}]}});
 await shared.els.supervisorCards.querySelectorAll()[0].onclick();await shared.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='followup').onclick();assert(shared.els.moduleBody.innerHTML.includes('خاص بمعلم أ'));assert(!shared.els.moduleBody.innerHTML.includes('خاص بمعلم ب'));
 await shared.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='studentClassAttendance').onclick();assert(shared.els.moduleBody.innerHTML.includes('حاضر أ'));assert(!shared.els.moduleBody.innerHTML.includes('غائب ب'));
 const weeklyData={users:[{id:'leader-a',name:'رائد أ',username:'a@test',role:'classLeader',grade:'الثالث الابتدائي',section:'أ'},{id:'leader-b',name:'رائد ب',username:'b@test',role:'classLeader',grade:'الثالث الابتدائي',section:'أ'}],weeklyPlans:[...Array.from({length:65},(_,i)=>({id:'plan-a-'+i,leaderUid:'leader-a',weekNumber:1,grade:'الثالث الابتدائي',section:'أ',educationalValue:'خطة أ رقم '+i,days:[{day:'الأحد',lessons:[{subject:'رياضيات',content:'محتوى الخطة التجريبي'}]}]})),{id:'plan-b',leaderUid:'leader-b',weekNumber:1,grade:'الثالث الابتدائي',section:'أ',educationalValue:'خطة ب السرية'},{id:'fixed-a',leaderUid:'leader-a',documentType:'fixedSchedule',weekNumber:1,educationalValue:'جدول ثابت'}]};
 const linkedWeekly=await browserSession('supervisor','executive_viewer','',{weeklyData});await linkedWeekly.els.supervisorCards.querySelectorAll()[0].onclick();await linkedWeekly.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='weekly').onclick();assert(linkedWeekly.els.moduleBody.innerHTML.includes('رائد أ'));assert(!linkedWeekly.els.moduleBody.innerHTML.includes('رائد ب'));assert(linkedWeekly.els.moduleBody.innerHTML.includes('الثالث الابتدائي'),'leader assignment may use a different grade format');
 await linkedWeekly.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='weeklyPlans').onclick();assert(linkedWeekly.els.moduleBody.innerHTML.includes('رائد أ'));assert(!linkedWeekly.els.moduleBody.innerHTML.includes('خطة ب السرية'));assert(!linkedWeekly.els.moduleBody.innerHTML.includes('جدول ثابت'));await linkedWeekly.els.moduleBody.querySelectorAll()[0].onclick();assert(linkedWeekly.els.detailBody.innerHTML.includes('محتوى الخطة التجريبي'));linkedWeekly.els.printModule.onclick();assert(linkedWeekly.els.moduleBody.innerHTML.includes('>65</td>'),'weekly print includes all 65 plans');linkedWeekly.events.afterprint();
 await linkedWeekly.els.backToDirectory.onclick();await linkedWeekly.els.supervisorCards.querySelectorAll()[1].onclick();await linkedWeekly.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='weekly').onclick();assert(linkedWeekly.els.moduleBody.innerHTML.includes('رائد ب'));assert(!linkedWeekly.els.moduleBody.innerHTML.includes('رائد أ'));
 const noPlan=await browserSession('supervisor','executive_viewer','',{weeklyData:{...weeklyData,weeklyPlans:[]}});await noPlan.els.supervisorCards.querySelectorAll()[0].onclick();await noPlan.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='weekly').onclick();assert(noPlan.els.moduleBody.innerHTML.includes('رائد أ'),'leader without a saved plan remains visible');assert(noPlan.els.moduleBody.innerHTML.includes('>0</td>'));
 assert.deepEqual(shared.writes,[]);assert.deepEqual(linkedWeekly.writes,[]);assert.deepEqual(noPlan.writes,[]);
 console.log('PASS: executive same-class teacher filtering, weekly UID ownership across grade formats, class leaders without plans, plan details, all-row printing and supervisor switching.');
 let rejectTeachers=true;const failure=await browserSession('supervisor','executive_viewer','',{beforeRead:async source=>{if(source==='teachers'&&rejectTeachers)throw Error('offline');}});await failure.els.supervisorCards.querySelectorAll()[0].onclick();assert(failure.els.workspaceStatus.textContent.includes('تعذر تحميل'));assert.equal(failure.els.modulePanel.hidden,true);rejectTeachers=false;await failure.els.refreshSupervisor.onclick();assert.equal(failure.els.moduleTitle.textContent,'متابعة أعمال الإشراف');
 let release;const pending=new Promise(resolve=>release=resolve);const race=await browserSession('supervisor','executive_viewer','',{beforeRead:async source=>{if(source==='teachers')await pending;}});const first=race.els.supervisorCards.querySelectorAll()[0].onclick();race.els.backToDirectory.onclick();const second=race.els.supervisorCards.querySelectorAll()[1].onclick();release();await Promise.all([first,second]);assert.equal(race.els.selectedName.textContent,'sup-b');assert(race.els.moduleBody.innerHTML.includes('عمل ب'));assert(!race.els.moduleBody.innerHTML.includes('عمل أ'));
 assert.deepEqual(race.writes,[]);assert.deepEqual(weekly.writes,[]);assert.deepEqual(printingSession.writes,[]);
 console.log('PASS: merged teacher accounts, automatic saved work, weekly records, acknowledgements, print all 65 rows, read failure retry and stale selection isolation.');
 console.log('PASS: controller login guards, supervisor selection, module drill-down, cross-supervisor isolation and unchanged viewer session.');
})();
