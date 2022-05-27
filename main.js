const electron = require('electron')
const path = require('path')
const { app, BrowserWindow, Menu } = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  const applicationMenu = [
    {
      label: 'menu1',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            electron.dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] })
          }
        },
        {
          label: 'Dev',
          submenu: [
            {
              label: 'open dev tools',
              accelerator: 'CmdOrCtrl+A',
              click: () => {
                mainWindow.openDevTools()
              }
            },
            {
              label: 'close dev tools',
              accelerator: 'CmdOrCtrl+B',
              click: () => {
                mainWindow.closeDevTools()
              }
            }
          ]
        }
      ]
    }
  ]
  if (process.platform === 'darwin') {
    const name = app.getName()
    applicationMenu.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => { app.quit() }
        }
      ]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(applicationMenu))

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.whenReady().then(createWindow)
