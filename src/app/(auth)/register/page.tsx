'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual registration with database
      alert('Registration functionality coming soon!');
      // In production: await registerUser({ name, email, password })
    } catch (err) {
      setError('Registration failed. Please try again.');
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
          Create Account
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '32px',
        }}>
          Join HouseChurchApp
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
            <label className="form-group label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-group label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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

          <div className="form-group">
            <label className="form-group label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
