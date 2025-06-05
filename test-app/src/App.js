import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/login/Login'
import Checklist from './features/checklist/Checklist';



  function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect default path to /login */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/checklist" element={<Checklist />} />
      </Routes>
    </Router>
  );
}

export default App;
