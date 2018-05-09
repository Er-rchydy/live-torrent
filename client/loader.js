/* eslint-env browser */
const WebTorrent = require('webtorrent')
const client = new WebTorrent()

const torrents = []
const announceList = [['wss://tracker.openwebtorrent.com']]

window.p2p = 0
window.server = 0

navigator.serviceWorker.register('../sw.js').then(() => {
  navigator.serviceWorker.addEventListener('message', msg => {
    return newTorrent(msg.data.magnets)
  })
}).catch(() => console.log('SW registration failure'))

function cleanupTorrents () {
  if (torrents.length < 6) return
  const oldTorrent = torrents.shift()
  client.remove(oldTorrent.magnetURI)
}

function isTorrentAdded (input) {
  if (torrents.find(t => t.magnetURI === input)) return true
  return false
}

function onDone (t) {  
  t.files[0].getBuffer((err, b) => {
    if (err) return console.log('err with onDone')
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
    window.p2p += ab.byteLength
    navigator.serviceWorker.controller.postMessage({ name: t.files[0].name, ab }, [ab])
  })
}

function onAdded (t, isSeed) {
  torrents.push({ name: t.name, magnetURI: t.magnetURI })
  cleanupTorrents()
}

function newTorrent (magnets) {
  magnets.forEach(magnet => {
    if (isTorrentAdded(magnet)) return
    const t = client.add(magnet)
    t.on('infoHash', () => onAdded(t))
    t.on('done', () => onDone(t))
  })
}

