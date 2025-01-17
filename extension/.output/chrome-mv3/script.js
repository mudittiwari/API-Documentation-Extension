var script = function() {
  "use strict";
  function defineUnlistedScript(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const definition = defineUnlistedScript(() => {
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const requestHeaders = {};
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      requestHeaders[header] = value;
      return originalXhrSetRequestHeader.call(this, header, value);
    };
    XMLHttpRequest.prototype.open = function(method, url, async = true, username, password) {
      this.addEventListener("readystatechange", function() {
        if (this.readyState === 4) {
          const event = new CustomEvent("xhr-intercepted", { detail: { url: this.responseURL, response: this.responseText, headers: requestHeaders } });
          console.log(this.response);
          document.dispatchEvent(event);
        }
      });
      return originalXhrOpen.call(this, method, url, async, username, password);
    };
    console.log("XHR interceptor script with response modification injected.");
  });
  script;
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
  const result = (async () => {
    try {
      initPlugins();
      return await definition.main();
    } catch (err) {
      logger.error(
        `The unlisted script "${"script"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
script;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3Qvc2FuZGJveC9kZWZpbmUtdW5saXN0ZWQtc2NyaXB0Lm1qcyIsIi4uLy4uL2VudHJ5cG9pbnRzL3NjcmlwdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lVW5saXN0ZWRTY3JpcHQoYXJnKSB7XG4gIGlmIChhcmcgPT0gbnVsbCB8fCB0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB7IG1haW46IGFyZyB9O1xuICByZXR1cm4gYXJnO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lVW5saXN0ZWRTY3JpcHQoKCkgPT4ge1xuXG4gICAgY29uc3Qgb3JpZ2luYWxYaHJPcGVuID0gWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW47XG4gICAgY29uc3Qgb3JpZ2luYWxYaHJTZXRSZXF1ZXN0SGVhZGVyID0gWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnNldFJlcXVlc3RIZWFkZXI7XG4gICAgY29uc3QgcmVxdWVzdEhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuc2V0UmVxdWVzdEhlYWRlciA9IGZ1bmN0aW9uIChoZWFkZXI6IHN0cmluZywgdmFsdWU6IHN0cmluZykge1xuICAgICAgICByZXF1ZXN0SGVhZGVyc1toZWFkZXJdID0gdmFsdWU7ICAvLyBTdG9yZSB0aGUgaGVhZGVyIGFuZCBpdHMgdmFsdWVcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsWGhyU2V0UmVxdWVzdEhlYWRlci5jYWxsKHRoaXMsIGhlYWRlciwgdmFsdWUpO1xuICAgIH07XG4gICAgWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWV0aG9kOiBzdHJpbmcsIHVybDogc3RyaW5nIHwgVVJMLCBhc3luYzogYm9vbGVhbiA9IHRydWUsIHVzZXJuYW1lPzogc3RyaW5nIHwgbnVsbCwgcGFzc3dvcmQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgneGhyLWludGVyY2VwdGVkJywgeyBkZXRhaWw6IHsgdXJsOiB0aGlzLnJlc3BvbnNlVVJMLCByZXNwb25zZTogdGhpcy5yZXNwb25zZVRleHQsIGhlYWRlcnM6IHJlcXVlc3RIZWFkZXJzIH0gfSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5yZXNwb25zZSlcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFhock9wZW4uY2FsbCh0aGlzLCBtZXRob2QsIHVybCwgYXN5bmMsIHVzZXJuYW1lLCBwYXNzd29yZCk7XG4gICAgfTtcbiAgICBjb25zb2xlLmxvZygnWEhSIGludGVyY2VwdG9yIHNjcmlwdCB3aXRoIHJlc3BvbnNlIG1vZGlmaWNhdGlvbiBpbmplY3RlZC4nKTtcbn0pO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQU8sV0FBUyxxQkFBcUIsS0FBSztBQUN4QyxRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFLO0FBQ2xFLFdBQU87QUFBQSxFQUNUO0FDSGUsUUFBQSxhQUFBLHFCQUFxQixNQUFNO0FBRWhDLFVBQUEsa0JBQWtCLGVBQWUsVUFBVTtBQUMzQyxVQUFBLDhCQUE4QixlQUFlLFVBQVU7QUFDN0QsVUFBTSxpQkFBeUMsQ0FBQztBQUNoRCxtQkFBZSxVQUFVLG1CQUFtQixTQUFVLFFBQWdCLE9BQWU7QUFDakYscUJBQWUsTUFBTSxJQUFJO0FBQ3pCLGFBQU8sNEJBQTRCLEtBQUssTUFBTSxRQUFRLEtBQUs7QUFBQSxJQUMvRDtBQUNlLG1CQUFBLFVBQVUsT0FBTyxTQUFVLFFBQWdCLEtBQW1CLFFBQWlCLE1BQU0sVUFBMEIsVUFBMEI7QUFDL0ksV0FBQSxpQkFBaUIsb0JBQW9CLFdBQVk7QUFDOUMsWUFBQSxLQUFLLGVBQWUsR0FBRztBQUN2QixnQkFBTSxRQUFRLElBQUksWUFBWSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsS0FBSyxLQUFLLGFBQWEsVUFBVSxLQUFLLGNBQWMsU0FBUyxlQUFBLEdBQWtCO0FBQ3BJLGtCQUFBLElBQUksS0FBSyxRQUFRO0FBQ3pCLG1CQUFTLGNBQWMsS0FBSztBQUFBLFFBQUE7QUFBQSxNQUNoQyxDQUNIO0FBQ0QsYUFBTyxnQkFBZ0IsS0FBSyxNQUFNLFFBQVEsS0FBSyxPQUFPLFVBQVUsUUFBUTtBQUFBLElBQzVFO0FBQ0EsWUFBUSxJQUFJLDZEQUE2RDtBQUFBLEVBQzdFLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXX0=
