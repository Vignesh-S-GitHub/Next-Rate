/* Notification-only service worker. Does not cache or poll market prices. */
'use strict';
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=new URL('./#tools',self.registration.scope).href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const page=windows.find(client=>client.url.startsWith(self.registration.scope));
  if(page){
   if(typeof page.navigate==='function')await page.navigate(url);
   return page.focus();
  }
  return self.clients.openWindow(url);
 })());
});
