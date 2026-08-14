import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNote } from '../api/noteApi';

const NewNote = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  const initNote = async () => {
    setError(false);
    try {
      const data = await createNote();
      navigate(`/${data.slug}`, { replace: true });
    } catch (err) {
      console.error('Failed to create note:', err);
      setError(true);
    }
  };

  useEffect(() => {
    initNote();
  }, [navigate]);

  return (
    <div className="new-note-container">
      {error ? (
        <div className="error-state">
          <p>Failed to create a new note.</p>
          <button onClick={initNote}>Retry</button>
        </div>
      ) : (
        <p>Creating your note...</p>
      )}
    </div>
  );
};

export default NewNote;
