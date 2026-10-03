import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
const Book = lazy(() => import('./pages/Book'));
const Return = lazy(() => import('./pages/Return'));
const Edit = lazy(() => import('./pages/Edit'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 20 }}>กำลังโหลด...</div>}><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<Book />} />
        <Route path="/return" element={<Return />} />
        <Route path="/edit/:bookingId" element={<Edit />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}

export default App;
