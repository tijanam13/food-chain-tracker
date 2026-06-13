import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">EatSmart</h1>
        </div>

        <div className="glass-card rounded-2xl p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-muted-foreground text-sm">
                We sent a password reset link to <span className="text-foreground font-medium">{email}</span>
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-6">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Forgot Password</h2>
              <p className="text-muted-foreground text-sm mb-6">Enter your email to reset 🔑</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link to="/login" className="text-primary hover:underline font-medium">
                  <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
