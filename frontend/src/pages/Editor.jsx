import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getNote, renameNote, setPassword, removePassword, setExpiry as setExpiryApi, sendMessage, uploadAttachment, deleteAttachment } from '../api/noteApi';
import PasswordPrompt from './PasswordPrompt';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import socket from '../socket';

const Editor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Security state
  const [isLocked, setIsLocked] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(null);

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState(slug);
  const [renameError, setRenameError] = useState('');

  // Copy state
  const [isCopied, setIsCopied] = useState(false);

  // Settings Panel state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMode, setSettingsMode] = useState('change');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // View Mode state
  const [viewMode, setViewMode] = useState('edit');

  const [expiresAt, setExpiresAt] = useState(null);
  const [settingsExpiry, setSettingsExpiry] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  // Socket.io state
  const [myLabel, setMyLabel] = useState('');
  const myLabelRef = useRef('');
  const [activeUsers, setActiveUsers] = useState([]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    myLabelRef.current = myLabel;
  }, [myLabel]);

  useEffect(() => {
    // Reset states when URL changes
    setNewSlugInput(slug);
    setIsRenaming(false);
    setRenameError('');
    setShowSettings(false);
    setSettingsMode('change');
    setSettingsPassword('');
    setSettingsCurrentPassword('');
    setSettingsMessage('');
    setSettingsError('');
    setSettingsCurrentPassword('');
    setCurrentPassword(null);
    setMessages([]);
    setAttachments([]);
    setNewMessage('');

    const fetchNote = async () => {
      try {
        const data = await getNote(slug);
        setMessages(data.messages || []);
        setAttachments(data.attachments || []);
        setIsLocked(data.locked);
        setNeedsPassword(false);
        setExpiresAt(data.expiresAt || null);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setNotFound(true);
        } else if (err.response && err.response.status === 401 && err.response.data.locked) {
          setNeedsPassword(true);
          setIsLocked(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    socket.emit('join-note', slug);

    const handleMessageReceived = (msg) => {
      if (msg.sender !== myLabelRef.current) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleYourLabel = ({ slug: s, label }) => {
      if (s === slug) setMyLabel(label);
    };

    const handleActiveUsers = (users) => {
      setActiveUsers(users);
    };

    socket.on('message-received', handleMessageReceived);
    socket.on('your-label', handleYourLabel);
    socket.on('active-users', handleActiveUsers);

    return () => {
      socket.emit('leave-note', slug);
      socket.off('message-received', handleMessageReceived);
      socket.off('your-label', handleYourLabel);
      socket.off('active-users', handleActiveUsers);
    };
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewMode]);

  const handleUnlock = async (password) => {
    const data = await getNote(slug, password);
    setMessages(data.messages || []);
    setAttachments(data.attachments || []);
    setIsLocked(true);
    setNeedsPassword(false);
    setCurrentPassword(password);
    setExpiresAt(data.expiresAt || null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !myLabel) return;

    const msgObj = { text, sender: myLabel, sentAt: new Date().toISOString() };
    setMessages(prev => [...prev, msgObj]);
    setNewMessage('');

    socket.emit('new-message', { slug, text, sender: myLabel });

    try {
      await sendMessage(slug, text, myLabel);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !myLabel) return;
    
    setIsUploading(true);
    try {
      const updatedNote = await uploadAttachment(slug, file, myLabel);
      setAttachments(updatedNote.attachments || []);
    } catch (err) {
      console.error('Failed to upload attachment', err);
      alert(err.response?.data?.error || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      const updatedNote = await deleteAttachment(slug, attachmentId);
      setAttachments(updatedNote.attachments || []);
    } catch (err) {
      console.error('Failed to delete attachment', err);
      alert(err.response?.data?.error || 'Failed to delete attachment');
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    setRenameError('');

    if (newSlugInput === slug) {
      setIsRenaming(false);
      return;
    }

    try {
      await renameNote(slug, newSlugInput);
      setIsRenaming(false);
      navigate(`/${newSlugInput}`, { replace: true });
    } catch (err) {
      setRenameError(err.response?.data?.error || 'Failed to rename URL');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');
    try {
      await setPassword(slug, settingsPassword, isLocked ? settingsCurrentPassword : null);
      setIsLocked(true);
      setCurrentPassword(settingsPassword);
      setSettingsPassword('');
      setSettingsCurrentPassword('');
      setSettingsMessage('Password set successfully');
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Failed to set password');
    }
  };

  const handleRemovePassword = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');
    try {
      await removePassword(slug, settingsCurrentPassword);
      setIsLocked(false);
      setCurrentPassword(null);
      setSettingsCurrentPassword('');
      setSettingsPassword('');
      setSettingsMessage('Password removed successfully');
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Failed to remove password');
    }
  };

  const handleSetExpiry = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');
    try {
      const isoString = settingsExpiry ? new Date(settingsExpiry).toISOString() : null;
      const updatedNote = await setExpiryApi(slug, isoString);
      setExpiresAt(updatedNote.expiresAt || null);
      setSettingsMessage('Expiry updated successfully');
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Failed to update expiry');
    }
  };

  const handleClearExpiry = async () => {
    setSettingsMessage('');
    setSettingsError('');
    try {
      const updatedNote = await setExpiryApi(slug, null);
      setExpiresAt(updatedNote.expiresAt || null);
      setSettingsExpiry('');
      setSettingsMessage('Expiry cleared');
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Failed to clear expiry');
    }
  };

  useEffect(() => {
    if (showSettings) {
      if (expiresAt) {
        const date = new Date(expiresAt);
        const localStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setSettingsExpiry(localStr);
      } else {
        setSettingsExpiry('');
      }
    }
  }, [showSettings, expiresAt]);

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining('');
      return;
    }

    const calculateRemaining = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`Expires in ${days}d ${hours % 24}h`);
      } else {
        setTimeRemaining(`Expires in ${hours}h ${minutes}m`);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (loading) return <div className="loading">Loading...</div>;

  if (notFound) {
    return (
      <div className="not-found">
        <h1>Note not found</h1>
        <Link to="/">Create a new note</Link>
      </div>
    );
  }

  if (needsPassword) {
    return <PasswordPrompt slug={slug} onUnlock={handleUnlock} />;
  }

  const wordCount = messages.reduce((acc, msg) => acc + msg.text.split(/\s+/).filter(w => w.length > 0).length, 0);
  const charCount = messages.reduce((acc, msg) => acc + msg.text.length, 0);

  return (
    <div className="editor-container">
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt,.csv"
      />
      <header className="editor-header">
        <div className="header-left">
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="rename-form">
              <span className="slug-prefix">/</span>
              <input
                type="text"
                value={newSlugInput}
                onChange={(e) => setNewSlugInput(e.target.value)}
                className="rename-input"
                autoFocus
              />
              <button type="submit" className="btn-small btn-primary">Change</button>
              <button type="button" className="btn-small" onClick={() => { setIsRenaming(false); setRenameError(''); setNewSlugInput(slug); }}>Cancel</button>
              {renameError && <span className="rename-error">{renameError}</span>}
            </form>
          ) : (
            <>
              <span className="slug">/{slug} {isLocked && '🔒'}</span>
              {myLabel && <span className="user-label">You are {myLabel}</span>}
              {activeUsers.length > 1 && (
                <span className="viewer-count" title={`Also here: ${activeUsers.filter(u => u !== myLabel).join(', ')}`}>
                  👀 {activeUsers.length} viewing
                </span>
              )}
              {timeRemaining && <span className="expiry-label">{timeRemaining}</span>}
              <button className="btn-small btn-text" onClick={() => setIsRenaming(true)}>Change URL</button>

              <div className="view-mode-toggle">
                <button 
                  className={`btn-small ${viewMode === 'edit' ? 'active' : ''}`} 
                  onClick={() => setViewMode('edit')}
                >Chat</button>
                <button 
                  className={`btn-small ${viewMode === 'preview' ? 'active' : ''}`} 
                  onClick={() => setViewMode('preview')}
                >Preview</button>
                <button 
                  className={`btn-small ${viewMode === 'raw' ? 'active' : ''}`} 
                  onClick={() => setViewMode('raw')}
                >Raw</button>
              </div>

              <div className="settings-dropdown">
                <button className="btn-small btn-text" onClick={() => setShowSettings(!showSettings)}>Settings</button>
                {showSettings && (
                  <div className="settings-panel">
                    {!isLocked ? (
                      <>
                        <h4>Set Password</h4>
                        <form onSubmit={handleSetPassword}>
                          <input 
                            type="password" 
                            placeholder="New Password" 
                            value={settingsPassword}
                            onChange={(e) => setSettingsPassword(e.target.value)}
                            required
                            minLength={4}
                          />
                          <button type="submit" className="btn-small btn-primary">Set Password</button>
                        </form>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <button 
                            className={`btn-small ${settingsMode === 'change' ? 'btn-primary' : ''}`} 
                            onClick={() => { setSettingsMode('change'); setSettingsMessage(''); setSettingsError(''); }}
                          >
                            Change
                          </button>
                          <button 
                            className={`btn-small ${settingsMode === 'remove' ? 'btn-primary' : ''}`} 
                            onClick={() => { setSettingsMode('remove'); setSettingsMessage(''); setSettingsError(''); }}
                          >
                            Remove
                          </button>
                        </div>
                        {settingsMode === 'change' && (
                          <form onSubmit={handleSetPassword}>
                            <input 
                              type="password" 
                              placeholder="Current Password" 
                              value={settingsCurrentPassword}
                              onChange={(e) => setSettingsCurrentPassword(e.target.value)}
                              required
                            />
                            <input 
                              type="password" 
                              placeholder="New Password" 
                              value={settingsPassword}
                              onChange={(e) => setSettingsPassword(e.target.value)}
                              required
                              minLength={4}
                            />
                            <button type="submit" className="btn-small btn-primary">Change Password</button>
                          </form>
                        )}
                        {settingsMode === 'remove' && (
                          <form onSubmit={handleRemovePassword}>
                            <input 
                              type="password" 
                              placeholder="Current Password" 
                              value={settingsCurrentPassword}
                              onChange={(e) => setSettingsCurrentPassword(e.target.value)}
                              required
                            />
                            <button type="submit" className="btn-small btn-primary">Remove Password</button>
                          </form>
                        )}
                      </>
                    )}
                    <hr style={{ margin: '1rem 0', borderColor: '#eaeaea', width: '100%' }} />
                    <h4>Note Expiry</h4>
                    <form onSubmit={handleSetExpiry} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input 
                        type="datetime-local" 
                        value={settingsExpiry} 
                        onChange={(e) => setSettingsExpiry(e.target.value)}
                        className="settings-input"
                        required
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn-small btn-primary" style={{flex: 1}}>Set Expiry</button>
                        <button type="button" className="btn-small" style={{flex: 1}} onClick={handleClearExpiry}>Clear Expiry</button>
                      </div>
                    </form>
                    {settingsMessage && <p className="success-text">{settingsMessage}</p>}
                    {settingsError && <p className="error-text">{settingsError}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="header-right">
          <button 
            className="btn-small" 
            onClick={() => fileInputRef.current?.click()}
            title="Upload a file as an attachment"
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : '📎 Upload File'}
          </button>
          <button className={`btn-small ${isCopied ? 'copied' : ''}`} onClick={handleCopyLink}>
            {isCopied ? 'Copied!' : 'Copy Link'}
          </button>
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </header>

      {viewMode === 'edit' && (
        <div className="notepad-container">
          <div className="notepad-content">
            {attachments.length > 0 && (
              <div className="attachments-container">
                {attachments.map((att, idx) => (
                  <div key={idx} className="attachment-chip">
                    {att.fileType && att.fileType.startsWith('image/') && (
                      <img src={att.fileUrl} alt={att.fileName} className="attachment-thumb" />
                    )}
                    <div className="attachment-info">
                      <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="attachment-name">
                        {att.fileName}
                      </a>
                      <span className="attachment-size">{(att.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <button className="btn-remove-attachment" onClick={() => handleDeleteAttachment(att._id)} title="Remove attachment">×</button>
                  </div>
                ))}
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className="notepad-line">
                <span className="notepad-sender">{msg.sender === myLabel ? 'You' : msg.sender}:</span>{' '}
                <span className="notepad-text">{msg.text}</span>
              </div>
            ))}
            {myLabel && (
              <form className="notepad-input-line" onSubmit={handleSendMessage}>
                <span className="notepad-sender">You:</span>{' '}
                <button 
                  type="button" 
                  className="btn-attach" 
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  disabled={isUploading}
                >
                  📎
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isUploading ? "Uploading..." : ""}
                  autoFocus
                  className="notepad-input"
                  disabled={isUploading}
                />
                <button type="submit" style={{ display: 'none' }} disabled={!newMessage.trim() || isUploading}></button>
              </form>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="markdown-preview chat-preview">
          {messages.map((msg, idx) => (
            <div key={idx} className="preview-message">
              <strong>{msg.sender}:</strong>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.text)) }} />
            </div>
          ))}
        </div>
      )}

      {viewMode === 'raw' && (
        <pre className="raw-preview">
          {messages.map(msg => `[${msg.sender}] ${msg.text}`).join('\n')}
        </pre>
      )}
    </div>
  );
};

export default Editor;
