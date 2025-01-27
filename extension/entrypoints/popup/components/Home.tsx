import axios from 'axios';
import React, { useState, useEffect } from 'react';
import LoadingBar from './Loadingbar';

interface Endpoint {
  url: string;
  method: string;
  headers: Record<string, string>;
  requestBody: any | null;
  response: any | null;
  params: any | null;
}


const Home: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [websites, setWebsites] = useState<{ _id: string; websiteName: string, createdByUser: string }[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);
  const [selectedWebsiteName, setSelectedWebsiteName] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);


  const getWebsites = async () => {
    const userFromStorage = localStorage.getItem('documentation-user');
    if (userFromStorage) {
      setUser(userFromStorage);
      setSelectedWebsite(JSON.parse(userFromStorage)["selected-website-id"]);
      setSelectedWebsiteName(JSON.parse(userFromStorage)["selected-website-name"]);
      setLoading(true);
      const userParsed = JSON.parse(userFromStorage);
      const token = userParsed.data.token;
      const userId = userParsed.data.id;
      try {
        const response = await axios.get('https://api-documentation-extension.onrender.com/api/website/get-user-websites', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            userId: userId,
          },
        });
        if (response.status === 200) {
          setWebsites(response.data.websites);
          if (JSON.parse(userFromStorage)["selected-website-id"] && JSON.parse(userFromStorage)["selected-website-name"])
            await selectWebsite(JSON.parse(userFromStorage)["selected-website-id"], JSON.parse(userFromStorage)["selected-website-name"], userFromStorage);
        }
      } catch (err: any) {
        console.log(err)
        console.error(err?.response?.data);
        setError(err?.response?.data?.message || 'Failed to load websites');
      } finally {
        setLoading(false);
      }
    }
  };

  const selectWebsite = async (websiteId: string, websiteName: string, userFromStorage: string | null) => {
    if (userFromStorage) {
      console.log("selecting website urls");
      setLoading(true);
      const userParsed = JSON.parse(userFromStorage);
      const token = userParsed.data.token;
      const userId = userParsed.data.id;
      setLoading(true);
      try {
        const response = await axios.get(`https://api-documentation-extension.onrender.com/api/website/get-website-endpoints`, {
          params: {
            id: websiteId
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.status == 200) {
          console.log(response.data.endpoints)
          const userParsed = JSON.parse(userFromStorage);
          const updatedData = {
            ...userParsed,
            "selected-website-id": websiteId,
            "selected-website-name": websiteName,
            "selected-website-endpoints": response.data.endpoints ? response.data.endpoints : []
          };
          await storage.setItem("local:definedUrls", response.data.endpoints ? response.data.endpoints : []);
          await storage.setItem("local:website-id", websiteId);
          await storage.setItem("local:userToken", token);
          localStorage.setItem("documentation-user", JSON.stringify(updatedData));
          setSelectedWebsite(websiteId);
          setError(null);
          setSelectedWebsiteName(websiteName);
          setEndpoints(response.data.endpoints);
          setUser(localStorage.getItem('documentation-user'));
          console.log(localStorage.getItem("documentation-user"));
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load endpoints');
      } finally {
        setLoading(false);
      }
    }
  };

  const createWebsite = async (name: string) => {
    if (user) {
      const userParsed = JSON.parse(user);
      const token = userParsed.data.token;
      const userId = userParsed.data.id;
      setLoading(true);
      try {
        const response = await axios.post('https://api-documentation-extension.onrender.com/api/website/create-website', {
          websiteName: name,
          userId: userId
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.status == 201) {
          console.log(response);
          getWebsites();
        }
      } catch (err) {
        setError('Please Enter Valid Token');
      }
      finally {
        setLoading(false);
      }
    }
    setModalVisible(false);
  };

  useEffect(() => {
    getWebsites();
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'closePopup') {
        window.close();
      }
    });    
  }, []);

  return (
    <>
      {loading && <LoadingBar />}
      <div className="h-[600px] w-[600px] relative bg-gray-900 text-white">
        <button
          onClick={() => setSidebarVisible(true)}
          className="absolute top-4 left-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 z-10"
        >
          Websites
        </button>
        {sidebarVisible && (
          <div className="fixed top-0 left-0 h-full w-64 bg-gray-800 text-white p-4 shadow-lg z-20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Websites</h3>
              <button
                onClick={() => setSidebarVisible(false)}
                className="text-white bg-red-500 px-2 py-1 rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
            <ul className="space-y-6">
              {websites.map((website) => (
                <li key={website._id}>
                  <button
                    onClick={() => selectWebsite(website._id, website.websiteName, user)}
                    className={`w-full text-left px-4 py-2 rounded-md ${selectedWebsite === website._id ? 'bg-indigo-500' : 'bg-gray-700'
                      } hover:bg-indigo-600`}
                  >
                    {website.websiteName}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setModalVisible(true)}
              className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              Create Website
            </button>
          </div>
        )}

        <div className="h-full p-8 overflow-auto">
          {error ? (
            <h1 className="text-2xl font-bold mt-10 text-center text-red-500">{error}</h1>
          ) : selectedWebsite ? (
            <>
              <h1 className="text-2xl font-bold mb-4 mt-10 mx-auto text-center underline">
                Selected Website: {selectedWebsiteName}
              </h1>
              <h1 className="text-2xl font-bold mb-4 mt-10">Endpoints</h1>
              {endpoints.length > 0 ? (
                <ul className="space-y-2 pb-6">
                  {endpoints.map((endpoint, index) => (
                    <li key={index} className="p-6 bg-gray-800 flex flex-col rounded-lg shadow-md mb-6 max-h-[400px] overflow-scroll">
                      {endpoint.method === "POST" && 
                      <button
                        className="ml-auto w-max bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none"
                        aria-label="Apply"
                        onClick={(e)=>{
                          e.preventDefault();
                          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (tabs.length > 0 && tabs[0].id !== undefined) {
                              chrome.tabs.sendMessage(tabs[0].id, { action: "applyData", data: JSON.stringify(endpoint.requestBody) },
                                function (response) {
                                  if (browser.runtime.lastError) {
                                    console.error("Error sending message:", browser.runtime.lastError);
                                  }
                                });
                            } else {
                              console.error("No active tab found or tab ID is undefined.");
                            }
                          });
                        }}
                      >
                        Apply
                      </button>}
                      <div className="mb-4">
                        <strong className="text-gray-400 block text-xl">URL:</strong>
                        <code className="block bg-gray-700 p-2 rounded text-sm text-gray-300">{endpoint.url}</code>
                      </div>
                      <div className="mb-4">
                        <strong className="text-gray-400 block">Method:</strong>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold ${endpoint.method === "GET" ? "bg-green-500" : endpoint.method === "POST" ? "bg-blue-500" : "bg-yellow-500"
                            }`}
                        >
                          {endpoint.method}
                        </span>
                      </div>
                      <div className="mb-4">
                        <strong className="text-gray-400 block">Headers:</strong>
                        {Object.keys(endpoint.headers).length > 0 ? (
                          <ul className="mt-2">
                            {Object.entries(endpoint.headers).map(([key, value], i) => (
                              <pre className="bg-gray-700 p-2 rounded text-sm text-gray-300" key={i}>
                                <strong>{key}:</strong> {value}
                              </pre>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-gray-500">No headers provided</span>
                        )}
                      </div>
                      <div className="mb-4">
                        <strong className="text-gray-400 block">Query Params:</strong>
                        <pre className="bg-gray-700 p-2 rounded text-sm text-gray-300">
                          {endpoint.params ? JSON.stringify(endpoint.params, null, 2) : "N/A"}
                        </pre>
                      </div>
                      <div className="mb-4">
                        <strong className="text-gray-400 block">Request Body:</strong>
                        {Array.isArray(endpoint.requestBody) && endpoint.requestBody.length > 0 ? (
                          <pre className="bg-gray-700 p-2 rounded text-sm text-gray-300">
                            {endpoint.requestBody
                              .map((item) => `  "${item.key}": ${JSON.stringify(item.value)}`)
                              .join(",\n")}
                          </pre>
                        ) : (
                          <pre className="bg-gray-700 p-2 rounded text-sm text-gray-300">N/A</pre>
                        )}
                      </div>
                      <div className="mb-4">
                        <strong className="text-gray-400 block">Response:</strong>
                        <pre className="bg-gray-700 p-2 rounded text-sm text-gray-300">
                          {endpoint.response ? JSON.stringify(endpoint.response, null, 2) : "N/A"}
                        </pre>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No endpoints available for this website.</p>
              )}
            </>
          ) : (
            <div className="text-center h-full flex flex-col items-center justify-center">
              <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-600 animate-gradient">
                Welcome to API Documentation
              </h1>
              <h2 className="text-2xl font-semibold mt-4 text-gray-300">
                Select a website to view its endpoints
              </h2>
            </div>


          )}
        </div>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-white">
            <h2 className="text-2xl font-bold mb-4">Create New Website</h2>
            <input
              type="text"
              placeholder="Website Name"
              className="w-full p-3 border border-gray-600 rounded-md mb-4 bg-gray-900 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  createWebsite(e.currentTarget.value.trim());
                }
              }}
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setModalVisible(false)}
                className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input');
                  if (input?.value.trim()) {
                    createWebsite(input.value.trim());
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

};

export default Home;
