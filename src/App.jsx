import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Book from './pages/Book';
import Return from './pages/Return';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<Book />} />
        <Route path="/return" element={<Return />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;