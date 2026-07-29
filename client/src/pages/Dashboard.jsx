import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Plus, ShieldAlert, Heart, Activity, FileText, ArrowRight, User } from 'lucide-react';

const Dashboard = () => {
  const { token, API_HOST } = useAuth();
  const [reports, setReports] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParam, setSelectedParam] = useState('glucose_fasting');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch reports
        const reportsRes = await fetch(`${API_HOST}/api/reports`, { headers });
        const reportsData = await reportsRes.json();
        
        // Fetch trends
        const trendsRes = await fetch(`${API_HOST}/api/reports/trends/analytics`, { headers });
        const trendsData = await trendsRes.json();
        
        if (reportsRes.ok) setReports(reportsData);
        if (trendsRes.ok) setTrends(trendsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, API_HOST]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div style={{ fontSize: '1.25rem', color: '#64748b', fontWeight: 500 }}>Loading clinical data...</div>
      </div>
    );
  }

  const latestReport = reports[0];

  // Map disease risks for the radar chart
  const diseaseData = latestReport ? Object.keys(latestReport.mlResult.diseaseRisks).map(k => ({
    subject: k.replace('_', ' ').toUpperCase(),
    value: Math.round(latestReport.mlResult.diseaseRisks[k] * 100),
    fullMark: 100,
  })) : [];

  // Get status color for the risk score
  const getTierStyles = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'low': return { bg: '#e0f2fe', text: '#0369a1', accent: '#0284c7' };
      case 'moderate': return { bg: '#fef3c7', text: '#b45309', accent: '#d97706' };
      case 'high': return { bg: '#fee2e2', text: '#b91c1c', accent: '#dc2626' };
      case 'critical': return { bg: '#fca5a5', text: '#7f1d1d', accent: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#475569', accent: '#64748b' };
    }
  };

  const tierStyle = getTierStyles(latestReport?.mlResult.riskTier);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Health Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Personalized disease risk predictions and trend analytics</p>
        </div>
        <Link to="/entry" className="btn btn-primary">
          <Plus size={18} />
          New Report
        </Link>
      </div>

      {!latestReport ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <ShieldAlert size={48} color="#64748b" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>No Medical Records Detected</h3>
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '400px', marginInline: 'auto' }}>
            Upload a PDF blood report or log parameters manually to kickstart the ML classification and risk scoring pipeline.
          </p>
          <Link to="/entry" className="btn btn-primary">Get Started</Link>
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <div className="dashboard-grid">
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', backgroundColor: tierStyle.bg,
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', fontWeight: 800, color: tierStyle.text
              }}>
                {latestReport.mlResult.overallRiskScore}
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>OVERALL RISK SCORE</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className={`badge ${latestReport.mlResult.riskTier.toLowerCase()}`}>
                    {latestReport.mlResult.riskTier} Risk
                  </span>
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#10b981' }}>
                <Heart size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>ANALYTIC METRICS</h4>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                  {Object.keys(latestReport.parameters).length} Biomarkers Tracked
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                <Activity size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>LATEST REPORT DATE</h4>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                  {new Date(latestReport.reportDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="dashboard-grid">
            {/* Historical Trend Line Chart */}
            <div className="card span-2" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Biomarker Historical Trends</h3>
                <select 
                  className="form-input" 
                  style={{ width: '180px', padding: '6px 12px', fontSize: '0.875rem' }}
                  value={selectedParam}
                  onChange={(e) => setSelectedParam(e.target.value)}
                >
                  <option value="glucose_fasting">Fasting Glucose</option>
                  <option value="hemoglobin">Hemoglobin</option>
                  <option value="wbc_count">White Blood Cells</option>
                  <option value="creatinine">Creatinine</option>
                  <option value="platelets">Platelets</option>
                  <option value="riskScore">Overall Risk Score</option>
                </select>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey={selectedParam} stroke="#0284c7" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
                    Insufficient history to build line trends. Log more reports.
                  </div>
                )}
              </div>
            </div>

            {/* Disease Radar Chart */}
            <div className="card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>ML Predicted Disease Risks</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" radius="70%" data={diseaseData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" style={{ fontSize: '10px', fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: '10px' }} />
                    <Radar name="Risk Level" dataKey="value" stroke="#0284c7" fill="#e0f2fe" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Latest report details */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#0284c7" />
              Latest Biomarker Levels
            </h3>
            <div className="parameters-list">
              {Object.entries(latestReport.parameters).map(([key, item]) => {
                const flag = latestReport.mlResult.flags[key] || 'normal';
                return (
                  <div key={key} className={`parameter-item ${flag}`}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      {key.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, marginBlock: '4px' }}>
                      {item.value} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b' }}>{item.unit || ''}</span>
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className={`badge ${flag}`}>{flag.replace('_', ' ')}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: {item.ref_range || 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Logs List */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Report Submission History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: '#64748b', fontSize: '0.875rem' }}>
                    <th style={{ paddingBlock: '12px' }}>Date</th>
                    <th>Source</th>
                    <th>Biomarkers</th>
                    <th>Risk Score</th>
                    <th>Risk Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem' }}>
                      <td style={{ paddingBlock: '16px', fontWeight: 500 }}>
                        {new Date(rep.reportDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{rep.sourceType}</td>
                      <td>{Object.keys(rep.parameters).length} tracked</td>
                      <td style={{ fontWeight: 700 }}>{rep.mlResult.overallRiskScore}</td>
                      <td>
                        <span className={`badge ${rep.mlResult.riskTier.toLowerCase()}`}>
                          {rep.mlResult.riskTier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
