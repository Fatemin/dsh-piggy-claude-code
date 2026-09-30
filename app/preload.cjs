/**
 * Bridge between the pig page (web/desk.html) and the Electron main process.
 *
 * desk.html already talks to a native host through
 * `window.webkit.messageHandlers.pig` (the macOS WKWebView shell); exposing the
 * same shape here lets the page stay identical across both shells.
 *
 * It also tells the main process whether the pointer is over the pig, so the
 * window can let clicks through everywhere else.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    pig: { postMessage: message => ipcRenderer.send('pig', message) },
  },
})

let overPig = null
let pressed = false

function report(hit) {
  if (hit === overPig) return
  overPig = hit
  ipcRenderer.send('pig', { type: 'hit', hit })
}

window.addEventListener('mousemove', event => {
  if (pressed) return
  const el = document.elementFromPoint(event.clientX, event.clientY)
  report(el !== null && el.closest('[data-dsh-pig]') !== null)
}, true)
window.addEventListener('mousedown', () => { pressed = true }, true)
window.addEventListener('mouseup', () => { pressed = false }, true)
document.addEventListener('mouseleave', () => { if (!pressed) report(false) })
