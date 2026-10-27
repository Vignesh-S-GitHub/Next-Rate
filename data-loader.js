/* One publication per page load. A failed API falls back to one static set. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NextRateData=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const endpoint='https://nextrate-scheduler.vigneshshanmugam.workers.dev';
  const files=['latest.json','history.json','forecast.json','funds.json','cities.json','forecast_history.json'];
  function createLoader(fetcher,base){
    fetcher=fetcher||fetch;base=base||endpoint;let pending;
    async function read(url){
      const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('Market snapshot unavailable: '+response.status);
      return response.json();
    }
    async function load(){
      try{
        const bundle=await read(base+'/bundle.json');
        if(bundle.schema_version!==1||!bundle.documents||!files.every(f=>bundle.documents[f]?.schema_version===1))throw new Error('Incomplete Cloudflare publication');
        return bundle.documents;
      }catch{
        const result=await Promise.allSettled(files.map(f=>read('./data/'+f+'?v='+Date.now())));
        return Object.fromEntries(files.flatMap((f,i)=>result[i].status==='fulfilled'?[[f,result[i].value]]:[]));
      }
    }
    return {get:async function(file){
      if(!files.includes(file))throw new Error('Unknown market document');
      const docs=await (pending||(pending=load()));
      if(!docs[file])throw new Error('Market snapshot unavailable');
      return docs[file];
    }};
  }
  return {createLoader,endpoint};
});
