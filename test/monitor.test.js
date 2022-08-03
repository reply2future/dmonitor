const chai = require('chai')
chai.should()
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const cpus = [110, 120, 130, 50, 112, 130, 0, 0, 10]
let i = 0
const { Monitor, Statistics, CheckTimer, ACTION_EVENT, STATUS_EVENT } = proxyquire('../src/monitor', {
  pidtree: async () => [1],
  '@reply2future/pidusage': async () => ({ 1: { cpu: cpus[i++ % cpus.length], ppid: 1 } })
})

describe('monitor module', () => {
  describe('monitor', () => {
    let clock
    beforeEach(() => {
      i = 0
      clock = sinon.useFakeTimers()
    })
    afterEach(() => {
      clock.restore()
      i = 0
    })
    it('should monitor successfully', async () => {
      let addCbCount = 0
      let removeCbCount = 0
      const monitor = new Monitor()
      monitor.on(ACTION_EVENT.ADD, ({ pid, stat, type }) => {
        addCbCount += 1
      })
      monitor.on(ACTION_EVENT.REMOVE, ({ pid, stat, type }) => {
        removeCbCount += 1
      })
      monitor.stats.windowSize = 2

      monitor.start()

      monitor.isRunning().should.equal(true)
      await clock.tickAsync(3000)
      addCbCount.should.equal(1)
      removeCbCount.should.equal(0)
      await clock.tickAsync(3000)
      addCbCount.should.equal(2)
      removeCbCount.should.equal(1)
      await monitor.stop()
      monitor.isRunning().should.equal(false)
    })

    it('should emit the event when starting', (done) => {
      const monitor = new Monitor()
      let invokeStarted = false
      let invokeStopped = false
      monitor.on(STATUS_EVENT.START, () => {
        invokeStarted = true
      })
      monitor.on(STATUS_EVENT.STOP, () => {
        invokeStopped = true
      })
      monitor.start()
      monitor.stop()
      process.nextTick(() => {
        invokeStarted.should.equal(true)
        invokeStopped.should.equal(true)
        done()
      })
    })

    it('should setInterval successfully', async () => {
      let addCbCount = 0
      let removeCbCount = 0
      const monitor = new Monitor()
      monitor.on(ACTION_EVENT.ADD, ({ pid, stat, type }) => {
        addCbCount += 1
      })
      monitor.on(ACTION_EVENT.REMOVE, ({ pid, stat, type }) => {
        removeCbCount += 1
      })
      monitor.stats.windowSize = 2

      monitor.setInterval(4000)
      monitor.start()

      monitor.isRunning().should.equal(true)
      await clock.tickAsync(3000)
      addCbCount.should.equal(0)
      removeCbCount.should.equal(0)
      await clock.tickAsync(5000)
      addCbCount.should.equal(1)
      removeCbCount.should.equal(0)
      await monitor.stop()
      monitor.isRunning().should.equal(false)
    })
  })

  describe('statistics', () => {
    it('should not invoke callback because there is not no data greater than threshold', (done) => {
      let cbCount = 0
      const s = new Statistics({
        windowSize: 2,
        slidingCallback: () => {
          cbCount++
        }
      })

      for (let i = 0; i < 10; i++) {
        s.addPidStat(1, { cpu: 10 })
      }
      cbCount.should.equal(9)
      done()
    })

    it('should invoke callback because there is some data greater than threshold', (done) => {
      const mockStat = { cpu: 110, command: '/bin/bash' }
      const s = new Statistics({
        windowSize: 2,
        slidingCallback: ({ pid, stat }) => {
          pid.should.equal(1)
          stat.command.should.equal(mockStat.command)
          done()
        }
      })

      s.addPidStat(1, { ...mockStat })
      s.addPidStat(1, { ...mockStat })
    })
  })

  describe('checktimer', () => {
    let clock
    beforeEach(() => {
      clock = sinon.useFakeTimers()
    })
    afterEach(() => {
      clock.restore()
    })
    it('should invoke callback when time interval is bigger than settings', async () => {
      const intervalMs = 3000
      const cache = new Map([
        ['expired', Date.now()],
        ['not expired', Date.now() + intervalMs * 3]
      ])
      let cbCount = 0
      const s = new CheckTimer({
        intervalMs,
        cache,
        cb: ({ pid }) => {
          pid.should.equal('expired')
          cbCount++
        }
      })

      s.start()
      await clock.tickAsync(4000)
      cbCount.should.equal(1)
      s.stop()
    })
  })
})
