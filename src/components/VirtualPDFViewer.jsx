// VirtualPDFViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker (essential for rendering)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const VirtualPDFViewer = () => {
  // Refs for DOM access
  const pdfContainerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null); // For MediaPipe Hands instance

  // Application state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfFile, setPdfFile] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Camera off');

  // Load MediaPipe scripts dynamically
  useEffect(() => {
    const loadMediaPipe = () => {
      if (window.Hands && window.Camera) {
        console.log('MediaPipe is ready.');
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const handsScript = document.createElement('script');
        handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        const cameraScript = document.createElement('script');
        cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

        let loadedCount = 0;
        const checkLoaded = () => {
          loadedCount++;
          if (loadedCount === 2) {
            setTimeout(resolve, 500);
          }
        };

        handsScript.onload = checkLoaded;
        cameraScript.onload = checkLoaded;
        document.head.appendChild(handsScript);
        document.head.appendChild(cameraScript);
      });
    };

    loadMediaPipe().catch(console.error);
  }, []);

  // Start the camera and hand tracking
  const startGestureControl = async () => {
    try {
      await loadMediaPipe();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        initializeHandTracking();
      };
    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("Could not access your camera. Please check permissions.");
    }
  };

  // Initialize MediaPipe Hands
  const initializeHandTracking = () => {
    if (!window.Hands) {
      console.error("MediaPipe Hands not loaded.");
      return;
    }

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onHandResults);
    handsRef.current = hands;

    // Start processing frames from the camera
    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });
    camera.start();
    setIsCameraOn(true);
    setGestureStatus('👋 Show your hand');
  };

  // Process results from MediaPipe
  const onHandResults = (results) => {
    if (!canvasRef.current || !pdfContainerRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw hand landmarks (optional, for visual feedback)
    if (results.multiHandLandmarks) {
      ctx.fillStyle = '#00FF00';
      results.multiHandLandmarks.forEach(landmarks => {
        landmarks.forEach(landmark => {
          ctx.beginPath();
          ctx.arc(landmark.x * canvasRef.current.width, landmark.y * canvasRef.current.height, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }

    // Gesture-to-Scroll Logic (Simplified Example)
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Get the tip of the index finger (landmark 8)
      const indexFingerTip = results.multiHandLandmarks[0][8];
      const currentY = indexFingerTip.y;

      // A simple rule: if hand is in top half of video, scroll up; bottom half, scroll down.
      // You can make this more sophisticated based on finger direction or movement.
      const scrollContainer = pdfContainerRef.current;
      const scrollAmount = 25; // Pixels to scroll per detection frame

      if (currentY < 0.4) {
        // Hand in top half -> scroll up
        scrollContainer.scrollTop -= scrollAmount;
        setGestureStatus('⬆️ Scrolling Up');
      } else if (currentY > 0.6) {
        // Hand in bottom half -> scroll down
        scrollContainer.scrollTop += scrollAmount;
        setGestureStatus('⬇️ Scrolling Down');
      } else {
        setGestureStatus('✋ Hand detected');
      }
    } else {
      setGestureStatus('👋 No hand detected');
    }
  };

  // Stop the camera
  const stopGestureControl = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
    }
    setIsCameraOn(false);
    setGestureStatus('Camera off');
  };

  // PDF load success handler
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Handle file input
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileUrl = URL.createObjectURL(file);
      setPdfFile(fileUrl);
      setPageNumber(1);
    }
  };

  return (
    <div className="viewer-container">
      {/* Hidden elements for hand tracking */}
      <div style={{ display: 'none' }}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} width="640" height="480" />
      </div>

      {/* Header Controls */}
      <div className="controls">
        <input type="file" accept="application/pdf" onChange={handleFileUpload} />
        <button onClick={isCameraOn ? stopGestureControl : startGestureControl}>
          {isCameraOn ? 'Stop Gestures' : 'Start Gestures'}
        </button>
        <span>Status: {gestureStatus}</span>
      </div>

      {/* PDF Viewer */}
      <div ref={pdfContainerRef} className="pdf-scroll-container">
        {pdfFile && (
          <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from(new Array(numPages), (el, index) => (
              <Page 
                key={`page_${index + 1}`} 
                pageNumber={index + 1} 
                width={800} 
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
};

export default VirtualPDFViewer;