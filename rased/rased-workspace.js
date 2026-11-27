/* Shared presentation for the existing Rased workspaces. Native actions and permissions remain authoritative. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document){const boot=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().toLowerCase();
 const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function category(role,label,target=''){
  const t=normalize(label);
  if(/كلمة المرور/.test(t))return 'account';
  if(role==='admin'){
   if(['teachersSection','supervisorsSection','studentCounselorsSection','activityLeadersSection','teacherAssignmentsSection'].includes(target)||/حسابات|اسناد/.test(t))return 'accounts';
   if(/التحكم|الصيانة|اعادة ضبط|تنظيف|الاعدادات/.test(t))return 'settings';
   if(/تحليل|مقارنة|تقرير|تقارير|سجل|الرصد|اوايل|اوائل|متابعة|ارسال رسالة|تطور/.test(t))return 'reports';
   if(['studentsSection','excelImportSection'].includes(target)||/ادارة الطلاب|استيراد الطلاب/.test(t))return 'students';
   return 'education';
  }
  if(role==='teacher'){
   if(/تطوير|مهني|ملفات|رفع ملف/.test(t))return 'development';
   if(/رسايل|رسائل|متابعة الطالب|مستوي|زيارات|تحليل/.test(t))return 'followup';
   return 'education';
  }
  if(/تحليل|مقارنة|حالة الرصد|اوايل|اوائل|الارشيف|تقرير الطالب/.test(t))return 'reports';
  if(['studentsBox'].includes(target)||/متابعة الطلاب|التوجيه الطلابي|المحتاجون للدعم/.test(t))return 'students';
  if(['teachersBox','subjectsBox','testsBox','schedulesBox','messagesBox'].includes(target)||/اختبارات|المعلمون|المواد|سجل الرسائل/.test(t))return 'data';
  return 'supervision';
 }
 function search(entries,query){const q=normalize(query);return entries.filter(e=>!q||normalize(e.label+' '+e.hint).includes(q));}
 function available(button,win){
  if(!button||button.disabled||button.hidden||button.style.display==='none'||button.getAttribute('aria-hidden')==='true'||button.getAttribute('aria-disabled')==='true')return false;
  const style=win.getComputedStyle(button);return style.display!=='none'&&style.visibility!=='hidden';
 }
 function activate(button,win){if(!available(button,win))return false;button.click();return true;}
 const paths={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',book:'M12 7v14M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z',chart:'M4 3v17h17M9 15v-5M14 15V6M19 15v-8',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM9 12l2 2 4-4',folder:'M3 7V4h6l2 3h10v13H3Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',arrow:'M19 12H5m6-6-6 6 6 6',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',key:'M21 3 10 14m6-6 3 3M12 16a5 5 0 1 1-10 0 5 5 0 0 1 10 0',logout:'M9 21H4V3h5m5 4 5 5-5 5M8 12h13',calendar:'M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4',grid:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z'};
 const icon=(name,cls='')=>'<svg class="rui-icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.grid)+'"/></svg>';
 const configs={
  admin:{title:'لوحة الإدارة',subtitle:'كل ما تحتاجه لإدارة المدرسة، في مساحة واحدة.',dashboard:'#adminCardDashboard',tools:'.admin-dashboard-tool',root:'.container',name:null,groups:[['accounts','الحسابات والصلاحيات','users'],['education','الشؤون التعليمية','book'],['students','الطلاب','users'],['reports','التقارير والمتابعة','chart'],['settings','النظام والإعدادات','settings']],quick:['إدارة الطلاب','إدارة المعلمين','حسابات المشرفين','رصد وتعديل الدرجات','إدارة الاختبارات','سجل التدقيق'],close:'closeAdminFeature',show:'showAdminFeature'},
  teacher:{title:'مساحة المعلم',subtitle:'حصصك، طلابك، وأدواتك التعليمية. يوم دراسي أكثر تنظيمًا.',dashboard:'#teacherDashboard',tools:'.dashboard-tool',root:'.container',name:'#headerTeacherName',groups:[['education','التعليم والرصد','book'],['followup','المتابعة والتواصل','chart'],['development','التطوير والملفات','folder'],['account','حسابي','key']],quick:['رصد الدرجات','متابعة الطالب','الخطة الأسبوعية','زياراتي الفنية','سجل رسائل أولياء الأمور','التطوير والدعم المهني'],close:'closeTeacherFeature',show:'showTeacherFeature'},
  supervisor:{title:'مساحة الإشراف',subtitle:'متابعة متكاملة لأعمال الإشراف والمعلمين والتحصيل الدراسي.',dashboard:'#supervisorCardDashboard',tools:'.supervisor-dashboard-tool',root:'.wrap',name:'#supName',groups:[['supervision','الإشراف والزيارات','shield'],['students','الطلاب والتحصيل','users'],['reports','التقارير والتحليل','chart'],['data','البيانات والسجلات','book'],['account','حسابي','key']],quick:['الزيارات الفنية','متابعة أعمال الإشراف','متابعة الخطة الأسبوعية','المعلمون','تحليل النتائج','متابعة الطلاب'],close:'closeSupervisorFeature',show:'showSupervisorFeature'}
 };
 function mount(win){
  const doc=win.document,role=doc.body.dataset.rasedWorkspace,cfg=configs[role];
  if(!cfg||doc.getElementById('ruiSidebar'))return;
  const content=doc.querySelector(cfg.root),dashboard=doc.querySelector(cfg.dashboard);if(!content||!dashboard)return;
  const $=id=>doc.getElementById(id);let entries=[],view='home',selectedGroup='home',searchIndex=-1,suppressed=false,queued=false,previousFocus=null;
  const nativeClose=win[cfg.close];
  if(role==='admin')['studentPortalControls','teacherPortalControls','supervisorPortalControls','maintenanceSection'].forEach(id=>{const panel=doc.getElementById(id);if(panel){panel.classList.add('rui-external-panel');content.append(panel);}});
  content.classList.add('rui-content');
  const sidebar=doc.createElement('aside');sidebar.id='ruiSidebar';sidebar.className='rui-sidebar';sidebar.setAttribute('aria-label','التنقل الرئيسي');
  sidebar.innerHTML='<a class="rui-brand" href="#ruiHome"><img src="logo.jpeg" alt="شعار مدارس الفلاح"><span><b>راصد<span class="rui-brand-dot">.</span></b><small>مدارس الفلاح الأهلية</small></span></a><div class="rui-workspace-label">مساحة العمل</div><nav id="ruiNav"></nav><div class="rui-sidebar-bottom"><span class="rui-live-dot"></span><span>نظام راصد التعليمي</span><div class="rui-sidebar-account"><a data-rui-password href="change-password.html?return='+ (role==='supervisor'?'supervisor-dashboard':role)+'.html">كلمة المرور</a><button id="ruiSidebarLogout" type="button">تسجيل الخروج</button></div><small>تصميم محمد عامر أحمد</small></div>';
  const top=doc.createElement('div');top.id='ruiTopbar';top.className='rui-topbar';top.setAttribute('role','banner');
  top.innerHTML='<div class="rui-breadcrumb"><button class="rui-icon-button rui-mobile-menu" id="ruiMenuToggle" aria-label="فتح قائمة التنقل" aria-controls="ruiSidebar" aria-expanded="false">'+icon('menu')+'</button><span class="rui-top-school">مدارس الفلاح</span><span class="rui-divider">/</span><strong id="ruiPageTitle">'+cfg.title+'</strong></div><div class="rui-search-wrap">'+icon('search')+'<input id="ruiSearch" type="search" placeholder="ابحث عن خدمة…" aria-label="البحث في الخدمات المتاحة" role="combobox" aria-autocomplete="list" aria-controls="ruiSearchResults" aria-expanded="false" autocomplete="off"><kbd>/</kbd></div><div class="rui-account"><div class="rui-avatar" id="ruiAvatar">ر</div><span><strong id="ruiAccountName">جارٍ تحميل الحساب…</strong><small id="ruiAccountRole">'+cfg.title+'</small></span><button id="ruiAccountMenu" class="rui-icon-button" aria-label="قائمة الحساب" aria-expanded="false">'+icon('settings')+'</button><div id="ruiAccountActions" class="rui-account-actions" hidden><a data-rui-password href="change-password.html?return='+ (role==='supervisor'?'supervisor-dashboard':role)+'.html">'+icon('key')+'تغيير كلمة المرور</a><button id="ruiLogout">'+icon('logout')+'تسجيل الخروج</button><button id="ruiExecutiveBack" hidden>العودة إلى المدير العام</button></div></div>';
  const backdrop=doc.createElement('button');backdrop.id='ruiNavBackdrop';backdrop.className='rui-nav-backdrop';backdrop.setAttribute('aria-label','إغلاق قائمة التنقل');backdrop.hidden=true;
  const results=doc.createElement('div');results.id='ruiSearchResults';results.className='rui-search-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','نتائج البحث في الخدمات');results.hidden=true;
  const home=doc.createElement('section');home.id='ruiHome';home.className='rui-home';
  home.innerHTML='<div class="rui-page-heading"><div><span class="rui-eyebrow">مساحة عملك، بوضوح أكبر</span><h1 id="ruiGreeting">'+cfg.title+'</h1><p>'+cfg.subtitle+'</p></div><span class="rui-date" id="ruiDate">'+icon('calendar')+'</span></div><div class="rui-metrics" id="ruiMetrics"></div><div class="rui-section-heading"><div><h2>الوصول السريع</h2><p>أدواتك اليومية، على بُعد خطوة.</p></div><span id="ruiServiceCount" class="rui-count-label"></span></div><div class="rui-quick-grid" id="ruiQuickAccess"></div><div class="rui-section-heading rui-explore-heading"><div><h2>استكشف مساحة العمل</h2><p>خدمات منظّمة لتصل إلى ما تحتاجه بسهولة.</p></div></div><div class="rui-category-grid" id="ruiCategories"></div>';
  const services=doc.createElement('section');services.id='ruiServices';services.className='rui-services';services.hidden=true;
  const back=doc.createElement('button');back.id='ruiFeatureBack';back.className='rui-feature-back';back.hidden=true;back.innerHTML=icon('arrow')+'العودة إلى مساحة العمل';
  const status=doc.createElement('div');status.id='ruiStatus';status.className='rui-sr-only';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  doc.body.prepend(sidebar,top,backdrop,results);content.prepend(home,services,back,status);doc.body.classList.add('rui-ready');
  $('ruiDate').append(doc.createTextNode(new Intl.DateTimeFormat('ar-SA',{weekday:'long',day:'numeric',month:'long',calendar:'gregory'}).format(new Date())));
  const groupInfo=id=>cfg.groups.find(g=>g[0]===id)||[id,'خدمات أخرى','grid'];
  function list(){return entries.filter(e=>available(e.button,win));}
  function collect(){entries=[...dashboard.querySelectorAll(cfg.tools)].map((button,index)=>{const label=clean(button.querySelector('strong')?.textContent||button.textContent),hint=clean(button.querySelector('small')?.textContent);return {button,id:index,label,hint,category:category(role,label,button.dataset.adminTarget||button.dataset.supervisorTarget||button.dataset.feature||'')};}).filter(e=>e.label);}
  function actionCard(e,compact=false){return '<button type="button" class="rui-service-card '+(compact?'rui-compact':'')+'" data-rui-service="'+e.id+'"><span class="rui-service-icon">'+icon(groupInfo(e.category)[2])+'</span><span class="rui-service-copy"><strong>'+esc(e.label)+'</strong><small>'+esc(e.hint||groupInfo(e.category)[1])+'</small></span>'+icon('arrow','rui-service-arrow')+'</button>';}
  function bindCards(container){container.querySelectorAll('[data-rui-service]').forEach(button=>button.onclick=()=>openEntry(Number(button.dataset.ruiService)));}
  function renderCatalog(){
   const allowed=list();
   const passwordAllowed=role==='admin'||allowed.some(e=>e.category==='account');
   doc.querySelectorAll('[data-rui-password]').forEach(link=>link.hidden=!passwordAllowed);
   $('ruiNav').innerHTML='<button class="rui-nav-item '+(selectedGroup==='home'?'is-active':'')+'" data-rui-category="home" '+(selectedGroup==='home'?'aria-current="page"':'')+'>'+icon('home')+'<span>الرئيسية</span></button>'+cfg.groups.map(([id,label,symbol])=>{const count=allowed.filter(e=>e.category===id).length;return count?'<button class="rui-nav-item '+(selectedGroup===id?'is-active':'')+'" data-rui-category="'+id+'" '+(selectedGroup===id?'aria-current="page"':'')+'>'+icon(symbol)+'<span>'+label+'</span><small>'+count+'</small></button>':'';}).join('');
   $('ruiNav').querySelectorAll('[data-rui-category]').forEach(button=>button.onclick=()=>navigate(button.dataset.ruiCategory));
   const quick=cfg.quick.map(label=>allowed.find(e=>e.label===label)).filter(Boolean);allowed.forEach(e=>{if(quick.length<6&&!quick.includes(e)&&e.category!=='account'&&e.category!=='settings')quick.push(e);});
   $('ruiQuickAccess').innerHTML=quick.map(e=>actionCard(e,true)).join('')||'<div class="rui-empty">لا توجد خدمات متاحة لحسابك حاليًا.</div>';bindCards($('ruiQuickAccess'));
   $('ruiServiceCount').textContent=allowed.length+' خدمة متاحة';
   $('ruiCategories').innerHTML=cfg.groups.map(([id,label,symbol])=>{const count=allowed.filter(e=>e.category===id).length;return count?'<button class="rui-category-card" data-rui-category="'+id+'"><span>'+icon(symbol)+'</span><strong>'+label+'</strong><small>'+count+' خدمات</small>'+icon('arrow')+'</button>':'';}).join('');
   $('ruiCategories').querySelectorAll('[data-rui-category]').forEach(button=>button.onclick=()=>navigate(button.dataset.ruiCategory));
   if(view==='category')renderServices();if(!$('ruiSearchResults').hidden)renderSearch();syncInfo();
  }
  function renderServices(){const g=groupInfo(selectedGroup),allowed=list().filter(e=>e.category===selectedGroup);services.innerHTML='<div class="rui-page-heading"><div><span class="rui-eyebrow">'+cfg.title+'</span><h1>'+g[1]+'</h1><p>اختر الخدمة للبدء. تظهر هنا الأدوات المتاحة لحسابك.</p></div><span class="rui-count-label">'+allowed.length+' خدمات</span></div><div class="rui-service-grid">'+allowed.map(e=>actionCard(e)).join('')+'</div>';bindCards(services);}
  function clearNative(){suppressed=true;try{if(typeof nativeClose==='function')nativeClose();}finally{suppressed=false;}doc.querySelectorAll('.rui-external-panel').forEach(el=>el.hidden=true);}
  function navigate(id){closeDrawers();clearNative();view=id==='home'?'home':'category';selectedGroup=id;home.hidden=view!=='home';services.hidden=view!=='category';back.hidden=true;doc.body.classList.remove('rui-feature-view');$('ruiPageTitle').textContent=id==='home'?cfg.title:groupInfo(id)[1];renderCatalog();closeMenu();closeSearch();win.scrollTo({top:0,behavior:'smooth'});}
  function showFeature(title){view='feature';home.hidden=true;services.hidden=true;back.hidden=false;doc.body.classList.add('rui-feature-view');if(title)$('ruiPageTitle').textContent=title;closeMenu();closeSearch();win.scrollTo({top:0,behavior:'smooth'});}
  function openEntry(id){const e=entries.find(e=>e.id===id);if(!e||!available(e.button,win)){schedule();$('ruiStatus').textContent='هذه الخدمة غير متاحة للحساب الحالي.';return;}closeDrawers();clearNative();selectedGroup=e.category;renderCatalog();showFeature(e.label);activate(e.button,win);}
  function hook(name,after){const original=win[name];if(typeof original!=='function')return;win[name]=function(...args){const result=original.apply(this,args);if(!suppressed)after(args);return result;};}
  hook(cfg.show,args=>{doc.querySelectorAll('.rui-external-panel').forEach(panel=>panel.hidden=true);const title=role==='teacher'?entries.find(e=>e.button.dataset.feature===args[0])?.label:args[2];showFeature(title);});
  hook(cfg.close,()=>navigate(selectedGroup==='home'?'home':selectedGroup));
  hook('closeUnifiedWorkspace',()=>navigate(selectedGroup||'home'));
  if(role==='admin')hook('openAdminPortalControls',args=>{const panel=$(args[0]);if(panel)panel.classList.add('rui-external-panel');showFeature(panel?.querySelector('h2,h3')?.textContent||'إعدادات البوابة');});
  back.onclick=()=>navigate(selectedGroup||'home');sidebar.querySelector('.rui-brand').onclick=e=>{e.preventDefault();navigate('home');};
  const mobileMenu=win.matchMedia('(max-width:820px)');
  function syncMenu(){const hidden=mobileMenu.matches&&!doc.body.classList.contains('rui-menu-open');sidebar.inert=hidden;sidebar.setAttribute('aria-hidden',String(hidden));if(!mobileMenu.matches){backdrop.hidden=true;doc.body.classList.remove('rui-menu-open');$('ruiMenuToggle').setAttribute('aria-expanded','false');}}
  function closeMenu(){const hadFocus=sidebar.contains(doc.activeElement);doc.body.classList.remove('rui-menu-open');backdrop.hidden=true;$('ruiMenuToggle').setAttribute('aria-expanded','false');syncMenu();if(hadFocus&&mobileMenu.matches)$('ruiMenuToggle').focus();}
  $('ruiMenuToggle').onclick=()=>{const opened=doc.body.classList.toggle('rui-menu-open');backdrop.hidden=!opened;$('ruiMenuToggle').setAttribute('aria-expanded',String(opened));syncMenu();if(opened)sidebar.querySelector('.is-active')?.focus();};backdrop.onclick=closeMenu;mobileMenu.addEventListener('change',syncMenu);syncMenu();
  function closeSearch(){$('ruiSearch').value='';results.hidden=true;$('ruiSearch').setAttribute('aria-expanded','false');$('ruiSearch').removeAttribute('aria-activedescendant');searchIndex=-1;}
  function renderSearch(){const q=$('ruiSearch').value,found=search(list(),q).slice(0,12);if(!clean(q)){closeSearch();return;}results.hidden=false;$('ruiSearch').setAttribute('aria-expanded','true');results.innerHTML='<div class="rui-search-caption">'+found.length+' نتيجة في خدماتك</div>'+found.map((e,i)=>'<button role="option" aria-selected="false" id="ruiSearchOption'+i+'" data-rui-service="'+e.id+'">'+icon(groupInfo(e.category)[2])+'<span><strong>'+esc(e.label)+'</strong><small>'+groupInfo(e.category)[1]+'</small></span>'+icon('arrow')+'</button>').join('')+(found.length?'':'<div class="rui-empty">لا توجد خدمة بهذا الاسم. جرّب كلمة أخرى.</div>');bindCards(results);searchIndex=-1;}
  $('ruiSearch').oninput=renderSearch;
  $('ruiSearch').onkeydown=e=>{const options=[...results.querySelectorAll('[role="option"]')];if(e.key==='Escape'){closeSearch();return;}if(['ArrowDown','ArrowUp'].includes(e.key)&&options.length){e.preventDefault();searchIndex=(searchIndex+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((b,i)=>{b.classList.toggle('is-selected',i===searchIndex);b.setAttribute('aria-selected',String(i===searchIndex));});$('ruiSearch').setAttribute('aria-activedescendant',options[searchIndex].id);options[searchIndex].scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&options.length){e.preventDefault();options[Math.max(0,searchIndex)].click();}};
  $('ruiAccountMenu').onclick=()=>{const box=$('ruiAccountActions');box.hidden=!box.hidden;$('ruiAccountMenu').setAttribute('aria-expanded',String(!box.hidden));};
  $('ruiLogout').onclick=()=>{const original=doc.querySelector('body > header .logout,body > .header .logout');if(original)original.click();else if(typeof win.logout==='function')win.logout();};
  $('ruiSidebarLogout').onclick=()=>$('ruiLogout').click();
  $('ruiExecutiveBack').onclick=()=>{if(typeof win.returnToExecutiveDashboard==='function')win.returnToExecutiveDashboard();};
  doc.addEventListener('click',e=>{if(!top.contains(e.target)&&!results.contains(e.target)){closeSearch();$('ruiAccountActions').hidden=true;$('ruiAccountMenu').setAttribute('aria-expanded','false');}});
  function syncInfo(){
   let info={};try{info=win.RasedWorkspaceInfo?.()||{};}catch{}
   const raw=clean(info.name||(cfg.name?doc.querySelector(cfg.name)?.textContent:'')||'');const name=raw&&!['...','المستخدم','جارٍ تحميل الحساب…'].includes(raw)?raw:(role==='admin'?'فريق الإدارة':role==='teacher'?'المعلم':'المشرف');
   $('ruiAccountName').textContent=name;$('ruiAvatar').textContent=name.split(' ').slice(0,2).map(x=>x[0]).join('');$('ruiGreeting').textContent='مرحبًا، '+name;
   const roleLabel=role==='supervisor'?clean($('supRoleLabel')?.textContent).replace(/^نوع الحساب:\s*/,''):'';if(roleLabel)$('ruiAccountRole').textContent=roleLabel;
   $('ruiExecutiveBack').hidden=!$('executiveReturn')||win.getComputedStyle($('executiveReturn')).display==='none';
   let metrics=info.metrics||[];
   if(role==='admin')metrics=[['statStudents','الطلاب'],['statTeachers','المعلمون'],['statClasses','الفصول'],['statTests','الاختبارات']].map(([id,label])=>({label,value:clean($(id)?.textContent)||'—'}));
   if(role==='supervisor')metrics=[['sTeachers','المعلمون'],['sStudents','الطلاب'],['sTests','الاختبارات'],['sGrades','الدرجات المرصودة']].filter(([id])=>{const node=$(id);return node&&win.getComputedStyle(node.parentElement).display!=='none';}).map(([id,label])=>({label,value:clean($(id).textContent)||'—'}));
   if(!metrics.length)metrics=[{label:'الخدمات المتاحة',value:list().length}];
   $('ruiMetrics').style.setProperty('--rui-metric-columns',Math.min(4,metrics.length));
   $('ruiMetrics').innerHTML=metrics.slice(0,4).map((m,i)=>'<article class="rui-metric"><span class="rui-metric-symbol">'+icon(['users','book','grid','chart'][i])+'</span><span class="rui-metric-label">'+esc(m.label)+'</span><strong>'+esc(m.value)+'</strong><span class="rui-metric-foot">'+(role==='teacher'?'ضمن إسناداتك':'البيانات المسجلة في راصد')+'</span></article>').join('');
  }
  function schedule(){if(queued)return;queued=true;win.setTimeout(()=>{queued=false;collect();renderCatalog();},40);}
  const observer=new win.MutationObserver(schedule);observer.observe(dashboard,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','disabled','aria-hidden','aria-disabled','class']});
  ['statStudents','statTeachers','statClasses','statTests','sStudents','sTeachers','sTests','sGrades','headerTeacherName','supName','supRoleLabel','executiveReturn'].forEach(id=>{const node=$(id);if(node)new win.MutationObserver(schedule).observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});});
  win.addEventListener('load',schedule);win.addEventListener('focus',schedule);
  const editors=role==='admin'?[['teacherEditor','بيانات المعلم'],['supervisorEditor','الحساب والصلاحيات'],['counselorEditor','حساب الموجه الطلابي'],['activityEditor','حساب رائد النشاط']]:[];
  const drawerBackdrop=doc.createElement('div');drawerBackdrop.id='ruiDrawerBackdrop';drawerBackdrop.className='rui-drawer-backdrop';drawerBackdrop.hidden=true;doc.body.append(drawerBackdrop);
  function closeDrawers(){editors.forEach(([id])=>{const e=$(id);if(e)e.hidden=true;});doc.body.classList.remove('rui-drawer-open');drawerBackdrop.hidden=true;}
  function syncDrawer(editor){
   const opened=!editor.hidden;editor.classList.toggle('rui-editor-open',opened);if(opened){previousFocus=doc.activeElement?.closest('.rui-row-menu')?.querySelector('summary')||doc.activeElement;editor.setAttribute('role','dialog');editor.setAttribute('aria-modal','true');editor.setAttribute('aria-labelledby','ruiEditorTitle'+editor.id);doc.body.classList.add('rui-drawer-open');drawerBackdrop.hidden=false;win.setTimeout(()=>editor.querySelector('input:not([type="hidden"]),select,textarea,.rui-editor-close')?.focus(),30);}else{editor.removeAttribute('aria-modal');if(!editors.some(([id])=>$(id)&&!$(id).hidden)){doc.body.classList.remove('rui-drawer-open');drawerBackdrop.hidden=true;if(previousFocus?.isConnected)previousFocus.focus();}}
  }
  editors.forEach(([id,title])=>{const editor=$(id);if(!editor)return;editor.classList.add('rui-editor');const heading=doc.createElement('div');heading.className='rui-editor-heading';heading.innerHTML='<div><small>إدارة الحسابات</small><h2 id="ruiEditorTitle'+id+'">'+title+'</h2></div><button type="button" class="rui-icon-button rui-editor-close" aria-label="إغلاق نافذة '+title+'">'+icon('close')+'</button>';heading.querySelector('button').onclick=()=>editor.hidden=true;editor.prepend(heading);new win.MutationObserver(()=>syncDrawer(editor)).observe(editor,{attributes:true,attributeFilter:['hidden']});if(!editor.hidden)syncDrawer(editor);});
  function accountTable(source){
   const tableBox=doc.createElement('div');tableBox.className='rui-account-table';tableBox.setAttribute('aria-label','قائمة الحسابات');source.before(tableBox);source.classList.add('rui-account-source');
   function render(){
    const cards=[...source.querySelectorAll('.account-card')].filter(card=>!card.hidden);
    tableBox.innerHTML='<table><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>نوع الحساب</th><th>الإسنادات والبيانات</th><th>الإجراءات</th></tr></thead><tbody>'+cards.map((card,i)=>{const name=clean(card.querySelector('.account-card-name')?.textContent),login=clean(card.querySelector('.account-card-meta span')?.textContent).replace(/^[^\p{L}\p{N}]+/u,''),roleName=clean(card.querySelector('.account-role-badge')?.textContent),details=[...card.querySelectorAll('.account-detail-panel:not([hidden])')];const buttons=[...card.querySelectorAll('button')];return '<tr><td><span class="rui-table-name"><span class="rui-mini-avatar">'+esc(name[0]||'ح')+'</span><strong>'+esc(name)+'</strong></span></td><td class="rui-login">'+esc(login)+'</td><td><span class="rui-role-pill">'+esc(roleName)+'</span></td><td>'+esc(clean(card.querySelector('.account-detail-tile-count')?.textContent)||'—')+'</td><td><details class="rui-row-menu"><summary>إدارة '+icon('settings')+'</summary><div>'+buttons.map((b,j)=>'<button type="button" data-rui-account="'+i+'" data-rui-action="'+j+'" '+(b.disabled?'disabled':'')+'>'+esc(clean(b.querySelector('.account-detail-tile-label')?.textContent||b.textContent).replace(/^[^\p{L}\p{N}]+/u,''))+'</button>').join('')+'</div></details></td></tr>'+(details.length?'<tr class="rui-detail-row"><td colspan="5">'+details.map(panel=>'<section><strong>'+esc(clean(panel.querySelector('.account-detail-panel-title')?.textContent))+'</strong><div>'+[...panel.querySelectorAll('.account-detail-item,.account-detail-empty')].map(item=>'<span>'+esc(clean(item.textContent))+'</span>').join('')+'</div></section>').join('')+'</td></tr>':'');}).join('')+(cards.length?'':'<tr><td colspan="5" class="rui-empty">'+esc(clean(source.querySelector('.account-empty')?.textContent)||'لا توجد حسابات مطابقة للبحث.')+'</td></tr>')+'</tbody></table>';
    tableBox.querySelectorAll('[data-rui-account]').forEach(button=>button.onclick=()=>{const original=cards[Number(button.dataset.ruiAccount)]?.querySelectorAll('button')[Number(button.dataset.ruiAction)];if(original&&!original.disabled){button.closest('details').open=false;original.click();}});
    tableBox.querySelectorAll('.rui-row-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(!menu.open)return;doc.querySelectorAll('.rui-row-menu[open]').forEach(other=>{if(other!==menu)other.open=false;});const popup=menu.querySelector('div'),rect=menu.querySelector('summary').getBoundingClientRect(),height=popup.offsetHeight,width=popup.offsetWidth;popup.style.left=Math.max(12,Math.min(rect.left,win.innerWidth-width-12))+'px';popup.style.top=Math.max(12,Math.min(rect.bottom+8+height<=win.innerHeight-12?rect.bottom+8:rect.top-height-8,win.innerHeight-height-12))+'px';}));
   }
   new win.MutationObserver(render).observe(source,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled']});render();
  }
  doc.addEventListener('scroll',event=>{if(event.target.nodeType===1&&event.target.closest('.rui-row-menu>div'))return;doc.querySelectorAll('.rui-row-menu[open]').forEach(menu=>menu.open=false);},true);
  win.addEventListener('resize',()=>doc.querySelectorAll('.rui-row-menu[open]').forEach(menu=>menu.open=false));
  if(role==='admin')['teachersBody','supervisorsBody','studentCounselorsBody','activityLeadersBody'].forEach(id=>{const source=$(id);if(source)accountTable(source);});
  doc.addEventListener('keydown',e=>{
   const editor=editors.map(([id])=>$(id)).find(el=>el&&!el.hidden);
   if(e.key==='Escape'){closeSearch();closeMenu();$('ruiAccountActions').hidden=true;doc.querySelectorAll('.rui-row-menu[open]').forEach(menu=>menu.open=false);if(editor)editor.hidden=true;return;}
   const input=/INPUT|TEXTAREA|SELECT/.test(doc.activeElement?.tagName)||doc.activeElement?.isContentEditable;
   const shortcut=(e.key==='/'&&!input)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k');
   if(shortcut){e.preventDefault();if(!editor)$('ruiSearch').focus();}
   if(e.key==='Tab'&&doc.body.classList.contains('rui-menu-open')){const items=[...sidebar.querySelectorAll('a,button')].filter(el=>!el.hidden);if(e.shiftKey&&doc.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&doc.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}
   if(e.key==='Tab'&&editor){const items=[...editor.querySelectorAll('button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);const first=items[0],last=items[items.length-1];if(!editor.contains(doc.activeElement)){e.preventDefault();(e.shiftKey?last:first)?.focus();}else if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first?.focus();}}
  });
  collect();renderCatalog();
  return Object.freeze({refresh:schedule,navigate});
 }
 return {normalize,category,search,available,activate,mount};
});
