
function isDev () {
  return process.env.NODE_ENV === 'development'
}

function getIpcStoreKey (key) {
  return `store:${key}`
}

module.exports = {
  isDev,
  getIpcStoreKey
}
