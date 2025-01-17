import './App.css'
import Signup from './screens/auth/Signup';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from './screens/auth/Login';
import Home from './screens/Home';
import PrivateRoute from './components/PrivateRoute';
import { Toaster } from 'react-hot-toast';
import DocumentationPage from './screens/DocumentationPage';

function App() {
  return (
    <>
    <Toaster />
      <Router>
          <Routes>
          <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/documentation/:websiteId"
          element={
            <PrivateRoute>
              <DocumentationPage  />
            </PrivateRoute>
          }
        />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
            {/* private routes */}
            {/* <Route path="/analysis" element={<PrivateRoute />} >
              <Route path="/analysis" element={<Analysis />} />
            </Route>
            */}
          </Routes>
      </Router>
    </>
  )
}

export default App
