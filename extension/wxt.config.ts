import { defineConfig } from 'wxt';
import { CONTENT_SCRIPT_MATCHES } from "./utils/Matches";
// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ["activeTab", "scripting", "tabs", "storage"],
    action: {},
    host_permissions:[CONTENT_SCRIPT_MATCHES],
    web_accessible_resources: [
      {
        resources: ["script.js"],
        matches: [CONTENT_SCRIPT_MATCHES],
      },
    ],
  },
  runner: {
    startUrls: ["http://localhost:5173"],
  },
});
