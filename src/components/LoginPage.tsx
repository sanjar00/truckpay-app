
import { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface LoginPageProps {
  onShowRegistration: () => void;
}

const LoginPage = ({ onShowRegistration }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });

    if (error) {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
            <img 
              src="/logo.png" 
              alt="TruckPay Logo" 
              className="w-20 h-20 object-contain brutal-shadow"
            />
            <CardTitle className="text-2xl brutal-text text-accent">TruckPay</CardTitle>
          </div>
          <p className="text-gray-600">Welcome back! Please sign in to continue.</p>
        </CardHeader>
        <CardContent>
          {resetMode ? (
            resetSent ? (
              <div className="text-center space-y-4">
                <p className="text-green-700 font-medium">Check your email!</p>
                <p className="text-sm text-gray-600">
                  We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setResetMode(false); setResetSent(false); }}
                  className="w-full h-12"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active"
                  disabled={loading || !email}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResetMode(false)}
                  className="w-full h-10"
                >
                  Back to Sign In
                </Button>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active"
                  disabled={loading}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">New to TruckPay?</p>
                <Button
                  variant="outline"
                  onClick={onShowRegistration}
                  className="mt-2 w-full h-12"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
