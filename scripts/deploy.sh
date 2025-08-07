#!/bin/bash

# Production deployment script
set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-https://formaops.com/api/health}
MAX_HEALTH_CHECK_ATTEMPTS=30
HEALTH_CHECK_INTERVAL=10

echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if required environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}❌ Environment variable $1 is not set${NC}"
        exit 1
    fi
}

if [ "$ENVIRONMENT" = "production" ]; then
    echo "Checking production environment variables..."
    check_env_var "DATABASE_URL"
    check_env_var "OPENAI_API_KEY"
    check_env_var "SUPABASE_URL"
    check_env_var "SUPABASE_ANON_KEY"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run linting
echo "🧹 Running ESLint..."
npm run lint:check

# Run type checking
echo "🔍 Running TypeScript checks..."
npm run type-check

# Run tests
echo "🧪 Running tests..."
npm run test -- --watchAll=false --coverage=false

# Build the application
echo "🏗️  Building application..."
npm run build

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Database migrations (if needed)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🗄️  Running database migrations..."
    npx prisma db push --force-reset=false
fi

# Deploy based on platform
case "$DEPLOYMENT_PLATFORM" in
    "vercel")
        echo "🚀 Deploying to Vercel..."
        if [ "$ENVIRONMENT" = "production" ]; then
            vercel --prod --token=$VERCEL_TOKEN
        else
            vercel --token=$VERCEL_TOKEN
        fi
        ;;
    "netlify")
        echo "🚀 Deploying to Netlify..."
        if [ "$ENVIRONMENT" = "production" ]; then
            netlify deploy --prod --dir=.next
        else
            netlify deploy --dir=.next
        fi
        ;;
    "docker")
        echo "🐳 Building and deploying Docker container..."
        docker build -t formaops:latest .
        docker tag formaops:latest formaops:$ENVIRONMENT
        # Additional Docker deployment commands would go here
        ;;
    *)
        echo -e "${YELLOW}No specific deployment platform configured${NC}"
        ;;
esac

# Health check after deployment
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🏥 Performing health check..."
    
    attempt=1
    while [ $attempt -le $MAX_HEALTH_CHECK_ATTEMPTS ]; do
        echo "Health check attempt $attempt/$MAX_HEALTH_CHECK_ATTEMPTS..."
        
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            echo -e "${GREEN}✅ Health check passed!${NC}"
            
            # Get health check details
            health_response=$(curl -s "$HEALTH_CHECK_URL")
            echo "Health check response: $health_response"
            break
        else
            if [ $attempt -eq $MAX_HEALTH_CHECK_ATTEMPTS ]; then
                echo -e "${RED}❌ Health check failed after $MAX_HEALTH_CHECK_ATTEMPTS attempts${NC}"
                echo "Deployment may have issues. Please check the application manually."
                exit 1
            fi
            
            echo "Health check failed, waiting ${HEALTH_CHECK_INTERVAL}s before retry..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
        
        ((attempt++))
    done
fi

# Notification (if configured)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 FormaOps deployed successfully to $ENVIRONMENT\"}" \
        $SLACK_WEBHOOK_URL
fi

if [ ! -z "$DISCORD_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"content\":\"🚀 FormaOps deployed successfully to $ENVIRONMENT\"}" \
        $DISCORD_WEBHOOK_URL
fi

# Performance monitoring setup
echo "📊 Setting up performance monitoring..."

# Create performance monitoring config
cat > .lighthouse-budget.json << EOF
{
  "resourceSizes": [
    {
      "resourceType": "script",
      "budget": 400
    },
    {
      "resourceType": "total",
      "budget": 2000
    }
  ],
  "timings": [
    {
      "metric": "first-contentful-paint",
      "budget": 2000
    },
    {
      "metric": "largest-contentful-paint",
      "budget": 2500
    },
    {
      "metric": "interactive",
      "budget": 3000
    }
  ]
}
EOF

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🔗 Application URL: $HEALTH_CHECK_URL${NC}"

# Cleanup
echo "🧹 Cleaning up..."
rm -f .lighthouse-budget.json

echo -e "${GREEN}✅ All done!${NC}"