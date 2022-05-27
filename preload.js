const { contextBridge } = require('electron')
const path = require('path')

contextBridge.exposeInMainWorld('electron', {
  getLocalAssertPath: (fileName) => {
    return path.join(__dirname, 'asserts', fileName)
  }
})
