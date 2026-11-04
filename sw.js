const CACHE_NAME='homeoffice-pwa-v3';
const APP_SHELL=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL))
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
          return response;
        })
        .catch(async()=>{
          return (await caches.match(request)) ||
                 (await caches.match('./index.html')) ||
                 Response.error();
        })
    );
    return;
  }

  // Always check the network for scripts and styles so a cached old version
  // cannot mask a newly deployed release. Keep offline fallback when available.
  if(/\.(?:js|css)$/i.test(url.pathname)){
    event.respondWith(
      fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)));
        }
        return response;
      }).catch(async()=> (await caches.match(request)) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});


self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if('focus' in client){
          client.navigate(target).catch(()=>{});
          return client.focus();
        }
      }
      if(clients.openWindow)return clients.openWindow(target);
    })
  );
});
