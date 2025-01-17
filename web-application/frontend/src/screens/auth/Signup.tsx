import axios from 'axios';
import React, { useState } from 'react';
import LoadingBar from '../../components/LoadingBar';
import { useNavigate } from 'react-router-dom';
import { Toaster } from "react-hot-toast";
import { notifyError, notifySuccess } from '../../utils/Utils';

const Signup: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/api/auth/register', formData);
            notifySuccess(response.data.message);
            console.log('Signup response:', response.data);
            navigate("/login");
        } catch (err) {
            notifyError('Signup failed. Please try again.');
            console.error('Signup error:', err);
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <LoadingBar />}
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-full max-w-sm bg-white p-6 shadow-lg rounded-lg">
                    <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800">Create an Account</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                            />
                        </div>
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
                            Sign Up
                        </button>
                        <button
                            onClick={(e)=>{
                                e.preventDefault();
                                navigate("/login");
                            }}

                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default Signup;