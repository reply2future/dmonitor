const pidtree = require('pidtree')
const pidusage = require('@reply2future/pidusage')
const { EventEmitter } = require('events')

const ALL_PROCESSES = -1
const DEFAULT_INTERVAL_MS = 1000
const DEFAULT_THRESHOLD = 100
const DEFAULT_WINDOW_SIZE = 60

const ACTION_EVENT = {
  ADD: 'add',
  REMOVE: 'remove'
}

const STATUS_EVENT = {
  START: 'start',
  STOP: 'stop'
}

class Monitor extends EventEmitter {
  constructor ({ intervalMs = DEFAULT_INTERVAL_MS, windowSize = DEFAULT_WINDOW_SIZE } = {}) {
    super()
    this.intervalMs = intervalMs
    this.running = false
    this.overThresholdPidCache = new Map()
    this.windowSize = windowSize
    this.stats = new Statistics({
      windowSize,
      slidingCallback: ({ pid, stat }) => {
        const median = this.getMedian(stat.data)

        const ret = { pid, stat, type: null }
        if (median < DEFAULT_THRESHOLD) {
          if (!this.overThresholdPidCache.has(pid)) return

          ret.type = ACTION_EVENT.REMOVE
          this.overThresholdPidCache.delete(pid)
        } else {
          if (this.overThresholdPidCache.has(pid)) {
            this.overThresholdPidCache.set(pid, Date.now())
            return
          }

          ret.type = ACTION_EVENT.ADD
          this.overThresholdPidCache.set(pid, Date.now())
        }

        this.emit(ret.type, ret)
      }
    })
    this.checkTimer = new CheckTimer({
      intervalMs: this.windowSize * this.intervalMs,
      cache: this.overThresholdPidCache,
      cb: ({ pid }) => {
        this.emit(ACTION_EVENT.REMOVE, { pid, type: ACTION_EVENT.REMOVE })
      }
    })
  }

  start () {
    if (this.running) return
    this.running = true
    this.emit(STATUS_EVENT.START)
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
    this.checkTimer.start()
  }

  async stop () {
    this.running = false
    this.emit(STATUS_EVENT.STOP)
    this.checkTimer.stop()
  }

  isRunning () {
    return this.running
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
    if (!this.map.has(pid)) this.map.set(pid, { sum: 0, command: stat.command, data: [] })
    const _stat = this.map.get(pid)
    // duplicated info
    delete stat.command
    _stat.data.push(stat)
    _stat.sum += stat.cpu

    for (let i = 0; i < _stat.data.length - this.windowSize; i++) {
      const _del = _stat.data.shift()
      _stat.sum -= _del.cpu
    }

    if (_stat.data.length !== this.windowSize) return
    this.slidingCallback({ pid, stat: _stat })
  }

  clear (pid) {
    this.map.delete(pid)
  }
}

class CheckTimer {
  constructor ({ intervalMs, cache, cb }) {
    this.intervalMs = intervalMs
    this.cache = cache
    this.cb = cb
  }

  start () {
    this.interval = setInterval(() => {
      this.cache.forEach((v, k) => {
        if (Date.now() - v < this.intervalMs) return

        this.cache.delete(k)
        this.cb({ pid: k })
      })
    }, this.intervalMs)
  }

  stop () {
    clearInterval(this.interval)
  }
}

module.exports = { Monitor, Statistics, CheckTimer, ACTION_EVENT, STATUS_EVENT }
