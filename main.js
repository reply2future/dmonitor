const path = require('path')
const { Monitor } = require('./monitor')
const { app, Menu, Notification, Tray, nativeImage } = require('electron')

const monitor = new Monitor({
  alertCallback: ({ pid, stat }) => {
    if (cachedMenus.find(item => item.id === pid)) return

    new Notification({ title: 'ooops', body: `There is some process draining the battery fast, pid is ${pid}` }).show()

    const statusItem = cachedMenus.find(item => item.id === STATUS_ID)
    statusItem.label = STATUS_HAS_PID_LABEL

    cachedMenus.push({
      label: `kill ${pid}`,
      type: 'normal',
      isPid: true,
      id: pid,
      before: [QUIT_ID],
      click: () => {
        process.kill(pid)
        cachedMenus = cachedMenus.filter(item => item.id !== pid)
        const hasPid = cachedMenus.some(item => item.isPid)
        if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL
        menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
      }
    })
    menuTray.setContextMenu(Menu.buildFromTemplate(cachedMenus))
  }
})

let cachedMenus
let menuTray

const STATUS_ID = 'status'
const QUIT_ID = 'quit'
const STATUS_NO_PID_LABEL = 'There is no draining process'
const STATUS_HAS_PID_LABEL = 'There are some processes draining the battery'

function initMenuBar () {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'asserts', 'black-icon.png'))
  menuTray = new Tray(icon)

  cachedMenus = [
    {
      label: 'Current Status',
      enabled: false
    },
    {
      label: '    on',
      accelerator: 'CmdOrCtrl+S',
      type: 'radio',
      click: () => {
        monitor.start()
      }
    },
    {
      label: '    off',
      type: 'radio',
      checked: true,
      accelerator: 'CmdOrCtrl+P',
      click: () => {
        monitor.stop()
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
app.whenReady().then(initMenuBar)
