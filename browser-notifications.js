/* Foreground notifications: Android uses a scoped service worker.
 * No server push exists; price targets are evaluated when NextRate is visited. */
(function(root){
'use strict';
function createNotifier(env){
 const notification=()=>env.Notification;
 const workers=()=>env.navigator?.serviceWorker;
 const permitted=()=>notification()?.permission==='granted';
 async function worker(){
  if(!workers()?.register)throw new Error('service-worker-unavailable');
  const reg=await workers().register('./notification-sw.js',{scope:'./'});
  return reg.active?reg:await workers().ready;
 }
 async function enable(){
  if(env.isSecureContext===false)return {ok:false,reason:'insecure'};
  if(!notification()||typeof notification().requestPermission!=='function')
   return {ok:false,reason:'unsupported'};
  if(!workers()?.register)return {ok:false,reason:'service-worker-unavailable'};
  if(notification().permission==='denied')return {ok:false,reason:'denied'};
  // Ask synchronously within the button gesture, before any await.
  let permission=notification().permission;
  if(permission!=='granted'){
   try{permission=await notification().requestPermission();}
   catch{return {ok:false,reason:'permission-error'};}
  }
  if(permission!=='granted')return {ok:false,reason:'not-allowed'};
  try{await worker();return {ok:true,reason:'ready'};}
  catch{return {ok:false,reason:'worker-error'};}
 }
 async function show(title,body,tag='nextrate-test'){
  if(!permitted())return {ok:false,reason:'not-allowed'};
  if(env.isSecureContext===false||!workers()?.register)return {ok:false,reason:'service-worker-unavailable'};
  try{
   const reg=await worker();
   await reg.showNotification(title,{body,tag,icon:'./assets/nextrate-icon.png',data:{url:'./#tools'}});
   return {ok:true,reason:'shown'};
  }catch{return {ok:false,reason:'display-error'};}
 }
 return Object.freeze({enable,show,permitted});
}
const api=Object.freeze({createNotifier,...createNotifier(root)});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.NextRateNotifications=api;
})(typeof window==='undefined'?globalThis:window);
