'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const pathname = usePathname();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Don't show navbar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg border-b-2 border-blue-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 font-bold text-xl flex items-center">
              <svg className="h-8 w-8 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Stockz
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/dashboard" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/dashboard' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Dashboard
                </Link>
                
                {userData?.role === 'hospital' && (
                  <>
                    <Link 
                      href="/hospital/alerts" 
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname.startsWith('/hospital/alerts') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Alerts
                    </Link>
                    <Link 
                      href="/hospital/inventory" 
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname.startsWith('/hospital/inventory') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Inventory
                    </Link>
                  </>
                )}
                
                {userData?.role === 'supplier' && (
                  <>
                    <Link 
                      href="/supplier/alerts" 
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname.startsWith('/supplier/alerts') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4.343 12.344l1.414 1.414L12 7.515l6.243 6.243 1.414-1.414L12 4.686z" />
                      </svg>
                      Supply Requests
                    </Link>
                    <Link 
                      href="/supplier/hospitals" 
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname.startsWith('/supplier/hospitals') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Hospitals
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-100">
                      {userData?.name || userData?.email}
                    </div>
                    {userData?.facilityName && (
                      <div className="text-xs text-blue-200">
                        {userData.facilityName}
                      </div>
                    )}
                  </div>
                  <div className="relative flex items-center space-x-2">
                    <Link
                      href="/profile"
                      className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors success-primary"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors alert-primary"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-2 rounded-md text-sm font-medium bg-white text-blue-600 hover:bg-gray-50 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            href="/dashboard" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/dashboard' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
            }`}
          >
            Dashboard
          </Link>
          
          {userData?.role === 'hospital' && (
            <>
              <Link 
                href="/hospital/inventory" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/hospital/inventory') ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                Inventory
              </Link>
              <Link 
                href="/hospital/alerts" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/hospital/alerts') ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                Alerts
              </Link>
            </>
          )}
          
          {userData?.role === 'supplier' && (
            <>
              <Link 
                href="/supplier/alerts" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/supplier/alerts') ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                Alerts
              </Link>
              <Link 
                href="/supplier/hospitals" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/supplier/hospitals') ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                Hospitals
              </Link>
            </>
          )}
          
          <Link 
            href="/profile" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/profile' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-500'
            }`}
          >
            Profile
          </Link>
          
          {user ? (
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-red-600 text-white hover:bg-red-700"
            >
              Logout
            </button>
          ) : (
            <div className="flex flex-col space-y-1">
              <Link
                href="/login"
                className="block px-3 py-2 rounded-md text-base font-medium bg-blue-500 text-white hover:bg-blue-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block px-3 py-2 rounded-md text-base font-medium bg-white text-blue-600 hover:bg-blue-100"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
