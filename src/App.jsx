import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VirtualPaint from './components/VirtualPaint';
import './App.css';
import GesturePDFViewer from './components/GesturePDFViewer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VirtualPaint />} />
        <Route path="/pdf" element={<GesturePDFViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
