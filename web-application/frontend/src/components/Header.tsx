import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate  = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  useEffect(()=>{
    const token = localStorage.getItem("documentation-token");
    if(token && token.length>0){
      setToken(token);
    }
  },[])
  return (
    <header className="bg-blue-600 text-white py-4 shadow-md px-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">API Documentation Platform</h1>
        <nav className="space-x-4">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          {!token && <Link to="/login" className="hover:underline">
            Login
          </Link>}
          {!token && <Link to="/signup" className="hover:underline">
            Signup
          </Link>}
          <a href="#" onClick={(e)=>{
            e.preventDefault();
            localStorage.removeItem("documentation-token");
            navigate("/login");
          }} className="hover:underline">
            Logout
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;