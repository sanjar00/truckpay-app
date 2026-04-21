
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  isSocialAuth: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithLinkedIn: () => Promise<{ error: any }>;
  completeSocialProfile: (userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SOCIAL_PROVIDERS = ['google', 'linkedin_oidc'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isSocialAuth, setIsSocialAuth] = useState(false);

  useEffect(() => {
    let listenerFired = false;

    // Set up auth state listener FIRST — catches PASSWORD_RECOVERY before getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        listenerFired = true;
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          setIsPasswordRecovery(false);
        }
        const provider = session?.user?.app_metadata?.provider ?? '';
        setIsSocialAuth(SOCIAL_PROVIDERS.includes(provider));
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Only use getSession as fallback if the listener hasn't fired (normal page load with existing session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!listenerFired) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const completeSocialProfile = async (userData: any) => {
    if (!user) return { error: new Error('No user') };
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: userData.full_name,
      phone: userData.phone,
      driver_type: userData.driver_type,
      company_deduction: userData.company_deduction || '0',
      weekly_period: userData.weekly_period,
      lease_rate_per_mile: userData.lease_rate_per_mile || null,
      company_pay_type: userData.company_pay_type || null,
      company_pay_rate: userData.company_pay_rate || null,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error };
  };

  const signInWithLinkedIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isPasswordRecovery,
      isSocialAuth,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithLinkedIn,
      completeSocialProfile,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
