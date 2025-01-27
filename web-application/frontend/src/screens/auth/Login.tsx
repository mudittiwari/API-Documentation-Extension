import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LoadingBar from '../../components/LoadingBar';
import { notifyError, notifySuccess } from '../../utils/Utils';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(()=>{
    const token = localStorage.getItem("documentation-token");
    console.log(token)
    if (token && token.length > 0) {
      navigate("/");
    }
  },[])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await axios.post('https://api-documentation-extension.onrender.com/api/auth/login', formData);
      notifySuccess(response.data.message);
      console.log('Login response:', response.data);
      localStorage.setItem("userId",response.data.userId);
      localStorage.setItem("documentation-token",response.data.token);
      navigate("/");
    } catch (err) {
      notifyError('Login failed. Please check your credentials and try again.');
      console.error('Login error:', err);
    }
    finally{
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingBar />}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-sm bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800">Log In</h2>
          {error && <p className="text-red-500 text-center">{error}</p>}
          {success && <p className="text-green-500 text-center">{success}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            >
              Log In
            </button>
            <button
              onClick={(e)=>{
                e.preventDefault();
                navigate("/register");
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;