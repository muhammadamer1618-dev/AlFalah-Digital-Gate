const assert=require('node:assert/strict'),fs=require('node:fs');
const V=require('../rased/executive-viewer.js');
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
async function browserSession(role='supervisor',actorType='executive_viewer'){
 const els={},writes=[],reads=[];
 const users=[{id:'boss',name:'viewer',role:'supervisor',supervisorType:actorType,password:'NEVER_RENDER'},a,b];
 const data={users,teachers,students:[{id:'s-a',name:'طالب أ',grade:'3',section:'أ'},{id:'s-b',name:'طالب ب',grade:'4',section:'ب'}],remoteSessions:[{id:'remote-a',teacherEmail:'a@test',grade:'3',section:'أ',topic:'حصة أ'},{id:'remote-b',teacherEmail:'b@test',grade:'4',section:'ب',topic:'حصة ب'}],remoteAttendance:[{id:'ra',sessionId:'remote-a',studentName:'طالب أ',status:'present'},{id:'rb',sessionId:'remote-b',studentName:'طالب ب',status:'present'}],studentClassAttendance:[{id:'att-a',grade:'3',section:'أ',date:'2026-11-19',entries:[{studentCode:'s-a',studentName:'طالب أ',status:'present'}]}],studentFollowupEvents:[{id:'event-a',studentCode:'s-a',note:'متابعة خاصة بأ'}],guidanceIncidents:[{id:'guide-a',studentCode:'s-a',problemType:'ملاحظة توجيهية أ'}],trainingCourses:[{id:'c-a',createdBy:'sup-a',title:'عمل أ'},{id:'c-b',createdBy:'sup-b',title:'عمل ب'}]};
 const storage={getItem:k=>({currentUserEmail:'boss',currentUserRole:role,rasedTabAuthReady:'1'}[k]||null),setItem(...x){writes.push(x)},removeItem(...x){writes.push(x)}};
 const win={document:{getElementById:id=>els[id]??=new Element()},sessionStorage:storage,localStorage:storage,location:{href:''},firebase:{apps:[],initializeApp(config,name){return {name,firestore:()=>({collection:collection=>({get:async()=>{reads.push(collection);return {docs:(data[collection]||[]).map(d=>({id:d.id,data:()=>d}))}},doc:id=>({get:async()=>{reads.push(collection+'/'+id);const d=(data[collection]||[]).find(x=>x.id===id);return {exists:!!d,data:()=>d}}})})})}}},print(){}};
 const mounted=V.mount(win);await mounted.ready;return {win,els,writes,reads};
}
module.exports=(async()=>{
 const denied=await browserSession('teacher');assert.equal(denied.win.location.href,'index.html');assert.equal(denied.reads.length,0);
 const invalid=await browserSession('supervisor','general_supervisor');assert.equal(invalid.win.location.href,'index.html');assert.deepEqual(invalid.reads,['users/boss']);
 const s=await browserSession();assert.equal(s.els.supervisorCards.querySelectorAll().length,2);assert(!s.els.supervisorCards.innerHTML.includes('NEVER_RENDER'));
 await s.els.supervisorCards.querySelectorAll()[0].onclick();assert.equal(s.els.selectedName.textContent,'sup-a');
 const studentsButton=s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='students');await studentsButton.onclick();assert(s.els.moduleBody.innerHTML.includes('طالب أ'));assert(!s.els.moduleBody.innerHTML.includes('طالب ب'));
 await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='training').onclick();assert(s.els.moduleBody.innerHTML.includes('عمل أ'));assert(!s.els.moduleBody.innerHTML.includes('عمل ب'));
 await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='remote').onclick();await s.els.moduleTabs.querySelectorAll().find(e=>e.dataset.source==='remoteAttendance').onclick();assert(s.els.moduleBody.innerHTML.includes('طالب أ'));assert(!s.els.moduleBody.innerHTML.includes('طالب ب'));
 await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='report').onclick();await s.els.moduleBody.querySelectorAll()[0].onclick();assert(s.els.detailBody.innerHTML.includes('الحضور والغياب'));assert(s.els.detailBody.innerHTML.includes('2026-11-19'),'class-session attendance must be linked to student');assert(s.els.detailBody.innerHTML.includes('ملاحظة توجيهية أ'));assert(!s.els.detailBody.innerHTML.includes('متابعة خاصة بأ'),'follow-up permission defaults to denied');
 s.els.backToDirectory.onclick();await s.els.supervisorCards.querySelectorAll()[1].onclick();await s.els.supervisorModules.querySelectorAll().find(e=>e.dataset.module==='students').onclick();assert(s.els.moduleBody.innerHTML.includes('طالب ب'));assert(!s.els.moduleBody.innerHTML.includes('طالب أ'));assert.deepEqual(s.writes,[]);
 console.log('PASS: controller login guards, supervisor selection, module drill-down, cross-supervisor isolation and unchanged viewer session.');
})();
