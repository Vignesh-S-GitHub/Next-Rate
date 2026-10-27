import {refresh,respond} from './runtime.mjs';
export default {
  async scheduled(controller,env){await refresh(controller,env);},
  async fetch(request,env){return respond(request,env);},
};
