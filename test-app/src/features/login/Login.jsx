import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../../logo.svg';
import './Login.css';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/login', { username, password });
      if (res.data && res.data.success) {
        navigate('/checklist');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <>
      <div className="login-bg-3d">
        {/* Dubai buildings photo as background, royalty-free */}
        <img src="https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80" alt="Dubai Buildings Background" />
      </div>
      <div className="login-container">
        <div className="login-logo-header">
          <img src={logo} alt="AbdulWahed BinShabib Real Estate Logo" />
          <div className="welcome-row">WELCOME TO</div>
          <div className="brand-row">ABDULWAHED BINSHABIB</div>
          <div className="brand-row">REAL ESTATE</div>
          {/* 3D buildings illustration moved to background only */}
        </div>
        {error && <div className="login-error" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit">Login</button>
        </form>
      </div>
    </>
  );
};

export default Login;
