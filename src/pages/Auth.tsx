import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Package, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import inventraLogoWhite from '@/assets/inventra-logo-white.svg';
import inventraLogo from '@/assets/inventra-logo.svg';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', fullName: '' });

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(loginForm.email);
      passwordSchema.parse(loginForm.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(signupForm.email);
      passwordSchema.parse(signupForm.password);
      if (!signupForm.fullName.trim()) {
        throw new Error('Full name is required');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
      if (err instanceof Error) {
        toast({
          title: 'Validation Error',
          description: err.message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    setIsSubmitting(false);

    if (error) {
      const message = error.message.includes('already registered')
        ? 'This email is already registered. Please log in instead.'
        : error.message;
      toast({
        title: 'Signup Failed',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created',
        description: 'Welcome to Inventra!',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Abstract geometric background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3">
              <img src={inventraLogoWhite} alt="Inventra" className="h-12 w-auto" />
            </div>
            <p className="text-slate-400 mt-3 text-sm">Powered by Ciméntica Solutions</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Industrial-Grade Inventory Management
              </h2>
              <p className="text-slate-400 mt-2 text-lg">
                Streamline your warehouse operations with precision engineering
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <Package className="h-6 w-6 text-primary mb-2" />
                <div className="text-lg font-bold text-white tabular-nums">Multi-Location</div>
                <div className="text-xs text-slate-400">Stock Tracking</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <BarChart3 className="h-6 w-6 text-primary mb-2" />
                <div className="text-lg font-bold text-white tabular-nums">Real-time</div>
                <div className="text-xs text-slate-400">Analytics</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <Shield className="h-6 w-6 text-primary mb-2" />
                <div className="text-lg font-bold text-white tabular-nums">Secure</div>
                <div className="text-xs text-slate-400">Audit Trail</div>
              </div>
            </div>
          </div>

          <div className="text-slate-500 text-xs">
            © 2025 Ciméntica Solutions. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={inventraLogo} alt="Inventra" className="h-14 w-auto" />
            <p className="text-xs text-muted-foreground mt-2">Powered by Ciméntica Solutions</p>
          </div>

          <div className="space-y-2 text-center lg:text-left mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="h-12"
                  />
                </div>
                <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                </div>
                <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}