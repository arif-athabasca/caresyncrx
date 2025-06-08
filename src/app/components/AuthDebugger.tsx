'use client';

/**
 * AuthDebugger Component
 * 
 * This component displays authentication state for debugging purposes.
 * It can be temporarily added to layouts to debug authentication issues.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';

export default function AuthDebugger({ visible = false }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [tokenInfo, setTokenInfo] = useState({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isExpired: null,
    deviceId: null
  });
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    const updateTokenInfo = () => {
      try {
        // Get token info from window.TokenStorage if available, otherwise fall back to localStorage
        const accessToken = 
          (window.TokenStorage && typeof window.TokenStorage.getAccessToken === 'function') ? 
            window.TokenStorage.getAccessToken() : 
            localStorage.getItem('accessToken');
            
        const refreshToken = 
          (window.TokenStorage && typeof window.TokenStorage.getRefreshToken === 'function') ? 
            window.TokenStorage.getRefreshToken() : 
            localStorage.getItem('refreshToken');
            
        const expiresAt = localStorage.getItem('expiresAt');
        
        const isExpired = 
          (window.TokenStorage && typeof window.TokenStorage.isAccessTokenExpired === 'function') ? 
            window.TokenStorage.isAccessTokenExpired() : 
            (expiresAt ? Date.now() >= parseInt(expiresAt, 10) : true);
            
        const deviceId = localStorage.getItem('deviceId');
        
        setTokenInfo({
          accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : null,
          refreshToken: refreshToken ? `${refreshToken.substring(0, 10)}...` : null,
          expiresAt: expiresAt ? new Date(parseInt(expiresAt, 10)).toLocaleTimeString() : null,
          isExpired,
          deviceId
        });
      } catch (error) {
        console.error('Error updating token info:', error);
      }
    };
    
    // Update immediately and every 5 seconds
    updateTokenInfo();
    const interval = setInterval(updateTokenInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Hide if not visible
  if (!visible && !isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-2 right-2 bg-gray-800 text-white p-1 text-xs rounded opacity-50 hover:opacity-100 z-50"
      >
        Debug
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-0 bg-gray-800 text-white p-2 text-xs rounded-tl-md w-64 max-w-full z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Auth Debug</h3>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-xs bg-gray-700 px-1 rounded"
        >
          Close
        </button>
      </div>
      
      <div className="mb-2">
        <div>Status: {isLoading ? 'Loading...' : (isAuthenticated ? 'Authenticated' : 'Not Authenticated')}</div>
        <div>User: {user ? `${user.email} (${user.role})` : 'None'}</div>
      </div>
      
      <div className="mb-2">
        <div>Access Token: {tokenInfo.accessToken || 'None'}</div>
        <div>Refresh Token: {tokenInfo.refreshToken || 'None'}</div>
        <div>Expires At: {tokenInfo.expiresAt || 'None'}</div>
        <div>Is Expired: {tokenInfo.isExpired !== null ? (tokenInfo.isExpired ? 'Yes' : 'No') : 'Unknown'}</div>
        <div>Device ID: {tokenInfo.deviceId || 'None'}</div>
      </div>
      
      <div className="mt-2 text-2xs">
        <button 
          onClick={() => {
            try {
              const script = document.createElement('script');
              script.src = '/test-token-methods.js';
              document.body.appendChild(script);
            } catch (e) {
              console.error('Error loading test script:', e);
            }
          }}
          className="bg-blue-600 text-white px-1 py-0.5 rounded text-2xs mr-1"
        >
          Test Tokens
        </button>
        
        <button 
          onClick={() => {
            try {
              if (window.TokenStorage && typeof window.TokenStorage.clearTokens === 'function') {
                window.TokenStorage.clearTokens();
              }
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('expiresAt');
              localStorage.removeItem('deviceId');
              window.location.reload();
            } catch (e) {
              console.error('Error clearing tokens:', e);
            }
          }}
          className="bg-red-600 text-white px-1 py-0.5 rounded text-2xs"
        >
          Clear Tokens
        </button>
      </div>
    </div>
  );
}
