'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createNotifier}=require('../browser-notifications.js');
function mock(initial='default'){
 const calls=[],notices=[];
 const registration={active:{state:'activated'},showNotification:async (title,options)=>notices.push({title,options})};
 const Notification={permission:initial,requestPermission(){calls.push('request');Notification.permission='granted';return Promise.resolve('granted');}};
 const navigator={serviceWorker:{register:async (url,options)=>{
  calls.push('register');assert.equal(url,'./notification-sw.js');assert.deepEqual(options,{scope:'./'});return registration;
 },ready:Promise.resolve(registration)}};
 return {env:{Notification,navigator,isSecureContext:true},calls,notices};
}
test('permission is requested on user action then Android notification uses the worker',async()=>{
 const fake=mock(),notifier=createNotifier(fake.env);
 assert.equal((await notifier.enable()).ok,true);
 assert.deepEqual(fake.calls,['request','register']);
 assert.equal((await notifier.show('NextRate notifications ready','Test notification','nextrate-test')).ok,true);
 assert.equal(fake.notices.length,1);
 assert.equal(fake.notices[0].options.tag,'nextrate-test');
 assert.equal(fake.notices[0].options.data.url,'./#tools');
});
test('already granted permission skips permission request',async()=>{
 const f=mock('granted');assert.equal((await createNotifier(f.env).enable()).ok,true);
 assert.deepEqual(f.calls,['register']);
});
test('denied, unsupported and insecure contexts report precise errors',async()=>{
 const f=mock('denied');assert.equal((await createNotifier(f.env).enable()).reason,'denied');assert.deepEqual(f.calls,[]);
 const g=mock();delete g.env.navigator.serviceWorker;
 assert.equal((await createNotifier(g.env).enable()).reason,'service-worker-unavailable');
 const h=mock();h.env.isSecureContext=false;
 assert.equal((await createNotifier(h.env).enable()).reason,'insecure');
});
test('failed service worker registration fails explicitly',async()=>{
 const f=mock('granted');f.env.navigator.serviceWorker.register=async()=>{throw Error('blocked');};
 assert.equal((await createNotifier(f.env).enable()).reason,'worker-error');
 assert.equal((await createNotifier(f.env).show('Test','Hi')).reason,'display-error');
});
test('worker handles notification tap without intercepting fetch or caching rates',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../notification-sw.js'),'utf8');
 assert.match(sw,/notificationclick/);
 assert.match(sw,/clients\.openWindow/);
 assert.doesNotMatch(sw,/addEventListener\('fetch'/);
});
