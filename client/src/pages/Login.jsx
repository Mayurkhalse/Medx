import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <div className="card" style={{ width: '420px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'center' }}>
          <Activity size={32} color="#0284c7" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7' }}>MedX</h1>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Welcome Back</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Log in to access your health dashboard</p>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
            {submitting ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Don't have an account? <Link to="/signup" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
