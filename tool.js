
function isDev () {
  return process.env.NODE_ENV === 'development'
}

module.exports = {
  isDev
}
