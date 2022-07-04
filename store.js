const Store = require('electron-store')
const store = new Store()

const STORE_KEY = {
  silentTimeHr: 'silentTimeHr',
  intervalTimeSd: 'intervalTimeSd',
  autoLaunch: 'autoLaunch',
  appInfo: 'appInfo'
}

module.exports = { store, STORE_KEY }
