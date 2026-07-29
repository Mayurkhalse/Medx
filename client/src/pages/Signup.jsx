import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await signup(name, email, password, dob, gender);
    setSubmitting(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <div className="card" style={{ width: '460px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'center' }}>
          <Activity size={32} color="#0284c7" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7' }}>MedX</h1>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Create your Account</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Track, analyze, and optimize your health profile</p>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
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
              placeholder="Min. 8 characters"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">Gender</label>
              <select
                className="form-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
