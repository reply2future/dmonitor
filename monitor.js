const pidtree = require('pidtree')
const pidusage = require('pidusage')

const ALL_PROCESSES = -1
const DEFAULT_INTERVAL_MS = 1000
const DEFAULT_THRESHOLD = 100
const DEFAULT_WINDOW_SIZE = 60

class Monitor {
  constructor ({ intervalMs = DEFAULT_INTERVAL_MS, windowSize = DEFAULT_WINDOW_SIZE, alertCallback }) {
    this.intervalMs = intervalMs
    this.running = false
    this.alertCallback = alertCallback
    this.stats = new Statistics({
      windowSize,
      slidingCallback: ({ pid, stat }) => {
        if (typeof this.alertCallback !== 'function') return
        const median = this.getMedian(stat.data)
        if (median < DEFAULT_THRESHOLD) return
        this.alertCallback({ pid, stat })
        // prevent multiple alerts
        this.stats.reset(pid)
      }
    })
  }

  start () {
    if (this.running) return
    this.running = true
    const interval = async (time) => {
      setTimeout(async () => {
        if (!this.running) return

        const pids = await pidtree(ALL_PROCESSES)
        const stats = await pidusage(pids)

        for (const [pid, stat] of Object.entries(stats)) {
          this.stats.addPidStat(pid, stat)
        }

        interval(time)
      }, time)
    }

    interval(this.intervalMs)
  }

  async stop () {
    this.running = false
  }

  getMedian (data) {
    const dLen = data.length
    const mid = Math.floor(dLen / 2)
    const nums = [...data].sort((a, b) => a.cpu - b.cpu)
    return dLen % 2 !== 0 ? nums[mid].cpu : (nums[mid - 1].cpu + nums[mid].cpu) / 2
  }
}

class Statistics {
  constructor ({ windowSize = DEFAULT_WINDOW_SIZE, slidingCallback }) {
    this.windowSize = windowSize
    // pid: {sum: number, data: []stat}
    this.map = new Map()
    this.slidingCallback = slidingCallback || function () {}
  }

  addPidStat (pid, stat) {
    if (!this.map.has(pid)) this.map.set(pid, { sum: 0, data: [] })
    const _stat = this.map.get(pid)
    _stat.data.push(stat)
    _stat.sum += stat.cpu

    for (let i = 0; i < _stat.data.length - this.windowSize; i++) {
      const _del = _stat.data.shift()
      _stat.sum -= _del.cpu
    }

    if (_stat.data.length !== this.windowSize) return
    this.slidingCallback({ pid, stat: _stat })
  }

  reset (pid) {
    this.map.set(pid, { sum: 0, data: [] })
  }

  clear (pid) {
    this.map.delete(pid)
  }
}

module.exports = { Monitor, Statistics }
