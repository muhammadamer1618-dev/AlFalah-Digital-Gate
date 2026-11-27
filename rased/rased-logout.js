/* Explicit staff logout; student sessions belong to their separate portal. */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)root.RasedLogout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const portal='https://rasededu.online/';
 const keys=['alfalah.gate.session.v1','currentUser','currentUserEmail','currentUserName','currentUserRole','currentUserType','currentUserPermissions','currentTeacher','currentSupervisor','weeklyPlanUserName','weeklyPlanUserRole','weeklyPlanUserId','rasedExecutiveReadOnly','rasedExecutiveTarget','rasedExecutiveTargetName','rasedExecutiveActorId','rasedExecutiveActorType',...['Role','User','UserName','UserEmail','UserType','UserPermissions'].map(k=>'rasedExecutiveActor'+k)];
 function clear(win){for(const storage of [win.sessionStorage,win.localStorage])for(const key of keys){try{storage.removeItem(key);}catch(e){}}try{win.sessionStorage.setItem('rasedTabAuthReady','1');}catch(e){}}
 function logout(win){clear(win);try{if(win.top&&win.top!==win&&win.top.location.origin===win.location.origin){clear(win.top);win.top.location.replace(portal+'?logout=1');return;}}catch(e){}win.location.replace(portal+'?logout=1');}
 return Object.freeze({portal,clear,logout});
});
