import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, Send, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

const WhatIfAssistant = () => {
  const { token, API_HOST } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef(null);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_HOST}/api/whatif/history/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    };
    loadHistory();
  }, [token, API_HOST, sessionId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput('');
    setLoading(true);

    // Append user message immediately
    const userMsg = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`${API_HOST}/api/whatif/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, question: text })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(data.chat.messages);
      } else {
        const errMsg = { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error communicating with the Express backend service. Please check if services are running.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch (err) {
      const errMsg = { 
        role: 'assistant', 
        content: 'Server error: Connection lost. Make sure the backend server is active.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    "If I walk 10k steps a day, how does that affect my risk profile?",
    "If I reduce processed sugar intake, what happens to my glucose forecast?",
    "What iron-rich foods can help improve my hemoglobin numbers?"
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '82vh' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={28} color="#0284c7" />
          "What-If" AI Assistant
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Hypothetical scenario planner powered by LLM. See how health variables influence your biomarkers.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        {/* Chat window */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }} className="chat-container">
          <div className="chat-history">
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#64748b', textAlign: 'center', padding: '20px' }}>
                <MessageSquare size={48} color="#94a3b8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>AI Medical Reasoning Sandbox</h3>
                  <p style={{ fontSize: '0.875rem', maxWidth: '380px', marginTop: '4px' }}>
                    Ask how specific behaviors, exercises, or dietary choices might improve your latest blood test results.
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                {msg.content.split('\n').map((para, i) => (
                  <p key={i} style={{ marginBottom: para.startsWith('*') ? '0' : '8px' }}>{para}</p>
                ))}
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant" style={{ fontStyle: 'italic', color: '#64748b' }}>
                Reasoning over blood metrics...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="chat-input-area"
          >
            <input
              type="text"
              className="form-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a hypothetical health question..."
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ paddingInline: '16px' }} disabled={loading}>
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Sidebar Templates */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <HelpCircle size={18} color="#0284c7" />
              Suggested Scenarios
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map((temp, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(temp)}
                  disabled={loading}
                  style={{
                    padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: '#f8fafc',
                    textAlign: 'left', fontSize: '0.85rem', cursor: 'pointer', color: '#334155', fontWeight: 500, transition: 'var(--transition-all)'
                  }}
                  className="template-btn"
                >
                  {temp}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b45309' }}>Clinical Disclaimer</h4>
              <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px', lineHeight: 1.4 }}>
                This assistant is designed to simulate physiological correlations using predictive rules. It is not an alternative to professional medical consultation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIfAssistant;
