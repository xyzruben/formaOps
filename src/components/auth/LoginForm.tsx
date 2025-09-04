'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error: authError, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      clearError();
      clearErrors();

      const result = await login(data.email, data.password);

      if (!result.success) {
        // Handle login failure
        throw new Error(result.error || 'Login failed');
      }

      // Redirect to dashboard after successful login
      window.location.href = '/dashboard';
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';

      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('invalid credentials')) {
        setError('root', {
          type: 'manual',
          message: 'Invalid credentials',
        });
      } else if (errorMessage.toLowerCase().includes('email')) {
        setError('email', {
          type: 'manual',
          message: 'Email is required',
        });
      } else if (errorMessage.toLowerCase().includes('password')) {
        setError('password', {
          type: 'manual',
          message: 'Password is required',
        });
      } else {
        setError('root', {
          type: 'manual',
          message: errorMessage,
        });
      }

      onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Display auth context error or form error
  const displayError = authError || errors.root?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Email"
          {...register('email')}
          disabled={isSubmitting}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Password"
          {...register('password')}
          disabled={isSubmitting}
          className={errors.password ? 'border-destructive' : ''}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {displayError && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{displayError}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
