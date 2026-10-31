'use client';
import React from 'react';

export default function AppFrame({ children }) {
  return (
    <div className="shammah-app-frame-root">
      <div className="shammah-app-frame-content">
        {children}
      </div>
    </div>
  );
}
