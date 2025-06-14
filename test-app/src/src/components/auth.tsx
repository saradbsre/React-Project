import React from 'react';
import { Navigate } from 'react-router-dom';

type AuthProps = {
  children: React.ReactNode;
};

const auth = ({ children }: AuthProps) => {
  const isAuthenticated = localStorage.getItem('token'); // or use context/state

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default auth;