'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: AuthMode;
}

export function AuthModal({
  isOpen,
  onOpenChange,
  defaultMode = 'login',
}: AuthModalProps): JSX.Element {
  const handleSuccess = (): void => {
    onOpenChange(false);
  };

  const handleError = (error: string): void => {
    // Error handling is managed by the form components
    console.error('Auth error:', error);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to FormaOps</DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one to get started
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="login" className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">Sign In</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials to access your account
                </p>
              </div>
              <LoginForm onSuccess={handleSuccess} onError={handleError} />
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">Create Account</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new account to start using FormaOps
                </p>
              </div>
              <RegisterForm onSuccess={handleSuccess} onError={handleError} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
