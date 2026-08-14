import React, { useState } from 'react';

const PasswordPrompt = ({ slug, onUnlock }) => {
  const [password, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onUnlock(password);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-prompt-container">
      <div className="password-prompt-card">
        <h2>Locked Note</h2>
        <p>This note is password protected.</p>
        <form onSubmit={handleSubmit} className="password-prompt-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            required
            autoFocus
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
};

export default PasswordPrompt;
