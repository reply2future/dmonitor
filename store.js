const Store = require('electron-store')
const store = new Store()

const STORE_KEY = {
  silentTimeHr: 'silentTimeHr',
  autoLaunch: 'autoLaunch',
  appInfo: 'appInfo'
}

module.exports = { store, STORE_KEY }
