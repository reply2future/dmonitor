const path = require('path')
const { Monitor, ACTION_EVENT, STATUS_EVENT } = require('./monitor')
const { app, Menu, Notification, Tray, nativeImage, BrowserWindow, ipcMain, shell } = require('electron')
const { isDev, getIpcStoreKey } = require('./tool')
const { store, STORE_KEY } = require('./store')
const logger = require('electron-log')

const monitorConfig = isDev() ? { windowSize: 5 } : {}
const monitor = new Monitor(monitorConfig)

monitor.on(ACTION_EVENT.REMOVE, ({ pid }) => {
  logger.warn(`pid: ${pid} becomes normal`)
  const statusItem = cachedMenus.find(item => item.id === STATUS_ID)
  cachedMenus = cachedMenus.filter(item => item.id !== pid)
  const hasPid = cachedMenus.some(item => item.isPid)
  if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL

  menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
})

monitor.on(ACTION_EVENT.ADD, ({ pid, stat }) => {
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
    after: [STATUS_ID],
    click: () => {
      process.kill(pid)
      logger.info(`sent SIGTERM to command ${stat.command} pid ${pid}`)
      cachedMenus = cachedMenus.filter(item => item.id !== pid)
      const hasPid = cachedMenus.some(item => item.isPid)
      if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL
      menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
    }
  })
  menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
})

Object.entries(STATUS_EVENT).forEach(([_, value]) => {
  monitor.on(value, () => {
    updateStatusItem(value)
  })
})

function updateStatusItem (value) {
  const isRunning = value === STATUS_EVENT.START
  const radios = cachedMenus.filter(item => item.type === 'radio')
  radios.forEach(item => {
    if ((isRunning && item.id === ON_ID) || (!isRunning && item.id === OFF_ID)) {
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
    { type: 'separator' },
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
          menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
        })
      }
    },
    { label: 'Help', role: 'help', click: () => shell.openExternal('https://github.com/reply2future/dmonitor/issues') },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' },
    { type: 'separator' }
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
