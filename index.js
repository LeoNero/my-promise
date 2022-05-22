const PENDING = 0
const FULFILLED = 1
const REJECTED = 2

class MyPromise {
  static deferred() {
    const res = {}
    res.promise = new MyPromise((resolve, reject) => {
      res.resolve = resolve
      res.reject = reject
    })
    return res
  }

  constructor(executor) {
    this.state = PENDING
    this.value = null
    this.reason = null

    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []

    const resolve = (value) => {
      if (this.state === PENDING) {
        this.state = FULFILLED
        this.value = value

        this.onFulfilledCallbacks.forEach(cb => setImmediate(() => cb(this.value)))
        this.onFulfilledCallbacks = []
      }
    }

    const reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED
        this.reason = reason

        this.onRejectedCallbacks.forEach(cb => setImmediate(() => cb(this.reason)))
        this.onRejectedCallbacks = []
      }
    }

    executor(resolve, reject)
  }

  static resolution(
    promise,
    x,
    resolve,
    reject,
  ) {
    if (promise === x) {
      throw new TypeError('promise and x are the same object')
    }

    if (x instanceof MyPromise) {
      x.then(y => MyPromise.resolution(promise, y, resolve, reject), reject)
      return
    }

    let called = false

    const resolvePromise = y => {
      if (!called) {
        called = true
        MyPromise.resolution(
          promise,
          y,
          resolve,
          reject,
        )
      }
    }

    const rejectPromise = r => {
      if (!called) {
        called = true
        reject(r)
      }
    }

    const xType = typeof x

    if (xType === 'function' || (xType === 'object' && x !== null)) {
      let then
      try {
        then = x.then
      } catch (e) {
        reject(e)
        return
      }

      if (then === undefined || typeof then !== 'function') {
        resolve(x)
      } else {
        try {
          then.call(x, resolvePromise, rejectPromise)
        } catch (e) {
          if (!called) {
            reject(e)
          }
        }
      }
    } else {
      resolve(x)
    }
  }

  then(onFulfilled, onRejected) {
    let onRejectedNotAFunc = false

    if (typeof onFulfilled !== 'function') {
      onFulfilled = value => value
    }

    if (typeof onRejected !== 'function') {
      onRejected = reason => reason
      onRejectedNotAFunc = true
    }

    const promise2 = new MyPromise((resolve, reject) => {
      if (this.state === PENDING) {
        this.onFulfilledCallbacks.push(value => {
          try {
            const x = onFulfilled(value)
            MyPromise.resolution(
              promise2,
              x,
              resolve,
              reject,
            )
          } catch(e) {
            reject(e)
          }
        })

        this.onRejectedCallbacks.push(reason => {
          try {
            const x = onRejected(reason)

            if (onRejectedNotAFunc) {
              reject(x)
            } else {
              MyPromise.resolution(
                promise2,
                x,
                resolve,
                reject,
              )
            }
          } catch(e) {
            reject(e)
          }
        })
      }

      if (this.state === FULFILLED) {
        setImmediate(() => {
          try {
            const x = onFulfilled(this.value)
            MyPromise.resolution(
              promise2,
              x,
              resolve,
              reject,
            )
          } catch(e) {
            reject(e)
          }
        })
      }

      if (this.state === REJECTED) {
        setImmediate(() => {
          try {
            const x = onRejected(this.reason)

            if (onRejectedNotAFunc) {
              reject(x)
            } else {
              MyPromise.resolution(
                promise2,
                x,
                resolve,
                reject,
              )
            }
          } catch(e) {
            reject(e)
          }
        })
      }
    })

    return promise2
  }
}

module.exports = MyPromise
