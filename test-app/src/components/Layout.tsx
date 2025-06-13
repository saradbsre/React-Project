import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../assets/AWSLogo.png';

const modules = [
  { name: 'Maintenance', path: 'maintenance', accessKey: 'MNT' },
  { name: 'Tenant', path: 'tenant', accessKey: 'TNT' },
  { name: 'Movein/Moveout', path: 'moveinmoveout', accessKey: 'MIO' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // const username = localStorage.getItem('username');
  const storedAccess = localStorage.getItem('userAccess');
  const userAccess: string[] = storedAccess ? JSON.parse(storedAccess) : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Top Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="px-2 py-2 sm:px-3 sm:py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Hamburger for mobile */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                type="button"
                className="inline-flex items-center p-2 text-xl text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                aria-label="Open sidebar"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <a href="/" className="flex ms-2 items-center min-w-0 flex-1">
                <img src={logo} className="h-8 me-2 flex-shrink-0" alt="Logo" />
                <span
                  className="text-xs xs:text-sm sm:text-base md:text-xl font-semibold dark:text-white break-words"
                  style={{ maxWidth: '100%' }}
                  title="ABDULWAHED AHMAD RASHED BIN SHABIB"
                >
                  ABDULWAHED AHMAD RASHED BIN SHABIB
                </span>
              </a>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                aria-label="User menu"
              >
                <img
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  src="https://ui-avatars.com/api/?background=000000&color=ffffff&name=+"
                  alt="user"
                />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600 z-50">
                  <ul className="py-1 text-sm text-gray-700 dark:text-gray-200">
                    <li>
                      <button
                        onClick={() => {
                          localStorage.removeItem('token');
                          navigate('/', { replace: true });
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 w-64 h-screen pt-20 transition-transform duration-300 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 sm:z-40`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
          <ul className="space-y-2 font-medium">
            {modules
              .filter(({ accessKey }) => userAccess.includes(accessKey))
              .map(({ name, path }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-lg group ${
                        isActive
                          ? 'bg-gray-100 text-blue-600 dark:bg-gray-700 dark:text-white'
                          : 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)} // Close sidebar on mobile after click
                  >
                    <svg
                      className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
                    </svg>
                    <span className="ms-3">{name}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="p-2 pt-20 sm:ml-64">
        <div className="w-full max-w-3xl mx-auto px-2 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </>
  );
}