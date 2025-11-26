import { Routes, Route } from 'react-router-dom';
import VirtualPaint from './components/VirtualPaint';
import GesturePDFViewer from './components/GesturePDFViewer';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<VirtualPaint />} />
      <Route path="/pdf" element={<GesturePDFViewer />} />
    </Routes>
  );
}

export default App;
