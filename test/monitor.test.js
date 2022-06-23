const chai = require('chai')
chai.should()
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const cpus = [110, 120, 130, 50, 112, 130, 0, 0, 10]
let i = 0
const { Monitor, Statistics, CHANGED_TYPES } = proxyquire('../monitor', {
  pidtree: async () => [1],
  '@reply2future/pidusage': async () => ({ 1: { cpu: cpus[i++ % cpus.length], ppid: 1 } })
})

describe('monitor module', () => {
  describe('monitor', () => {
    let clock
    beforeEach(() => {
      clock = sinon.useFakeTimers()
    })
    afterEach(() => {
      clock.restore()
    })
    it('should monitor successfully', async () => {
      let addCbCount = 0
      let removeCbCount = 0
      const monitor = new Monitor({
        changedCallback: ({ pid, stat, type }) => {
          switch (type) {
            case CHANGED_TYPES.ADD:
              addCbCount += 1
              break
            case CHANGED_TYPES.REMOVE:
              removeCbCount += 1
              break
            default:
              break
          }
        }
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
})
