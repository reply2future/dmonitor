const path = require('path')
const { Monitor, CHANGED_TYPES } = require('./monitor')
const { app, Menu, Notification, Tray, nativeImage, BrowserWindow, ipcMain } = require('electron')
const { isDev, getIpcStoreKey } = require('./tool')
const { store, STORE_KEY } = require('./store')
const logger = require('electron-log')

const monitorConfig = isDev() ? { windowSize: 10 } : {}

const changedActions = {}
changedActions[CHANGED_TYPES.ADD] = ({ pid, stat }) => {
  const command = path.basename(stat.command)
  logger.warn(`pid: ${pid}, command: ${stat.command} drains the battery fast`)
  new Notification({ title: 'ooops', body: `The command "${command}" is draining the battery fast and pid is ${pid}` }).show()

  const statusItem = cachedMenus.find(item => item.id === STATUS_ID)
  statusItem.label = STATUS_HAS_PID_LABEL

  cachedMenus.push({
    label: `kill ${command} (${pid})`,
    toolTip: `the path is "${stat.command}"`,
    type: 'normal',
    isPid: true,
    id: pid,
    before: [LAST_SEQ_ID],
    click: () => {
      process.kill(pid)
      logger.info(`sent SIGTERM to command ${stat.command} pid ${pid}`)
      cachedMenus = cachedMenus.filter(item => item.id !== pid)
      const hasPid = cachedMenus.some(item => item.isPid)
      if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL
      updateStatusItem()
      menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
    }
  })
  updateStatusItem()
  menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
}

changedActions[CHANGED_TYPES.REMOVE] = ({ pid }) => {
  logger.warn(`pid: ${pid} becomes normal`)
  const statusItem = cachedMenus.find(item => item.id === STATUS_ID)
  cachedMenus = cachedMenus.filter(item => item.id !== pid)
  const hasPid = cachedMenus.some(item => item.isPid)
  if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL

  updateStatusItem()
  menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
}

const monitor = new Monitor({
  ...monitorConfig,
  changedCallback: ({ pid, stat, type }) => {
    const fn = changedActions[type]
    if (fn == null) return logger.warn(`type: ${type} action is not found`)

    fn({ pid, stat })
  }
})

function updateStatusItem () {
  const radios = cachedMenus.filter(item => item.type === 'radio')
  radios.forEach(item => {
    if ((monitor.isRunning() && item.id === ON_ID) || (!monitor.isRunning() && item.id === OFF_ID)) {
      item.checked = true
    } else {
      delete item.checked
    }
  })
}

let cachedMenus
let menuTray

const STATUS_ID = 'status'
const ON_ID = 'on'
const OFF_ID = 'off'
const SILENT_ID = 'silent'
const LAST_SEQ_ID = 'lastSeqId'
const STATUS_NO_PID_LABEL = 'There is no draining process'
const STATUS_HAS_PID_LABEL = 'There are some processes draining the battery'
const DEFAULT_SILENT_TIME_HR = 1

let silentTimeoutId = null

function generateSilentTimeLabel () {
  return `    silent mode(${store.get(STORE_KEY.silentTimeHr, 1)} hour)`
}

function initMenuBar () {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'asserts', 'BlackIconTemplate.png'))
  menuTray = new Tray(icon)

  cachedMenus = [
    {
      label: 'Current Status',
      enabled: false
    },
    {
      label: '    on',
      id: ON_ID,
      accelerator: 'CmdOrCtrl+S',
      type: 'radio',
      click: () => {
        clearTimeout(silentTimeoutId)
        monitor.start()
      }
    },
    {
      label: '    off',
      id: OFF_ID,
      type: 'radio',
      checked: true,
      accelerator: 'CmdOrCtrl+P',
      click: () => {
        clearTimeout(silentTimeoutId)
        monitor.stop()
      }
    },
    {
      label: generateSilentTimeLabel(),
      id: SILENT_ID,
      type: 'radio',
      accelerator: 'CmdOrCtrl+L',
      click: () => {
        clearTimeout(silentTimeoutId)
        monitor.stop()
        silentTimeoutId = setTimeout(() => {
          monitor.start()
          cachedMenus.filter(item => item.type === 'radio').forEach(item => {
            if (item.id === ON_ID) item.checked = true
            else delete item.checked
          })
          menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
        }, store.get(STORE_KEY.silentTimeHr, DEFAULT_SILENT_TIME_HR) * 3600 * 1000)
      }
    },
    { type: 'separator' },
    { label: STATUS_NO_PID_LABEL, type: 'normal', id: STATUS_ID },
    { type: 'separator', id: LAST_SEQ_ID },
    {
      label: 'Preferences',
      click: () => {
        const win = new BrowserWindow({
          width: 800,
          height: 600,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js')
          }
        })
        win.loadFile('preference.html')
        win.on('close', () => {
          const silentItem = cachedMenus.find(item => item.id === SILENT_ID)
          silentItem.label = generateSilentTimeLabel()
          updateStatusItem()
          menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
        })
      }
    },
    { label: 'Help', role: 'help' },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]

  menuTray.setToolTip('dmonitor!')
  menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
}

function initListeners () {
  ipcMain.on(getIpcStoreKey(STORE_KEY.autoLaunch), (event, value) => {
    app.setLoginItemSettings({
      openAtLogin: value
    })
  })
}

// This method will be called when Electron has done everything
// initialization and ready for creating menu bar.
app.whenReady()
  .then(() => {
    logger.info('It\'s time to initialize')
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
