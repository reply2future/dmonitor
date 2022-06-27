const silentTimeRange = document.querySelector('#silent-time')

silentTimeRange.addEventListener('change', (event) => {
  window.api.setStore(window.api.STORE_KEY.silentTimeHr, parseInt(event.target.value, 10))
})

silentTimeRange.value = window.api.getStore(window.api.STORE_KEY.silentTimeHr)
silentTimeRange.nextElementSibling.value = `${silentTimeRange.value}h`
