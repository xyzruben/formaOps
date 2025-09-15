-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('SCHEMA', 'REGEX', 'FUNCTION');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PromptStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptId" TEXT NOT NULL,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "context" JSONB,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "edgeFunctionId" TEXT,
    "model" TEXT DEFAULT 'gpt-3.5-turbo',
    "totalTokens" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "output" TEXT,
    "rawOutput" TEXT,
    "validatedOutput" JSONB,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" JSONB,
    "latencyMs" INTEGER,
    "costUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_results" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "tokenUsage" JSONB NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ValidationType" NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "promptId" TEXT NOT NULL,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionId" TEXT NOT NULL,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "prompts_userId_status_idx" ON "prompts"("userId", "status");

-- CreateIndex
CREATE INDEX "prompts_createdAt_idx" ON "prompts"("createdAt");

-- CreateIndex
CREATE INDEX "prompts_status_publishedAt_idx" ON "prompts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "prompt_versions_promptId_createdAt_idx" ON "prompt_versions"("promptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_promptId_version_key" ON "prompt_versions"("promptId", "version");

-- CreateIndex
CREATE INDEX "executions_userId_status_idx" ON "executions"("userId", "status");

-- CreateIndex
CREATE INDEX "executions_createdAt_idx" ON "executions"("createdAt");

-- CreateIndex
CREATE INDEX "executions_promptId_createdAt_idx" ON "executions"("promptId", "createdAt");

-- CreateIndex
CREATE INDEX "executions_status_createdAt_idx" ON "executions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "executions_userId_createdAt_idx" ON "executions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "executions_model_idx" ON "executions"("model");

-- CreateIndex
CREATE INDEX "execution_results_executionId_idx" ON "execution_results"("executionId");

-- CreateIndex
CREATE INDEX "validations_promptId_isActive_idx" ON "validations"("promptId", "isActive");

-- CreateIndex
CREATE INDEX "execution_logs_executionId_timestamp_idx" ON "execution_logs"("executionId", "timestamp");

-- CreateIndex
CREATE INDEX "execution_logs_level_timestamp_idx" ON "execution_logs"("level", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_isActive_idx" ON "api_keys"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_results" ADD CONSTRAINT "execution_results_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
