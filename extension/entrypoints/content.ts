import { CONTENT_SCRIPT_MATCHES } from "@/utils/Matches";

export default defineContentScript({
  matches: [CONTENT_SCRIPT_MATCHES],
  async main(ctx) {
    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (event.data) {
        chrome.runtime.sendMessage({
          type: "apiReqRes", options: {
            data: event.data
          }
        });
      }
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "showDialog") {
        if (document.getElementById("custom-popup")) return;

        const popup = document.createElement("div");
        popup.id = "custom-popup";
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.zIndex = "10000";
        popup.style.background = "#fff";
        popup.style.border = "1px solid #ccc";
        popup.style.padding = "20px";
        popup.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
        popup.style.width = "300px";
    
        popup.innerHTML = `
            <h3 style="margin-bottom: 10px;color: #555;">New Endpoint Data Detected</h3>
            <p style="margin-bottom: 15px; font-size: 14px; color: #555;">URL: <strong>${message.url}</strong></p>
            <p style="margin-bottom: 15px; font-size: 14px; color: #555;">Method: <strong>${message.method}</strong></p>
            <form id="popup-form">
              <div style="text-align: right;">
                <button type="submit" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px;">Save</button>
                <button type="button" id="close-popup" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; margin-left: 10px;">Discard</button>
              </div>
            </form>
        `;
        document.body.appendChild(popup);
        document.getElementById("popup-form")?.addEventListener("submit", (e) => {
          e.preventDefault();
          console.log("Form Data:", { "url":message.url });
          chrome.runtime.sendMessage({ type: "endPointFormSubmitted", data: { "url":message.url,"method":message.method, request:message.request, response:message.response, headers:message.headers, params:message.params } });
          document.body.removeChild(popup);
        });
        document.getElementById("close-popup")?.addEventListener("click", () => {
          document.body.removeChild(popup);
        });
      }

      if(message.action === "showLoadingbar"){
        showLoadingBar();
      }
      if(message.action === "hideLoadingbar"){
        hideLoadingBar();
      }
      if(message.action === "applyData"){
        const parsedData = JSON.parse(message.data);
        parsedData.forEach((item: { key: string; value: any; type:any }) => {
          const inputElement = document.getElementById(item.key);
          if (inputElement && inputElement instanceof HTMLInputElement) {
            console.log("data injectin");
            (inputElement as HTMLInputElement).value = item.value;
          }
        });
        showMessagePopup("Data Injected Successfully");
        chrome.runtime.sendMessage({ action: 'closePopup' });
      }
    });
  },
});

const showMessagePopup = (message:string) => {
  if (document.getElementById("message-popup-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "message-popup-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0, 0, 0, 0.6)";
  overlay.style.zIndex = "10001";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  const popup = document.createElement("div");
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.zIndex = "10000";
  popup.style.background = "#fff";
  popup.style.border = "1px solid #ccc";
  popup.style.padding = "20px";
  popup.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
  popup.style.width = "300px";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.justifyContent = "center";
  popup.style.alignItems = "center";
  const messageText = document.createElement("p");
  messageText.textContent = message;
  messageText.style.marginBottom = "20px";
  messageText.style.color = "black";
  messageText.style.textAlign = "center";
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.padding = "10px 20px";
  closeButton.style.border = "none";
  closeButton.style.background = "#4CAF50";
  closeButton.style.color = "#fff";
  closeButton.style.borderRadius = "4px";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "16px";
  closeButton.style.width = "max-content";
  closeButton.onclick = () => {
    document.body.removeChild(overlay);
  };
  popup.appendChild(messageText);
  popup.appendChild(closeButton);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
};


const showLoadingBar = () => {
  if (document.getElementById("loading-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0, 0, 0, 0.6)";
  overlay.style.zIndex = "10001";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  const spinner = document.createElement("div");
  spinner.style.width = "50px";
  spinner.style.height = "50px";
  spinner.style.border = "5px solid #f3f3f3";
  spinner.style.borderTop = "5px solid #3498db";
  spinner.style.borderRadius = "50%";
  spinner.style.animation = "spin 1s linear infinite";

  overlay.appendChild(spinner);
  document.body.appendChild(overlay);
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

const hideLoadingBar = () => {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    document.body.removeChild(overlay);
  }
};