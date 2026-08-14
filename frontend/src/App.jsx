import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NewNote from './pages/NewNote';
import Editor from './pages/Editor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NewNote />} />
        <Route path="/:slug" element={<Editor />} />
      </Routes>
    </Router>
  );
}

export default App;
