/* One publication per page load. A failed API falls back to one static set. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NextRateData=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  // Retired 30 October 2026: local dated documents are the default.
  // An explicit base remains available for offline regression/source reuse.
  const endpoint=null;
  const files=['latest.json','history.json','forecast.json','funds.json','cities.json','forecast_history.json'];
  function createLoader(fetcher,base){
    fetcher=fetcher||fetch;base=base||endpoint;let pending,metadata={source:'loading'};
    async function read(url){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await fetcher(url,{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Market snapshot unavailable: '+response.status);
        return await response.json();
      }finally{clearTimeout(timer);}
    }
    async function load(){
      if(!base){
        metadata={source:'archive'};
        const result=await Promise.allSettled(files.map(f=>read('./data/'+f)));
        return Object.fromEntries(files.flatMap((f,i)=>result[i].status==='fulfilled'?[[f,result[i].value]]:[]));
      }
      try{
        const bundle=await read(base+'/bundle.json');
        if(bundle.schema_version!==1||!bundle.documents||!files.every(f=>bundle.documents[f]?.schema_version===1))throw new Error('Incomplete Cloudflare publication');
        metadata={source:'cloudflare',revision:bundle.revision};
        return bundle.documents;
      }catch{
        metadata={source:'fallback'};
        const result=await Promise.allSettled(files.map(f=>read('./data/'+f+'?v='+Date.now())));
        return Object.fromEntries(files.flatMap((f,i)=>result[i].status==='fulfilled'?[[f,result[i].value]]:[]));
      }
    }
    return {status:()=>({...metadata}),get:async function(file){
      if(!files.includes(file))throw new Error('Unknown market document');
      const docs=await (pending||(pending=load()));
      if(!docs[file])throw new Error('Market snapshot unavailable');
      return docs[file];
    }};
  }
  return {createLoader,endpoint};
});
