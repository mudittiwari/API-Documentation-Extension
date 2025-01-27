import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { notifyError, notifySuccess } from '../utils/Utils';
import LoadingBar from '../components/LoadingBar';

interface Website {
  _id: string;
  websiteName: string;
  createdAt: string;
}

const Home: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const fetchWebsites = async () => {
    const token = localStorage.getItem("documentation-token");
    const userId = localStorage.getItem("userId");
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/website/get-user-websites', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          userId: userId,
        },
      });
      if (response.status === 200) {
        setWebsites(response.data.websites);
      }
    } catch (err: any) {
      notifyError("Error fetching websites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("documentation-token");
    if (token) {
      setToken(token);
      fetchWebsites();
    }
    else {
      navigate("/login");
    }
  }, []);

  const handleCopyToClipboard = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token);
        notifySuccess("Token copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy token:", err);
        notifyError("Failed to copy token. Please try again.");
      }
    }
  };

  const deleteWebsite = async (websiteId: string) => {
    const userId = localStorage.getItem("userId");
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/website/delete-website', {
        websiteId: websiteId,
        userId: userId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status == 200) {
        console.log(response);
        notifySuccess("Website Deleted Successfully");
        fetchWebsites();
      }
    } catch (err) {
      notifyError("Some error occoured");
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      {loading && <LoadingBar />}
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto">
          <div className="flex items-center justify-center my-5">

            <h2 className="text-lg font-semibold text-center text-gray-800 mr-4">
              Your API Token
            </h2>
            <div className="flex items-center justify-between bg-gray-200 px-4 py-2 rounded-lg">
              <span className="text-gray-700 truncate max-w-xs">
                {"•".repeat(token?.length ?? 0)}
              </span>
              <button
                onClick={handleCopyToClipboard}
                className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
              >
                Copy
              </button>
            </div>
          </div>
          <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800 mt-10">Your Websites</h2>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="overflow-x-auto flex justify-center">
            <table className="w-[80%] bg-white border border-gray-300">
              <thead>
                <tr>
                  <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">Created At</th>
                  <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">Documentation</th>
                  <th className="px-6 py-3 border-b text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {websites.map((website) => (
                  <tr key={website._id}>
                    <td className="px-6 py-4 border-b border-r text-sm text-gray-800">{website.websiteName}</td>
                    <td className="px-6 py-4 border-b border-r text-sm text-gray-800">{new Date(website.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 border-b border-r text-sm text-blue-600 underline">
                      <a onClick={() => {
                        navigate(`/documentation/${website._id}`, {
                          state: { "websiteName": website.websiteName },
                        });
                      }} className='cursor-pointer'>View Documentation</a>
                    </td>
                    <td className='border-b flex justify-center py-4'>
                      <button
                        className="bg-red-500 px-2 py-1 rounded bg:text-red-700 text-white focus:outline-none"
                        onClick={(e) => {
                          e.preventDefault();
                          deleteWebsite(website._id);
                        }}
                        aria-label="Delete Website">
                        delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div >
    </>
  );
};

export default Home;