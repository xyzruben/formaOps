'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function DashboardPage(): JSX.Element {
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
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

  // Don't render if not authenticated (will redirect)
  if (!user) {
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Prompts</CardTitle>
            <CardDescription>
              Manage your AI prompts and templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">View Prompts</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Executions</CardTitle>
            <CardDescription>Monitor prompt execution history</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View History
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>
              Track usage and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
