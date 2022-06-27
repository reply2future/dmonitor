const Store = require('electron-store')
const store = new Store()

const STORE_KEY = {
  silentTimeHr: 'silentTimeHr'
}

module.exports = { store, STORE_KEY }
