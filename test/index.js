var test = require("tape")

var Throttle = require("../")
var TokenBucket = require("../token_bucket")

test("Loaded", function (t) {
  t.plan(2)

  t.ok(Throttle, "Loaded Throttle module")
  t.ok(TokenBucket, "Loaded TokenBucket module")
})

test("TokenBucket", function (t) {
  t.plan(13)
  var bucket, copy

  bucket = TokenBucket({fillRate: 10, capacity: 10, window: 1000})
  t.equal(bucket.tokens, 10, "Tokens filled from capacity")

  bucket = TokenBucket({fillRate: "0", capacity: "11", window: "1000"})
  t.equal(bucket.tokens, 11, "Type fixes stringified numbers")

  t.ok(bucket.consume(1), "We can consume one from a bucket with tokens")
  t.equal(bucket.tokens, 10, "We've removed a token.")

  copy = TokenBucket(bucket)
  t.equal(copy.time, bucket.time, "inner field copied")
  t.equal(copy.tokens, bucket.tokens, "tokens copied")

  copy = TokenBucket(JSON.parse(JSON.stringify(bucket)))
  t.equal(copy.time, bucket.time, "inner field copied from raw object")
  t.equal(copy.tokens, bucket.tokens, "tokens copied from raw object")

  bucket = TokenBucket({fillRate: 0, capacity: 1, window: 1000})
  t.ok(bucket.consume(1))
  t.notOk(bucket.consume(1), "No tokens left to consume.")

  bucket = TokenBucket({fillRate: 10, capacity: 10, window: 1000})
  t.ok(bucket.consume(1), "tokens available to")
  setTimeout(function () {
    t.ok(bucket.consume(1), "tokens available to consume")
    console.log(bucket.tokens)
    t.ok(bucket.tokens > 8 && bucket.tokens < 9, "Partially filled now upon consume")
  }, 10)
})

test("Throttle", function (t) {
  t.plan(36)

  var throttle = Throttle({rate: 3})
  var i = 0
  var remaining = 3
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "Not throttled yet")
        t.equal(metadata.limit, 3)
        t.equal(metadata.rate, 3)
        t.equal(metadata.remaining, --remaining)
        t.ok(metadata.reset <= 1000)
      })
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.ok(limited, "Should now be throttled.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 3)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 1000)
    })
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "Throttle should be lifted.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 3)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 1000)
    })
  }, 400)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited)
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 3)
      t.ok(metadata.remaining > 0, "Tokens should replenish.")
      t.ok(metadata.reset <= 1000)
    })
  }, 1200)
})

test("Override", function (t) {
  t.plan(24)

  var throttle = Throttle({
    rate: 3,
    burst: 3,
    overrides: {
      test: {rate: 0, burst: 0}
    }
  })
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "Not throttled yet")
        t.equal(metadata.limit, 0)
        t.equal(metadata.rate, 0)
        t.equal(metadata.remaining, 0)
        t.equal(metadata.reset, 1000)
      })
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "This one never gets throttled.")
      t.equal(metadata.limit, 0)
      t.equal(metadata.rate, 0)
      t.equal(metadata.remaining, 0)
      t.equal(metadata.reset, 1000)
    })
  }, 50)
})

test("Override rate only", function (t) {
  t.plan(24)

  var throttle = Throttle({
    rate: 3,
    burst: 3,
    overrides: {
      test: {rate: 0}
    }
  })
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "Not throttled yet")
        t.equal(metadata.limit, 3)
        t.equal(metadata.rate, 0)
        t.equal(metadata.remaining, 3)
        t.ok(metadata.reset <= 1000)
      })
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "This one never gets throttled.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 0)
      t.equal(metadata.remaining, 3)
      t.ok(metadata.reset <= 1000)
    })
  }, 50)
})

test("Override window", function (t) {
  t.plan(36)

  var throttle = Throttle({
    rate: 1,
    burst: 3,
    overrides: {
      test: {rate: 1, burst: 3, window: 100}
    }
  })
  var i = 0
  var remaining = 3
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "Not throttled yet")
        t.equal(metadata.limit, 3)
        t.equal(metadata.rate, 1)
        t.equal(metadata.remaining, --remaining)
        t.ok(metadata.reset <= 100)
      })
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.ok(limited, "Should now be throttled.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 100)
    })
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "Throttle should be lifted.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 100)
    })
  }, 150)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited)
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.ok(metadata.remaining > 0, "Tokens should replenish.")
      t.ok(metadata.reset <= 100)
    })
  }, 350)
})

test("Different throttle window", function (t) {
  t.plan(36)

  var throttle = Throttle({rate: 1, burst: 3, window: 100})
  var i = 0
  var remaining = 3
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "Not throttled yet")
        t.equal(metadata.limit, 3)
        t.equal(metadata.rate, 1)
        t.equal(metadata.remaining, --remaining)
        t.ok(metadata.reset <= 100)
      })
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.ok(limited, "Should now be throttled.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 100)
    })
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "Throttle should be lifted.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 100)
    })
  }, 150)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited)
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.ok(metadata.remaining > 0, "Tokens should replenish.")
      t.ok(metadata.reset <= 100)
    })
  }, 350)  
})

test("Bad Options", function (t) {
  t.plan(4)

  t.throws(function () {
    Throttle()
  }, "No options")

  function HashTable() {}
  HashTable.prototype.put = function (key) {}
  HashTable.prototype.get = function () {}
  t.throws(function () {
    Throttle({rate: 1, burst: 3, window: 100, tokensTable: new HashTable()})
  }, "Bad table")

  t.throws(function () {
    Throttle({burst: 1})
  }, "Missing rate")

  t.throws(function () {
    Throttle({rate: "blue"})
  }, "Bad rate type")
})

test("Different Token Table", function (t) {
  t.plan(40)

  function HashTable() {}
  HashTable.prototype.put = function (key, bucket) {
    t.ok(1, "Running custom put")
    this.key = bucket
  }
  HashTable.prototype.get = function (key) {
    t.ok(1, "Running custom get")
    return this.key
  }
  var throttle = Throttle({
    rate: 1,
    burst: 3,
    window: 100,
    tokensTable: new HashTable()
  })
  var i = 0
  var remaining = 3
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "Not throttled yet")
        t.equal(metadata.limit, 3)
        t.equal(metadata.rate, 1)
        t.equal(metadata.remaining, --remaining)
        t.ok(metadata.reset <= 100)
      })
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.ok(limited, "Should now be throttled.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 100)
    })
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "Throttle should be lifted.")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 100)
    })
  }, 150)
})

test("Two Throttle instances", function (t) {
  t.plan(36)

  var throttle1 = Throttle({rate: 3})
  var throttle2 = Throttle({rate: 1})
  var i = 0
  var remaining = 3
  // Test throttle2
  // This is so much cleaner with setImmediate... *sigh 0.8.x*
  setTimeout(function () {
    throttle2.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.notOk(limited, "throttle2 not throttled yet")
      t.equal(metadata.limit, 1)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 1000)
    })
  }, 0)
  setTimeout(function () {
    throttle2.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.ok(limited, "throttle2 should now be throttled")
      t.equal(metadata.limit, 1)
      t.equal(metadata.rate, 1)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 1000)
    })
  }, 10)
  // Make sure throttle1 is independent of throttle2
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle1.rateLimit("test", function (err, limited, metadata) {
        t.notOk(err)
        t.notOk(limited, "throttle1 not throttled yet")
        t.equal(metadata.limit, 3)
        t.equal(metadata.rate, 3)
        t.equal(metadata.remaining, --remaining)
        t.ok(metadata.reset <= 1000)
      })
    }, 20 + i)
  }
  setTimeout(function () {
    throttle1.rateLimit("test", function (err, limited, metadata) {
      t.notOk(err)
      t.ok(limited, "throttle1 should now be throttled")
      t.equal(metadata.limit, 3)
      t.equal(metadata.rate, 3)
      t.equal(metadata.remaining, 0)
      t.ok(metadata.reset <= 1000)
    })
  }, 50)
})
