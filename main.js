const path = require('path')
const { Monitor, CHANGED_TYPES } = require('./monitor')
const { app, Menu, Notification, Tray, nativeImage } = require('electron')
const { isDev } = require('./tool')
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
    before: [QUIT_ID],
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
const QUIT_ID = 'quit'
const ON_ID = 'on'
const OFF_ID = 'off'
const STATUS_NO_PID_LABEL = 'There is no draining process'
const STATUS_HAS_PID_LABEL = 'There are some processes draining the battery'
const DEFAULT_SILENT_TIME = 60 * 60 * 1000

let silentTimeoutId = null

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
      label: '    silent mode(1 hour)',
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
        }, DEFAULT_SILENT_TIME)
      }
    },
    { type: 'separator' },
    { label: STATUS_NO_PID_LABEL, type: 'normal', id: STATUS_ID },
    { label: 'Quit', role: 'quit', id: QUIT_ID }
  ]

  menuTray.setToolTip('dmonitor!')
  menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
}

// This method will be called when Electron has done everything
// initialization and ready for creating menu bar.
app.whenReady()
  .then(() => {
    logger.info('It\'s time to initialize')
  })
  .then(initMenuBar)
  .then(() => {
    logger.info('initialized')
  })
  .catch(error => {
    logger.error(`Failed to initialize: ${error.message}`)
  })
