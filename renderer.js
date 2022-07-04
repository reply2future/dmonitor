const silentTimeRange = document.querySelector('#silent-time')

silentTimeRange.addEventListener('change', (event) => {
  window.api.setStore(window.api.STORE_KEY.silentTimeHr, parseInt(event.target.value, 10))
})

silentTimeRange.value = window.api.getStore(window.api.STORE_KEY.silentTimeHr)
silentTimeRange.nextElementSibling.value = `${silentTimeRange.value} hour`

const intervalTimeRange = document.querySelector('#interval-time')

intervalTimeRange.addEventListener('change', (event) => {
  window.api.setStore(window.api.STORE_KEY.intervalTimeSd, parseInt(event.target.value, 10) * 1000)
})

intervalTimeRange.value = window.api.getStore(window.api.STORE_KEY.intervalTimeSd) / 1000
intervalTimeRange.nextElementSibling.value = `${intervalTimeRange.value} second`

const autoLaunch = document.querySelector('#auto-launch')

autoLaunch.addEventListener('change', (event) => {
  window.api.setStore(window.api.STORE_KEY.autoLaunch, event.target.checked)
})

autoLaunch.checked = window.api.getStore(window.api.STORE_KEY.autoLaunch, false)

const info = document.querySelector('#info')
info.innerHTML = window.api.getAppInfo()
