'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Implement actual login with NextAuth
      // For now, show a demo message
      alert('Login functionality coming soon!\nDemo credentials: danny@housechurch.local / password123');
      // In production: await signIn('credentials', { email, password })
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px',
          color: 'var(--text-primary)',
        }}>
          HouseChurchApp
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '32px',
        }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-group label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="danny@housechurch.local"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-group label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 20px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s',
              marginBottom: '16px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          Don't have an account?{' '}
          <Link
            href="/register"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
