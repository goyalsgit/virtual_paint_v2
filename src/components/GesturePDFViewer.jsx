import { useEffect, useRef, useState } from 'react'

const GesturePDFViewer = () => {
  // ===== REFERENCES TO HTML ELEMENTS =====
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const pdfContainerRef = useRef(null)

  // ===== STATE VARIABLES =====
  const [cameraActive, setCameraActive] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [lastGesture, setLastGesture] = useState('')
  const [isHandDetected, setIsHandDetected] = useState(false)
  const [scrollActive, setScrollActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [scrollSpeed, setScrollSpeed] = useState(7)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageCanvases, setPageCanvases] = useState([])

  // ===== REFERENCES FOR COMPLEX OBJECTS =====
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const scrollIntervalRef = useRef(null)
  const mediaPipeLoaded = useRef(false)
  const currentGestureRef = useRef('none')
  const scrollSpeedRef = useRef(scrollSpeed)
  const currentScrollAmountRef = useRef(0)
  const currentIntervalTimeRef = useRef(0)
  const prevHandXRef = useRef(null)
  const renderTasksRef = useRef(new Map())

  // ===== EFFECT: UPDATE SPEED WHEN IT CHANGES =====
  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed
    const { scrollAmount, intervalTime } = calculateSpeedValues(scrollSpeed)
    currentScrollAmountRef.current = scrollAmount
    currentIntervalTimeRef.current = intervalTime
  }, [scrollSpeed])

  // ===== EFFECT: RENDER PAGES WHEN PDF DOC OR ZOOM CHANGES =====
  useEffect(() => {
    if (pdfDoc && pdfContainerRef.current) {
      renderAllPages()
    }
  }, [pdfDoc, zoomLevel])

  // ===== EFFECT: LOAD MEDIAPIPE =====
  useEffect(() => {
    if (mediaPipeLoaded.current) return

    const loadMediaPipe = async () => {
      try {
        if (window.Hands && window.Camera && window.drawConnectors) {
          mediaPipeLoaded.current = true
          return
        }

        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`)
            if (existingScript) {
              resolve()
              return
            }

            const script = document.createElement('script')
            script.src = src
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
        }

        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
        
        mediaPipeLoaded.current = true
        console.log('MediaPipe fully loaded!')

      } catch (error) {
        console.error('Error loading MediaPipe:', error)
      }
    }

    loadMediaPipe()
  }, [])

  // ===== EFFECT: LOAD PDF.JS =====
  useEffect(() => {
    const loadPDFJS = () => {
      if (window.pdfjsLib) {
        console.log('PDF.js already loaded')
        return
      }

      const pdfjsScript = document.createElement('script')
      pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'
      pdfjsScript.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
          console.log('PDF.js loaded successfully!')
        }
      }
      
      pdfjsScript.onerror = () => {
        console.error('Failed to load PDF.js')
        alert('Failed to load PDF library. Please refresh the page.')
      }
      
      document.head.appendChild(pdfjsScript)
    }

    loadPDFJS()
  }, [])

  // ===== HANDLE PDF FILE UPLOAD =====
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    
    if (!file) {
      console.log('No file selected')
      return
    }

    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file (.pdf)')
      return
    }

    console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type)

    setIsLoading(true)
    
    // Clear previous PDF
    setPageCanvases([])
    setPdfFile(null)
    setTotalPages(0)
    setCurrentPage(1)
    setPdfDoc(null)

    try {
      const fileUrl = URL.createObjectURL(file)
      console.log('Created file URL:', fileUrl)
      
      setPdfFile(fileUrl)
      await loadPdfDocument(fileUrl)
      
    } catch (error) {
      console.error('Error in handleFileUpload:', error)
      alert('Error loading PDF: ' + error.message)
      
      setPdfFile(null)
      setPageCanvases([])
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // ===== LOAD PDF DOCUMENT (REAL PDF VIEWER APPROACH) =====
  const loadPdfDocument = async (fileUrl) => {
    console.log('Starting PDF load...')
    
    if (!window.pdfjsLib) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (!window.pdfjsLib) {
        throw new Error('PDF library is still loading. Please wait and try again.')
      }
    }

    try {
      console.log('Loading PDF document from URL:', fileUrl)
      
      const loadingTask = window.pdfjsLib.getDocument(fileUrl)
      const pdfDocument = await loadingTask.promise
      
      console.log('PDF document loaded. Number of pages:', pdfDocument.numPages)
      
      setPdfDoc(pdfDocument)
      setTotalPages(pdfDocument.numPages)
      setCurrentPage(1)

      // Initialize canvas array
      const canvases = Array.from({ length: pdfDocument.numPages }, (_, i) => ({
        id: `pdf-page-${i + 1}`,
        pageNumber: i + 1,
        rendered: false
      }))
      
      setPageCanvases(canvases)
      console.log(`Ready to render ${pdfDocument.numPages} pages with vector quality`)
      
    } catch (error) {
      console.error('Error in loadPdfDocument:', error)
      
      if (error.name === 'PasswordException') {
        throw new Error('This PDF is password protected. Please use an unprotected PDF.')
      } else if (error.name === 'InvalidPDFException') {
        throw new Error('This file is not a valid PDF. Please try another file.')
      } else {
        throw new Error('Failed to load PDF: ' + error.message)
      }
    }
  }

  // ===== RENDER ALL PAGES WITH VECTOR QUALITY =====
  const renderAllPages = async () => {
    if (!pdfDoc || !pdfContainerRef.current) return

    console.log('Rendering PDF pages with vector quality...')
    
    const container = pdfContainerRef.current
    const pagesContainer = container.querySelector('.pdf-pages-container')
    
    if (!pagesContainer) {
      console.error('Pages container not found')
      return
    }

    // Clear previous content
    pagesContainer.innerHTML = ''

    // Render pages (limit to first 50 for performance)
    const pagesToRender = Math.min(totalPages, 50)
    
    for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
      await renderPage(pageNum, pagesContainer)
    }
  }

  // ===== RENDER INDIVIDUAL PAGE WITH VECTOR QUALITY =====
  const renderPage = async (pageNumber, container) => {
    if (!pdfDoc) return

    try {
      console.log(`Rendering page ${pageNumber} with vector quality...`)
      
      const page = await pdfDoc.getPage(pageNumber)
      
      // Calculate viewport with zoom
      const viewport = page.getViewport({ scale: zoomLevel })
      
      // Create page container
      const pageDiv = document.createElement('div')
      pageDiv.className = 'pdf-page'
      pageDiv.style.cssText = `
        position: relative;
        margin: 20px auto;
        border: 1px solid #444;
        border-radius: 8px;
        overflow: hidden;
        background: white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        max-width: 100%;
      `

      // Create canvas for PDF rendering
      const canvas = document.createElement('canvas')
      canvas.id = `pdf-canvas-${pageNumber}`
      canvas.style.cssText = `
        display: block;
        width: 100%;
        height: auto;
      `

      const context = canvas.getContext('2d', { alpha: false })
      
      // Set canvas resolution for high DPI displays
      const outputScale = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : null

      // Render PDF page with vector quality
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        transform: transform,
        enableWebGL: true,
        intent: 'display' // High quality display intent
      }

      await page.render(renderContext).promise

      // Add page info
      const pageInfo = document.createElement('div')
      pageInfo.style.cssText = `
        padding: 8px;
        background: #f5f5f5;
        text-align: center;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #ddd;
      `
      pageInfo.textContent = `Page ${pageNumber}`

      pageDiv.appendChild(canvas)
      pageDiv.appendChild(pageInfo)
      container.appendChild(pageDiv)

      console.log(`Page ${pageNumber} rendered with vector quality`)

    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error)
    }
  }

  // ===== ENHANCED HAND GESTURE DETECTION =====
  const detectHandGesture = (landmarks) => {
    if (!landmarks || landmarks.length < 21) {
      return 'none'
    }

    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    
    const thumbIp = landmarks[3]
    const indexPip = landmarks[6]
    const middlePip = landmarks[10]
    const ringPip = landmarks[14]
    const pinkyPip = landmarks[18]

    const thumbExtended = thumbTip.x < thumbIp.x
    const indexExtended = indexTip.y < indexPip.y - 0.05
    const middleExtended = middleTip.y < middlePip.y - 0.05
    const ringExtended = ringTip.y < ringPip.y - 0.05
    const pinkyExtended = pinkyTip.y < pinkyPip.y - 0.05

    const indexClosed = indexTip.y > indexPip.y
    const middleClosed = middleTip.y > middlePip.y
    const ringClosed = ringTip.y > ringPip.y
    const pinkyClosed = pinkyTip.y > pinkyPip.y

    const extendedFingers = [indexExtended, middleExtended, ringExtended, pinkyExtended]
      .filter(Boolean).length
    const closedFingers = [indexClosed, middleClosed, ringClosed, pinkyClosed]
      .filter(Boolean).length

    const wrist = landmarks[0]
    const currentHandX = wrist.x

    if (prevHandXRef.current !== null) {
      const horizontalMovement = currentHandX - prevHandXRef.current
      
      if (horizontalMovement > 0.08) {
        prevHandXRef.current = currentHandX
        return 'swipe_right'
      } else if (horizontalMovement < -0.08) {
        prevHandXRef.current = currentHandX
        return 'swipe_left'
      }
    }
    
    prevHandXRef.current = currentHandX

    if (extendedFingers >= 3 && !thumbExtended) {
      return 'open'
    } else if (closedFingers >= 3) {
      return 'closed'
    } else if (thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'point_left'
    } else if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'point_right'
    } else {
      return 'none'
    }
  }

  // ===== CALCULATE SCROLL SPEED VALUES =====
  const calculateSpeedValues = (speed) => {
    const speedMultipliers = {
      1: { scrollAmount: 1, intervalTime: 50 },
      2: { scrollAmount: 2, intervalTime: 40 },
      3: { scrollAmount: 3, intervalTime: 35 },
      4: { scrollAmount: 4, intervalTime: 30 },
      5: { scrollAmount: 5, intervalTime: 25 },
      6: { scrollAmount: 7, intervalTime: 20 },
      7: { scrollAmount: 10, intervalTime: 15 },
      8: { scrollAmount: 15, intervalTime: 12 },
      9: { scrollAmount: 20, intervalTime: 10 },
      10: { scrollAmount: 30, intervalTime: 8 }
    }
    
    return speedMultipliers[speed] || { scrollAmount: 10, intervalTime: 15 }
  }

  // ===== ENHANCED SCROLL GESTURE HANDLER =====
  const handleScrollGesture = (gesture) => {
    if (gesture === currentGestureRef.current) return

    stopScrolling()

    if (gesture === 'open') {
      startScrolling('up')
      setLastGesture(`↑ Scrolling UP`)
      setScrollActive(true)
    } else if (gesture === 'closed') {
      startScrolling('down')
      setLastGesture(`↓ Scrolling DOWN`)
      setScrollActive(true)
    } else if (gesture === 'swipe_left' || gesture === 'point_left') {
      startScrolling('left')
      setLastGesture(`← Scrolling LEFT`)
      setScrollActive(true)
    } else if (gesture === 'swipe_right' || gesture === 'point_right') {
      startScrolling('right')
      setLastGesture(`→ Scrolling RIGHT`)
      setScrollActive(true)
    } else {
      setLastGesture('✋ Scroll Stopped')
      setScrollActive(false)
      setTimeout(() => setLastGesture(''), 2000)
    }

    currentGestureRef.current = gesture
  }

  // ===== ENHANCED SCROLLING WITH HORIZONTAL SUPPORT =====
  const startScrolling = (direction) => {
    stopScrolling()

    scrollIntervalRef.current = setInterval(() => {
      if (pdfContainerRef.current) {
        const scrollAmount = currentScrollAmountRef.current
        
        switch (direction) {
          case 'up':
            pdfContainerRef.current.scrollTop -= scrollAmount
            break
          case 'down':
            pdfContainerRef.current.scrollTop += scrollAmount
            break
          case 'left':
            pdfContainerRef.current.scrollLeft -= scrollAmount
            break
          case 'right':
            pdfContainerRef.current.scrollLeft += scrollAmount
            break
          default:
            break
        }
      }
    }, currentIntervalTimeRef.current)
  }

  // ===== STOP SCROLLING =====
  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  // ===== ENHANCED MANUAL CONTROLS =====
  const scrollUp = () => {
    if (pdfContainerRef.current) {
      pdfContainerRef.current.scrollBy({ top: -100, behavior: 'smooth' })
    }
  }

  const scrollDown = () => {
    if (pdfContainerRef.current) {
      pdfContainerRef.current.scrollBy({ top: 100, behavior: 'smooth' })
    }
  }

  const scrollLeft = () => {
    if (pdfContainerRef.current) {
      pdfContainerRef.current.scrollBy({ left: -100, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (pdfContainerRef.current) {
      pdfContainerRef.current.scrollBy({ left: 100, behavior: 'smooth' })
    }
  }

  // ===== ZOOM CONTROLS =====
  const zoomIn = () => {
    setZoomLevel(prevZoom => {
      const newZoom = Math.min(prevZoom + 0.1, 3.0)
      console.log(`Zoom changed to: ${newZoom}`)
      return newZoom
    })
  }

  const zoomOut = () => {
    setZoomLevel(prevZoom => {
      const newZoom = Math.max(prevZoom - 0.1, 0.5)
      console.log(`Zoom changed to: ${newZoom}`)
      return newZoom
    })
  }

  const resetZoom = () => {
    setZoomLevel(1.0)
  }

  // ===== SPEED CONTROLS =====
  const increaseSpeed = () => {
    setScrollSpeed(prev => Math.min(prev + 1, 10))
  }

  const decreaseSpeed = () => {
    setScrollSpeed(prev => Math.max(prev - 1, 1))
  }

  // ===== START CAMERA AND HAND TRACKING =====
  const startCamera = async () => {
    if (!videoRef.current) {
      alert('Camera element not ready')
      return
    }

    if (!mediaPipeLoaded.current) {
      alert('Hand tracking library is still loading. Please wait a moment.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      })
      
      videoRef.current.srcObject = stream
      
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve)
          }
        }
      })

      const hands = new window.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      })

      hands.onResults((results) => {
        if (!canvasRef.current || !results) return

        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        
        if (results.image) {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(results.image, -canvasRef.current.width, 0, 
                       canvasRef.current.width, canvasRef.current.height)
          ctx.restore()
        }

        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            const gesture = detectHandGesture(landmarks)
            
            let handColor = '#00FF00'
            if (gesture === 'open') handColor = '#007BFF'
            else if (gesture === 'closed') handColor = '#FF4444'
            else if (gesture === 'swipe_left' || gesture === 'point_left') handColor = '#FFA500'
            else if (gesture === 'swipe_right' || gesture === 'point_right') handColor = '#9C27B0'

            const mirroredLandmarks = landmarks.map(landmark => ({
              ...landmark,
              x: 1 - landmark.x
            }))

            if (window.drawConnectors && window.drawLandmarks) {
              window.drawConnectors(ctx, mirroredLandmarks, window.HAND_CONNECTIONS, {
                color: handColor,
                lineWidth: 3
              })
              window.drawLandmarks(ctx, mirroredLandmarks, {
                color: handColor,
                lineWidth: 2,
                radius: 4
              })
            }

            if (gesture !== 'none') {
              ctx.fillStyle = 
                gesture === 'open' ? '#00FFFF' :
                gesture === 'closed' ? '#FFAAAA' :
                gesture === 'swipe_left' || gesture === 'point_left' ? '#FFB74D' :
                gesture === 'swipe_right' || gesture === 'point_right' ? '#E1BEE7' : '#00FF00'
              
              ctx.beginPath()
              ctx.arc(
                mirroredLandmarks[0].x * canvasRef.current.width,
                mirroredLandmarks[0].y * canvasRef.current.height,
                15, 0, 2 * Math.PI
              )
              ctx.fill()
            }
          }
          
          if (results.multiHandLandmarks.length > 0) {
            const gesture = detectHandGesture(results.multiHandLandmarks[0])
            handleScrollGesture(gesture)
            setIsHandDetected(true)
          } else {
            setIsHandDetected(false)
            handleScrollGesture('none')
          }
        } else {
          setIsHandDetected(false)
          handleScrollGesture('none')
        }
      })

      handsRef.current = hands

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            try {
              await handsRef.current.send({ image: videoRef.current })
            } catch (error) {
              console.error('Error processing frame:', error)
            }
          }
        },
        width: 640,
        height: 480
      })

      camera.start()
      cameraRef.current = camera
      setCameraActive(true)

    } catch (error) {
      console.error('Error starting camera:', error)
      alert('Camera error: ' + error.message)
    }
  }

  // ===== STOP CAMERA =====
  const stopCamera = () => {
    stopScrolling()
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    
    if (cameraRef.current) {
      cameraRef.current.stop()
    }
    
    if (handsRef.current) {
      handsRef.current.close()
    }
    
    setCameraActive(false)
    setIsHandDetected(false)
    setScrollActive(false)
    currentGestureRef.current = 'none'
    prevHandXRef.current = null
  }

  // ===== CLEANUP =====
  useEffect(() => {
    return () => {
      stopCamera()
      stopScrolling()
      if (pdfFile) {
        URL.revokeObjectURL(pdfFile)
      }
    }
  }, [pdfFile])

  // ===== HELPER FUNCTIONS =====
  const getSpeedDescription = () => {
    const descriptions = {
      1: 'Very Slow',  2: 'Slow',  3: 'Moderate',
      4: 'Medium',     5: 'Balanced', 6: 'Fast',
      7: 'Very Fast',  8: 'Ultra Fast', 9: 'Extreme', 10: 'Maximum'
    }
    return descriptions[scrollSpeed] || 'Medium'
  }

  const getCurrentSpeedValues = () => {
    return calculateSpeedValues(scrollSpeed)
  }

  const getZoomPercentage = () => {
    return Math.round(zoomLevel * 100)
  }

  // ===== RENDER COMPONENT =====
  return (
    <div style={{ 
      padding: '0',
      margin: '0',
      fontFamily: 'Arial, sans-serif',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* HEADER */}
      <div style={{ 
        padding: '12px 20px', 
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h1 style={{ 
          margin: 0, 
          color: 'white', 
          fontSize: '20px',
          fontWeight: '600'
        }}>
          🤖 Professional PDF Viewer with Vector Quality
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={!mediaPipeLoaded.current}
            style={{ 
              padding: '8px 16px', 
              background: cameraActive ? '#ff4444' : (mediaPipeLoaded.current ? '#007bff' : '#666'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: mediaPipeLoaded.current ? 'pointer' : 'not-allowed'
            }}
          >
            {!mediaPipeLoaded.current ? '⏳ Loading...' : 
             cameraActive ? '🛑 Stop Camera' : '📷 Start Camera'}
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              padding: '8px 16px', 
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📄 Upload PDF
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ 
        flex: 1,
        display: 'flex', 
        gap: '0',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>
        
        {/* PDF VIEWER */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#2d2d2d',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          
          {/* PDF HEADER */}
          <div style={{ 
            padding: '12px 20px', 
            backgroundColor: '#3d3d3d',
            borderBottom: '1px solid #555',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <h3 style={{ 
              margin: 0, 
              color: 'white', 
              fontSize: '16px',
              fontWeight: '500'
            }}>
              {pdfFile ? `📖 PDF Document - Page ${currentPage} of ${totalPages} (Vector Quality)` : 'No PDF Loaded'}
            </h3>
            
            {pdfFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                
                <span style={{ 
                  color: '#ccc', 
                  fontSize: '12px',
                  padding: '4px 8px',
                  background: scrollActive ? 
                    (currentGestureRef.current === 'open' ? '#007bff' : 
                     currentGestureRef.current === 'closed' ? '#ff4444' :
                     currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? '#ffa500' :
                     '#9c27b0') : '#555',
                  borderRadius: '4px'
                }}>
                  {scrollActive ? 
                    (currentGestureRef.current === 'open' ? '👆 SCROLLING UP' : 
                     currentGestureRef.current === 'closed' ? '👇 SCROLLING DOWN' :
                     currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? '👈 SCROLLING LEFT' :
                     '👉 SCROLLING RIGHT') : 
                    '👋 Show Hand Gestures'}
                </span>
                
                {/* Zoom Controls */}
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button 
                    onClick={zoomOut}
                    disabled={zoomLevel <= 0.5}
                    style={{ 
                      padding: '6px 12px',
                      background: zoomLevel <= 0.5 ? '#666' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🔍−
                  </button>
                  
                  <span style={{ 
                    color: 'white', 
                    fontSize: '12px',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}>
                    {getZoomPercentage()}%
                  </span>
                  
                  <button 
                    onClick={zoomIn}
                    disabled={zoomLevel >= 3.0}
                    style={{ 
                      padding: '6px 12px',
                      background: zoomLevel >= 3.0 ? '#666' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: zoomLevel >= 3.0 ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🔍+
                  </button>
                  
                  <button 
                    onClick={resetZoom}
                    style={{ 
                      padding: '6px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Reset
                  </button>
                </div>

                {/* Manual Scroll */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    onClick={scrollUp}
                    style={{ 
                      padding: '6px 8px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    ↑
                  </button>
                  <button 
                    onClick={scrollDown}
                    style={{ 
                      padding: '6px 8px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    ↓
                  </button>
                  <button 
                    onClick={scrollLeft}
                    style={{ 
                      padding: '6px 8px',
                      background: '#ffa500',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    ←
                  </button>
                  <button 
                    onClick={scrollRight}
                    style={{ 
                      padding: '6px 8px',
                      background: '#9c27b0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* PDF CONTENT WITH VECTOR RENDERING */}
          <div style={{ 
            flex: 1,
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {isLoading ? (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'white',
                fontSize: '18px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                  <p>Loading PDF with Vector Quality...</p>
                  <p style={{ fontSize: '14px', color: '#ccc' }}>Rendering crisp text and graphics</p>
                </div>
              </div>
            ) : pdfFile && pdfDoc ? (
              <>
                <div
                  ref={pdfContainerRef}
                  style={{
                    height: '100%',
                    overflow: 'auto',
                    padding: '20px'
                  }}
                >
                  <div className="pdf-pages-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    {/* PDF pages are rendered dynamically here */}
                  </div>
                </div>

                {scrollActive && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 
                      currentGestureRef.current === 'open' ? 'rgba(0, 123, 255, 0.9)' : 
                      currentGestureRef.current === 'closed' ? 'rgba(255, 68, 68, 0.9)' :
                      currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? 'rgba(255, 165, 0, 0.9)' :
                      'rgba(156, 39, 176, 0.9)',
                    color: 'white',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    zIndex: 1000
                  }}>
                    {currentGestureRef.current === 'open' ? '↑ Scrolling UP' : 
                     currentGestureRef.current === 'closed' ? '↓ Scrolling DOWN' :
                     currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? '← Scrolling LEFT' :
                     '→ Scrolling RIGHT'}
                  </div>
                )}
              </>
            ) : (
              <div style={{ 
                textAlign: 'center',
                color: '#888',
                padding: '40px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <div style={{ fontSize: '72px', marginBottom: '20px' }}>📄</div>
                <h3 style={{ marginBottom: '10px', fontSize: '24px', color: 'white' }}>
                  No PDF Loaded
                </h3>
                <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                  Upload a PDF file to experience true vector quality rendering
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    padding: '12px 24px', 
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  📁 Choose PDF File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTROL PANEL */}
        <div style={{ 
          width: '400px',
          backgroundColor: '#2d2d2d',
          borderLeft: '1px solid #444',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ 
            padding: '15px 20px', 
            backgroundColor: '#3d3d3d',
            borderBottom: '1px solid #555'
          }}>
            <h3 style={{ 
              margin: 0, 
              color: 'white', 
              fontSize: '16px',
              fontWeight: '500'
            }}>
              🎯 Gesture Control Panel
            </h3>
          </div>
          
          <div style={{ padding: '20px', flex: 1, overflow: 'auto' }}>
            
            {/* Camera Feed */}
            <div style={{ 
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid #555',
              backgroundColor: '#1a1a1a',
              marginBottom: '20px'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  display: cameraActive ? 'block' : 'none',
                  transform: 'scaleX(-1)'
                }}
              />
              <canvas
                ref={canvasRef}
                width="640"
                height="480"
                style={{
                  width: '100%',
                  display: cameraActive ? 'block' : 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              />
              {!cameraActive && (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center',
                  color: '#888'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📷</div>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px', color: 'white' }}>
                    Camera is off
                  </p>
                  <p>Start camera to use gesture controls</p>
                </div>
              )}
            </div>

            {/* Speed Control */}
            <div style={{ 
              padding: '15px', 
              background: '#3d3d3d', 
              borderRadius: '10px',
              border: '1px solid #555',
              marginBottom: '20px'
            }}>
              <h4 style={{ 
                marginTop: 0, 
                marginBottom: '15px', 
                color: 'white', 
                fontSize: '16px',
                textAlign: 'center'
              }}>
                ⚡ Scroll Speed
              </h4>
              
              <div style={{
                textAlign: 'center',
                marginBottom: '15px'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: scrollSpeed >= 7 ? '#ff4444' : scrollSpeed >= 4 ? '#ffa500' : '#00ff00',
                  marginBottom: '5px'
                }}>
                  {scrollSpeed}/10
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#ccc',
                  marginBottom: '5px'
                }}>
                  {getSpeedDescription()}
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #00ff00, #ffa500, #ff4444)',
                  outline: 'none',
                  opacity: 0.7,
                }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: '20px' }}>
              {lastGesture && (
                <div style={{
                  padding: '12px',
                  background: 
                    currentGestureRef.current === 'open' ? 'linear-gradient(135deg, #007bff, #0056b3)' : 
                    currentGestureRef.current === 'closed' ? 'linear-gradient(135deg, #ff4444, #cc0000)' :
                    currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? 'linear-gradient(135deg, #ff9800, #f57c00)' :
                    'linear-gradient(135deg, #9c27b0, #7b1fa2)',
                  color: 'white',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginBottom: '12px'
                }}>
                  🎯 {lastGesture}
                </div>
              )}

              <div style={{
                padding: '12px',
                background: isHandDetected ? 
                  'linear-gradient(135deg, #28a745, #1e7e34)' : 
                  'linear-gradient(135deg, #6c757d, #545b62)',
                color: 'white',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '10px'
              }}>
                {isHandDetected ? '✅ HAND DETECTED' : '❌ NO HAND DETECTED'}
              </div>

              <div style={{
                padding: '15px',
                background: 
                  currentGestureRef.current === 'open' ? 'rgba(0, 123, 255, 0.2)' :
                  currentGestureRef.current === 'closed' ? 'rgba(255, 68, 68, 0.2)' : 
                  currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? 'rgba(255, 152, 0, 0.2)' :
                  currentGestureRef.current === 'swipe_right' || currentGestureRef.current === 'point_right' ? 'rgba(156, 39, 176, 0.2)' :
                  'rgba(108, 117, 125, 0.2)',
                color: 
                  currentGestureRef.current === 'open' ? '#007bff' :
                  currentGestureRef.current === 'closed' ? '#ff4444' : 
                  currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? '#ff9800' :
                  currentGestureRef.current === 'swipe_right' || currentGestureRef.current === 'point_right' ? '#9c27b0' :
                  '#6c757d',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '16px',
                border: `2px solid ${
                  currentGestureRef.current === 'open' ? '#007bff' :
                  currentGestureRef.current === 'closed' ? '#ff4444' : 
                  currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? '#ff9800' :
                  currentGestureRef.current === 'swipe_right' || currentGestureRef.current === 'point_right' ? '#9c27b0' :
                  'transparent'
                }`
              }}>
                {currentGestureRef.current === 'open' ? '👋 OPEN HAND - SCROLL UP' :
                 currentGestureRef.current === 'closed' ? '✊ CLOSED FIST - SCROLL DOWN' :
                 currentGestureRef.current === 'swipe_left' || currentGestureRef.current === 'point_left' ? '👈 LEFT SWIPE - SCROLL LEFT' :
                 currentGestureRef.current === 'swipe_right' || currentGestureRef.current === 'point_right' ? '👉 RIGHT SWIPE - SCROLL RIGHT' :
                 '🔄 SHOW HAND TO START'}
              </div>
            </div>

            {/* Instructions */}
            <div style={{ 
              padding: '15px', 
              background: '#3d3d3d', 
              borderRadius: '10px',
              border: '1px solid #555'
            }}>
              <h4 style={{ 
                marginTop: 0, 
                marginBottom: '10px', 
                color: 'white', 
                fontSize: '14px'
              }}>
                🚀 Advanced Gestures:
              </h4>
              <div style={{ color: '#ccc', fontSize: '12px', lineHeight: '1.4' }}>
                <p>👋 <strong>Open Hand</strong> - Scroll Up (Blue)</p>
                <p>✊ <strong>Closed Fist</strong> - Scroll Down (Red)</p>
                <p>👈 <strong>Hand Swipe Left</strong> - Scroll Left (Orange)</p>
                <p>👉 <strong>Hand Swipe Right</strong> - Scroll Right (Purple)</p>
                <p>⚡ <strong>Adjust Speed</strong> - Use slider above</p>
                <p>🔍 <strong>Zoom</strong> - Use zoom controls in PDF header</p>
                <p>🎯 <strong>Vector Quality</strong> - Crisp text at any zoom level</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GesturePDFViewer