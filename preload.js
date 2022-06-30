const { contextBridge, ipcRenderer } = require('electron')
const { store, STORE_KEY } = require('./store')
const { getIpcStoreKey } = require('./tool')

// Expose protected methods off of window (ie.
// window.api.sendToA) in order to use ipcRenderer
// without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  STORE_KEY,
  getStore: (key, defaultValue) => store.get(key, defaultValue),
  setStore: (key, value) => {
    store.set(key, value)
    ipcRenderer.send(getIpcStoreKey(key), value)
  },
  getAppInfo: () => store.get(STORE_KEY.appInfo)
})
