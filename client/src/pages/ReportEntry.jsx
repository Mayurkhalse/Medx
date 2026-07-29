import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Upload, Send } from 'lucide-react';

const ReportEntry = () => {
  const { token, API_HOST } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual form state
  const [glucose, setGlucose] = useState('90');
  const [hemoglobin, setHemoglobin] = useState('14');
  const [wbc, setWbc] = useState('7000');
  const [creatinine, setCreatinine] = useState('0.9');
  const [platelets, setPlatelets] = useState('250000');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // File upload state
  const [file, setFile] = useState(null);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const parameters = {
      glucose_fasting: { value: parseFloat(glucose), unit: 'mg/dL', ref_range: '70-100' },
      hemoglobin: { value: parseFloat(hemoglobin), unit: 'g/dL', ref_range: '12-17' },
      wbc_count: { value: parseFloat(wbc), unit: '/uL', ref_range: '4000-11000' },
      creatinine: { value: parseFloat(creatinine), unit: 'mg/dL', ref_range: '0.6-1.3' },
      platelets: { value: parseFloat(platelets), unit: '/uL', ref_range: '150000-450000' }
    };

    try {
      const response = await fetch(`${API_HOST}/api/reports/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reportDate, parameters })
      });

      if (response.ok) {
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit report parameters.');
      }
    } catch (err) {
      setError('Connection to Express backend failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setError('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('reportFile', file);

    try {
      const response = await fetch(`${API_HOST}/api/reports/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to parse file.');
      }
    } catch (err) {
      setError('Connection to Express backend failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.875rem', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Log Lab Results</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Upload your blood test PDF or input parameters manually to calculate disease classification models.</p>
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => { setActiveTab('manual'); setError(''); }}
          style={{
            padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'manual' ? '3px solid var(--color-primary)' : 'none',
            color: activeTab === 'manual' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer'
          }}
        >
          Manual Entry
        </button>
        <button 
          onClick={() => { setActiveTab('upload'); setError(''); }}
          style={{
            padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'upload' ? '3px solid var(--color-primary)' : 'none',
            color: activeTab === 'upload' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer'
          }}
        >
          PDF Report Upload (OCR)
        </button>
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#0284c7" />
            Biomarker Form
          </h2>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Report Date</label>
            <input type="date" className="form-input" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Fasting Glucose (mg/dL)</label>
              <input type="number" step="any" className="form-input" value={glucose} onChange={(e) => setGlucose(e.target.value)} placeholder="e.g. 90" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hemoglobin (g/dL)</label>
              <input type="number" step="any" className="form-input" value={hemoglobin} onChange={(e) => setHemoglobin(e.target.value)} placeholder="e.g. 14" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">WBC Count (/uL)</label>
              <input type="number" step="any" className="form-input" value={wbc} onChange={(e) => setWbc(e.target.value)} placeholder="e.g. 7000" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Creatinine (mg/dL)</label>
              <input type="number" step="any" className="form-input" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} placeholder="e.g. 0.9" required />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <label className="form-label">Platelets (/uL)</label>
              <input type="number" step="any" className="form-input" value={platelets} onChange={(e) => setPlatelets(e.target.value)} placeholder="e.g. 250000" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
            <Send size={18} />
            {submitting ? 'Analyzing parameters...' : 'Analyze & Save'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleFileUpload} className="card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} color="#0284c7" />
            PDF Ingestion
          </h2>

          <div 
            className="dropzone"
            onClick={() => document.getElementById('pdf-file-input').click()}
          >
            <Upload size={32} color="#64748b" style={{ marginBottom: '12px' }} />
            <p style={{ fontWeight: 500, color: '#0f172a' }}>
              {file ? file.name : 'Click to select or drag and drop your blood report PDF'}
            </p>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>Supports text-based or scanned lab reports</p>
            <input 
              id="pdf-file-input"
              type="file"
              accept=".pdf,text/plain"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
            <Upload size={18} />
            {submitting ? 'Parsing & running ML model...' : 'Upload & Process'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ReportEntry;
