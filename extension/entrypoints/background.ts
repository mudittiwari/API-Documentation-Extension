import { CONTENT_SCRIPT_MATCHES } from "@/utils/Matches";

const contentMatch = new MatchPattern(CONTENT_SCRIPT_MATCHES);

export default defineBackground(async () => {
  browser.runtime.onMessage.addListener(async function (request, sender) {
    if (request.type === "apiReqRes") {
      const websiteId = await storage.getItem("local:website-id");
      const userToken = await storage.getItem("local:userToken");
      if (websiteId && userToken) {
        const requestUrl = request?.options?.data?.data?.url || "";
        if (requestUrl.includes("favicon.ico")) {
          console.log("Ignoring favicon request");
          return;
        }
        console.log(request);
        if (request.options.data.type != "xhr-intercepted" || (request.options.data.data.requestBody == null && request.options.data.data.response == null))
          return;
        console.log("Processing user-initiated request:", requestUrl);
        console.log(getEndpoint(requestUrl));
        let parsedRequestBody = null;
        let parsedResponse = null;
        let parsedResponseStatusKey = null;
        let parsedResponseStatusValue = null;
        let parsedResponseData = null;
        if (request.options.data.data.requestBody)
          parsedRequestBody = parseRequest(request.options.data.data.requestBody);
        if (request.options.data.data.response)
          parsedResponse = parseRequest(request.options.data.data.response);
        if (parsedResponse) {
          parsedResponseStatusKey = parsedResponse[0].key;
          parsedResponseStatusValue = parsedResponse[0].value;
          parsedResponseData = parsedResponse[1].value;
        }
        if (parsedRequestBody || parsedResponseData) {

          if (await checkEndpoint(getEndpoint(requestUrl), parsedRequestBody, parsedResponseData, request?.options?.data?.data?.headers)) {
            browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
              if (tabs.length > 0 && tabs[0].id !== undefined) {
                browser.tabs.sendMessage(tabs[0].id, { action: "showDialog", url: requestUrl, "method": request.options.data.data.method, request: parsedRequestBody, response: parsedResponseData, headers: request?.options?.data?.data?.headers, params: request?.options?.data?.data?.params },
                  function (response) {
                    if (browser.runtime.lastError) {
                      console.error("Error sending message:", browser.runtime.lastError);
                    }
                  });
              } else {
                console.error("No active tab found or tab ID is undefined.");
              }
            });
          }
        }
      }
    }

    if (request.type == "endPointFormSubmitted") {
      addEndpointToDB(request.data.method, request.data.request, request.data.response, request.data.url, request.data.headers, request.data.params)
    }
  });
});


async function addEndpointToDB(method: string, request: any, response: any, url: string, headers: any, params: any) {
  try {


    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        browser.tabs.sendMessage(tabs[0].id, { action: "showLoadingbar" },
          function (response) {
            if (browser.runtime.lastError) {
              console.error("Error sending message:", browser.runtime.lastError);
            }
          });
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
    const responseFromServer = await fetch("http://localhost:5000/api/website/add-endpoint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify(payload)
    });

    const result = await responseFromServer.json();

    if (responseFromServer.ok) {
      console.log("Endpoint added successfully:", result);
      storage.setItem("local:definedUrls", response.data.endpoints ? response.data.endpoints : [])
    } else {
      console.error("Failed to add endpoint:", result.message || "Unknown error");
    }
  } catch (error) {
    console.error("Error adding endpoint to database:", error);
  }
  finally{
    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        browser.tabs.sendMessage(tabs[0].id, { action: "hideLoadingbar" },
          function (response) {
            if (browser.runtime.lastError) {
              console.error("Error sending message:", browser.runtime.lastError);
            }
          });
      } else {
        console.error("No active tab found or tab ID is undefined.");
      }
    });
  }
}


async function checkEndpoint(endPoint: string | null, req: any, res: any, headers: any) {
  if (endPoint) {
    let value = await storage.getItem("local:definedUrls");
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          if (item.url === endPoint) {
            const isReqEqual = (item.requestBody === null && req === null) || JSON.stringify(item.requestBody) === JSON.stringify(req);
            const isResEqual = (item.response === null && res === null) ||
              (item.response?.constructor === Array && res?.constructor === Array && areArraysOfObjectsEqual(item.response, res)) ||
              (item.response?.constructor === Object && res?.constructor === Object && areObjectsEqual(item.response, res));
            const isHeadersEqual = (item.headers === null && headers === null) || JSON.stringify(item.headers) === JSON.stringify(headers);
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


function areObjectsEqual(obj1: Record<string, any>, obj2: Record<string, any>): boolean {
  console.log("checking objects");
  const keys1 = Object.keys(obj1).sort();
  const keys2 = Object.keys(obj2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

function areArraysOfObjectsEqual<T extends Record<string, any>>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) return false;
  const getObjectSignature = (obj: T): string => {
    return JSON.stringify(
      Object.keys(obj)
        .sort()
        .reduce((acc: Record<string, any>, key: string) => {
          acc[key] = obj[key];
          return acc;
        }, {})
    );
  };
  const signatures1 = arr1.map(getObjectSignature).sort();
  const signatures2 = arr2.map(getObjectSignature).sort();
  return JSON.stringify(signatures1) === JSON.stringify(signatures2);
}


function getEndpoint(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
}


function parseRequest(requestBody: string) {
  try {
    const parsedObject = JSON.parse(requestBody);
    const result = Object.entries(parsedObject).map(([key, value]) => ({
      key,
      value,
      type: typeof value,
    }));
    return result;
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return [];
  }
}