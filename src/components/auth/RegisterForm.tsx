'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function RegisterForm({
  onSuccess,
  onError,
}: RegisterFormProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register: registerUser, error: authError, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      clearError();
      clearErrors();

      const result = await registerUser(data.email, data.password);

      if (!result.success) {
        // Handle registration failure
        throw new Error(result.error || 'Registration failed');
      }

      // Handle successful registration
      if (result.error && result.error.includes('email to confirm')) {
        // Email confirmation required - show success message but don't redirect
        onError(
          'Registration successful! Please check your email to confirm your account.'
        );
        return;
      }

      // Immediate login after registration - redirect to dashboard
      window.location.href = '/dashboard';
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';

      // Handle specific error cases
      if (
        errorMessage.toLowerCase().includes('already registered') ||
        errorMessage.toLowerCase().includes('email exists')
      ) {
        setError('email', {
          type: 'manual',
          message: 'Email is already registered',
        });
      } else if (errorMessage.toLowerCase().includes('invalid email')) {
        setError('email', {
          type: 'manual',
          message: 'Invalid email address',
        });
      } else if (errorMessage.toLowerCase().includes('password')) {
        setError('password', {
          type: 'manual',
          message: 'Password requirements not met',
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

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Confirm Password"
          {...register('confirmPassword')}
          disabled={isSubmitting}
          className={errors.confirmPassword ? 'border-destructive' : ''}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {displayError && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{displayError}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
