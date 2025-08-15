import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function HomePage(): JSX.Element {
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
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button size="sm">Get Started</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <div className="container px-4 py-24 text-center">
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
              <Button size="lg" className="text-base">
                Start Building Prompts
              </Button>
              <Button variant="outline" size="lg" className="text-base">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
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
    </div>
  );
}
