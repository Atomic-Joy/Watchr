import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { ArrowRight } from 'lucide-react';

export function AuthPage() {
  const { isAuthenticated, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch('http://localhost:8000/api/v1/auth/login/access-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Login failed');
        }

        const data = await res.json();
        login(data.access_token);
      } else {
        const res = await fetch('http://localhost:8000/api/v1/users/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Registration failed');
        }

        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const loginRes = await fetch('http://localhost:8000/api/v1/auth/login/access-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });

        if (loginRes.ok) {
          const data = await loginRes.json();
          login(data.access_token);
        } else {
          setIsLogin(true);
          setError('Registration successful. Please log in.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brutal-black flex flex-col justify-center items-center px-4 font-sans">
      {/* Decorative Grid Lines */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-0 left-1/4 w-px h-full bg-brutal-white"></div>
        <div className="absolute top-0 left-2/4 w-px h-full bg-brutal-white"></div>
        <div className="absolute top-0 left-3/4 w-px h-full bg-brutal-white"></div>
        <div className="absolute top-1/3 left-0 w-full h-px bg-brutal-white"></div>
        <div className="absolute top-2/3 left-0 w-full h-px bg-brutal-white"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-bold tracking-tighter text-brutal-red mb-2">
            WATCHR
          </h1>
          <p className="text-[11px] text-brutal-gray uppercase tracking-[0.4em]">
            Track Everything You Watch
          </p>
        </div>

        {/* Form Card */}
        <div className="border-2 border-brutal-border bg-brutal-dark p-8">
          <h2 className="font-serif italic text-3xl text-brutal-white mb-1">
            {isLogin ? 'Welcome back' : 'Join the club'}
          </h2>
          <p className="text-brutal-gray text-sm mb-8 uppercase tracking-wider">
            {isLogin ? 'Sign in to continue' : 'Create your account'}
          </p>

          {error && (
            <div className="mb-6 p-3 border-2 border-brutal-red bg-brutal-red/10 text-brutal-red text-sm font-bold uppercase tracking-wide">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] text-brutal-gray uppercase tracking-[0.3em] mb-2 font-bold">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutal-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[10px] text-brutal-gray uppercase tracking-[0.3em] mb-2 font-bold">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brutal-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="brutal-btn brutal-btn-primary w-full mt-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-brutal-pulse">Processing...</span>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-brutal-border text-center">
            <span className="text-brutal-gray text-xs uppercase tracking-wider">
              {isLogin ? 'New here?' : 'Already have an account?'}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="block mx-auto mt-2 text-brutal-red font-bold text-sm uppercase tracking-wider hover:text-brutal-white transition-colors"
            >
              {isLogin ? 'Create Account →' : 'Sign In Instead →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
