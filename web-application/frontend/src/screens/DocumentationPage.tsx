import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { notifyError } from '../utils/Utils';
import Header from '../components/Header';

interface Endpoint {
  url: string;
  method: string;
  headers: Record<string, string>;
  params?: Record<string, any>;
  requestBody?: Array<{ key: string; value: any }>;
  response?: any;
}

const DocumentationPage: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const websiteName = location.state?.websiteName;

  useEffect(() => {
    const fetchEndpoints = async () => {
      const token = localStorage.getItem('documentation-token');
      if (!token) {
        notifyError('You are not authorized!');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get('https://api-documentation-extension.onrender.com/api/website/get-website-endpoints', {
          params: { id: websiteId },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200) {
          setEndpoints(response.data.endpoints || []);
        } else {
          setError('Failed to load endpoints.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.message || 'Failed to load endpoints.');
      } finally {
        setLoading(false);
      }
    };

    if (websiteId) {
      fetchEndpoints();
    } else {
      setError('Invalid website ID.');
    }
  }, [websiteId, navigate]);


  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Header />

      {/* Content */}
      <div className="container mx-auto py-10 px-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">{websiteName}</h1>
        {loading && <p className="text-center text-gray-500">Loading...</p>}
        {error && <p className="text-red-500 text-center">{error}</p>}
        {endpoints.length > 0 ? (
          <>
            <ul className="space-y-6">
              {endpoints.map((endpoint, index) => (
                <li key={index} className="border border-gray-300 rounded-lg shadow-md overflow-auto max-h-[500px]">
                  {/* Header */}
                  <div className="bg-blue-100 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-blue-800 truncate">{endpoint.url}</h2>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold ${
                        endpoint.method === 'GET'
                          ? 'bg-green-500'
                          : endpoint.method === 'POST'
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 bg-white">
                    {/* Headers */}
                    <div className="mb-4">
                      <strong className="text-gray-700 block mb-2">Headers:</strong>
                      {Object.keys(endpoint.headers).length > 0 ? (
                        <ul className="space-y-1">
                          {Object.entries(endpoint.headers).map(([key, value], i) => (
                            <li
                              key={i}
                              className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-800"
                            >
                              <strong>{key}:</strong> {value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500">No headers provided</span>
                      )}
                    </div>

                    {/* Query Params */}
                    <div className="mb-4">
                      <strong className="text-gray-700 block mb-2">Query Params:</strong>
                      <pre className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-800">
                        {endpoint.params ? JSON.stringify(endpoint.params, null, 2) : 'N/A'}
                      </pre>
                    </div>

                    {/* Request Body */}
                    <div className="mb-4">
                      <strong className="text-gray-700 block mb-2">Request Body:</strong>
                      {Array.isArray(endpoint.requestBody) && endpoint.requestBody.length > 0 ? (
                        <pre className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-800">
                          {endpoint.requestBody
                            .map((item) => `  "${item.key}": ${JSON.stringify(item.value)}`)
                            .join(',\n')}
                        </pre>
                      ) : (
                        <pre className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-800">N/A</pre>
                      )}
                    </div>

                    {/* Response */}
                    <div>
                      <strong className="text-gray-700 block mb-2">Response:</strong>
                      <pre className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-800">
                        {endpoint.response ? JSON.stringify(endpoint.response, null, 2) : 'N/A'}
                      </pre>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          !loading && <p className="text-gray-500 text-center">No endpoints available for this website.</p>
        )}
      </div>
    </div>
  );
};

export default DocumentationPage;
