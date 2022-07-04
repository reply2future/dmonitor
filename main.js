const path = require('path')
const { Monitor, ACTION_EVENT } = require('./monitor')
const { app, Notification, nativeImage, ipcMain } = require('electron')
const { isDev, getIpcStoreKey } = require('./tool')
const { store, STORE_KEY } = require('./store')
const { MenuTray, MENU_CLICK_EVENT } = require('./menu')
const logger = require('electron-log')

const monitorConfig = isDev() ? { windowSize: 5, intervalMs: 1000 } : { intervalMs: store.get(STORE_KEY.intervalTimeSd, 1000) }
const monitor = new Monitor(monitorConfig)

monitor.on(ACTION_EVENT.REMOVE, ({ pid }) => {
  logger.warn(`pid: ${pid} becomes normal`)
  menuTray.removePid({ pid })
})

monitor.on(ACTION_EVENT.ADD, ({ pid, stat }) => {
  const command = path.basename(stat.command)
  logger.warn(`pid: ${pid}, command: ${stat.command} drains the battery fast`)
  new Notification({ title: 'ooops', body: `The command "${command}" is draining the battery fast and pid is ${pid}` }).show()

  menuTray.addPid({
    pid,
    stat,
    clickFn: () => {
      process.kill(pid)
      logger.info(`sent SIGTERM to command ${stat.command} pid ${pid}`)
    }
  })
})

let menuTray

function initMenuBar () {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'asserts', 'BlackIconTemplate.png'))
  menuTray = new MenuTray(icon)
  menuTray.on(MENU_CLICK_EVENT.ON, () => {
    monitor.start()
  })
  menuTray.on(MENU_CLICK_EVENT.OFF, () => {
    monitor.stop()
  })
  menuTray.updateUi()
}

function initListeners () {
  ipcMain.on(getIpcStoreKey(STORE_KEY.autoLaunch), (event, value) => {
    app.setLoginItemSettings({
      openAtLogin: value
    })
  })

  ipcMain.on(getIpcStoreKey(STORE_KEY.intervalTimeSd), (event, intervalMs) => {
    monitor.setInterval(intervalMs)
  })
}

// This method will be called when Electron has done everything
// initialization and ready for creating menu bar.
app.whenReady()
  .then(() => {
    logger.info('It\'s time to initialize')
    store.set(STORE_KEY.appInfo, `${app.getName()}:${app.getVersion()}`)
  })
  .then(initListeners)
  .then(initMenuBar)
  .then(() => {
    logger.info('initialized')
  })
  .catch(error => {
    logger.error(`Failed to initialize: ${error.message}`)
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
