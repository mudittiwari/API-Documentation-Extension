var background = function() {
  "use strict";
  var _a, _b, _c, _d;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  const browser$1 = (
    // @ts-expect-error
    ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );
  var has = Object.prototype.hasOwnProperty;
  function dequal(foo, bar) {
    var ctor, len;
    if (foo === bar) return true;
    if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
      if (ctor === Date) return foo.getTime() === bar.getTime();
      if (ctor === RegExp) return foo.toString() === bar.toString();
      if (ctor === Array) {
        if ((len = foo.length) === bar.length) {
          while (len-- && dequal(foo[len], bar[len])) ;
        }
        return len === -1;
      }
      if (!ctor || typeof foo === "object") {
        len = 0;
        for (ctor in foo) {
          if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
          if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
        }
        return Object.keys(bar).length === len;
      }
    }
    return foo !== foo && bar !== bar;
  }
  const E_CANCELED = new Error("request for lock canceled");
  var __awaiter$2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Semaphore {
    constructor(_value, _cancelError = E_CANCELED) {
      this._value = _value;
      this._cancelError = _cancelError;
      this._queue = [];
      this._weightedWaiters = [];
    }
    acquire(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      return new Promise((resolve, reject) => {
        const task = { resolve, reject, weight, priority };
        const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
        if (i === -1 && weight <= this._value) {
          this._dispatchItem(task);
        } else {
          this._queue.splice(i + 1, 0, task);
        }
      });
    }
    runExclusive(callback_1) {
      return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
        const [value, release] = yield this.acquire(weight, priority);
        try {
          return yield callback(value);
        } finally {
          release();
        }
      });
    }
    waitForUnlock(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      if (this._couldLockImmediately(weight, priority)) {
        return Promise.resolve();
      } else {
        return new Promise((resolve) => {
          if (!this._weightedWaiters[weight - 1])
            this._weightedWaiters[weight - 1] = [];
          insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
        });
      }
    }
    isLocked() {
      return this._value <= 0;
    }
    getValue() {
      return this._value;
    }
    setValue(value) {
      this._value = value;
      this._dispatchQueue();
    }
    release(weight = 1) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      this._value += weight;
      this._dispatchQueue();
    }
    cancel() {
      this._queue.forEach((entry) => entry.reject(this._cancelError));
      this._queue = [];
    }
    _dispatchQueue() {
      this._drainUnlockWaiters();
      while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
        this._dispatchItem(this._queue.shift());
        this._drainUnlockWaiters();
      }
    }
    _dispatchItem(item) {
      const previousValue = this._value;
      this._value -= item.weight;
      item.resolve([previousValue, this._newReleaser(item.weight)]);
    }
    _newReleaser(weight) {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;
        this.release(weight);
      };
    }
    _drainUnlockWaiters() {
      if (this._queue.length === 0) {
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          waiters.forEach((waiter) => waiter.resolve());
          this._weightedWaiters[weight - 1] = [];
        }
      } else {
        const queuedPriority = this._queue[0].priority;
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
          (i === -1 ? waiters : waiters.splice(0, i)).forEach((waiter) => waiter.resolve());
        }
      }
    }
    _couldLockImmediately(weight, priority) {
      return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
    }
  }
  function insertSorted(a, v) {
    const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
    a.splice(i + 1, 0, v);
  }
  function findIndexFromEnd(a, predicate) {
    for (let i = a.length - 1; i >= 0; i--) {
      if (predicate(a[i])) {
        return i;
      }
    }
    return -1;
  }
  var __awaiter$1 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Mutex {
    constructor(cancelError) {
      this._semaphore = new Semaphore(1, cancelError);
    }
    acquire() {
      return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
        const [, releaser] = yield this._semaphore.acquire(1, priority);
        return releaser;
      });
    }
    runExclusive(callback, priority = 0) {
      return this._semaphore.runExclusive(() => callback(), 1, priority);
    }
    isLocked() {
      return this._semaphore.isLocked();
    }
    waitForUnlock(priority = 0) {
      return this._semaphore.waitForUnlock(1, priority);
    }
    release() {
      if (this._semaphore.isLocked())
        this._semaphore.release();
    }
    cancel() {
      return this._semaphore.cancel();
    }
  }
  const browser = (
    // @ts-expect-error
    ((_d = (_c = globalThis.browser) == null ? void 0 : _c.runtime) == null ? void 0 : _d.id) == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );
  const storage = createStorage();
  function createStorage() {
    const drivers = {
      local: createDriver("local"),
      session: createDriver("session"),
      sync: createDriver("sync"),
      managed: createDriver("managed")
    };
    const getDriver = (area) => {
      const driver = drivers[area];
      if (driver == null) {
        const areaNames = Object.keys(drivers).join(", ");
        throw Error(`Invalid area "${area}". Options: ${areaNames}`);
      }
      return driver;
    };
    const resolveKey = (key) => {
      const deliminatorIndex = key.indexOf(":");
      const driverArea = key.substring(0, deliminatorIndex);
      const driverKey = key.substring(deliminatorIndex + 1);
      if (driverKey == null)
        throw Error(
          `Storage key should be in the form of "area:key", but received "${key}"`
        );
      return {
        driverArea,
        driverKey,
        driver: getDriver(driverArea)
      };
    };
    const getMetaKey = (key) => key + "$";
    const mergeMeta = (oldMeta, newMeta) => {
      const newFields = { ...oldMeta };
      Object.entries(newMeta).forEach(([key, value]) => {
        if (value == null)
          delete newFields[key];
        else
          newFields[key] = value;
      });
      return newFields;
    };
    const getValueOrFallback = (value, fallback) => value ?? fallback ?? null;
    const getMetaValue = (properties) => typeof properties === "object" && !Array.isArray(properties) ? properties : {};
    const getItem = async (driver, driverKey, opts) => {
      const res = await driver.getItem(driverKey);
      return getValueOrFallback(res, (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue));
    };
    const getMeta = async (driver, driverKey) => {
      const metaKey = getMetaKey(driverKey);
      const res = await driver.getItem(metaKey);
      return getMetaValue(res);
    };
    const setItem = async (driver, driverKey, value) => {
      await driver.setItem(driverKey, value ?? null);
    };
    const setMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      const existingFields = getMetaValue(await driver.getItem(metaKey));
      await driver.setItem(metaKey, mergeMeta(existingFields, properties));
    };
    const removeItem = async (driver, driverKey, opts) => {
      await driver.removeItem(driverKey);
      if (opts == null ? void 0 : opts.removeMeta) {
        const metaKey = getMetaKey(driverKey);
        await driver.removeItem(metaKey);
      }
    };
    const removeMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      if (properties == null) {
        await driver.removeItem(metaKey);
      } else {
        const newFields = getMetaValue(await driver.getItem(metaKey));
        [properties].flat().forEach((field) => delete newFields[field]);
        await driver.setItem(metaKey, newFields);
      }
    };
    const watch = (driver, driverKey, cb) => {
      return driver.watch(driverKey, cb);
    };
    const storage2 = {
      getItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        return await getItem(driver, driverKey, opts);
      },
      getItems: async (keys) => {
        const areaToKeyMap = /* @__PURE__ */ new Map();
        const keyToOptsMap = /* @__PURE__ */ new Map();
        const orderedKeys = [];
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") {
            keyStr = key;
          } else if ("getValue" in key) {
            keyStr = key.key;
            opts = { fallback: key.fallback };
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          orderedKeys.push(keyStr);
          const { driverArea, driverKey } = resolveKey(keyStr);
          const areaKeys = areaToKeyMap.get(driverArea) ?? [];
          areaToKeyMap.set(driverArea, areaKeys.concat(driverKey));
          keyToOptsMap.set(keyStr, opts);
        });
        const resultsMap = /* @__PURE__ */ new Map();
        await Promise.all(
          Array.from(areaToKeyMap.entries()).map(async ([driverArea, keys2]) => {
            const driverResults = await drivers[driverArea].getItems(keys2);
            driverResults.forEach((driverResult) => {
              const key = `${driverArea}:${driverResult.key}`;
              const opts = keyToOptsMap.get(key);
              const value = getValueOrFallback(
                driverResult.value,
                (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue)
              );
              resultsMap.set(key, value);
            });
          })
        );
        return orderedKeys.map((key) => ({
          key,
          value: resultsMap.get(key)
        }));
      },
      getMeta: async (key) => {
        const { driver, driverKey } = resolveKey(key);
        return await getMeta(driver, driverKey);
      },
      getMetas: async (args) => {
        const keys = args.map((arg) => {
          const key = typeof arg === "string" ? arg : arg.key;
          const { driverArea, driverKey } = resolveKey(key);
          return {
            key,
            driverArea,
            driverKey,
            driverMetaKey: getMetaKey(driverKey)
          };
        });
        const areaToDriverMetaKeysMap = keys.reduce((map, key) => {
          var _a2;
          map[_a2 = key.driverArea] ?? (map[_a2] = []);
          map[key.driverArea].push(key);
          return map;
        }, {});
        const resultsMap = {};
        await Promise.all(
          Object.entries(areaToDriverMetaKeysMap).map(async ([area, keys2]) => {
            const areaRes = await browser.storage[area].get(
              keys2.map((key) => key.driverMetaKey)
            );
            keys2.forEach((key) => {
              resultsMap[key.key] = areaRes[key.driverMetaKey] ?? {};
            });
          })
        );
        return keys.map((key) => ({
          key: key.key,
          meta: resultsMap[key.key]
        }));
      },
      setItem: async (key, value) => {
        const { driver, driverKey } = resolveKey(key);
        await setItem(driver, driverKey, value);
      },
      setItems: async (items) => {
        const areaToKeyValueMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey(
            "key" in item ? item.key : item.item.key
          );
          areaToKeyValueMap[driverArea] ?? (areaToKeyValueMap[driverArea] = []);
          areaToKeyValueMap[driverArea].push({
            key: driverKey,
            value: item.value
          });
        });
        await Promise.all(
          Object.entries(areaToKeyValueMap).map(async ([driverArea, values]) => {
            const driver = getDriver(driverArea);
            await driver.setItems(values);
          })
        );
      },
      setMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await setMeta(driver, driverKey, properties);
      },
      setMetas: async (items) => {
        const areaToMetaUpdatesMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey(
            "key" in item ? item.key : item.item.key
          );
          areaToMetaUpdatesMap[driverArea] ?? (areaToMetaUpdatesMap[driverArea] = []);
          areaToMetaUpdatesMap[driverArea].push({
            key: driverKey,
            properties: item.meta
          });
        });
        await Promise.all(
          Object.entries(areaToMetaUpdatesMap).map(
            async ([storageArea, updates]) => {
              const driver = getDriver(storageArea);
              const metaKeys = updates.map(({ key }) => getMetaKey(key));
              console.log(storageArea, metaKeys);
              const existingMetas = await driver.getItems(metaKeys);
              const existingMetaMap = Object.fromEntries(
                existingMetas.map(({ key, value }) => [key, getMetaValue(value)])
              );
              const metaUpdates = updates.map(({ key, properties }) => {
                const metaKey = getMetaKey(key);
                return {
                  key: metaKey,
                  value: mergeMeta(existingMetaMap[metaKey] ?? {}, properties)
                };
              });
              await driver.setItems(metaUpdates);
            }
          )
        );
      },
      removeItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        await removeItem(driver, driverKey, opts);
      },
      removeItems: async (keys) => {
        const areaToKeysMap = {};
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") {
            keyStr = key;
          } else if ("getValue" in key) {
            keyStr = key.key;
          } else if ("item" in key) {
            keyStr = key.item.key;
            opts = key.options;
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          const { driverArea, driverKey } = resolveKey(keyStr);
          areaToKeysMap[driverArea] ?? (areaToKeysMap[driverArea] = []);
          areaToKeysMap[driverArea].push(driverKey);
          if (opts == null ? void 0 : opts.removeMeta) {
            areaToKeysMap[driverArea].push(getMetaKey(driverKey));
          }
        });
        await Promise.all(
          Object.entries(areaToKeysMap).map(async ([driverArea, keys2]) => {
            const driver = getDriver(driverArea);
            await driver.removeItems(keys2);
          })
        );
      },
      removeMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await removeMeta(driver, driverKey, properties);
      },
      snapshot: async (base, opts) => {
        var _a2;
        const driver = getDriver(base);
        const data = await driver.snapshot();
        (_a2 = opts == null ? void 0 : opts.excludeKeys) == null ? void 0 : _a2.forEach((key) => {
          delete data[key];
          delete data[getMetaKey(key)];
        });
        return data;
      },
      restoreSnapshot: async (base, data) => {
        const driver = getDriver(base);
        await driver.restoreSnapshot(data);
      },
      watch: (key, cb) => {
        const { driver, driverKey } = resolveKey(key);
        return watch(driver, driverKey, cb);
      },
      unwatch() {
        Object.values(drivers).forEach((driver) => {
          driver.unwatch();
        });
      },
      defineItem: (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        const { version: targetVersion = 1, migrations = {} } = opts ?? {};
        if (targetVersion < 1) {
          throw Error(
            "Storage item version cannot be less than 1. Initial versions should be set to 1, not 0."
          );
        }
        const migrate = async () => {
          var _a2;
          const driverMetaKey = getMetaKey(driverKey);
          const [{ value }, { value: meta }] = await driver.getItems([
            driverKey,
            driverMetaKey
          ]);
          if (value == null)
            return;
          const currentVersion = (meta == null ? void 0 : meta.v) ?? 1;
          if (currentVersion > targetVersion) {
            throw Error(
              `Version downgrade detected (v${currentVersion} -> v${targetVersion}) for "${key}"`
            );
          }
          console.debug(
            `[@wxt-dev/storage] Running storage migration for ${key}: v${currentVersion} -> v${targetVersion}`
          );
          const migrationsToRun = Array.from(
            { length: targetVersion - currentVersion },
            (_, i) => currentVersion + i + 1
          );
          let migratedValue = value;
          for (const migrateToVersion of migrationsToRun) {
            try {
              migratedValue = await ((_a2 = migrations == null ? void 0 : migrations[migrateToVersion]) == null ? void 0 : _a2.call(migrations, migratedValue)) ?? migratedValue;
            } catch (err) {
              throw Error(`v${migrateToVersion} migration failed for "${key}"`, {
                cause: err
              });
            }
          }
          await driver.setItems([
            { key: driverKey, value: migratedValue },
            { key: driverMetaKey, value: { ...meta, v: targetVersion } }
          ]);
          console.debug(
            `[@wxt-dev/storage] Storage migration completed for ${key} v${targetVersion}`,
            { migratedValue }
          );
        };
        const migrationsDone = (opts == null ? void 0 : opts.migrations) == null ? Promise.resolve() : migrate().catch((err) => {
          console.error(
            `[@wxt-dev/storage] Migration failed for ${key}`,
            err
          );
        });
        const initMutex = new Mutex();
        const getFallback = () => (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue) ?? null;
        const getOrInitValue = () => initMutex.runExclusive(async () => {
          const value = await driver.getItem(driverKey);
          if (value != null || (opts == null ? void 0 : opts.init) == null)
            return value;
          const newValue = await opts.init();
          await driver.setItem(driverKey, newValue);
          return newValue;
        });
        migrationsDone.then(getOrInitValue);
        return {
          key,
          get defaultValue() {
            return getFallback();
          },
          get fallback() {
            return getFallback();
          },
          getValue: async () => {
            await migrationsDone;
            if (opts == null ? void 0 : opts.init) {
              return await getOrInitValue();
            } else {
              return await getItem(driver, driverKey, opts);
            }
          },
          getMeta: async () => {
            await migrationsDone;
            return await getMeta(driver, driverKey);
          },
          setValue: async (value) => {
            await migrationsDone;
            return await setItem(driver, driverKey, value);
          },
          setMeta: async (properties) => {
            await migrationsDone;
            return await setMeta(driver, driverKey, properties);
          },
          removeValue: async (opts2) => {
            await migrationsDone;
            return await removeItem(driver, driverKey, opts2);
          },
          removeMeta: async (properties) => {
            await migrationsDone;
            return await removeMeta(driver, driverKey, properties);
          },
          watch: (cb) => watch(
            driver,
            driverKey,
            (newValue, oldValue) => cb(newValue ?? getFallback(), oldValue ?? getFallback())
          ),
          migrate
        };
      }
    };
    return storage2;
  }
  function createDriver(storageArea) {
    const getStorageArea = () => {
      if (browser.runtime == null) {
        throw Error(
          [
            "'wxt/storage' must be loaded in a web extension environment",
            "\n - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371",
            " - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html\n"
          ].join("\n")
        );
      }
      if (browser.storage == null) {
        throw Error(
          "You must add the 'storage' permission to your manifest to use 'wxt/storage'"
        );
      }
      const area = browser.storage[storageArea];
      if (area == null)
        throw Error(`"browser.storage.${storageArea}" is undefined`);
      return area;
    };
    const watchListeners = /* @__PURE__ */ new Set();
    return {
      getItem: async (key) => {
        const res = await getStorageArea().get(key);
        return res[key];
      },
      getItems: async (keys) => {
        const result2 = await getStorageArea().get(keys);
        return keys.map((key) => ({ key, value: result2[key] ?? null }));
      },
      setItem: async (key, value) => {
        if (value == null) {
          await getStorageArea().remove(key);
        } else {
          await getStorageArea().set({ [key]: value });
        }
      },
      setItems: async (values) => {
        const map = values.reduce(
          (map2, { key, value }) => {
            map2[key] = value;
            return map2;
          },
          {}
        );
        await getStorageArea().set(map);
      },
      removeItem: async (key) => {
        await getStorageArea().remove(key);
      },
      removeItems: async (keys) => {
        await getStorageArea().remove(keys);
      },
      snapshot: async () => {
        return await getStorageArea().get();
      },
      restoreSnapshot: async (data) => {
        await getStorageArea().set(data);
      },
      watch(key, cb) {
        const listener = (changes) => {
          const change = changes[key];
          if (change == null)
            return;
          if (dequal(change.newValue, change.oldValue))
            return;
          cb(change.newValue ?? null, change.oldValue ?? null);
        };
        getStorageArea().onChanged.addListener(listener);
        watchListeners.add(listener);
        return () => {
          getStorageArea().onChanged.removeListener(listener);
          watchListeners.delete(listener);
        };
      },
      unwatch() {
        watchListeners.forEach((listener) => {
          getStorageArea().onChanged.removeListener(listener);
        });
        watchListeners.clear();
      }
    };
  }
  const CONTENT_SCRIPT_MATCHES = "*://*.localhost/*";
  background;
  new MatchPattern(CONTENT_SCRIPT_MATCHES);
  const definition = defineBackground(async () => {
    browser$1.runtime.onMessage.addListener(async function(request, sender) {
      var _a2, _b2, _c2, _d2, _e, _f;
      if (request.type === "apiReqRes") {
        const websiteId = await storage.getItem("local:website-id");
        const userToken = await storage.getItem("local:userToken");
        if (websiteId && userToken) {
          const requestUrl = ((_c2 = (_b2 = (_a2 = request == null ? void 0 : request.options) == null ? void 0 : _a2.data) == null ? void 0 : _b2.data) == null ? void 0 : _c2.url) || "";
          if (requestUrl.includes("favicon.ico")) {
            console.log("Ignoring favicon request");
            return;
          }
          console.log(request);
          if (request.options.data.type != "xhr-intercepted" || request.options.data.data.requestBody == null && request.options.data.data.response == null)
            return;
          console.log("Processing user-initiated request:", requestUrl);
          console.log(getEndpoint(requestUrl));
          let parsedRequestBody = null;
          let parsedResponse = null;
          let parsedResponseData = null;
          if (request.options.data.data.requestBody)
            parsedRequestBody = parseRequest(request.options.data.data.requestBody);
          if (request.options.data.data.response)
            parsedResponse = parseRequest(request.options.data.data.response);
          if (parsedResponse) {
            parsedResponse[0].key;
            parsedResponse[0].value;
            parsedResponseData = parsedResponse[1].value;
          }
          if (parsedRequestBody || parsedResponseData) {
            if (await checkEndpoint(getEndpoint(requestUrl), parsedRequestBody, parsedResponseData, (_f = (_e = (_d2 = request == null ? void 0 : request.options) == null ? void 0 : _d2.data) == null ? void 0 : _e.data) == null ? void 0 : _f.headers)) {
              browser$1.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                var _a3, _b3, _c3, _d3, _e2, _f2;
                if (tabs.length > 0 && tabs[0].id !== void 0) {
                  browser$1.tabs.sendMessage(
                    tabs[0].id,
                    { action: "showDialog", url: requestUrl, "method": request.options.data.data.method, request: parsedRequestBody, response: parsedResponseData, headers: (_c3 = (_b3 = (_a3 = request == null ? void 0 : request.options) == null ? void 0 : _a3.data) == null ? void 0 : _b3.data) == null ? void 0 : _c3.headers, params: (_f2 = (_e2 = (_d3 = request == null ? void 0 : request.options) == null ? void 0 : _d3.data) == null ? void 0 : _e2.data) == null ? void 0 : _f2.params },
                    function(response) {
                      if (browser$1.runtime.lastError) {
                        console.error("Error sending message:", browser$1.runtime.lastError);
                      }
                    }
                  );
                } else {
                  console.error("No active tab found or tab ID is undefined.");
                }
              });
            }
          }
        }
      }
      if (request.type == "endPointFormSubmitted") {
        addEndpointToDB(request.data.method, request.data.request, request.data.response, request.data.url, request.data.headers, request.data.params);
      }
    });
  });
  async function addEndpointToDB(method, request, response, url, headers, params) {
    try {
      browser$1.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0 && tabs[0].id !== void 0) {
          browser$1.tabs.sendMessage(
            tabs[0].id,
            { action: "showLoadingbar" },
            function(response2) {
              if (browser$1.runtime.lastError) {
                console.error("Error sending message:", browser$1.runtime.lastError);
              }
            }
          );
        } else {
          console.error("No active tab found or tab ID is undefined.");
        }
      });
      console.log("Adding endpoint:", { method, request, response, headers, url });
      const websiteId = await storage.getItem("local:website-id");
      const userToken = await storage.getItem("local:userToken");
      if (!websiteId || !userToken) {
        console.error("Website ID or User Token is missing.");
        return;
      }
      const urlParsed = getEndpoint(url);
      const payload = {
        websiteId,
        url: urlParsed,
        method,
        headers,
        requestBody: request || null,
        response: response || null,
        params: params || null
      };
      const responseFromServer = await fetch("https://api-documentation-extension.onrender.com/api/website/add-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify(payload)
      });
      const result2 = await responseFromServer.json();
      if (responseFromServer.ok) {
        console.log("Endpoint added successfully:", result2);
        storage.setItem("local:definedUrls", response.data.endpoints ? response.data.endpoints : []);
      } else {
        console.error("Failed to add endpoint:", result2.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error adding endpoint to database:", error);
    } finally {
      browser$1.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0 && tabs[0].id !== void 0) {
          browser$1.tabs.sendMessage(
            tabs[0].id,
            { action: "hideLoadingbar" },
            function(response2) {
              if (browser$1.runtime.lastError) {
                console.error("Error sending message:", browser$1.runtime.lastError);
              }
            }
          );
        } else {
          console.error("No active tab found or tab ID is undefined.");
        }
      });
    }
  }
  async function checkEndpoint(endPoint, req, res, headers) {
    var _a2, _b2;
    if (endPoint) {
      let value = await storage.getItem("local:definedUrls");
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            if (item.url === endPoint) {
              const isReqEqual = item.requestBody === null && req === null || JSON.stringify(item.requestBody) === JSON.stringify(req);
              const isResEqual = item.response === null && res === null || ((_a2 = item.response) == null ? void 0 : _a2.constructor) === Array && (res == null ? void 0 : res.constructor) === Array && areArraysOfObjectsEqual(item.response, res) || ((_b2 = item.response) == null ? void 0 : _b2.constructor) === Object && (res == null ? void 0 : res.constructor) === Object && areObjectsEqual(item.response, res);
              const isHeadersEqual = item.headers === null && headers === null || JSON.stringify(item.headers) === JSON.stringify(headers);
              if (isReqEqual && isResEqual && isHeadersEqual) {
                return false;
              }
            }
          }
        }
      }
      return true;
    }
    return false;
  }
  function areObjectsEqual(obj1, obj2) {
    console.log("checking objects");
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    if (keys1.length !== keys2.length) return false;
    for (let key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }
    return true;
  }
  function areArraysOfObjectsEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const getObjectSignature = (obj) => {
      return JSON.stringify(
        Object.keys(obj).sort().reduce((acc, key) => {
          acc[key] = obj[key];
          return acc;
        }, {})
      );
    };
    const signatures1 = arr1.map(getObjectSignature).sort();
    const signatures2 = arr2.map(getObjectSignature).sort();
    return JSON.stringify(signatures1) === JSON.stringify(signatures2);
  }
  function getEndpoint(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname + parsedUrl.search;
    } catch (error) {
      console.error("Invalid URL:", error);
      return null;
    }
  }
  function parseRequest(requestBody) {
    try {
      const parsedObject = JSON.parse(requestBody);
      const result2 = Object.entries(parsedObject).map(([key, value]) => ({
        key,
        value,
        type: typeof value
      }));
      return result2;
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return [];
    }
  }
  background;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = `${"ws:"}//${"localhost"}:${3e3}`;
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser$1.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser$1.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser$1.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser$1.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser$1.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser$1.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser$1.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser$1.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url)
        return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser$1.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser$1.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser$1.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser$1.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3NhbmRib3gvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci9jaHJvbWUubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2RlcXVhbC9saXRlL2luZGV4Lm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9hc3luYy1tdXRleC9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvc3RvcmFnZS9kaXN0L2luZGV4Lm1qcyIsIi4uLy4uL3V0aWxzL01hdGNoZXMudHMiLCIuLi8uLi9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iLCJleHBvcnQgY29uc3QgYnJvd3NlciA9IChcbiAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkID09IG51bGwgPyBnbG9iYWxUaGlzLmNocm9tZSA6IChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgZ2xvYmFsVGhpcy5icm93c2VyXG4gIClcbik7XG4iLCJ2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlcXVhbChmb28sIGJhcikge1xuXHR2YXIgY3RvciwgbGVuO1xuXHRpZiAoZm9vID09PSBiYXIpIHJldHVybiB0cnVlO1xuXG5cdGlmIChmb28gJiYgYmFyICYmIChjdG9yPWZvby5jb25zdHJ1Y3RvcikgPT09IGJhci5jb25zdHJ1Y3Rvcikge1xuXHRcdGlmIChjdG9yID09PSBEYXRlKSByZXR1cm4gZm9vLmdldFRpbWUoKSA9PT0gYmFyLmdldFRpbWUoKTtcblx0XHRpZiAoY3RvciA9PT0gUmVnRXhwKSByZXR1cm4gZm9vLnRvU3RyaW5nKCkgPT09IGJhci50b1N0cmluZygpO1xuXG5cdFx0aWYgKGN0b3IgPT09IEFycmF5KSB7XG5cdFx0XHRpZiAoKGxlbj1mb28ubGVuZ3RoKSA9PT0gYmFyLmxlbmd0aCkge1xuXHRcdFx0XHR3aGlsZSAobGVuLS0gJiYgZGVxdWFsKGZvb1tsZW5dLCBiYXJbbGVuXSkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxlbiA9PT0gLTE7XG5cdFx0fVxuXG5cdFx0aWYgKCFjdG9yIHx8IHR5cGVvZiBmb28gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRsZW4gPSAwO1xuXHRcdFx0Zm9yIChjdG9yIGluIGZvbykge1xuXHRcdFx0XHRpZiAoaGFzLmNhbGwoZm9vLCBjdG9yKSAmJiArK2xlbiAmJiAhaGFzLmNhbGwoYmFyLCBjdG9yKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRpZiAoIShjdG9yIGluIGJhcikgfHwgIWRlcXVhbChmb29bY3Rvcl0sIGJhcltjdG9yXSkpIHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhiYXIpLmxlbmd0aCA9PT0gbGVuO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmb28gIT09IGZvbyAmJiBiYXIgIT09IGJhcjtcbn1cbiIsImNvbnN0IEVfVElNRU9VVCA9IG5ldyBFcnJvcigndGltZW91dCB3aGlsZSB3YWl0aW5nIGZvciBtdXRleCB0byBiZWNvbWUgYXZhaWxhYmxlJyk7XG5jb25zdCBFX0FMUkVBRFlfTE9DS0VEID0gbmV3IEVycm9yKCdtdXRleCBhbHJlYWR5IGxvY2tlZCcpO1xuY29uc3QgRV9DQU5DRUxFRCA9IG5ldyBFcnJvcigncmVxdWVzdCBmb3IgbG9jayBjYW5jZWxlZCcpO1xuXG52YXIgX19hd2FpdGVyJDIgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmNsYXNzIFNlbWFwaG9yZSB7XG4gICAgY29uc3RydWN0b3IoX3ZhbHVlLCBfY2FuY2VsRXJyb3IgPSBFX0NBTkNFTEVEKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gX3ZhbHVlO1xuICAgICAgICB0aGlzLl9jYW5jZWxFcnJvciA9IF9jYW5jZWxFcnJvcjtcbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICAgICAgdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzID0gW107XG4gICAgfVxuICAgIGFjcXVpcmUod2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXNrID0geyByZXNvbHZlLCByZWplY3QsIHdlaWdodCwgcHJpb3JpdHkgfTtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBmaW5kSW5kZXhGcm9tRW5kKHRoaXMuX3F1ZXVlLCAob3RoZXIpID0+IHByaW9yaXR5IDw9IG90aGVyLnByaW9yaXR5KTtcbiAgICAgICAgICAgIGlmIChpID09PSAtMSAmJiB3ZWlnaHQgPD0gdGhpcy5fdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBOZWVkcyBpbW1lZGlhdGUgZGlzcGF0Y2gsIHNraXAgdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgdGhpcy5fZGlzcGF0Y2hJdGVtKHRhc2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcXVldWUuc3BsaWNlKGkgKyAxLCAwLCB0YXNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJ1bkV4Y2x1c2l2ZShjYWxsYmFja18xKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIkMih0aGlzLCBhcmd1bWVudHMsIHZvaWQgMCwgZnVuY3Rpb24qIChjYWxsYmFjaywgd2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgICAgICBjb25zdCBbdmFsdWUsIHJlbGVhc2VdID0geWllbGQgdGhpcy5hY3F1aXJlKHdlaWdodCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4geWllbGQgY2FsbGJhY2sodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgd2FpdEZvclVubG9jayh3ZWlnaHQgPSAxLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgaWYgKHdlaWdodCA8PSAwKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgaWYgKHRoaXMuX2NvdWxkTG9ja0ltbWVkaWF0ZWx5KHdlaWdodCwgcHJpb3JpdHkpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdID0gW107XG4gICAgICAgICAgICAgICAgaW5zZXJ0U29ydGVkKHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSwgeyByZXNvbHZlLCBwcmlvcml0eSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlzTG9ja2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWUgPD0gMDtcbiAgICB9XG4gICAgZ2V0VmFsdWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICB9XG4gICAgc2V0VmFsdWUodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fZGlzcGF0Y2hRdWV1ZSgpO1xuICAgIH1cbiAgICByZWxlYXNlKHdlaWdodCA9IDEpIHtcbiAgICAgICAgaWYgKHdlaWdodCA8PSAwKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgdGhpcy5fdmFsdWUgKz0gd2VpZ2h0O1xuICAgICAgICB0aGlzLl9kaXNwYXRjaFF1ZXVlKCk7XG4gICAgfVxuICAgIGNhbmNlbCgpIHtcbiAgICAgICAgdGhpcy5fcXVldWUuZm9yRWFjaCgoZW50cnkpID0+IGVudHJ5LnJlamVjdCh0aGlzLl9jYW5jZWxFcnJvcikpO1xuICAgICAgICB0aGlzLl9xdWV1ZSA9IFtdO1xuICAgIH1cbiAgICBfZGlzcGF0Y2hRdWV1ZSgpIHtcbiAgICAgICAgdGhpcy5fZHJhaW5VbmxvY2tXYWl0ZXJzKCk7XG4gICAgICAgIHdoaWxlICh0aGlzLl9xdWV1ZS5sZW5ndGggPiAwICYmIHRoaXMuX3F1ZXVlWzBdLndlaWdodCA8PSB0aGlzLl92YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fZGlzcGF0Y2hJdGVtKHRoaXMuX3F1ZXVlLnNoaWZ0KCkpO1xuICAgICAgICAgICAgdGhpcy5fZHJhaW5VbmxvY2tXYWl0ZXJzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Rpc3BhdGNoSXRlbShpdGVtKSB7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzVmFsdWUgPSB0aGlzLl92YWx1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWUgLT0gaXRlbS53ZWlnaHQ7XG4gICAgICAgIGl0ZW0ucmVzb2x2ZShbcHJldmlvdXNWYWx1ZSwgdGhpcy5fbmV3UmVsZWFzZXIoaXRlbS53ZWlnaHQpXSk7XG4gICAgfVxuICAgIF9uZXdSZWxlYXNlcih3ZWlnaHQpIHtcbiAgICAgICAgbGV0IGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNhbGxlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5yZWxlYXNlKHdlaWdodCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIF9kcmFpblVubG9ja1dhaXRlcnMoKSB7XG4gICAgICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZvciAobGV0IHdlaWdodCA9IHRoaXMuX3ZhbHVlOyB3ZWlnaHQgPiAwOyB3ZWlnaHQtLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdhaXRlcnMgPSB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB3YWl0ZXJzLmZvckVhY2goKHdhaXRlcikgPT4gd2FpdGVyLnJlc29sdmUoKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBxdWV1ZWRQcmlvcml0eSA9IHRoaXMuX3F1ZXVlWzBdLnByaW9yaXR5O1xuICAgICAgICAgICAgZm9yIChsZXQgd2VpZ2h0ID0gdGhpcy5fdmFsdWU7IHdlaWdodCA+IDA7IHdlaWdodC0tKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd2FpdGVycyA9IHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXTtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXRlcnMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGkgPSB3YWl0ZXJzLmZpbmRJbmRleCgod2FpdGVyKSA9PiB3YWl0ZXIucHJpb3JpdHkgPD0gcXVldWVkUHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgIChpID09PSAtMSA/IHdhaXRlcnMgOiB3YWl0ZXJzLnNwbGljZSgwLCBpKSlcbiAgICAgICAgICAgICAgICAgICAgLmZvckVhY2goKHdhaXRlciA9PiB3YWl0ZXIucmVzb2x2ZSgpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2NvdWxkTG9ja0ltbWVkaWF0ZWx5KHdlaWdodCwgcHJpb3JpdHkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9xdWV1ZS5sZW5ndGggPT09IDAgfHwgdGhpcy5fcXVldWVbMF0ucHJpb3JpdHkgPCBwcmlvcml0eSkgJiZcbiAgICAgICAgICAgIHdlaWdodCA8PSB0aGlzLl92YWx1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiBpbnNlcnRTb3J0ZWQoYSwgdikge1xuICAgIGNvbnN0IGkgPSBmaW5kSW5kZXhGcm9tRW5kKGEsIChvdGhlcikgPT4gdi5wcmlvcml0eSA8PSBvdGhlci5wcmlvcml0eSk7XG4gICAgYS5zcGxpY2UoaSArIDEsIDAsIHYpO1xufVxuZnVuY3Rpb24gZmluZEluZGV4RnJvbUVuZChhLCBwcmVkaWNhdGUpIHtcbiAgICBmb3IgKGxldCBpID0gYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBpZiAocHJlZGljYXRlKGFbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbnZhciBfX2F3YWl0ZXIkMSA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuY2xhc3MgTXV0ZXgge1xuICAgIGNvbnN0cnVjdG9yKGNhbmNlbEVycm9yKSB7XG4gICAgICAgIHRoaXMuX3NlbWFwaG9yZSA9IG5ldyBTZW1hcGhvcmUoMSwgY2FuY2VsRXJyb3IpO1xuICAgIH1cbiAgICBhY3F1aXJlKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyJDEodGhpcywgYXJndW1lbnRzLCB2b2lkIDAsIGZ1bmN0aW9uKiAocHJpb3JpdHkgPSAwKSB7XG4gICAgICAgICAgICBjb25zdCBbLCByZWxlYXNlcl0gPSB5aWVsZCB0aGlzLl9zZW1hcGhvcmUuYWNxdWlyZSgxLCBwcmlvcml0eSk7XG4gICAgICAgICAgICByZXR1cm4gcmVsZWFzZXI7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2ssIHByaW9yaXR5ID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLnJ1bkV4Y2x1c2l2ZSgoKSA9PiBjYWxsYmFjaygpLCAxLCBwcmlvcml0eSk7XG4gICAgfVxuICAgIGlzTG9ja2VkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLmlzTG9ja2VkKCk7XG4gICAgfVxuICAgIHdhaXRGb3JVbmxvY2socHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUud2FpdEZvclVubG9jaygxLCBwcmlvcml0eSk7XG4gICAgfVxuICAgIHJlbGVhc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9zZW1hcGhvcmUuaXNMb2NrZWQoKSlcbiAgICAgICAgICAgIHRoaXMuX3NlbWFwaG9yZS5yZWxlYXNlKCk7XG4gICAgfVxuICAgIGNhbmNlbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5jYW5jZWwoKTtcbiAgICB9XG59XG5cbnZhciBfX2F3YWl0ZXIgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmZ1bmN0aW9uIHdpdGhUaW1lb3V0KHN5bmMsIHRpbWVvdXQsIHRpbWVvdXRFcnJvciA9IEVfVElNRU9VVCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGFjcXVpcmU6ICh3ZWlnaHRPclByaW9yaXR5LCBwcmlvcml0eSkgPT4ge1xuICAgICAgICAgICAgbGV0IHdlaWdodDtcbiAgICAgICAgICAgIGlmIChpc1NlbWFwaG9yZShzeW5jKSkge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdlaWdodCAhPT0gdW5kZWZpbmVkICYmIHdlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGlzVGltZW91dCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpc1RpbWVvdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QodGltZW91dEVycm9yKTtcbiAgICAgICAgICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aWNrZXQgPSB5aWVsZCAoaXNTZW1hcGhvcmUoc3luYylcbiAgICAgICAgICAgICAgICAgICAgICAgID8gc3luYy5hY3F1aXJlKHdlaWdodCwgcHJpb3JpdHkpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHN5bmMuYWNxdWlyZShwcmlvcml0eSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxlYXNlID0gQXJyYXkuaXNBcnJheSh0aWNrZXQpID8gdGlja2V0WzFdIDogdGlja2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRpY2tldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1RpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2ssIHdlaWdodCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlbGVhc2UgPSAoKSA9PiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlja2V0ID0geWllbGQgdGhpcy5hY3F1aXJlKHdlaWdodCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aWNrZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlID0gdGlja2V0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKHRpY2tldFswXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlID0gdGlja2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVsZWFzZSh3ZWlnaHQpIHtcbiAgICAgICAgICAgIHN5bmMucmVsZWFzZSh3ZWlnaHQpO1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWwoKSB7XG4gICAgICAgICAgICByZXR1cm4gc3luYy5jYW5jZWwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgd2FpdEZvclVubG9jazogKHdlaWdodE9yUHJpb3JpdHksIHByaW9yaXR5KSA9PiB7XG4gICAgICAgICAgICBsZXQgd2VpZ2h0O1xuICAgICAgICAgICAgaWYgKGlzU2VtYXBob3JlKHN5bmMpKSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBwcmlvcml0eSA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2VpZ2h0ICE9PSB1bmRlZmluZWQgJiYgd2VpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdCh0aW1lb3V0RXJyb3IpLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICAoaXNTZW1hcGhvcmUoc3luYylcbiAgICAgICAgICAgICAgICAgICAgPyBzeW5jLndhaXRGb3JVbmxvY2sod2VpZ2h0LCBwcmlvcml0eSlcbiAgICAgICAgICAgICAgICAgICAgOiBzeW5jLndhaXRGb3JVbmxvY2socHJpb3JpdHkpKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBpc0xvY2tlZDogKCkgPT4gc3luYy5pc0xvY2tlZCgpLFxuICAgICAgICBnZXRWYWx1ZTogKCkgPT4gc3luYy5nZXRWYWx1ZSgpLFxuICAgICAgICBzZXRWYWx1ZTogKHZhbHVlKSA9PiBzeW5jLnNldFZhbHVlKHZhbHVlKSxcbiAgICB9O1xufVxuZnVuY3Rpb24gaXNTZW1hcGhvcmUoc3luYykge1xuICAgIHJldHVybiBzeW5jLmdldFZhbHVlICE9PSB1bmRlZmluZWQ7XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGlzbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlc1xuZnVuY3Rpb24gdHJ5QWNxdWlyZShzeW5jLCBhbHJlYWR5QWNxdWlyZWRFcnJvciA9IEVfQUxSRUFEWV9MT0NLRUQpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIHJldHVybiB3aXRoVGltZW91dChzeW5jLCAwLCBhbHJlYWR5QWNxdWlyZWRFcnJvcik7XG59XG5cbmV4cG9ydCB7IEVfQUxSRUFEWV9MT0NLRUQsIEVfQ0FOQ0VMRUQsIEVfVElNRU9VVCwgTXV0ZXgsIFNlbWFwaG9yZSwgdHJ5QWNxdWlyZSwgd2l0aFRpbWVvdXQgfTtcbiIsImltcG9ydCB7IGRlcXVhbCB9IGZyb20gJ2RlcXVhbC9saXRlJztcbmltcG9ydCB7IE11dGV4IH0gZnJvbSAnYXN5bmMtbXV0ZXgnO1xuXG5jb25zdCBicm93c2VyID0gKFxuICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gIGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWQgPT0gbnVsbCA/IGdsb2JhbFRoaXMuY2hyb21lIDogKFxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgKVxuKTtcbmNvbnN0IHN0b3JhZ2UgPSBjcmVhdGVTdG9yYWdlKCk7XG5mdW5jdGlvbiBjcmVhdGVTdG9yYWdlKCkge1xuICBjb25zdCBkcml2ZXJzID0ge1xuICAgIGxvY2FsOiBjcmVhdGVEcml2ZXIoXCJsb2NhbFwiKSxcbiAgICBzZXNzaW9uOiBjcmVhdGVEcml2ZXIoXCJzZXNzaW9uXCIpLFxuICAgIHN5bmM6IGNyZWF0ZURyaXZlcihcInN5bmNcIiksXG4gICAgbWFuYWdlZDogY3JlYXRlRHJpdmVyKFwibWFuYWdlZFwiKVxuICB9O1xuICBjb25zdCBnZXREcml2ZXIgPSAoYXJlYSkgPT4ge1xuICAgIGNvbnN0IGRyaXZlciA9IGRyaXZlcnNbYXJlYV07XG4gICAgaWYgKGRyaXZlciA9PSBudWxsKSB7XG4gICAgICBjb25zdCBhcmVhTmFtZXMgPSBPYmplY3Qua2V5cyhkcml2ZXJzKS5qb2luKFwiLCBcIik7XG4gICAgICB0aHJvdyBFcnJvcihgSW52YWxpZCBhcmVhIFwiJHthcmVhfVwiLiBPcHRpb25zOiAke2FyZWFOYW1lc31gKTtcbiAgICB9XG4gICAgcmV0dXJuIGRyaXZlcjtcbiAgfTtcbiAgY29uc3QgcmVzb2x2ZUtleSA9IChrZXkpID0+IHtcbiAgICBjb25zdCBkZWxpbWluYXRvckluZGV4ID0ga2V5LmluZGV4T2YoXCI6XCIpO1xuICAgIGNvbnN0IGRyaXZlckFyZWEgPSBrZXkuc3Vic3RyaW5nKDAsIGRlbGltaW5hdG9ySW5kZXgpO1xuICAgIGNvbnN0IGRyaXZlcktleSA9IGtleS5zdWJzdHJpbmcoZGVsaW1pbmF0b3JJbmRleCArIDEpO1xuICAgIGlmIChkcml2ZXJLZXkgPT0gbnVsbClcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgU3RvcmFnZSBrZXkgc2hvdWxkIGJlIGluIHRoZSBmb3JtIG9mIFwiYXJlYTprZXlcIiwgYnV0IHJlY2VpdmVkIFwiJHtrZXl9XCJgXG4gICAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBkcml2ZXJBcmVhLFxuICAgICAgZHJpdmVyS2V5LFxuICAgICAgZHJpdmVyOiBnZXREcml2ZXIoZHJpdmVyQXJlYSlcbiAgICB9O1xuICB9O1xuICBjb25zdCBnZXRNZXRhS2V5ID0gKGtleSkgPT4ga2V5ICsgXCIkXCI7XG4gIGNvbnN0IG1lcmdlTWV0YSA9IChvbGRNZXRhLCBuZXdNZXRhKSA9PiB7XG4gICAgY29uc3QgbmV3RmllbGRzID0geyAuLi5vbGRNZXRhIH07XG4gICAgT2JqZWN0LmVudHJpZXMobmV3TWV0YSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbClcbiAgICAgICAgZGVsZXRlIG5ld0ZpZWxkc1trZXldO1xuICAgICAgZWxzZVxuICAgICAgICBuZXdGaWVsZHNba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXdGaWVsZHM7XG4gIH07XG4gIGNvbnN0IGdldFZhbHVlT3JGYWxsYmFjayA9ICh2YWx1ZSwgZmFsbGJhY2spID0+IHZhbHVlID8/IGZhbGxiYWNrID8/IG51bGw7XG4gIGNvbnN0IGdldE1ldGFWYWx1ZSA9IChwcm9wZXJ0aWVzKSA9PiB0eXBlb2YgcHJvcGVydGllcyA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzKSA/IHByb3BlcnRpZXMgOiB7fTtcbiAgY29uc3QgZ2V0SXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgb3B0cykgPT4ge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGRyaXZlci5nZXRJdGVtKGRyaXZlcktleSk7XG4gICAgcmV0dXJuIGdldFZhbHVlT3JGYWxsYmFjayhyZXMsIG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZSk7XG4gIH07XG4gIGNvbnN0IGdldE1ldGEgPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXkpID0+IHtcbiAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGRyaXZlci5nZXRJdGVtKG1ldGFLZXkpO1xuICAgIHJldHVybiBnZXRNZXRhVmFsdWUocmVzKTtcbiAgfTtcbiAgY29uc3Qgc2V0SXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgdmFsdWUpID0+IHtcbiAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShkcml2ZXJLZXksIHZhbHVlID8/IG51bGwpO1xuICB9O1xuICBjb25zdCBzZXRNZXRhID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgY29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcbiAgICBjb25zdCBleGlzdGluZ0ZpZWxkcyA9IGdldE1ldGFWYWx1ZShhd2FpdCBkcml2ZXIuZ2V0SXRlbShtZXRhS2V5KSk7XG4gICAgYXdhaXQgZHJpdmVyLnNldEl0ZW0obWV0YUtleSwgbWVyZ2VNZXRhKGV4aXN0aW5nRmllbGRzLCBwcm9wZXJ0aWVzKSk7XG4gIH07XG4gIGNvbnN0IHJlbW92ZUl0ZW0gPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpID0+IHtcbiAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbShkcml2ZXJLZXkpO1xuICAgIGlmIChvcHRzPy5yZW1vdmVNZXRhKSB7XG4gICAgICBjb25zdCBtZXRhS2V5ID0gZ2V0TWV0YUtleShkcml2ZXJLZXkpO1xuICAgICAgYXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW0obWV0YUtleSk7XG4gICAgfVxuICB9O1xuICBjb25zdCByZW1vdmVNZXRhID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBwcm9wZXJ0aWVzKSA9PiB7XG4gICAgY29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcbiAgICBpZiAocHJvcGVydGllcyA9PSBudWxsKSB7XG4gICAgICBhd2FpdCBkcml2ZXIucmVtb3ZlSXRlbShtZXRhS2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbmV3RmllbGRzID0gZ2V0TWV0YVZhbHVlKGF3YWl0IGRyaXZlci5nZXRJdGVtKG1ldGFLZXkpKTtcbiAgICAgIFtwcm9wZXJ0aWVzXS5mbGF0KCkuZm9yRWFjaCgoZmllbGQpID0+IGRlbGV0ZSBuZXdGaWVsZHNbZmllbGRdKTtcbiAgICAgIGF3YWl0IGRyaXZlci5zZXRJdGVtKG1ldGFLZXksIG5ld0ZpZWxkcyk7XG4gICAgfVxuICB9O1xuICBjb25zdCB3YXRjaCA9IChkcml2ZXIsIGRyaXZlcktleSwgY2IpID0+IHtcbiAgICByZXR1cm4gZHJpdmVyLndhdGNoKGRyaXZlcktleSwgY2IpO1xuICB9O1xuICBjb25zdCBzdG9yYWdlMiA9IHtcbiAgICBnZXRJdGVtOiBhc3luYyAoa2V5LCBvcHRzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICByZXR1cm4gYXdhaXQgZ2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG4gICAgfSxcbiAgICBnZXRJdGVtczogYXN5bmMgKGtleXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb0tleU1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG4gICAgICBjb25zdCBrZXlUb09wdHNNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuICAgICAgY29uc3Qgb3JkZXJlZEtleXMgPSBbXTtcbiAgICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIGxldCBrZXlTdHI7XG4gICAgICAgIGxldCBvcHRzO1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGtleVN0ciA9IGtleTtcbiAgICAgICAgfSBlbHNlIGlmIChcImdldFZhbHVlXCIgaW4ga2V5KSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5LmtleTtcbiAgICAgICAgICBvcHRzID0geyBmYWxsYmFjazoga2V5LmZhbGxiYWNrIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5LmtleTtcbiAgICAgICAgICBvcHRzID0ga2V5Lm9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgb3JkZXJlZEtleXMucHVzaChrZXlTdHIpO1xuICAgICAgICBjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXlTdHIpO1xuICAgICAgICBjb25zdCBhcmVhS2V5cyA9IGFyZWFUb0tleU1hcC5nZXQoZHJpdmVyQXJlYSkgPz8gW107XG4gICAgICAgIGFyZWFUb0tleU1hcC5zZXQoZHJpdmVyQXJlYSwgYXJlYUtleXMuY29uY2F0KGRyaXZlcktleSkpO1xuICAgICAgICBrZXlUb09wdHNNYXAuc2V0KGtleVN0ciwgb3B0cyk7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdHNNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIEFycmF5LmZyb20oYXJlYVRvS2V5TWFwLmVudHJpZXMoKSkubWFwKGFzeW5jIChbZHJpdmVyQXJlYSwga2V5czJdKSA9PiB7XG4gICAgICAgICAgY29uc3QgZHJpdmVyUmVzdWx0cyA9IGF3YWl0IGRyaXZlcnNbZHJpdmVyQXJlYV0uZ2V0SXRlbXMoa2V5czIpO1xuICAgICAgICAgIGRyaXZlclJlc3VsdHMuZm9yRWFjaCgoZHJpdmVyUmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtkcml2ZXJBcmVhfToke2RyaXZlclJlc3VsdC5rZXl9YDtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBrZXlUb09wdHNNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGdldFZhbHVlT3JGYWxsYmFjayhcbiAgICAgICAgICAgICAgZHJpdmVyUmVzdWx0LnZhbHVlLFxuICAgICAgICAgICAgICBvcHRzPy5mYWxsYmFjayA/PyBvcHRzPy5kZWZhdWx0VmFsdWVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXN1bHRzTWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICByZXR1cm4gb3JkZXJlZEtleXMubWFwKChrZXkpID0+ICh7XG4gICAgICAgIGtleSxcbiAgICAgICAgdmFsdWU6IHJlc3VsdHNNYXAuZ2V0KGtleSlcbiAgICAgIH0pKTtcbiAgICB9LFxuICAgIGdldE1ldGE6IGFzeW5jIChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcbiAgICB9LFxuICAgIGdldE1ldGFzOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgY29uc3Qga2V5cyA9IGFyZ3MubWFwKChhcmcpID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0gdHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIiA/IGFyZyA6IGFyZy5rZXk7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2V5LFxuICAgICAgICAgIGRyaXZlckFyZWEsXG4gICAgICAgICAgZHJpdmVyS2V5LFxuICAgICAgICAgIGRyaXZlck1ldGFLZXk6IGdldE1ldGFLZXkoZHJpdmVyS2V5KVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBjb25zdCBhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCA9IGtleXMucmVkdWNlKChtYXAsIGtleSkgPT4ge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIG1hcFtfYSA9IGtleS5kcml2ZXJBcmVhXSA/PyAobWFwW19hXSA9IFtdKTtcbiAgICAgICAgbWFwW2tleS5kcml2ZXJBcmVhXS5wdXNoKGtleSk7XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICB9LCB7fSk7XG4gICAgICBjb25zdCByZXN1bHRzTWFwID0ge307XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYXJlYVRvRHJpdmVyTWV0YUtleXNNYXApLm1hcChhc3luYyAoW2FyZWEsIGtleXMyXSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGFyZWFSZXMgPSBhd2FpdCBicm93c2VyLnN0b3JhZ2VbYXJlYV0uZ2V0KFxuICAgICAgICAgICAga2V5czIubWFwKChrZXkpID0+IGtleS5kcml2ZXJNZXRhS2V5KVxuICAgICAgICAgICk7XG4gICAgICAgICAga2V5czIuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICByZXN1bHRzTWFwW2tleS5rZXldID0gYXJlYVJlc1trZXkuZHJpdmVyTWV0YUtleV0gPz8ge307XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgcmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7XG4gICAgICAgIGtleToga2V5LmtleSxcbiAgICAgICAgbWV0YTogcmVzdWx0c01hcFtrZXkua2V5XVxuICAgICAgfSkpO1xuICAgIH0sXG4gICAgc2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIGF3YWl0IHNldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKTtcbiAgICB9LFxuICAgIHNldEl0ZW1zOiBhc3luYyAoaXRlbXMpID0+IHtcbiAgICAgIGNvbnN0IGFyZWFUb0tleVZhbHVlTWFwID0ge307XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KFxuICAgICAgICAgIFwia2V5XCIgaW4gaXRlbSA/IGl0ZW0ua2V5IDogaXRlbS5pdGVtLmtleVxuICAgICAgICApO1xuICAgICAgICBhcmVhVG9LZXlWYWx1ZU1hcFtkcml2ZXJBcmVhXSA/PyAoYXJlYVRvS2V5VmFsdWVNYXBbZHJpdmVyQXJlYV0gPSBbXSk7XG4gICAgICAgIGFyZWFUb0tleVZhbHVlTWFwW2RyaXZlckFyZWFdLnB1c2goe1xuICAgICAgICAgIGtleTogZHJpdmVyS2V5LFxuICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYXJlYVRvS2V5VmFsdWVNYXApLm1hcChhc3luYyAoW2RyaXZlckFyZWEsIHZhbHVlc10pID0+IHtcbiAgICAgICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoZHJpdmVyQXJlYSk7XG4gICAgICAgICAgYXdhaXQgZHJpdmVyLnNldEl0ZW1zKHZhbHVlcyk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0sXG4gICAgc2V0TWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgc2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgfSxcbiAgICBzZXRNZXRhczogYXN5bmMgKGl0ZW1zKSA9PiB7XG4gICAgICBjb25zdCBhcmVhVG9NZXRhVXBkYXRlc01hcCA9IHt9O1xuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShcbiAgICAgICAgICBcImtleVwiIGluIGl0ZW0gPyBpdGVtLmtleSA6IGl0ZW0uaXRlbS5rZXlcbiAgICAgICAgKTtcbiAgICAgICAgYXJlYVRvTWV0YVVwZGF0ZXNNYXBbZHJpdmVyQXJlYV0gPz8gKGFyZWFUb01ldGFVcGRhdGVzTWFwW2RyaXZlckFyZWFdID0gW10pO1xuICAgICAgICBhcmVhVG9NZXRhVXBkYXRlc01hcFtkcml2ZXJBcmVhXS5wdXNoKHtcbiAgICAgICAgICBrZXk6IGRyaXZlcktleSxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiBpdGVtLm1ldGFcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICBPYmplY3QuZW50cmllcyhhcmVhVG9NZXRhVXBkYXRlc01hcCkubWFwKFxuICAgICAgICAgIGFzeW5jIChbc3RvcmFnZUFyZWEsIHVwZGF0ZXNdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoc3RvcmFnZUFyZWEpO1xuICAgICAgICAgICAgY29uc3QgbWV0YUtleXMgPSB1cGRhdGVzLm1hcCgoeyBrZXkgfSkgPT4gZ2V0TWV0YUtleShrZXkpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHN0b3JhZ2VBcmVhLCBtZXRhS2V5cyk7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ01ldGFzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW1zKG1ldGFLZXlzKTtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTWV0YU1hcCA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgICAgICAgICAgZXhpc3RpbmdNZXRhcy5tYXAoKHsga2V5LCB2YWx1ZSB9KSA9PiBba2V5LCBnZXRNZXRhVmFsdWUodmFsdWUpXSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBtZXRhVXBkYXRlcyA9IHVwZGF0ZXMubWFwKCh7IGtleSwgcHJvcGVydGllcyB9KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGtleSk7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAga2V5OiBtZXRhS2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBtZXJnZU1ldGEoZXhpc3RpbmdNZXRhTWFwW21ldGFLZXldID8/IHt9LCBwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbXMobWV0YVVwZGF0ZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9LFxuICAgIHJlbW92ZUl0ZW06IGFzeW5jIChrZXksIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcbiAgICAgIGF3YWl0IHJlbW92ZUl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbXM6IGFzeW5jIChrZXlzKSA9PiB7XG4gICAgICBjb25zdCBhcmVhVG9LZXlzTWFwID0ge307XG4gICAgICBrZXlzLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICBsZXQga2V5U3RyO1xuICAgICAgICBsZXQgb3B0cztcbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXk7XG4gICAgICAgIH0gZWxzZSBpZiAoXCJnZXRWYWx1ZVwiIGluIGtleSkge1xuICAgICAgICAgIGtleVN0ciA9IGtleS5rZXk7XG4gICAgICAgIH0gZWxzZSBpZiAoXCJpdGVtXCIgaW4ga2V5KSB7XG4gICAgICAgICAga2V5U3RyID0ga2V5Lml0ZW0ua2V5O1xuICAgICAgICAgIG9wdHMgPSBrZXkub3B0aW9ucztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlTdHIgPSBrZXkua2V5O1xuICAgICAgICAgIG9wdHMgPSBrZXkub3B0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXlTdHIpO1xuICAgICAgICBhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdID8/IChhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdID0gW10pO1xuICAgICAgICBhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdLnB1c2goZHJpdmVyS2V5KTtcbiAgICAgICAgaWYgKG9wdHM/LnJlbW92ZU1ldGEpIHtcbiAgICAgICAgICBhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdLnB1c2goZ2V0TWV0YUtleShkcml2ZXJLZXkpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYXJlYVRvS2V5c01hcCkubWFwKGFzeW5jIChbZHJpdmVyQXJlYSwga2V5czJdKSA9PiB7XG4gICAgICAgICAgY29uc3QgZHJpdmVyID0gZ2V0RHJpdmVyKGRyaXZlckFyZWEpO1xuICAgICAgICAgIGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtcyhrZXlzMik7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0sXG4gICAgcmVtb3ZlTWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuICAgICAgY29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuICAgICAgYXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgfSxcbiAgICBzbmFwc2hvdDogYXN5bmMgKGJhc2UsIG9wdHMpID0+IHtcbiAgICAgIGNvbnN0IGRyaXZlciA9IGdldERyaXZlcihiYXNlKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBkcml2ZXIuc25hcHNob3QoKTtcbiAgICAgIG9wdHM/LmV4Y2x1ZGVLZXlzPy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgZGVsZXRlIGRhdGFbZ2V0TWV0YUtleShrZXkpXTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICByZXN0b3JlU25hcHNob3Q6IGFzeW5jIChiYXNlLCBkYXRhKSA9PiB7XG4gICAgICBjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoYmFzZSk7XG4gICAgICBhd2FpdCBkcml2ZXIucmVzdG9yZVNuYXBzaG90KGRhdGEpO1xuICAgIH0sXG4gICAgd2F0Y2g6IChrZXksIGNiKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICByZXR1cm4gd2F0Y2goZHJpdmVyLCBkcml2ZXJLZXksIGNiKTtcbiAgICB9LFxuICAgIHVud2F0Y2goKSB7XG4gICAgICBPYmplY3QudmFsdWVzKGRyaXZlcnMpLmZvckVhY2goKGRyaXZlcikgPT4ge1xuICAgICAgICBkcml2ZXIudW53YXRjaCgpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWZpbmVJdGVtOiAoa2V5LCBvcHRzKSA9PiB7XG4gICAgICBjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG4gICAgICBjb25zdCB7IHZlcnNpb246IHRhcmdldFZlcnNpb24gPSAxLCBtaWdyYXRpb25zID0ge30gfSA9IG9wdHMgPz8ge307XG4gICAgICBpZiAodGFyZ2V0VmVyc2lvbiA8IDEpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICAgXCJTdG9yYWdlIGl0ZW0gdmVyc2lvbiBjYW5ub3QgYmUgbGVzcyB0aGFuIDEuIEluaXRpYWwgdmVyc2lvbnMgc2hvdWxkIGJlIHNldCB0byAxLCBub3QgMC5cIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgY29uc3QgbWlncmF0ZSA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgZHJpdmVyTWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcbiAgICAgICAgY29uc3QgW3sgdmFsdWUgfSwgeyB2YWx1ZTogbWV0YSB9XSA9IGF3YWl0IGRyaXZlci5nZXRJdGVtcyhbXG4gICAgICAgICAgZHJpdmVyS2V5LFxuICAgICAgICAgIGRyaXZlck1ldGFLZXlcbiAgICAgICAgXSk7XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb24gPSBtZXRhPy52ID8/IDE7XG4gICAgICAgIGlmIChjdXJyZW50VmVyc2lvbiA+IHRhcmdldFZlcnNpb24pIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAgIGBWZXJzaW9uIGRvd25ncmFkZSBkZXRlY3RlZCAodiR7Y3VycmVudFZlcnNpb259IC0+IHYke3RhcmdldFZlcnNpb259KSBmb3IgXCIke2tleX1cImBcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXG4gICAgICAgICAgYFtAd3h0LWRldi9zdG9yYWdlXSBSdW5uaW5nIHN0b3JhZ2UgbWlncmF0aW9uIGZvciAke2tleX06IHYke2N1cnJlbnRWZXJzaW9ufSAtPiB2JHt0YXJnZXRWZXJzaW9ufWBcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgbWlncmF0aW9uc1RvUnVuID0gQXJyYXkuZnJvbShcbiAgICAgICAgICB7IGxlbmd0aDogdGFyZ2V0VmVyc2lvbiAtIGN1cnJlbnRWZXJzaW9uIH0sXG4gICAgICAgICAgKF8sIGkpID0+IGN1cnJlbnRWZXJzaW9uICsgaSArIDFcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IG1pZ3JhdGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgZm9yIChjb25zdCBtaWdyYXRlVG9WZXJzaW9uIG9mIG1pZ3JhdGlvbnNUb1J1bikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtaWdyYXRlZFZhbHVlID0gYXdhaXQgbWlncmF0aW9ucz8uW21pZ3JhdGVUb1ZlcnNpb25dPy4obWlncmF0ZWRWYWx1ZSkgPz8gbWlncmF0ZWRWYWx1ZTtcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB2JHttaWdyYXRlVG9WZXJzaW9ufSBtaWdyYXRpb24gZmFpbGVkIGZvciBcIiR7a2V5fVwiYCwge1xuICAgICAgICAgICAgICBjYXVzZTogZXJyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgZHJpdmVyLnNldEl0ZW1zKFtcbiAgICAgICAgICB7IGtleTogZHJpdmVyS2V5LCB2YWx1ZTogbWlncmF0ZWRWYWx1ZSB9LFxuICAgICAgICAgIHsga2V5OiBkcml2ZXJNZXRhS2V5LCB2YWx1ZTogeyAuLi5tZXRhLCB2OiB0YXJnZXRWZXJzaW9uIH0gfVxuICAgICAgICBdKTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZyhcbiAgICAgICAgICBgW0B3eHQtZGV2L3N0b3JhZ2VdIFN0b3JhZ2UgbWlncmF0aW9uIGNvbXBsZXRlZCBmb3IgJHtrZXl9IHYke3RhcmdldFZlcnNpb259YCxcbiAgICAgICAgICB7IG1pZ3JhdGVkVmFsdWUgfVxuICAgICAgICApO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG1pZ3JhdGlvbnNEb25lID0gb3B0cz8ubWlncmF0aW9ucyA9PSBudWxsID8gUHJvbWlzZS5yZXNvbHZlKCkgOiBtaWdyYXRlKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIGBbQHd4dC1kZXYvc3RvcmFnZV0gTWlncmF0aW9uIGZhaWxlZCBmb3IgJHtrZXl9YCxcbiAgICAgICAgICBlcnJcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgaW5pdE11dGV4ID0gbmV3IE11dGV4KCk7XG4gICAgICBjb25zdCBnZXRGYWxsYmFjayA9ICgpID0+IG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZSA/PyBudWxsO1xuICAgICAgY29uc3QgZ2V0T3JJbml0VmFsdWUgPSAoKSA9PiBpbml0TXV0ZXgucnVuRXhjbHVzaXZlKGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBkcml2ZXIuZ2V0SXRlbShkcml2ZXJLZXkpO1xuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCB8fCBvcHRzPy5pbml0ID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGF3YWl0IG9wdHMuaW5pdCgpO1xuICAgICAgICBhd2FpdCBkcml2ZXIuc2V0SXRlbShkcml2ZXJLZXksIG5ld1ZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgICAgfSk7XG4gICAgICBtaWdyYXRpb25zRG9uZS50aGVuKGdldE9ySW5pdFZhbHVlKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgZ2V0IGRlZmF1bHRWYWx1ZSgpIHtcbiAgICAgICAgICByZXR1cm4gZ2V0RmFsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0IGZhbGxiYWNrKCkge1xuICAgICAgICAgIHJldHVybiBnZXRGYWxsYmFjaygpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRWYWx1ZTogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIGlmIChvcHRzPy5pbml0KSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0T3JJbml0VmFsdWUoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGdldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0TWV0YTogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0VmFsdWU6IGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1pZ3JhdGlvbnNEb25lO1xuICAgICAgICAgIHJldHVybiBhd2FpdCBzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldE1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmVWYWx1ZTogYXN5bmMgKG9wdHMyKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWlncmF0aW9uc0RvbmU7XG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHJlbW92ZUl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIG9wdHMyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlTWV0YTogYXN5bmMgKHByb3BlcnRpZXMpID0+IHtcbiAgICAgICAgICBhd2FpdCBtaWdyYXRpb25zRG9uZTtcbiAgICAgICAgICByZXR1cm4gYXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhdGNoOiAoY2IpID0+IHdhdGNoKFxuICAgICAgICAgIGRyaXZlcixcbiAgICAgICAgICBkcml2ZXJLZXksXG4gICAgICAgICAgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4gY2IobmV3VmFsdWUgPz8gZ2V0RmFsbGJhY2soKSwgb2xkVmFsdWUgPz8gZ2V0RmFsbGJhY2soKSlcbiAgICAgICAgKSxcbiAgICAgICAgbWlncmF0ZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzdG9yYWdlMjtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURyaXZlcihzdG9yYWdlQXJlYSkge1xuICBjb25zdCBnZXRTdG9yYWdlQXJlYSA9ICgpID0+IHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lID09IG51bGwpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBbXG4gICAgICAgICAgXCInd3h0L3N0b3JhZ2UnIG11c3QgYmUgbG9hZGVkIGluIGEgd2ViIGV4dGVuc2lvbiBlbnZpcm9ubWVudFwiLFxuICAgICAgICAgIFwiXFxuIC0gSWYgdGhyb3duIGR1cmluZyBhIGJ1aWxkLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3d4dC1kZXYvd3h0L2lzc3Vlcy8zNzFcIixcbiAgICAgICAgICBcIiAtIElmIHRocm93biBkdXJpbmcgdGVzdHMsIG1vY2sgJ3d4dC9icm93c2VyJyBjb3JyZWN0bHkuIFNlZSBodHRwczovL3d4dC5kZXYvZ3VpZGUvZ28tZnVydGhlci90ZXN0aW5nLmh0bWxcXG5cIlxuICAgICAgICBdLmpvaW4oXCJcXG5cIilcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChicm93c2VyLnN0b3JhZ2UgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIFwiWW91IG11c3QgYWRkIHRoZSAnc3RvcmFnZScgcGVybWlzc2lvbiB0byB5b3VyIG1hbmlmZXN0IHRvIHVzZSAnd3h0L3N0b3JhZ2UnXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGFyZWEgPSBicm93c2VyLnN0b3JhZ2Vbc3RvcmFnZUFyZWFdO1xuICAgIGlmIChhcmVhID09IG51bGwpXG4gICAgICB0aHJvdyBFcnJvcihgXCJicm93c2VyLnN0b3JhZ2UuJHtzdG9yYWdlQXJlYX1cIiBpcyB1bmRlZmluZWRgKTtcbiAgICByZXR1cm4gYXJlYTtcbiAgfTtcbiAgY29uc3Qgd2F0Y2hMaXN0ZW5lcnMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICByZXR1cm4ge1xuICAgIGdldEl0ZW06IGFzeW5jIChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KGtleSk7XG4gICAgICByZXR1cm4gcmVzW2tleV07XG4gICAgfSxcbiAgICBnZXRJdGVtczogYXN5bmMgKGtleXMpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KGtleXMpO1xuICAgICAgcmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7IGtleSwgdmFsdWU6IHJlc3VsdFtrZXldID8/IG51bGwgfSkpO1xuICAgIH0sXG4gICAgc2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkucmVtb3ZlKGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldCh7IFtrZXldOiB2YWx1ZSB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHNldEl0ZW1zOiBhc3luYyAodmFsdWVzKSA9PiB7XG4gICAgICBjb25zdCBtYXAgPSB2YWx1ZXMucmVkdWNlKFxuICAgICAgICAobWFwMiwgeyBrZXksIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICBtYXAyW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICByZXR1cm4gbWFwMjtcbiAgICAgICAgfSxcbiAgICAgICAge31cbiAgICAgICk7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChtYXApO1xuICAgIH0sXG4gICAgcmVtb3ZlSXRlbTogYXN5bmMgKGtleSkgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5KTtcbiAgICB9LFxuICAgIHJlbW92ZUl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuICAgICAgYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5cyk7XG4gICAgfSxcbiAgICBzbmFwc2hvdDogYXN5bmMgKCkgPT4ge1xuICAgICAgcmV0dXJuIGF3YWl0IGdldFN0b3JhZ2VBcmVhKCkuZ2V0KCk7XG4gICAgfSxcbiAgICByZXN0b3JlU25hcHNob3Q6IGFzeW5jIChkYXRhKSA9PiB7XG4gICAgICBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChkYXRhKTtcbiAgICB9LFxuICAgIHdhdGNoKGtleSwgY2IpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyID0gKGNoYW5nZXMpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbmdlID0gY2hhbmdlc1trZXldO1xuICAgICAgICBpZiAoY2hhbmdlID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoZGVxdWFsKGNoYW5nZS5uZXdWYWx1ZSwgY2hhbmdlLm9sZFZhbHVlKSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNiKGNoYW5nZS5uZXdWYWx1ZSA/PyBudWxsLCBjaGFuZ2Uub2xkVmFsdWUgPz8gbnVsbCk7XG4gICAgICB9O1xuICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgd2F0Y2hMaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGdldFN0b3JhZ2VBcmVhKCkub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgd2F0Y2hMaXN0ZW5lcnMuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bndhdGNoKCkge1xuICAgICAgd2F0Y2hMaXN0ZW5lcnMuZm9yRWFjaCgobGlzdGVuZXIpID0+IHtcbiAgICAgICAgZ2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgICB3YXRjaExpc3RlbmVycy5jbGVhcigpO1xuICAgIH1cbiAgfTtcbn1cbmNsYXNzIE1pZ3JhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihrZXksIHZlcnNpb24sIG9wdGlvbnMpIHtcbiAgICBzdXBlcihgdiR7dmVyc2lvbn0gbWlncmF0aW9uIGZhaWxlZCBmb3IgXCIke2tleX1cImAsIG9wdGlvbnMpO1xuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gIH1cbn1cblxuZXhwb3J0IHsgTWlncmF0aW9uRXJyb3IsIHN0b3JhZ2UgfTtcbiIsImV4cG9ydCBjb25zdCBDT05URU5UX1NDUklQVF9NQVRDSEVTID0gXCIqOi8vKi5sb2NhbGhvc3QvKlwiOyIsImltcG9ydCB7IENPTlRFTlRfU0NSSVBUX01BVENIRVMgfSBmcm9tIFwiQC91dGlscy9NYXRjaGVzXCI7XG5cbmNvbnN0IGNvbnRlbnRNYXRjaCA9IG5ldyBNYXRjaFBhdHRlcm4oQ09OVEVOVF9TQ1JJUFRfTUFUQ0hFUyk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoYXN5bmMgKCkgPT4ge1xuICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIGZ1bmN0aW9uIChyZXF1ZXN0LCBzZW5kZXIpIHtcbiAgICBpZiAocmVxdWVzdC50eXBlID09PSBcImFwaVJlcVJlc1wiKSB7XG4gICAgICBjb25zdCB3ZWJzaXRlSWQgPSBhd2FpdCBzdG9yYWdlLmdldEl0ZW0oXCJsb2NhbDp3ZWJzaXRlLWlkXCIpO1xuICAgICAgY29uc3QgdXNlclRva2VuID0gYXdhaXQgc3RvcmFnZS5nZXRJdGVtKFwibG9jYWw6dXNlclRva2VuXCIpO1xuICAgICAgaWYgKHdlYnNpdGVJZCAmJiB1c2VyVG9rZW4pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdFVybCA9IHJlcXVlc3Q/Lm9wdGlvbnM/LmRhdGE/LmRhdGE/LnVybCB8fCBcIlwiO1xuICAgICAgICBpZiAocmVxdWVzdFVybC5pbmNsdWRlcyhcImZhdmljb24uaWNvXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJJZ25vcmluZyBmYXZpY29uIHJlcXVlc3RcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKHJlcXVlc3QpO1xuICAgICAgICBpZiAocmVxdWVzdC5vcHRpb25zLmRhdGEudHlwZSAhPSBcInhoci1pbnRlcmNlcHRlZFwiIHx8IChyZXF1ZXN0Lm9wdGlvbnMuZGF0YS5kYXRhLnJlcXVlc3RCb2R5ID09IG51bGwgJiYgcmVxdWVzdC5vcHRpb25zLmRhdGEuZGF0YS5yZXNwb25zZSA9PSBudWxsKSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUHJvY2Vzc2luZyB1c2VyLWluaXRpYXRlZCByZXF1ZXN0OlwiLCByZXF1ZXN0VXJsKTtcbiAgICAgICAgY29uc29sZS5sb2coZ2V0RW5kcG9pbnQocmVxdWVzdFVybCkpO1xuICAgICAgICBsZXQgcGFyc2VkUmVxdWVzdEJvZHkgPSBudWxsO1xuICAgICAgICBsZXQgcGFyc2VkUmVzcG9uc2UgPSBudWxsO1xuICAgICAgICBsZXQgcGFyc2VkUmVzcG9uc2VTdGF0dXNLZXkgPSBudWxsO1xuICAgICAgICBsZXQgcGFyc2VkUmVzcG9uc2VTdGF0dXNWYWx1ZSA9IG51bGw7XG4gICAgICAgIGxldCBwYXJzZWRSZXNwb25zZURhdGEgPSBudWxsO1xuICAgICAgICBpZiAocmVxdWVzdC5vcHRpb25zLmRhdGEuZGF0YS5yZXF1ZXN0Qm9keSlcbiAgICAgICAgICBwYXJzZWRSZXF1ZXN0Qm9keSA9IHBhcnNlUmVxdWVzdChyZXF1ZXN0Lm9wdGlvbnMuZGF0YS5kYXRhLnJlcXVlc3RCb2R5KTtcbiAgICAgICAgaWYgKHJlcXVlc3Qub3B0aW9ucy5kYXRhLmRhdGEucmVzcG9uc2UpXG4gICAgICAgICAgcGFyc2VkUmVzcG9uc2UgPSBwYXJzZVJlcXVlc3QocmVxdWVzdC5vcHRpb25zLmRhdGEuZGF0YS5yZXNwb25zZSk7XG4gICAgICAgIGlmIChwYXJzZWRSZXNwb25zZSkge1xuICAgICAgICAgIHBhcnNlZFJlc3BvbnNlU3RhdHVzS2V5ID0gcGFyc2VkUmVzcG9uc2VbMF0ua2V5O1xuICAgICAgICAgIHBhcnNlZFJlc3BvbnNlU3RhdHVzVmFsdWUgPSBwYXJzZWRSZXNwb25zZVswXS52YWx1ZTtcbiAgICAgICAgICBwYXJzZWRSZXNwb25zZURhdGEgPSBwYXJzZWRSZXNwb25zZVsxXS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyc2VkUmVxdWVzdEJvZHkgfHwgcGFyc2VkUmVzcG9uc2VEYXRhKSB7XG5cbiAgICAgICAgICBpZiAoYXdhaXQgY2hlY2tFbmRwb2ludChnZXRFbmRwb2ludChyZXF1ZXN0VXJsKSwgcGFyc2VkUmVxdWVzdEJvZHksIHBhcnNlZFJlc3BvbnNlRGF0YSwgcmVxdWVzdD8ub3B0aW9ucz8uZGF0YT8uZGF0YT8uaGVhZGVycykpIHtcbiAgICAgICAgICAgIGJyb3dzZXIudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9LCBmdW5jdGlvbiAodGFicykge1xuICAgICAgICAgICAgICBpZiAodGFicy5sZW5ndGggPiAwICYmIHRhYnNbMF0uaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGJyb3dzZXIudGFicy5zZW5kTWVzc2FnZSh0YWJzWzBdLmlkLCB7IGFjdGlvbjogXCJzaG93RGlhbG9nXCIsIHVybDogcmVxdWVzdFVybCwgXCJtZXRob2RcIjogcmVxdWVzdC5vcHRpb25zLmRhdGEuZGF0YS5tZXRob2QsIHJlcXVlc3Q6IHBhcnNlZFJlcXVlc3RCb2R5LCByZXNwb25zZTogcGFyc2VkUmVzcG9uc2VEYXRhLCBoZWFkZXJzOiByZXF1ZXN0Py5vcHRpb25zPy5kYXRhPy5kYXRhPy5oZWFkZXJzLCBwYXJhbXM6IHJlcXVlc3Q/Lm9wdGlvbnM/LmRhdGE/LmRhdGE/LnBhcmFtcyB9LFxuICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChicm93c2VyLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHNlbmRpbmcgbWVzc2FnZTpcIiwgYnJvd3Nlci5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBhY3RpdmUgdGFiIGZvdW5kIG9yIHRhYiBJRCBpcyB1bmRlZmluZWQuXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdC50eXBlID09IFwiZW5kUG9pbnRGb3JtU3VibWl0dGVkXCIpIHtcbiAgICAgIGFkZEVuZHBvaW50VG9EQihyZXF1ZXN0LmRhdGEubWV0aG9kLCByZXF1ZXN0LmRhdGEucmVxdWVzdCwgcmVxdWVzdC5kYXRhLnJlc3BvbnNlLCByZXF1ZXN0LmRhdGEudXJsLCByZXF1ZXN0LmRhdGEuaGVhZGVycywgcmVxdWVzdC5kYXRhLnBhcmFtcylcbiAgICB9XG4gIH0pO1xufSk7XG5cblxuYXN5bmMgZnVuY3Rpb24gYWRkRW5kcG9pbnRUb0RCKG1ldGhvZDogc3RyaW5nLCByZXF1ZXN0OiBhbnksIHJlc3BvbnNlOiBhbnksIHVybDogc3RyaW5nLCBoZWFkZXJzOiBhbnksIHBhcmFtczogYW55KSB7XG4gIHRyeSB7XG5cblxuICAgIGJyb3dzZXIudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9LCBmdW5jdGlvbiAodGFicykge1xuICAgICAgaWYgKHRhYnMubGVuZ3RoID4gMCAmJiB0YWJzWzBdLmlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYnJvd3Nlci50YWJzLnNlbmRNZXNzYWdlKHRhYnNbMF0uaWQsIHsgYWN0aW9uOiBcInNob3dMb2FkaW5nYmFyXCIgfSxcbiAgICAgICAgICBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChicm93c2VyLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzZW5kaW5nIG1lc3NhZ2U6XCIsIGJyb3dzZXIucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIGFjdGl2ZSB0YWIgZm91bmQgb3IgdGFiIElEIGlzIHVuZGVmaW5lZC5cIik7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIGNvbnNvbGUubG9nKFwiQWRkaW5nIGVuZHBvaW50OlwiLCB7IG1ldGhvZCwgcmVxdWVzdCwgcmVzcG9uc2UsIGhlYWRlcnMsIHVybCB9KTtcbiAgICBjb25zdCB3ZWJzaXRlSWQgPSBhd2FpdCBzdG9yYWdlLmdldEl0ZW0oXCJsb2NhbDp3ZWJzaXRlLWlkXCIpO1xuICAgIGNvbnN0IHVzZXJUb2tlbiA9IGF3YWl0IHN0b3JhZ2UuZ2V0SXRlbShcImxvY2FsOnVzZXJUb2tlblwiKTtcbiAgICBpZiAoIXdlYnNpdGVJZCB8fCAhdXNlclRva2VuKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiV2Vic2l0ZSBJRCBvciBVc2VyIFRva2VuIGlzIG1pc3NpbmcuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB1cmxQYXJzZWQgPSBnZXRFbmRwb2ludCh1cmwpO1xuICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICB3ZWJzaXRlSWQsXG4gICAgICB1cmw6IHVybFBhcnNlZCxcbiAgICAgIG1ldGhvZCxcbiAgICAgIGhlYWRlcnMsXG4gICAgICByZXF1ZXN0Qm9keTogcmVxdWVzdCB8fCBudWxsLFxuICAgICAgcmVzcG9uc2U6IHJlc3BvbnNlIHx8IG51bGwsXG4gICAgICBwYXJhbXM6IHBhcmFtcyB8fCBudWxsXG4gICAgfTtcbiAgICBjb25zdCByZXNwb25zZUZyb21TZXJ2ZXIgPSBhd2FpdCBmZXRjaChcImh0dHBzOi8vYXBpLWRvY3VtZW50YXRpb24tZXh0ZW5zaW9uLm9ucmVuZGVyLmNvbS9hcGkvd2Vic2l0ZS9hZGQtZW5kcG9pbnRcIiwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt1c2VyVG9rZW59YFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXNwb25zZUZyb21TZXJ2ZXIuanNvbigpO1xuXG4gICAgaWYgKHJlc3BvbnNlRnJvbVNlcnZlci5vaykge1xuICAgICAgY29uc29sZS5sb2coXCJFbmRwb2ludCBhZGRlZCBzdWNjZXNzZnVsbHk6XCIsIHJlc3VsdCk7XG4gICAgICBzdG9yYWdlLnNldEl0ZW0oXCJsb2NhbDpkZWZpbmVkVXJsc1wiLCByZXNwb25zZS5kYXRhLmVuZHBvaW50cyA/IHJlc3BvbnNlLmRhdGEuZW5kcG9pbnRzIDogW10pXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gYWRkIGVuZHBvaW50OlwiLCByZXN1bHQubWVzc2FnZSB8fCBcIlVua25vd24gZXJyb3JcIik7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBhZGRpbmcgZW5kcG9pbnQgdG8gZGF0YWJhc2U6XCIsIGVycm9yKTtcbiAgfVxuICBmaW5hbGx5IHtcbiAgICBicm93c2VyLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSwgZnVuY3Rpb24gKHRhYnMpIHtcbiAgICAgIGlmICh0YWJzLmxlbmd0aCA+IDAgJiYgdGFic1swXS5pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGJyb3dzZXIudGFicy5zZW5kTWVzc2FnZSh0YWJzWzBdLmlkLCB7IGFjdGlvbjogXCJoaWRlTG9hZGluZ2JhclwiIH0sXG4gICAgICAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAoYnJvd3Nlci5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3Igc2VuZGluZyBtZXNzYWdlOlwiLCBicm93c2VyLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBhY3RpdmUgdGFiIGZvdW5kIG9yIHRhYiBJRCBpcyB1bmRlZmluZWQuXCIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gY2hlY2tFbmRwb2ludChlbmRQb2ludDogc3RyaW5nIHwgbnVsbCwgcmVxOiBhbnksIHJlczogYW55LCBoZWFkZXJzOiBhbnkpIHtcbiAgaWYgKGVuZFBvaW50KSB7XG4gICAgbGV0IHZhbHVlID0gYXdhaXQgc3RvcmFnZS5nZXRJdGVtKFwibG9jYWw6ZGVmaW5lZFVybHNcIik7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsdWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiBpdGVtICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGl0ZW0udXJsID09PSBlbmRQb2ludCkge1xuICAgICAgICAgICAgY29uc3QgaXNSZXFFcXVhbCA9IChpdGVtLnJlcXVlc3RCb2R5ID09PSBudWxsICYmIHJlcSA9PT0gbnVsbCkgfHwgSlNPTi5zdHJpbmdpZnkoaXRlbS5yZXF1ZXN0Qm9keSkgPT09IEpTT04uc3RyaW5naWZ5KHJlcSk7XG4gICAgICAgICAgICBjb25zdCBpc1Jlc0VxdWFsID0gKGl0ZW0ucmVzcG9uc2UgPT09IG51bGwgJiYgcmVzID09PSBudWxsKSB8fFxuICAgICAgICAgICAgICAoaXRlbS5yZXNwb25zZT8uY29uc3RydWN0b3IgPT09IEFycmF5ICYmIHJlcz8uY29uc3RydWN0b3IgPT09IEFycmF5ICYmIGFyZUFycmF5c09mT2JqZWN0c0VxdWFsKGl0ZW0ucmVzcG9uc2UsIHJlcykpIHx8XG4gICAgICAgICAgICAgIChpdGVtLnJlc3BvbnNlPy5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0ICYmIHJlcz8uY29uc3RydWN0b3IgPT09IE9iamVjdCAmJiBhcmVPYmplY3RzRXF1YWwoaXRlbS5yZXNwb25zZSwgcmVzKSk7XG4gICAgICAgICAgICBjb25zdCBpc0hlYWRlcnNFcXVhbCA9IChpdGVtLmhlYWRlcnMgPT09IG51bGwgJiYgaGVhZGVycyA9PT0gbnVsbCkgfHwgSlNPTi5zdHJpbmdpZnkoaXRlbS5oZWFkZXJzKSA9PT0gSlNPTi5zdHJpbmdpZnkoaGVhZGVycyk7XG4gICAgICAgICAgICBpZiAoaXNSZXFFcXVhbCAmJiBpc1Jlc0VxdWFsICYmIGlzSGVhZGVyc0VxdWFsKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIGFyZU9iamVjdHNFcXVhbChvYmoxOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LCBvYmoyOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogYm9vbGVhbiB7XG4gIGNvbnNvbGUubG9nKFwiY2hlY2tpbmcgb2JqZWN0c1wiKTtcbiAgY29uc3Qga2V5czEgPSBPYmplY3Qua2V5cyhvYmoxKS5zb3J0KCk7XG4gIGNvbnN0IGtleXMyID0gT2JqZWN0LmtleXMob2JqMikuc29ydCgpO1xuXG4gIGlmIChrZXlzMS5sZW5ndGggIT09IGtleXMyLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gIGZvciAobGV0IGtleSBvZiBrZXlzMSkge1xuICAgIGlmIChvYmoxW2tleV0gIT09IG9iajJba2V5XSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGFyZUFycmF5c09mT2JqZWN0c0VxdWFsPFQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBhbnk+PihhcnIxOiBUW10sIGFycjI6IFRbXSk6IGJvb2xlYW4ge1xuICBpZiAoYXJyMS5sZW5ndGggIT09IGFycjIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGdldE9iamVjdFNpZ25hdHVyZSA9IChvYmo6IFQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcbiAgICAgIE9iamVjdC5rZXlzKG9iailcbiAgICAgICAgLnNvcnQoKVxuICAgICAgICAucmVkdWNlKChhY2M6IFJlY29yZDxzdHJpbmcsIGFueT4sIGtleTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgYWNjW2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSlcbiAgICApO1xuICB9O1xuICBjb25zdCBzaWduYXR1cmVzMSA9IGFycjEubWFwKGdldE9iamVjdFNpZ25hdHVyZSkuc29ydCgpO1xuICBjb25zdCBzaWduYXR1cmVzMiA9IGFycjIubWFwKGdldE9iamVjdFNpZ25hdHVyZSkuc29ydCgpO1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoc2lnbmF0dXJlczEpID09PSBKU09OLnN0cmluZ2lmeShzaWduYXR1cmVzMik7XG59XG5cblxuZnVuY3Rpb24gZ2V0RW5kcG9pbnQodXJsOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSBuZXcgVVJMKHVybCk7XG4gICAgcmV0dXJuIHBhcnNlZFVybC5wYXRobmFtZSArIHBhcnNlZFVybC5zZWFyY2g7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkludmFsaWQgVVJMOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBwYXJzZVJlcXVlc3QocmVxdWVzdEJvZHk6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZE9iamVjdCA9IEpTT04ucGFyc2UocmVxdWVzdEJvZHkpO1xuICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5lbnRyaWVzKHBhcnNlZE9iamVjdCkubWFwKChba2V5LCB2YWx1ZV0pID0+ICh7XG4gICAgICBrZXksXG4gICAgICB2YWx1ZSxcbiAgICAgIHR5cGU6IHR5cGVvZiB2YWx1ZSxcbiAgICB9KSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHBhcnNlIEpTT046XCIsIGVycm9yKTtcbiAgICByZXR1cm4gW107XG4gIH1cbn0iXSwibmFtZXMiOlsiYnJvd3NlciIsInJlc3VsdCIsIl9hIiwiX2MiLCJfYiIsIl9kIiwiX2YiLCJfZSIsInJlc3BvbnNlIl0sIm1hcHBpbmdzIjoiOzs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUs7QUFDbEUsV0FBTztBQUFBLEVBQ1Q7QUNGQSxNQUFJLGdCQUFnQixNQUFNO0FBQUEsSUFDeEIsWUFBWSxjQUFjO0FBQ3hCLFVBQUksaUJBQWlCLGNBQWM7QUFDakMsYUFBSyxZQUFZO0FBQ2pCLGFBQUssa0JBQWtCLENBQUMsR0FBRyxjQUFjLFNBQVM7QUFDbEQsYUFBSyxnQkFBZ0I7QUFDckIsYUFBSyxnQkFBZ0I7QUFBQSxNQUMzQixPQUFXO0FBQ0wsY0FBTSxTQUFTLHVCQUF1QixLQUFLLFlBQVk7QUFDdkQsWUFBSSxVQUFVO0FBQ1osZ0JBQU0sSUFBSSxvQkFBb0IsY0FBYyxrQkFBa0I7QUFDaEUsY0FBTSxDQUFDLEdBQUcsVUFBVSxVQUFVLFFBQVEsSUFBSTtBQUMxQyx5QkFBaUIsY0FBYyxRQUFRO0FBQ3ZDLHlCQUFpQixjQUFjLFFBQVE7QUFFdkMsYUFBSyxrQkFBa0IsYUFBYSxNQUFNLENBQUMsUUFBUSxPQUFPLElBQUksQ0FBQyxRQUFRO0FBQ3ZFLGFBQUssZ0JBQWdCO0FBQ3JCLGFBQUssZ0JBQWdCO0FBQUEsTUFDM0I7QUFBQSxJQUNBO0FBQUEs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
