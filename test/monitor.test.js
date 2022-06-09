const chai = require('chai')
chai.should()
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const cpus = [110, 120, 130, 50, 112, 130, 0, 0, 10]
let i = 0
const { Monitor, Statistics } = proxyquire('../monitor', {
  pidtree: async () => [1],
  pidusage: async () => ({ 1: { cpu: cpus[i++ % cpus.length], ppid: 1 } })
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
      let cbCount = 0
      const monitor = new Monitor({
        alertCallback: ({ pid, stat }) => {
          cbCount += 1
        }
      })
      monitor.stats.windowSize = 2

      monitor.start()

      await clock.tickAsync(3000)
      cbCount.should.equal(1)
      await clock.tickAsync(3000)
      cbCount.should.equal(2)

      await monitor.stop()
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
      const s = new Statistics({
        windowSize: 2,
        slidingCallback: ({ pid }) => {
          pid.should.equal(1)
          done()
        }
      })

      s.addPidStat(1, { cpu: 110 })
      s.addPidStat(1, { cpu: 110 })
    })
  })
})
