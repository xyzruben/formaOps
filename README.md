# FormaOps - AI-Native Prompt Management Platform

<div align="center">

![FormaOps Logo](https://via.placeholder.com/200x80/4F46E5/FFFFFF?text=FormaOps)

**Professional prompt management platform for developers**

[![CI/CD Pipeline](https://github.com/username/formaops/actions/workflows/ci.yml/badge.svg)](https://github.com/username/formaops/actions/workflows/ci.yml)
[![CodeQL](https://github.com/username/formaops/actions/workflows/codeql.yml/badge.svg)](https://github.com/username/formaops/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)

[Live Demo](https://formaops.com) • [Documentation](https://docs.formaops.com) • [API Reference](https://api.formaops.com/docs)

</div>

## 🚀 Overview

FormaOps is an enterprise-grade AI-native prompt management platform designed for developers who want to create, validate, execute, and monitor AI prompts with professional-level tooling. Built with modern technologies and production-ready architecture.

### ✨ Key Features

- **🎯 Professional Prompt Management** - Create, organize, and version control your AI prompts
- **⚡ Real-time Execution** - Execute prompts with multiple AI models (GPT-3.5, GPT-4)
- **🔍 Advanced Validation** - Schema, regex, and function-based validation system
- **📊 Performance Monitoring** - Comprehensive analytics, cost tracking, and performance metrics
- **🔒 Enterprise Security** - Input sanitization, rate limiting, and security hardening
- **🏗️ Production Architecture** - Scalable, maintainable, and deployable infrastructure
- **🧪 Comprehensive Testing** - Unit, integration, and end-to-end test coverage

## 🏛️ Architecture

FormaOps follows a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│                      API Layer (Next.js API)                │
├─────────────────────────────────────────────────────────────┤
│     Business Logic     │    AI Integration    │   Security   │
│   - Prompt Management  │   - OpenAI Client    │ - Validation │
│   - Execution Engine   │   - Model Selection  │ - Rate Limit │
│   - Version Control    │   - Cost Tracking    │ - Sanitize   │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer (Prisma ORM)                  │
├─────────────────────────────────────────────────────────────┤
│                   Database (PostgreSQL)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Core Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI API (GPT-3.5, GPT-4)
- **Styling**: Tailwind CSS + shadcn/ui

### Development & Testing

- **Testing**: Jest, React Testing Library, Playwright
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged

### Production & DevOps

- **Deployment**: Vercel / Netlify / Docker
- **CI/CD**: GitHub Actions
- **Monitoring**: Custom performance monitoring
- **Security**: Input validation, rate limiting, CSP headers

## 🚦 Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- PostgreSQL database
- OpenAI API key
- Supabase project (for authentication)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/username/formaops.git
   cd formaops
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/formaops"
   OPENAI_API_KEY="your-openai-api-key"
   SUPABASE_URL="your-supabase-project-url"
   SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

4. **Set up the database**

   ```bash
   npm run db:setup
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🧪 Testing

FormaOps includes comprehensive testing at all levels:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

- **Unit Tests**: Core business logic, utilities, and components
- **Integration Tests**: API endpoints and database interactions
- **E2E Tests**: Critical user flows (authentication, prompt management, execution)

## 📦 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment-Specific Deployments

```bash
# Vercel deployment
vercel --prod

# Netlify deployment
netlify deploy --prod

# Docker deployment
docker build -t formaops:production .
docker run -p 3000:3000 formaops:production
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates in place
- [ ] Monitoring and logging configured
- [ ] Performance budgets set
- [ ] Security headers configured

## 📖 API Documentation

### Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Prompt Management

```bash
# Create prompt
POST /api/prompts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Welcome Message",
  "template": "Hello {{name}}, welcome to {{company}}!",
  "variables": [
    {
      "name": "name",
      "type": "string",
      "required": true
    },
    {
      "name": "company",
      "type": "string",
      "required": true
    }
  ]
}
```

### Prompt Execution

```bash
# Execute prompt
POST /api/executions
Authorization: Bearer <token>
Content-Type: application/json

{
  "promptId": "uuid-of-prompt",
  "inputs": {
    "name": "John",
    "company": "TechCorp"
  },
  "model": "gpt-3.5-turbo"
}
```

For complete API documentation, visit [api.formaops.com/docs](https://api.formaops.com/docs).

## 🔧 Configuration

### Environment Variables

| Variable                 | Description                        | Required |
| ------------------------ | ---------------------------------- | -------- |
| `DATABASE_URL`           | PostgreSQL connection string       | Yes      |
| `OPENAI_API_KEY`         | OpenAI API key for AI integration  | Yes      |
| `SUPABASE_URL`           | Supabase project URL               | Yes      |
| `SUPABASE_ANON_KEY`      | Supabase anonymous key             | Yes      |
| `CRON_SECRET`            | Secret for cron job authentication | No       |
| `ENABLE_REQUEST_LOGGING` | Enable detailed request logging    | No       |

### Performance Configuration

Adjust performance settings in `next.config.js`:

```javascript
// Bundle optimization
experimental: {
  optimizePackageImports: ['@supabase/supabase-js', 'openai'],
  optimizeCss: true,
  optimizeServerReact: true,
}

// Cache optimization
async headers() {
  return [
    {
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ];
}
```

## 🛡️ Security

FormaOps implements multiple layers of security:

### Input Validation & Sanitization

- XSS prevention with DOMPurify
- SQL injection protection
- Path traversal prevention
- Command injection protection

### Rate Limiting

- API endpoint rate limiting
- User-based and IP-based limits
- Configurable time windows

### Security Headers

- Content Security Policy (CSP)
- X-Frame-Options, X-XSS-Protection
- Strict Transport Security (HSTS)

### Authentication & Authorization

- Supabase authentication integration
- JWT token validation
- Role-based access control

## 📊 Monitoring & Analytics

### Performance Monitoring

- Real-time performance metrics
- Response time tracking
- Success rate monitoring
- Resource utilization metrics

### Cost Tracking

- OpenAI API usage tracking
- Cost per execution monitoring
- Budget alerts and limits
- Model usage breakdown

### Error Tracking

- Comprehensive error logging
- Error boundaries with fallbacks
- Performance degradation alerts

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- Follow TypeScript strict mode
- Maintain test coverage above 80%
- Use conventional commit messages
- Ensure all CI/CD checks pass

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.formaops.com](https://docs.formaops.com)
- **Issues**: [GitHub Issues](https://github.com/username/formaops/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/formaops/discussions)
- **Email**: support@formaops.com

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for AI API integration
- [Vercel](https://vercel.com) for deployment platform
- [Supabase](https://supabase.io) for authentication services
- [shadcn/ui](https://ui.shadcn.com) for UI components
- All contributors and community members

---

<div align="center">

**Built with ❤️ by the FormaOps Team**

[Website](https://formaops.com) • [Twitter](https://twitter.com/formaops) • [LinkedIn](https://linkedin.com/company/formaops)

</div>
