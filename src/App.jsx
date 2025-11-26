import { useState } from 'react'
import VirtualPaint from './components/VirtualPaint'
import './App.css'
import VirtualPDFViewer from './components/VirtualPDFViewer'
import GesturePdfViewer from './components/GesturePdfViewer'

function App() {
  return (
    <div className="App">
      <VirtualPaint />
    </div>
  )
}

export default App

