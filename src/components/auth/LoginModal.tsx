'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ isOpen, onOpenChange }: LoginModalProps): JSX.Element {
  const handleSuccess = (): void => {
    onOpenChange(false);
  };

  const handleError = (error: string): void => {
    // Error handling is managed by the LoginForm component
    console.error('Login error:', error);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign In to FormaOps</DialogTitle>
          <DialogDescription>
            Enter your credentials to access your account
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4">
          <LoginForm 
            onSuccess={handleSuccess} 
            onError={handleError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}