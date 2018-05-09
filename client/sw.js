let lastManifest
let localCache = {}
let localCacheOrder = []
const chunkName = url => url.match(/\d+(\.ts)/g)[0]

async function msgClient (id, msg) {
  const c = await self.clients.get(id)
  if (!c) return
  const chan = new MessageChannel()
  c.postMessage(msg, [chan.port2])
}

self.addEventListener('message', event => {
  const { name, ab } = event.data
  localCache[name] = ab
  localCacheOrder.push(name)
  if (localCacheOrder.length > 5) {
    const pastName = localCacheOrder.shift()
    delete localCache[pastName]
  }  
})

async function loadManifest (req, url, id) {
    const reply = await fetch(req)
    const manifestText = await reply.clone().text()
    if (manifestText === lastManifest ) return reply
    const magnets = manifestText.split('\n').filter(l => l.includes('.ts'))
    msgClient(id, { magnets })
    const resp = new Response(lastManifest || manifestText)
    lastManifest = manifestText  
    return resp
}

async function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function loadChunk (req, url, id) {
  const name = chunkName(url)
  while (!localCache[name]) {
      await sleep(3000);
  }
  return new Response(localCache[name]);
}

self.addEventListener('install', event => self.skipWaiting())
self.addEventListener('activate', event => self.clients.claim())
self.addEventListener('fetch', event => {
  const url = event.request.url
  if (event.request.method === 'GET' && url.includes('.m3u8')) {
    event.respondWith(loadManifest(event.request, url, event.clientId))
  } else if (event.request.method === 'GET' && url.includes('.ts')) {
    event.respondWith(loadChunk(event.request, url, event.clientId))
  }
})
