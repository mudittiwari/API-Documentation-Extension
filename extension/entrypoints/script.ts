export default defineUnlistedScript(() => {

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const requestHeaders: Record<string, string> = {};
    XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string) {
        requestHeaders[header] = value;  // Store the header and its value
        return originalXhrSetRequestHeader.call(this, header, value);
    };
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
        this.addEventListener('readystatechange', function () {
            if (this.readyState === 4) {
                const event = new CustomEvent('xhr-intercepted', { detail: { url: this.responseURL, response: this.responseText, headers: requestHeaders } });
                console.log(this.response)
                document.dispatchEvent(event);
            }
        });
        return originalXhrOpen.call(this, method, url, async, username, password);
    };
    console.log('XHR interceptor script with response modification injected.');
});
