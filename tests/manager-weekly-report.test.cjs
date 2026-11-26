const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../rased/supervisor-weekly-report.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function session(type='manager',role='supervisor'){
 const els={},printed=[];const profile={name:'مدير المدرسة',role,supervisorType:type,assignedTeacherEmails:['one'],permissions:{trainingManage:true}};
 const teachers=[{id:'one',name:'معلم أول',email:'one'},{id:'two',name:'معلم ثان',email:'two'}];
 const stored={supervisorEmail:'actor',supervisorName:'اسم محفوظ',weekNumber:'13',from:'2026-11-15',to:'2026-11-19',generalSupervisor:'اسم مشرف قديم',generalDirector:'جوهرة الزهراني',dates:['2026-11-15','2026-11-16','2026-11-17','2026-11-18','2026-11-19']};
 const get=id=>els[id]??={value:id==='generalDirector'?'جوهرة الزهراني':id==='generalSupervisor'?'أحمد سمير':'',hidden:false,checked:false,innerHTML:'',addEventListener(){},scrollIntoView(){}};
 const db={collection:name=>({
  doc:()=>({get:async()=>({exists:true,data:()=>name==='users'?profile:stored})}),
  get:async()=>({docs:(name==='teachers'?teachers:[]).map(t=>({id:t.id,data:()=>t}))})
 })};
 const popup={document:{open(){},write:s=>printed.push(s),close(){}},focus(){},print(){}};
 const values={currentUserRole:role,currentUser:'actor',currentUserName:'مدير المدرسة'};
 const ctx=vm.createContext({document:{getElementById:get,querySelector:()=>({textContent:''})},window:{open:()=>popup},sessionStorage:{getItem:k=>values[k]||null},localStorage:{getItem:()=>null},location:{href:'https://rasededu.online/rased/supervisor-weekly-report.html'},firebase:{initializeApp:()=>({firestore:()=>db}),firestore:()=>db},console,alert(){},Date});
 vm.runInContext(script.slice(0,script.indexOf('init().catch(')),ctx);await vm.runInContext('init()',ctx);return {ctx,els,printed};
}
module.exports=(async()=>{
 const manager=await session();assert(manager.els.weeklyPreview.innerHTML.includes('اسم المدير: '),'manager header');assert(manager.els.weeklyPreview.innerHTML.includes('<div>المدير<small>'),'manager signature');assert(!manager.els.weeklyPreview.innerHTML.includes('المشرف على المدارس'),'remove manager intermediate signature');assert(manager.els.weeklyPreview.innerHTML.includes('المديرة العامة للمجمعات'));assert(manager.els.weeklyPreview.innerHTML.includes('جوهرة الزهراني'));assert.equal(manager.els.generalSupervisorField.hidden,true);assert.equal(manager.els.reportOwnerLabel.textContent,'اسم المدير');assert.equal(manager.els.savedWeekOwnerLabel.textContent,'اسم المدير');assert.equal(vm.runInContext('teachers.length',manager.ctx),2,'manager includes all teachers');
 vm.runInContext('printWeekly()',manager.ctx);assert(manager.printed[0].includes('اسم المدير: '));assert(!manager.printed[0].includes('المشرف على المدارس'));
 await vm.runInContext("loadSavedWeek('saved')",manager.ctx);assert(manager.els.weeklyPreview.innerHTML.includes('اسم محفوظ'));assert(!manager.els.weeklyPreview.innerHTML.includes('اسم مشرف قديم'),'legacy saved names must not restore hidden signature');assert.equal(vm.runInContext('weekDoc().reportAccountType',manager.ctx),'manager');assert.equal(vm.runInContext("Object.hasOwn(weekDoc(),'generalSupervisor')",manager.ctx),false,'manager save omits general supervisor');
 const supervisor=await session('supervisor');assert(supervisor.els.weeklyPreview.innerHTML.includes('اسم المشرف التعليمي: '));assert(supervisor.els.weeklyPreview.innerHTML.includes('المشرف على المدارس'));assert.equal(supervisor.els.generalSupervisorField.hidden,false);assert.equal(vm.runInContext('teachers.length',supervisor.ctx),1,'specialist keeps assigned teachers');assert.equal(vm.runInContext('weekDoc().generalSupervisor',supervisor.ctx),'أحمد سمير');
 const legacyManager=await session('', 'manager');assert(legacyManager.els.weeklyPreview.innerHTML.includes('اسم المدير: '));assert.equal(vm.runInContext('teachers.length',legacyManager.ctx),2);
 const workflow=fs.readFileSync(__dirname+'/../.github/workflows/sync-rased.yml','utf8');assert(workflow.includes("--exclude 'supervisor-weekly-report.html'"));
 console.log('PASS: manager report labels, two signatures, preserved director, legacy saved weeks, print content, all-school teachers, specialist scope, legacy manager role and sync protection.');
})();
