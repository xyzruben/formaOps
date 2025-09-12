'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthModal } from '@/components/auth';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'register';

export default function HomePage(): JSX.Element {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [showAuthMessage, setShowAuthMessage] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user was redirected here because they need to sign in
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'required') {
      setShowAuthMessage(true);
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    }
  }, []);

  // Differentiated button handlers with user state awareness and analytics
  const handleSignIn = (): void => {
    // Analytics tracking for sign in
    console.warn('Sign In clicked:', {
      action: 'sign_in',
      authenticated: !!user,
      timestamp: Date.now(),
    });

    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleGetStarted = async (source: 'header' | 'hero'): Promise<void> => {
    // Analytics tracking for get started
    console.warn('Get Started clicked:', {
      action: 'get_started',
      source,
      authenticated: !!user,
      timestamp: Date.now(),
    });

    if (user) {
      // Authenticated user: Navigate to dashboard
      setIsNavigating(true);
      try {
        router.push('/dashboard');
      } catch (error) {
        console.error('Navigation error:', error);
        setIsNavigating(false);
      }
    } else {
      // Unauthenticated user: Open registration modal
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
    }
  };

  const handleViewDocumentation = (): void => {
    console.warn('View Documentation clicked:', {
      action: 'view_documentation',
      timestamp: Date.now(),
    });
    document.getElementById('features')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">FormaOps</h1>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
              Beta
            </span>
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleSignIn}>
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => handleGetStarted('header')}
              disabled={isNavigating || isLoading}
              aria-label={
                user ? 'Go to dashboard' : 'Create account to get started'
              }
            >
              {isNavigating ? 'Loading...' : 'Get Started'}
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <div className="container px-4 py-24 text-center">
          {showAuthMessage && (
            <div className="mb-8 mx-auto max-w-md p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">
                Please sign in to access the dashboard
              </p>
            </div>
          )}
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              AI-Native Prompt Management
              <span className="text-primary"> Platform</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Create, test, validate, and execute reusable operational prompts
              with enterprise-grade reliability and AI-first architecture.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="text-base"
                onClick={() => handleGetStarted('hero')}
                disabled={isNavigating || isLoading}
                aria-label={
                  user
                    ? 'Go to dashboard to build prompts'
                    : 'Create account to start building prompts'
                }
              >
                {isNavigating ? 'Loading...' : 'Start Building Prompts'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base"
                onClick={handleViewDocumentation}
                aria-label="Scroll to features section"
              >
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Built for Developers Building with AI
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Professional prompt management with enterprise features and
              developer-first experience.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI-First Architecture</CardTitle>
                <CardDescription>
                  CPU priority system ensures AI operations get maximum
                  resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Built from the ground up with AI workloads in mind. Automatic
                  resource allocation and priority management for optimal
                  performance.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Real-time Execution</CardTitle>
                <CardDescription>
                  Live status updates and streaming responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Watch your prompts execute in real-time with detailed metrics,
                  token usage tracking, and cost analysis.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Validation</CardTitle>
                <CardDescription>
                  Schema, regex, and custom JavaScript validation rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ensure output quality with comprehensive validation
                  frameworks. Catch issues before they reach production.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Version Control</CardTitle>
                <CardDescription>
                  Git-like versioning with rollback capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track changes, compare versions, and rollback to previous
                  working states with full audit trails.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Optimization</CardTitle>
                <CardDescription>
                  Token usage tracking and budget management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor AI API costs, set budgets, and optimize prompts for
                  better performance and lower costs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enterprise Security</CardTitle>
                <CardDescription>
                  Row-level security, audit logs, and encrypted storage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Production-ready security with comprehensive logging, access
                  controls, and compliance features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <p className="text-sm text-muted-foreground">
            © 2024 FormaOps. Built for portfolio demonstration.
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Next.js 15</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Prisma</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultMode={authModalMode}
      />
    </div>
  );
}
