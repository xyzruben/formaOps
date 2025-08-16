import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY =
  'sk-test-openai-key-12345678901234567890123456789012';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    pop: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    prompt: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    execution: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    promptVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    executionLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  })),
  Prisma: {
    JsonNull: Symbol('JsonNull'),
  },
}));

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          id: 'test-completion',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Test response',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
      },
    },
  })),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' }, session: { access_token: 'test' } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

// Mock Supabase SSR
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' }, session: { access_token: 'test' } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Web APIs for Next.js server environment
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || 'GET',
  headers: new Map(Object.entries(options?.headers || {})),
  body: options?.body,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
}));

global.Response = jest.fn().mockImplementation((body, options) => ({
  status: options?.status || 200,
  statusText: 'OK',
  headers: new Map(Object.entries(options?.headers || {})),
  body,
  json: jest.fn().mockResolvedValue(JSON.parse(body || '{}')),
  text: jest.fn().mockResolvedValue(body || ''),
}));

global.Headers = jest.fn().mockImplementation(init => {
  const headers = new Map();
  if (init) {
    Object.entries(init).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  return headers;
});

global.URLSearchParams = URLSearchParams;

// Mock Next.js server functions
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
    toString: jest.fn().mockReturnValue(''),
  }),
  headers: jest.fn().mockResolvedValue({
    get: jest.fn(),
    has: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    append: jest.fn(),
    getSetCookie: jest.fn().mockReturnValue([]),
    forEach: jest.fn(),
    entries: jest.fn().mockReturnValue([]),
    keys: jest.fn().mockReturnValue([]),
    values: jest.fn().mockReturnValue([]),
  }),
}));

// Mock Next.js server responses
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      statusText: 'OK',
      headers: new Map(Object.entries(options?.headers || {})),
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
      ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
    })),
    redirect: jest.fn((url, status) => ({
      status: status || 302,
      headers: new Map([['location', url]]),
    })),
  },
}));
