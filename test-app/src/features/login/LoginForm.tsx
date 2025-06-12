import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/AWSLogo.png';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already logged in (token exists)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/maintenance', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      const res = await axios.post('https://react-project-backend-4cfx.onrender.com/api/login', { username, password });

      if (res.data && res.data.success && res.data.token) {
        // Store the actual token from server response
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('userAccess', JSON.stringify(res.data.access));

        // Navigate to /layout and replace history entry to prevent back button to login
        navigate('/maintenance', { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <section className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center px-6 py-8">
      <div className="login-container bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="login-logo-header mb-8 text-center">
          <img src={logo} alt="AbdulWahed BinShabib Real Estate Logo" className="mx-auto mb-4 w-16 h-16" />
          <div className="welcome-row text-gray-600 dark:text-gray-300 text-sm font-semibold tracking-wide mb-1">WELCOME TO</div>
          <div className="brand-row text-2xl font-bold text-gray-900 dark:text-white leading-tight">ABDULWAHED AHMAD RASHED</div>
          <div className="brand-row text-2xl font-bold text-gray-900 dark:text-white leading-tight">BIN SHABIB</div>
        </div>

        {error && (
          <div className="login-error text-red-600 mb-4 text-center font-semibold">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-orange-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-orange-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            required
          />
          <button
            type="submit"
            className="w-full bg-orange-600 text-white font-semibold py-3 rounded-lg
                       hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 dark:focus:ring-orange-800"
          >
            Login
          </button>
        </form>
      </div>
    </section>
  );
}
