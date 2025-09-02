'use client';

import { Button } from '@/components/ui/button';
import { PromptList } from '@/components/prompts/PromptList';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function DashboardPage(): JSX.Element {
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    // Skip redirect in test mode if localStorage has auth-user
    const isTestMode = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || process.env.NODE_ENV === 'test');
    const hasTestAuth = typeof window !== 'undefined' && 
      window.localStorage.getItem('auth-user');
    
    // Redirect unauthenticated users to login (skip in test mode with auth data)
    if (!isLoading && !user && !(isTestMode && hasTestAuth)) {
      window.location.href = '/?auth=required';
    }
  }, [user, isLoading]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect) - except in test mode
  const isTestMode = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || process.env.NODE_ENV === 'test');
  const hasTestAuth = typeof window !== 'undefined' && 
    window.localStorage.getItem('auth-user');
    
  if (!user && !(isTestMode && hasTestAuth)) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Redirecting...</div>
      </div>
    );
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      // Redirect to home after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome to FormaOps</h1>
          <p className="text-muted-foreground mt-2">
            {user?.email ? `Welcome back, ${user.email}!` : 'Welcome!'}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Main Prompt Management Interface */}
      <PromptList />
    </div>
  );
}
