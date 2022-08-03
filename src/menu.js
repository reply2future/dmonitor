const { BrowserWindow, Menu, shell, Tray } = require('electron')
const { EventEmitter } = require('events')
const { store, STORE_KEY } = require('./store')
const path = require('path')

const STATUS_ID = 'status'
const ON_ID = 'on'
const OFF_ID = 'off'
const SILENT_ID = 'silent'
const STATUS_NO_PID_LABEL = 'There is no draining process'
const STATUS_HAS_PID_LABEL = 'There are some processes draining the battery'
const ISSUES_URL = 'https://github.com/reply2future/dmonitor/issues'
const DEFAULT_SILENT_TIME_HR = 1

const MENU_CLICK_EVENT = {
  ON: 'on',
  OFF: 'off',
  SILENT: 'silent'
}

class MenuTray extends EventEmitter {
  constructor (icon) {
    super()
    this.tray = new Tray(icon)
    this.silentTimeoutId = null
    this.items = [
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
          clearTimeout(this.silentTimeoutId)
          this.updateStatusItem(MENU_CLICK_EVENT.ON)
          this.emit(MENU_CLICK_EVENT.ON)
        }
      },
      {
        label: '    off',
        id: OFF_ID,
        type: 'radio',
        checked: true,
        accelerator: 'CmdOrCtrl+P',
        click: () => {
          clearTimeout(this.silentTimeoutId)
          this.updateStatusItem(MENU_CLICK_EVENT.OFF)
          this.emit(MENU_CLICK_EVENT.OFF)
        }
      },
      {
        label: this.generateSilentTimeLabel(),
        id: SILENT_ID,
        type: 'radio',
        accelerator: 'CmdOrCtrl+L',
        click: () => {
          clearTimeout(this.silentTimeoutId)
          this.updateStatusItem(MENU_CLICK_EVENT.OFF)
          this.emit(MENU_CLICK_EVENT.OFF)
          this.silentTimeoutId = setTimeout(() => {
            this.updateStatusItem(MENU_CLICK_EVENT.ON)
            this.emit(MENU_CLICK_EVENT.ON)
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
          win.loadFile(path.join(__dirname, 'preference.html'))
          win.on('close', () => {
            const silentItem = this.items.find(item => item.id === SILENT_ID)
            silentItem.label = this.generateSilentTimeLabel()
            this.updateUi()
          })
        }
      },
      { label: 'Help', role: 'help', click: () => shell.openExternal(ISSUES_URL) },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
      { type: 'separator' }
    ]
  }

  updateStatusItem (value) {
    const isRunning = value === MENU_CLICK_EVENT.ON
    this.items
      .filter(item => item.type === 'radio')
      .forEach(item => {
        item.checked = (isRunning && item.id === ON_ID) || (!isRunning && item.id === OFF_ID)
      })
    this.updateUi()
  }

  generateSilentTimeLabel () {
    return `    silent mode(${store.get(STORE_KEY.silentTimeHr, 1)} hour)`
  }

  addPid ({ pid, stat, clickFn }) {
    const command = path.basename(stat.command)
    const statusItem = this.items.find(item => item.id === STATUS_ID)
    statusItem.label = STATUS_HAS_PID_LABEL

    this.items.push({
      label: `kill ${command} (${pid})`,
      toolTip: `the path is "${stat.command}"`,
      type: 'normal',
      isPid: true,
      id: pid,
      after: [STATUS_ID],
      click: () => {
        clickFn()
        this.items = this.items.filter(item => item.id !== pid)
        const hasPid = this.items.some(item => item.isPid)
        if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL
        this.updateUi()
      }
    })
    this.updateUi()
  }

  removePid ({ pid }) {
    const statusItem = this.items.find(item => item.id === STATUS_ID)
    this.items = this.items.filter(item => item.id !== pid)
    const hasPid = this.items.some(item => item.isPid)
    if (!hasPid) statusItem.label = STATUS_NO_PID_LABEL

    this.updateUi()
  }

  updateUi () {
    this.tray.setContextMenu(Menu.buildFromTemplate(this.items))
  }
}

module.exports = { MenuTray, MENU_CLICK_EVENT }
