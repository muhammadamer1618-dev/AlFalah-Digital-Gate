const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {URLSearchParams}=require('node:url');
const root=__dirname+'/../';
const admin=fs.readFileSync(root+'rased/admin.html','utf8');
const start=admin.indexOf('async function saveSupervisor(){'),end=admin.indexOf('function editSupervisor(',start);
async function saveAccount(username,password='chosen-password',exists=false){
 const values={supervisorOriginalUsername:'',supervisorName:'حساب تجريبي',supervisorUsername:username,supervisorPassword:password,supervisorPhone:'0500000000',supervisorRole:'executive_viewer',supervisorAccountTitle:'المدير العام'};
 const writes=[],alerts=[];const ctx=vm.createContext({document:{getElementById:id=>({value:values[id]})},supervisors:[],readSupervisorPermissions:()=>({}),selectedSupervisorTeacherEmails:()=>[],db:{collection:()=>({doc:id=>({get:async()=>({exists,data:()=>({})}),set:async data=>writes.push({id,data})})})},firebase:{firestore:{FieldValue:{serverTimestamp:()=>0}}},writeAuditLog:async()=>{},supervisorTypeLabel:()=>'',alert:m=>alerts.push(m),clearSupervisorForm(){},closeSupervisorEditor(){},loadSupervisors:async()=>{}});
 vm.runInContext(admin.slice(start,end),ctx);await vm.runInContext('saveSupervisor()',ctx);return {writes,alerts};
}
function passwordPage(options={}){
 const html=fs.readFileSync(root+'rased/change-password.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const session=new Map(Object.entries({rasedTabAuthReady:'1',currentUser:'director',currentUserRole:'supervisor',currentUserType:'executive_viewer',...options.session}));
 const local=new Map(Object.entries({currentUser:'another-user',currentUserRole:'teacher'}));
 const storage=map=>({getItem:k=>map.get(k)||null,removeItem:k=>map.delete(k),setItem:(k,v)=>map.set(k,v)});
 const els={},reads=[],writes=[],timers=[];
 const data={name:'المدير',role:'supervisor',supervisorType:'executive_viewer',password:'old-password'};
 const ref={get:async()=>({exists:true,data:()=>({...data,password:options.freshPassword||data.password})}),update:async patch=>writes.push(patch)};
 const ctx=vm.createContext({document:{getElementById:id=>els[id]??={value:'',textContent:'',disabled:false},addEventListener(){}},sessionStorage:storage(session),localStorage:storage(local),location:{search:options.search||'',href:''},URLSearchParams,alert(){},console,setTimeout:fn=>timers.push(fn),firebase:{initializeApp(){},firestore:Object.assign(()=>({collection:()=>({doc:id=>({get:async()=>{reads.push(id);return {exists:true,ref,data:()=>data}}})})}),{FieldValue:{serverTimestamp:()=>0}})}});
 vm.runInContext(script,ctx);return {ctx,els,reads,writes,session,local,timers};
}
module.exports=(async()=>{
 const free=await saveAccount('Director.English');assert.equal(free.writes.length,1,'free username accepted');assert.equal(free.writes[0].id,'director.english');assert.equal(free.writes[0].data.password,'chosen-password');assert.equal(free.writes[0].data.identityNumber,'','free username is not a national ID');
 const arabic=await saveAccount('المدير العام');assert.equal(arabic.writes.length,1);assert.equal((await saveAccount('1000000000')).writes[0].data.identityNumber,'1000000000');
 for(const username of ['','bad/name','.','..'])assert.equal((await saveAccount(username)).writes.length,0);
 assert.equal((await saveAccount('director','chosen-password',true)).writes.length,0,'duplicates rejected');assert.equal((await saveAccount('director','')).writes.length,0,'empty password rejected');
 const page=passwordPage();await vm.runInContext('init()',page.ctx);assert.deepEqual(page.reads,['director'],'tab account takes precedence over another local account');assert.equal(page.els.accountRole.textContent,'المدير العام');assert.equal(vm.runInContext('returnUrl()',page.ctx),'executive-dashboard.html');
 page.els.currentPassword={value:'wrong'};page.els.newPassword={value:'new-password'};page.els.confirmPassword={value:'new-password'};await vm.runInContext('changeMyPassword()',page.ctx);assert.equal(page.writes.length,0);
 page.els.currentPassword.value='old-password';page.els.confirmPassword.value='different';await vm.runInContext('changeMyPassword()',page.ctx);assert.equal(page.writes.length,0);
 page.els.confirmPassword.value='new-password';await vm.runInContext('changeMyPassword()',page.ctx);assert.equal(page.writes.length,1);assert.equal(page.writes[0].password,'new-password');page.timers[0]();assert.equal(page.session.has('currentUser'),false);assert.equal(page.local.has('currentUser'),false);assert.equal(page.ctx.location.href,'index.html');
 const stale=passwordPage({freshPassword:'changed-elsewhere'});await vm.runInContext('init()',stale.ctx);for(const [id,value]of Object.entries({currentPassword:'old-password',newPassword:'new-password',confirmPassword:'new-password'}))stale.els[id]={value};await vm.runInContext('changeMyPassword()',stale.ctx);assert.equal(stale.writes.length,0,'stale password cannot overwrite a newer password');
 const empty=passwordPage({session:{currentUser:''}});await vm.runInContext('init()',empty.ctx);assert.deepEqual(empty.reads,[],'empty tab session must not use another tab account');assert.equal(empty.ctx.location.href,'index.html');
 const malicious=passwordPage({search:'?return=javascript:alert(1)'});assert.equal(vm.runInContext('returnUrl()',malicious.ctx),'executive-dashboard.html');
 const executive=fs.readFileSync(root+'rased/executive-dashboard.html','utf8');assert(executive.includes('change-password.html?return=executive-dashboard.html'));assert(/id="recordDialog"[\s\S]*class="executive-dialog-credit"[\s\S]*تصميم محمد عامر أحمد/.test(executive));assert(fs.readFileSync(root+'.github/workflows/sync-rased.yml','utf8').includes("--exclude 'change-password.html'"));
 console.log('PASS: free supervisor usernames, duplicate and invalid input guards, tab-scoped password change, wrong password, mismatch, stale password, logout, safe return, executive link and credit, sync protection.');
})();
