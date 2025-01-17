interface InterceptedXHR extends XMLHttpRequest {
  _requestMethod?: string;
  _requestUrl?: string | URL;
  _queryParams?: Record<string, string>;
}

const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;
const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
const requestHeaders: Record<string, string> = {};
XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string) {
  requestHeaders[header] = value;
  return originalXhrSetRequestHeader.call(this, header, value);
};

XMLHttpRequest.prototype.open = function (
  this: InterceptedXHR,
  method: string,
  url: string | URL,
  async: boolean = true,
  username?: string | null,
  password?: string | null
) {
  this._requestMethod = method;
  this._requestUrl = url;

  // Extract query parameters if present
  const urlString = typeof url === 'string' ? url : url.toString();
  const urlObj = new URL(urlString, window.location.origin); 
  this._queryParams = Object.fromEntries(urlObj.searchParams.entries());
  urlObj.search = '';
  this._requestUrl = urlObj.toString();
  return originalXhrOpen.call(this, method, url, async, username, password);
};

XMLHttpRequest.prototype.send = function (
  this: InterceptedXHR,
  body?: Document | XMLHttpRequestBodyInit | null
) {
  const requestBody = body;

  this.addEventListener('readystatechange', function (this: InterceptedXHR) {
    if (this.readyState === 4) {
      window.postMessage(
        {
          type: 'xhr-intercepted',
          data: {
            method: this._requestMethod,
            url: this._requestUrl,
            requestBody: requestBody,
            response: this.responseText,
            headers: requestHeaders,
            params: this._queryParams
          },
        },
        '*'
      );
    }
  });

  return originalXhrSend.call(this, body);
};

console.log('XHR interceptor script injected and running.');
