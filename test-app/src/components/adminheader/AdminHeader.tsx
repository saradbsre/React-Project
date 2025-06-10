import { useState, useRef, useEffect } from 'react';

export default function AdminSidebar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-64 bg-blue-700 text-white min-h-full p-4 rounded-lg">
      <div className="text-xl font-semibold mb-4">Admin Module</div>

      <div ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex justify-between items-center bg-blue-600 hover:bg-blue-800 px-3 py-2 rounded-md focus:outline-none"
        >
          <span>Admin Options</span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {dropdownOpen && (
          <ul className="mt-2 bg-blue-600 rounded-md text-sm">
            <li>
              <a
                href="#user-management"
                className="block px-4 py-2 hover:bg-blue-500 cursor-pointer"
              >
                User Management
              </a>
            </li>
            <li>
              <a
                href="#system-settings"
                className="block px-4 py-2 hover:bg-blue-500 cursor-pointer"
              >
                System Settings
              </a>
            </li>
            <li>
              <a
                href="#logs"
                className="block px-4 py-2 hover:bg-blue-500 cursor-pointer"
              >
                View Logs
              </a>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
