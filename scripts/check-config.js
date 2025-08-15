#!/usr/bin/env node

/**
 * Configuration validation script for FormaOps
 * Validates all required environment variables and configuration
 */

const fs = require('fs');
const path = require('path');

// Simple env file loader (since dotenv isn't a dependency)
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (error) {
    // Ignore file read errors
  }
}

// Load environment variables
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

class ConfigChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  /**
   * Check if a required environment variable exists
   */
  checkRequired(name, description) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
      this.errors.push(`❌ ${name}: ${description} (REQUIRED)`);
      return false;
    } else {
      this.info.push(`✅ ${name}: Set`);
      return true;
    }
  }

  /**
   * Check an optional environment variable
   */
  checkOptional(name, description, defaultValue) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
      this.warnings.push(
        `⚠️  ${name}: ${description} (using default: ${defaultValue})`
      );
      return false;
    } else {
      this.info.push(`✅ ${name}: Set to "${value}"`);
      return true;
    }
  }

  /**
   * Validate OpenAI API key format
   */
  validateApiKey(apiKey) {
    if (!apiKey) return false;

    if (!apiKey.startsWith('sk-')) {
      this.errors.push(
        `❌ OPENAI_API_KEY: Must start with 'sk-' (current: ${apiKey.substring(0, 10)}...)`
      );
      return false;
    }

    if (
      apiKey.includes('your-key-here') ||
      apiKey.includes('your-open-ai-key')
    ) {
      this.errors.push(
        `❌ OPENAI_API_KEY: Placeholder value detected. Please set a real API key.`
      );
      return false;
    }

    if (apiKey.length < 20) {
      this.errors.push(
        `❌ OPENAI_API_KEY: Key appears too short (expected 50+ characters)`
      );
      return false;
    }

    return true;
  }

  /**
   * Validate numeric environment variable
   */
  validateNumber(name, value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      this.errors.push(
        `❌ ${name}: Must be a valid number (current: "${value}")`
      );
      return false;
    }
    if (min !== undefined && num < min) {
      this.errors.push(`❌ ${name}: Must be >= ${min} (current: ${num})`);
      return false;
    }
    if (max !== undefined && num > max) {
      this.errors.push(`❌ ${name}: Must be <= ${max} (current: ${num})`);
      return false;
    }
    return true;
  }

  /**
   * Check database configuration
   */
  checkDatabase() {
    console.log('\n🗄️  DATABASE CONFIGURATION');
    console.log('═'.repeat(50));

    this.checkRequired('DATABASE_URL', 'PostgreSQL connection string');

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        this.warnings.push(
          `⚠️  DATABASE_URL: Using localhost - ensure PostgreSQL is running`
        );
      }
      if (dbUrl.includes('password') && process.env.NODE_ENV === 'production') {
        this.warnings.push(
          `⚠️  DATABASE_URL: Using default password in production`
        );
      }
    }
  }

  /**
   * Check authentication configuration
   */
  checkAuth() {
    console.log('\n🔐 AUTHENTICATION CONFIGURATION');
    console.log('═'.repeat(50));

    this.checkRequired('NEXT_PUBLIC_SUPABASE_URL', 'Supabase project URL');
    this.checkRequired(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'Supabase anonymous key'
    );
    this.checkRequired(
      'SUPABASE_SERVICE_ROLE_KEY',
      'Supabase service role key'
    );
    this.checkRequired('NEXTAUTH_SECRET', 'NextAuth secret key');
    this.checkOptional('NEXTAUTH_URL', 'NextAuth URL', 'http://localhost:3000');

    // Validate Supabase URL format
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (
      supabaseUrl &&
      !supabaseUrl.includes('supabase.co') &&
      !supabaseUrl.includes('localhost')
    ) {
      this.warnings.push(
        `⚠️  NEXT_PUBLIC_SUPABASE_URL: URL format may be incorrect`
      );
    }
  }

  /**
   * Check OpenAI configuration
   */
  checkOpenAI() {
    console.log('\n🤖 OPENAI CONFIGURATION');
    console.log('═'.repeat(50));

    const hasApiKey = this.checkRequired('OPENAI_API_KEY', 'OpenAI API key');

    if (hasApiKey) {
      this.validateApiKey(process.env.OPENAI_API_KEY);
    }

    // Check optional OpenAI settings
    this.checkOptional(
      'OPENAI_DEFAULT_MODEL',
      'Default OpenAI model',
      'gpt-3.5-turbo'
    );
    this.checkOptional('OPENAI_MAX_TOKENS', 'Default max tokens', '2000');
    this.checkOptional('OPENAI_TEMPERATURE', 'Default temperature', '0.7');

    // Validate numeric values
    const maxTokens = process.env.OPENAI_MAX_TOKENS;
    if (maxTokens) {
      this.validateNumber('OPENAI_MAX_TOKENS', maxTokens, 1, 4000);
    }

    const temperature = process.env.OPENAI_TEMPERATURE;
    if (temperature) {
      this.validateNumber('OPENAI_TEMPERATURE', temperature, 0, 2);
    }

    // Validate model
    const model = process.env.OPENAI_DEFAULT_MODEL;
    if (model && !['gpt-3.5-turbo', 'gpt-4'].includes(model)) {
      this.errors.push(
        `❌ OPENAI_DEFAULT_MODEL: Must be 'gpt-3.5-turbo' or 'gpt-4' (current: "${model}")`
      );
    }
  }

  /**
   * Check cost tracking configuration
   */
  checkCostTracking() {
    console.log('\n💰 COST TRACKING CONFIGURATION');
    console.log('═'.repeat(50));

    // Check cost configuration
    const costs = [
      { name: 'GPT35_COST_PER_1K_INPUT', default: '0.0015' },
      { name: 'GPT35_COST_PER_1K_OUTPUT', default: '0.002' },
      { name: 'GPT4_COST_PER_1K_INPUT', default: '0.03' },
      { name: 'GPT4_COST_PER_1K_OUTPUT', default: '0.06' },
    ];

    costs.forEach(({ name, default: defaultValue }) => {
      this.checkOptional(name, `Cost per 1K tokens`, defaultValue);

      const value = process.env[name];
      if (value) {
        this.validateNumber(name, value, 0);
      }
    });
  }

  /**
   * Check optional configuration
   */
  checkOptionalConfig() {
    console.log('\n⚙️  OPTIONAL CONFIGURATION');
    console.log('═'.repeat(50));

    this.checkOptional(
      'REDIS_URL',
      'Redis connection for caching',
      'redis://localhost:6379'
    );
    this.checkOptional('NODE_ENV', 'Node environment', 'development');

    // Check environment-specific warnings
    if (process.env.NODE_ENV === 'production') {
      this.info.push(`🚀 Production environment detected`);

      // Additional production checks
      if (process.env.NEXTAUTH_URL === 'http://localhost:3000') {
        this.errors.push(
          `❌ NEXTAUTH_URL: Should not be localhost in production`
        );
      }
    } else {
      this.info.push(`🔧 Development environment detected`);
    }
  }

  /**
   * Run all configuration checks
   */
  run() {
    console.log('🔍 FormaOps Configuration Checker');
    console.log('═'.repeat(50));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    this.checkDatabase();
    this.checkAuth();
    this.checkOpenAI();
    this.checkCostTracking();
    this.checkOptionalConfig();

    this.printSummary();

    // Exit with error code if there are errors
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }

  /**
   * Print configuration summary
   */
  printSummary() {
    console.log('\n📋 CONFIGURATION SUMMARY');
    console.log('═'.repeat(50));

    if (this.errors.length > 0) {
      console.log('\n🚨 ERRORS (must be fixed):');
      this.errors.forEach(error => console.log(`  ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (recommended to fix):');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.info.length > 0) {
      console.log('\n✅ VALID CONFIGURATION:');
      this.info.forEach(info => console.log(`  ${info}`));
    }

    console.log('\n' + '═'.repeat(50));

    if (this.errors.length === 0) {
      console.log('🎉 Configuration validation passed!');
      console.log(
        'All required environment variables are properly configured.'
      );
    } else {
      console.log(
        `❌ Configuration validation failed with ${this.errors.length} error(s).`
      );
      console.log('Please fix the errors above and run the check again.');
    }

    if (this.warnings.length > 0) {
      console.log(
        `⚠️  ${this.warnings.length} warning(s) found - consider addressing these for optimal configuration.`
      );
    }

    console.log('\n💡 Tips:');
    console.log('  • Copy .env.example to .env.local and update values');
    console.log('  • Never commit real API keys to version control');
    console.log('  • Use different configurations for development/production');
    console.log(
      '  • Run "npm run config:check" regularly to validate configuration'
    );
  }
}

// Run the configuration check
if (require.main === module) {
  const checker = new ConfigChecker();
  checker.run();
}

module.exports = { ConfigChecker };
