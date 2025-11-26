
// import { useEffect, useRef, useState } from 'react'
// import './VirtualPaint.css'

// const GRID_SIZE = 50

// const VirtualPaint = () => {
//   const videoRef = useRef(null)
//   const canvasRef = useRef(null)
//   const drawCanvasRef = useRef(null)
//   const handsRef = useRef(null)
//   const cameraRef = useRef(null)
  
//   const [brushSize, setBrushSize] = useState(5)
//   const [brushColor, setBrushColor] = useState('#ff0000')
//   const [isErasing, setIsErasing] = useState(false)
//   const [eraserSize, setEraserSize] = useState(40)
//   const [showHands, setShowHands] = useState(true)
//   const [isCameraOn, setIsCameraOn] = useState(false)
//   const [isDrawing, setIsDrawing] = useState(false)
//   const [manualDrawingEnabled, setManualDrawingEnabled] = useState(false)
//   const [drawingMode, setDrawingMode] = useState('gesture') // 'gesture' or 'manual'

//   const presetColors = ['#ff5c8d', '#ffb347', '#ffe066', '#4ade80', '#60a5fa', '#c084fc', '#111827']

//   const lastPointRef = useRef(null)
//   const lastMidPointRef = useRef(null)
//   const drawingContextRef = useRef(null)
//   const smoothedPointRef = useRef(null)
//   const isDrawingRef = useRef(false)
//   const gestureStateRef = useRef({
//     isPointing: false,
//     consecutivePointingFrames: 0,
//     consecutiveNotPointingFrames: 0
//   })
//   const brushColorRef = useRef(brushColor)
//   const brushSizeRef = useRef(brushSize)
//   const isErasingRef = useRef(isErasing)
//   const eraserSizeRef = useRef(eraserSize)
  
//   // Virtual button state
//   const buttonStateRef = useRef({
//     brushHovered: false,
//     eraserHovered: false,
//     hoveredColorIndex: null,
//     lastButtonClick: 0,
//     hoverStart: null,      // timestamp when finger first hovered a button
//     hoverTarget: null      // 'brush' | 'eraser' | `color-${index}`
//   })
  
//   // Virtual button configuration
//   const BUTTON_SIZE = 80
//   const BUTTON_PADDING = 20
//   const PINCH_THRESHOLD = 0.05 // Distance threshold for pinch detection
//   const VIRTUAL_COLOR_COUNT = 4
//   const COLOR_BUTTON_SIZE = 54
//   const COLOR_BUTTON_SPACING = 12


//   const resetStrokeState = () => {
//     lastPointRef.current = null
//     lastMidPointRef.current = null
//     smoothedPointRef.current = null
//   }

//   // Detect pinch gesture (thumb tip close to index tip) for button clicking
//   const isPinchGesture = (landmarks) => {
//     if (!landmarks || landmarks.length < 21) return false
    
//     try {
//       const thumbTip = landmarks[4]
//       const indexTip = landmarks[8]
      
//       // Calculate distance between thumb tip and index tip
//       const distance = Math.sqrt(
//         Math.pow(thumbTip.x - indexTip.x, 2) + 
//         Math.pow(thumbTip.y - indexTip.y, 2)
//       )
      
//       // Pinch detected if distance is very small
//       return distance < PINCH_THRESHOLD
//     } catch (error) {
//       return false
//     }
//   }

//   // Check if point is over a virtual button
//   const isOverButton = (x, y, canvasWidth, canvasHeight) => {
//     // Button positions: top-right corner (accounting for video mirroring)
//     // Since video is mirrored, buttons appear on right side visually but left side in coordinates
//     const brushButton = {
//       x: canvasWidth - BUTTON_SIZE - BUTTON_PADDING, // Right side (mirrored)
//       y: BUTTON_PADDING,
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE
//     }
    
//     const eraserButton = {
//       x: canvasWidth - BUTTON_SIZE - BUTTON_PADDING, // Right side (mirrored)
//       y: BUTTON_PADDING + BUTTON_SIZE + 10,
//       width: BUTTON_SIZE,
//       height: BUTTON_SIZE
//     }
    
//     const overBrush = x >= brushButton.x && x <= brushButton.x + brushButton.width &&
//                       y >= brushButton.y && y <= brushButton.y + brushButton.height
    
//     const overEraser = x >= eraserButton.x && x <= eraserButton.x + eraserButton.width &&
//                        y >= eraserButton.y && y <= eraserButton.y + eraserButton.height

//     const virtualColorOptions = presetColors.slice(0, VIRTUAL_COLOR_COUNT)
//     const colorButtons = virtualColorOptions.map((color, index) => {
//       const colorX = canvasWidth - COLOR_BUTTON_SIZE - BUTTON_PADDING
//       const colorY = eraserButton.y + eraserButton.height + 20 + index * (COLOR_BUTTON_SIZE + COLOR_BUTTON_SPACING)
//       return {
//         x: colorX,
//         y: colorY,
//         width: COLOR_BUTTON_SIZE,
//         height: COLOR_BUTTON_SIZE,
//         color
//       }
//     })

//     const overColorIndex = colorButtons.findIndex((btn) =>
//       x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height
//     )
//     const overColor = overColorIndex !== -1
    
//     return { overBrush, overEraser, overColor, overColorIndex, brushButton, eraserButton, colorButtons }
//   }

//   // Helper function to draw rounded rectangle
//   const drawRoundedRect = (ctx, x, y, width, height, radius) => {
//     ctx.beginPath()
//     ctx.moveTo(x + radius, y)
//     ctx.lineTo(x + width - radius, y)
//     ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
//     ctx.lineTo(x + width, y + height - radius)
//     ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
//     ctx.lineTo(x + radius, y + height)
//     ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
//     ctx.lineTo(x, y + radius)
//     ctx.quadraticCurveTo(x, y, x + radius, y)
//     ctx.closePath()
//   }

//   // Draw virtual buttons on canvas
//   const drawVirtualButtons = (ctx, canvasWidth, canvasHeight) => {
//     if (!ctx) return
    
//     const { brushButton, eraserButton, colorButtons } = isOverButton(0, 0, canvasWidth, canvasHeight)
    
//     // Draw brush button
//     ctx.save()
//     ctx.fillStyle = buttonStateRef.current.brushHovered 
//       ? 'rgba(74, 222, 128, 0.9)' 
//       : (isErasing ? 'rgba(148, 163, 184, 0.7)' : 'rgba(74, 222, 128, 0.8)')
//     ctx.strokeStyle = '#ffffff'
//     ctx.lineWidth = 3
//     drawRoundedRect(ctx, brushButton.x, brushButton.y, brushButton.width, brushButton.height, 12)
//     ctx.fill()
//     ctx.stroke()
    
//     // Draw brush icon
//     ctx.fillStyle = '#ffffff'
//     ctx.font = 'bold 32px Arial'
//     ctx.textAlign = 'center'
//     ctx.textBaseline = 'middle'
//     ctx.fillText('✏️', brushButton.x + brushButton.width / 2, brushButton.y + brushButton.height / 2)
    
//     // Draw eraser button
//     ctx.fillStyle = buttonStateRef.current.eraserHovered 
//       ? 'rgba(251, 113, 133, 0.9)' 
//       : (isErasing ? 'rgba(251, 113, 133, 0.8)' : 'rgba(148, 163, 184, 0.7)')
//     drawRoundedRect(ctx, eraserButton.x, eraserButton.y, eraserButton.width, eraserButton.height, 12)
//     ctx.fill()
//     ctx.stroke()
    
//     // Draw eraser icon
//     ctx.fillText('🧽', eraserButton.x + eraserButton.width / 2, eraserButton.y + eraserButton.height / 2)

//     // Draw color buttons
//     colorButtons.forEach((button, index) => {
//       ctx.save()
//       const isActiveColor = !isErasing && brushColorRef.current === button.color
//       const isHovered = buttonStateRef.current.hoveredColorIndex === index
      
//       const centerX = button.x + button.width / 2
//       const centerY = button.y + button.height / 2
//       const radius = button.width / 2

//       ctx.beginPath()
//       ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
//       ctx.fillStyle = button.color
//       ctx.fill()

//       if (isActiveColor) {
//         ctx.lineWidth = 5
//         ctx.strokeStyle = '#ffffff'
//       } else if (isHovered) {
//         ctx.lineWidth = 3
//         ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
//       } else {
//         ctx.lineWidth = 2
//         ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
//       }

//       ctx.stroke()
//       ctx.restore()
//     })
    
//     ctx.restore()
//   }

//   // Improved thumb inside fist detection with better accuracy
//   const isThumbInsideFist = (landmarks) => {
//     if (!landmarks || landmarks.length < 21) return false
    
//     try {
//       // Get all relevant landmarks
//       const thumbTip = landmarks[4]
//       const thumbIP = landmarks[3]
//       const thumbMCP = landmarks[2]
//       const indexTip = landmarks[8]
//       const indexDIP = landmarks[7]
//       const indexPIP = landmarks[6]
//       const indexMCP = landmarks[5]
//       const middleTip = landmarks[12]
//       const middlePIP = landmarks[10]
//       const middleMCP = landmarks[9]
//       const ringTip = landmarks[16]
//       const ringPIP = landmarks[14]
//       const pinkyTip = landmarks[20]
//       const pinkyPIP = landmarks[18]
//       const wrist = landmarks[0]
      
//       // Improved finger closure detection - check multiple joints for accuracy
//       const FINGER_THRESHOLD = 0.02 // Balanced threshold
//       const indexClosed = indexTip.y > indexPIP.y - FINGER_THRESHOLD && 
//                           indexTip.y > indexDIP.y - FINGER_THRESHOLD
//       const middleClosed = middleTip.y > middlePIP.y - FINGER_THRESHOLD
//       const ringClosed = ringTip.y > ringPIP.y - FINGER_THRESHOLD
//       const pinkyClosed = pinkyTip.y > pinkyPIP.y - FINGER_THRESHOLD
      
//       // Require at least 2-3 fingers closed for stable fist detection
//       const closedFingersCount = [indexClosed, middleClosed, ringClosed, pinkyClosed].filter(Boolean).length
//       const isFist = closedFingersCount >= 2
      
//       if (!isFist) {
//         return false
//       }
      
//       // Improved thumb detection - multiple checks for accuracy
//       // Check 1: Thumb is below the finger MCP joints
//       const thumbBelowFingers = thumbTip.y > indexMCP.y - 0.03 && 
//                                 thumbTip.y > middleMCP.y - 0.03
      
//       // Check 2: Thumb is folded (tip is below IP joint)
//       const thumbFolded = thumbTip.y > thumbIP.y
      
//       // Check 3: Thumb is close to palm (distance to index MCP)
//       const distanceToIndexMCP = Math.sqrt(
//         Math.pow(thumbTip.x - indexMCP.x, 2) + 
//         Math.pow(thumbTip.y - indexMCP.y, 2)
//       )
//       const thumbNearPalm = distanceToIndexMCP < 0.20
      
//       // Check 4: Thumb is closer to wrist than finger tips (thumb is inside)
//       const thumbToWrist = Math.sqrt(
//         Math.pow(thumbTip.x - wrist.x, 2) + 
//         Math.pow(thumbTip.y - wrist.y, 2)
//       )
//       const indexToWrist = Math.sqrt(
//         Math.pow(indexTip.x - wrist.x, 2) + 
//         Math.pow(indexTip.y - wrist.y, 2)
//       )
//       const thumbCloserToWrist = thumbToWrist < indexToWrist * 0.9
      
//       // Thumb is inside if multiple conditions are met (more reliable)
//       const thumbInside = (thumbBelowFingers && thumbNearPalm) || 
//                          (thumbFolded && thumbNearPalm) ||
//                          (thumbCloserToWrist && thumbNearPalm)
      
//       return isFist && thumbInside
//     } catch (error) {
//       console.error('Error in fist detection:', error)
//       return false
//     }
//   }

//   const applyDrawingStyle = () => {
//     if (!drawingContextRef.current) return
//     const ctx = drawingContextRef.current
    
//     // Optimize canvas rendering settings
//     ctx.lineCap = 'round'
//     ctx.lineJoin = 'round'
//     ctx.miterLimit = 2 // Prevent sharp corners

//     if (isErasingRef.current) {
//       ctx.globalCompositeOperation = 'destination-out'
//       ctx.strokeStyle = '#000000'
//       ctx.fillStyle = '#000000'
//       ctx.lineWidth = eraserSizeRef.current
//     } else {
//       ctx.globalCompositeOperation = 'source-over'
//       ctx.strokeStyle = brushColorRef.current
//       ctx.fillStyle = brushColorRef.current
//       // Ensure minimum line width for visibility
//       ctx.lineWidth = Math.max(brushSizeRef.current, 1)
//     }
//   }

//   const drawGridPattern = (ctx, width, height, gridSize = GRID_SIZE) => {
//     if (!ctx) return
//     ctx.save()
//     ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
//     ctx.lineWidth = 1

//     for (let x = 0; x <= width; x += gridSize) {
//       ctx.beginPath()
//       ctx.moveTo(x + 0.5, 0)
//       ctx.lineTo(x + 0.5, height)
//       ctx.stroke()
//     }

//     for (let y = 0; y <= height; y += gridSize) {
//       ctx.beginPath()
//       ctx.moveTo(0, y + 0.5)
//       ctx.lineTo(width, y + 0.5)
//       ctx.stroke()
//     }

//     ctx.restore()
//   }

//   useEffect(() => {
//     brushColorRef.current = brushColor
//   }, [brushColor])

//   useEffect(() => {
//     brushSizeRef.current = brushSize
//   }, [brushSize])

//   useEffect(() => {
//     isErasingRef.current = isErasing
//   }, [isErasing])

//   useEffect(() => {
//     eraserSizeRef.current = eraserSize
//   }, [eraserSize])

//   useEffect(() => {
//     applyDrawingStyle()
//   }, [brushColor, brushSize, isErasing, eraserSize])


//   const initializeHands = () => {
//     // Wait for MediaPipe to be loaded
//     const checkMediaPipe = setInterval(() => {
//       if (typeof window.Hands !== 'undefined' && typeof window.Camera !== 'undefined') {
//         clearInterval(checkMediaPipe)
//         setupHands()
//       }
//     }, 100)

//     // Timeout after 5 seconds
//     setTimeout(() => {
//       clearInterval(checkMediaPipe)
//       if (typeof window.Hands === 'undefined') {
//         console.error('MediaPipe Hands is not loaded. Please check your internet connection.')
//         alert('MediaPipe library failed to load. Please refresh the page and check your internet connection.')
//       }
//     }, 5000)
//   }

//   const setupHands = () => {
//     if (!videoRef.current) return

//     const hands = new window.Hands({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
//       }
//     })

//     hands.setOptions({
//       maxNumHands: 1,
//       modelComplexity: 1, // Higher complexity for better accuracy
//       minDetectionConfidence: 0.7, // Increased for more stable detection (reduces jitter)
//       minTrackingConfidence: 0.7  // Increased for more stable tracking (reduces jitter)
//     })

//     hands.onResults(onResults)
//     handsRef.current = hands

//     const camera = new window.Camera(videoRef.current, {
//       onFrame: async () => {
//         if (handsRef.current && videoRef.current) {
//           await handsRef.current.send({ image: videoRef.current })
//         }
//       },
//       width: 2560,  // Increased from 1920 for larger canvas
//       height: 1440  // Increased from 1080 for larger canvas
//     })

//     cameraRef.current = camera
//     camera.start()
//     setIsCameraOn(true)
//   }

//   // Simple smoothing with fixed exponential moving average
//   // - when drawing: stronger smoothing to steady the stroke
//   // - when not drawing: lighter smoothing so the pointer stays responsive
//   const smoothPointEMA = (newPoint, isDrawing) => {
//     if (!smoothedPointRef.current) {
//       smoothedPointRef.current = { x: newPoint.x, y: newPoint.y }
//       return smoothedPointRef.current
//     }

//     const drawingAlpha = 0.65 // lower => more smoothing (steadier lines)
//     const idleAlpha = 0.95    // higher => pointer closely follows finger when not drawing
//     const alpha = isDrawing ? drawingAlpha : idleAlpha

//     smoothedPointRef.current = {
//       x: alpha * newPoint.x + (1 - alpha) * smoothedPointRef.current.x,
//       y: alpha * newPoint.y + (1 - alpha) * smoothedPointRef.current.y
//     }

//     return smoothedPointRef.current
//   }

//   const drawFluidStroke = (ctx, currentPoint, size) => {
//     const previousPoint = lastPointRef.current
//     if (!previousPoint) {
//       // First point - draw a perfect circle
//       ctx.beginPath()
//       ctx.arc(currentPoint.x, currentPoint.y, size / 2, 0, 2 * Math.PI)
//       ctx.fill()
//       lastPointRef.current = currentPoint
//       lastMidPointRef.current = currentPoint
//       return
//     }

//     // Calculate smooth curve points for fluid strokes
//     const lastMidPoint = lastMidPointRef.current || previousPoint
//     const midPoint = {
//       x: (previousPoint.x + currentPoint.x) / 2,
//       y: (previousPoint.y + currentPoint.y) / 2
//     }

//     // Draw smooth quadratic curve for fluid lines
//     ctx.beginPath()
//     ctx.moveTo(lastMidPoint.x, lastMidPoint.y)
//     ctx.quadraticCurveTo(previousPoint.x, previousPoint.y, midPoint.x, midPoint.y)
//     ctx.stroke()

//     // Update points for next stroke
//     lastPointRef.current = currentPoint
//     lastMidPointRef.current = midPoint
//   }

//   const onResults = (results) => {
//     if (!canvasRef.current || !drawCanvasRef.current || !drawingContextRef.current) return

//     const canvasCtx = canvasRef.current.getContext('2d')
//     const drawCtx = drawingContextRef.current

//     // Clear and draw hand landmarks if enabled
//     canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

//     // Draw virtual buttons on overlay canvas
//     const canvasWidth = canvasRef.current.width
//     const canvasHeight = canvasRef.current.height
//     drawVirtualButtons(canvasCtx, canvasWidth, canvasHeight)

//     if (showHands && results.multiHandLandmarks) {
//       for (const landmarks of results.multiHandLandmarks) {
//         if (window.drawConnectors && window.HAND_CONNECTIONS) {
//           window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
//             color: '#00FF00',
//             lineWidth: 2
//           })
//         }
//         if (window.drawLandmarks) {
//           window.drawLandmarks(canvasCtx, landmarks, {
//             color: '#FF0000',
//             lineWidth: 1,
//             radius: 3
//           })
//         }
//       }
//     }

//     // Handle drawing with index finger tip
//     if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
//       const landmarks = results.multiHandLandmarks[0]
//       const indexTip = landmarks[8]
      
//       // Skip visibility check - it adds lag, MediaPipe already filters unreliable detections
      
//       // Determine if should draw with improved detection stability
//       let shouldDraw = false
//       if (drawingMode === 'gesture') {
//         const thumbInsideFist = isThumbInsideFist(landmarks)
        
//         if (thumbInsideFist) {
//           gestureStateRef.current.consecutivePointingFrames++
//           gestureStateRef.current.consecutiveNotPointingFrames = 0
          
//           // Require 3 frames for stable detection (prevents false positives)
//           if (gestureStateRef.current.consecutivePointingFrames >= 3) {
//             if (!gestureStateRef.current.isPointing) {
//               resetStrokeState()
//             }
//             gestureStateRef.current.isPointing = true
//           }
//         } else {
//           gestureStateRef.current.consecutiveNotPointingFrames++
//           gestureStateRef.current.consecutivePointingFrames = 0
          
//           // Require 3 frames before stopping (prevents accidental stops)
//           if (gestureStateRef.current.consecutiveNotPointingFrames >= 3) {
//             gestureStateRef.current.isPointing = false
//             resetStrokeState()
//           }
//         }
        
//         shouldDraw = gestureStateRef.current.isPointing
//       } else {
//         shouldDraw = manualDrawingEnabled
//         if (!manualDrawingEnabled && isDrawingRef.current) {
//           resetStrokeState()
//         }
//       }
      
//       isDrawingRef.current = shouldDraw
//       setIsDrawing(shouldDraw)
      
//       // Direct coordinate mapping - no scaling, no delays
//       const canvasWidth = drawCanvasRef.current.width
//       const canvasHeight = drawCanvasRef.current.height
      
//       // Validate canvas dimensions
//       if (canvasWidth === 0 || canvasHeight === 0) {
//         return
//       }
      
//       // Convert normalized coordinates (0-1) directly to canvas pixels
//       // Mirror x because video is flipped horizontally
//       const rawX = (1 - indexTip.x) * canvasWidth
//       const rawY = indexTip.y * canvasHeight
      
//       // Minimal smoothing - pointer follows finger in real-time
//       const smoothed = smoothPointEMA({ x: rawX, y: rawY }, shouldDraw)
      
//       // For button hit-testing we need to undo the X-mirroring used for drawing,
//       // because the overlay canvas (where buttons are drawn) is mirrored via CSS.
//       const buttonHitX = canvasWidth - smoothed.x
//       const buttonHitY = smoothed.y
      
//       // Check if pointer is over virtual buttons (in overlay/button coordinate space)
//       const buttonCheck = isOverButton(buttonHitX, buttonHitY, canvasWidth, canvasHeight)
//       const hoveredAction = buttonCheck.overBrush
//         ? { kind: 'brush' }
//         : buttonCheck.overEraser
//           ? { kind: 'eraser' }
//           : buttonCheck.overColor
//             ? { kind: 'color', color: buttonCheck.colorButtons[buttonCheck.overColorIndex].color, index: buttonCheck.overColorIndex }
//             : null
//       const isOverButtonArea = Boolean(hoveredAction)
      
//       // Update button hover state
//       buttonStateRef.current.brushHovered = buttonCheck.overBrush
//       buttonStateRef.current.eraserHovered = buttonCheck.overEraser
//       buttonStateRef.current.hoveredColorIndex = buttonCheck.overColor ? buttonCheck.overColorIndex : null
      
//       // Detect pinch gesture for button clicking
//       const isPinching = isPinchGesture(landmarks)
//       const currentTime = Date.now()
//       const CLICK_COOLDOWN = 500 // 500ms cooldown between clicks
//       const HOVER_ACTIVATION_TIME = 700 // ms to hover over a button to trigger it (no pinch needed)
      
//       // Helper to apply brush / eraser / color toggle in one place
//       const activateButton = (action) => {
//         if (currentTime - buttonStateRef.current.lastButtonClick <= CLICK_COOLDOWN) return
        
//         if (!action) return

//         if (action.kind === 'brush') {
//           setBrushMode()
//         } else if (action.kind === 'eraser') {
//           setEraserMode()
//         } else if (action.kind === 'color') {
//           setBrushColor(action.color)
//           brushColorRef.current = action.color
//           setIsErasing(false)
//           isErasingRef.current = false
//           applyDrawingStyle()
//         }
        
//         buttonStateRef.current.lastButtonClick = currentTime
//       }
      
//       // Handle button activation with pinch gesture
//       if (isPinching && hoveredAction) {
//         activateButton(hoveredAction)
//       }
      
//       // Also support activation by hovering the finger over a button for a short time
//       if (hoveredAction) {
//         const currentTarget = hoveredAction.kind === 'color'
//           ? `color-${hoveredAction.index}`
//           : hoveredAction.kind
        
//         if (buttonStateRef.current.hoverTarget !== currentTarget) {
//           // Start (or switch) hover tracking
//           buttonStateRef.current.hoverTarget = currentTarget
//           buttonStateRef.current.hoverStart = currentTime
//         } else if (
//           buttonStateRef.current.hoverStart &&
//           currentTime - buttonStateRef.current.hoverStart >= HOVER_ACTIVATION_TIME &&
//           !isPinching // avoid double-trigger with pinch
//         ) {
//           activateButton(hoveredAction)
//           // Reset hover tracking after activation
//           buttonStateRef.current.hoverStart = null
//           buttonStateRef.current.hoverTarget = null
//         }
//       } else {
//         // Not over any button – clear hover state
//         buttonStateRef.current.hoverStart = null
//         buttonStateRef.current.hoverTarget = null
//         buttonStateRef.current.hoveredColorIndex = null
//       }
      
//       // Prevent drawing when over button area
//       if (isOverButtonArea) {
//         shouldDraw = false
//         if (isDrawingRef.current) {
//           resetStrokeState()
//           isDrawingRef.current = false
//           setIsDrawing(false)
//         }
//       }
      
//       // Draw if should draw (and not over button)
//       if (shouldDraw && !isOverButtonArea) {
//         const activeSize = isErasingRef.current ? eraserSizeRef.current : brushSizeRef.current
        
//         // Set drawing style for accurate rendering (optimized)
//         drawCtx.lineCap = 'round'
//         drawCtx.lineJoin = 'round'
//         drawCtx.miterLimit = 2
//         drawCtx.lineWidth = activeSize
//         drawCtx.globalCompositeOperation = isErasingRef.current ? 'destination-out' : 'source-over'
//         drawCtx.strokeStyle = isErasingRef.current ? '#000000' : brushColorRef.current
//         drawCtx.fillStyle = isErasingRef.current ? '#000000' : brushColorRef.current
        
//         // Validate coordinates are within canvas bounds
//         if (smoothed.x < 0 || smoothed.x > canvasWidth || smoothed.y < 0 || smoothed.y > canvasHeight) {
//           // Point outside canvas - skip this frame
//           return
//         }
        
//         if (lastPointRef.current) {
//           // Calculate distance efficiently
//           const dx = smoothed.x - lastPointRef.current.x
//           const dy = smoothed.y - lastPointRef.current.y
//           const distance = Math.sqrt(dx * dx + dy * dy)
          
//           // Improved distance thresholds to filter jitter
//           const MIN_DISTANCE = 1.0 // Allow smaller moves to keep line feeling connected
//           const MAX_DISTANCE = 200 // Only prevent drawing on extreme jumps
          
//           if (distance < MAX_DISTANCE) {
//             // Normal movement - draw smoothly
//             if (distance > MIN_DISTANCE) {
//               // Movement is significant enough to draw
//               drawFluidStroke(drawCtx, smoothed, activeSize)
//             } else {
//               // Very small movement - likely jitter, update position but don't draw
//               // This prevents jittery dots from appearing
//               lastPointRef.current = smoothed
//               lastMidPointRef.current = smoothed
//             }
//           } else {
//             // Extreme jump - reset position without drawing
//             lastPointRef.current = smoothed
//             lastMidPointRef.current = smoothed
//             smoothedPointRef.current = smoothed
//           }
//         } else {
//           // First point - always draw to start stroke
//           drawFluidStroke(drawCtx, smoothed, activeSize)
//         }
//       } else {
//         // Not drawing - reset stroke state
//         if (isDrawingRef.current) {
//           resetStrokeState()
//         }
//       }
//     } else {
//       // No hand detected
//       if (isDrawingRef.current) {
//         isDrawingRef.current = false
//         setIsDrawing(false)
//         resetStrokeState()
//         gestureStateRef.current = {
//           isPointing: false,
//           consecutivePointingFrames: 0,
//           consecutiveNotPointingFrames: 0
//         }
//       }
//     }
//   }

//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: { 
//           width: { ideal: 2560, min: 1280 },  // Increased ideal resolution
//           height: { ideal: 1440, min: 720 },  // Increased ideal resolution
//           facingMode: 'user',
//           frameRate: { ideal: 30 }
//         } 
//       })
      
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream
        
//         videoRef.current.onloadedmetadata = () => {
//           // Set canvas sizes to match video
//           if (canvasRef.current && drawCanvasRef.current && videoRef.current) {
//             const videoWidth = videoRef.current.videoWidth
//             const videoHeight = videoRef.current.videoHeight
            
//             canvasRef.current.width = videoWidth
//             canvasRef.current.height = videoHeight
            
//             // Set drawing canvas dimensions (no DPI scaling for now to match video exactly)
//             drawCanvasRef.current.width = videoWidth
//             drawCanvasRef.current.height = videoHeight
            
//             // Re-get context after resizing
//             drawingContextRef.current = drawCanvasRef.current.getContext('2d', {
//               willReadFrequently: false,
//               alpha: true
//             })

//             if (drawingContextRef.current) {
//               drawingContextRef.current.clearRect(0, 0, videoWidth, videoHeight)
//               // Optimize canvas rendering for smooth drawing
//               drawingContextRef.current.imageSmoothingEnabled = true
//               drawingContextRef.current.imageSmoothingQuality = 'high'
//               // Enable subpixel rendering for smoother lines
//               drawingContextRef.current.textBaseline = 'top'
//               drawingContextRef.current.textAlign = 'left'
//               applyDrawingStyle()
//             }
//           }
          
//           initializeHands()
//         }
//       }
//     } catch (error) {
//       console.error('Error accessing camera:', error)
//       alert('Unable to access camera. Please ensure you have granted camera permissions.')
//     }
//   }

//   const stopCamera = () => {
//     if (cameraRef.current) {
//       cameraRef.current.stop()
//       cameraRef.current = null
//     }
    
//     if (videoRef.current && videoRef.current.srcObject) {
//       const tracks = videoRef.current.srcObject.getTracks()
//       tracks.forEach(track => track.stop())
//       videoRef.current.srcObject = null
//     }
    
//     if (handsRef.current) {
//       handsRef.current.close()
//       handsRef.current = null
//     }
    
//     setIsCameraOn(false)
//     setManualDrawingEnabled(false)
//     setIsDrawing(false)
//     isDrawingRef.current = false
//     resetStrokeState()
//   }

//   const clearCanvas = () => {
//     if (drawingContextRef.current && drawCanvasRef.current) {
//       drawingContextRef.current.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height)
//     }

//     resetStrokeState()
//     isDrawingRef.current = false
//     setIsDrawing(false)

//     // Reset gesture state
//     gestureStateRef.current = {
//       isPointing: false,
//       consecutivePointingFrames: 0,
//       consecutiveNotPointingFrames: 0
//     }
//   }

//   // Unified brush / eraser mode handlers so UI buttons and virtual buttons behave identically
//   const setBrushMode = () => {
//     setIsErasing(false)
//     isErasingRef.current = false
//     applyDrawingStyle()
//     resetStrokeState()
//   }

//   const setEraserMode = () => {
//     setIsErasing(true)
//     isErasingRef.current = true
//     applyDrawingStyle()
//     resetStrokeState()
//   }

//   const handleSaveArtwork = () => {
//     if (!drawCanvasRef.current) return

//     const width = drawCanvasRef.current.width
//     const height = drawCanvasRef.current.height
//     const exportCanvas = document.createElement('canvas')
//     exportCanvas.width = width
//     exportCanvas.height = height
//     const exportCtx = exportCanvas.getContext('2d')

//     if (!exportCtx) return

//     exportCtx.fillStyle = '#ffffff'
//     exportCtx.fillRect(0, 0, width, height)
//     drawGridPattern(exportCtx, width, height)
//     exportCtx.drawImage(drawCanvasRef.current, 0, 0)

//     const image = exportCanvas.toDataURL('image/png')
//     const link = document.createElement('a')
//     link.href = image
//     link.download = 'my_virtual_paint.png'
//     link.click()
//   }

//   useEffect(() => {
//     return () => {
//       stopCamera()
//     }
//   }, [])

//   return (
//     <div className="virtual-paint-page">
//       <div className="ambient-light ambient-light--one" aria-hidden="true" />
//       <div className="ambient-light ambient-light--two" aria-hidden="true" />

//       <div className="virtual-paint-container">
//         <header className="hero">
//           <div className="hero-text">
//             <p className="eyebrow">Hand-gesture creative lab</p>
//             <h1>
//               Virtual Paint <span>Studio</span>
//             </h1>
//             <p className="subhead">
//               Control vivid strokes with nothing but your hands. Start the camera, tuck your thumb,
//               and sketch in mid-air with gesture-precise tracking.
//             </p>
//           </div>

//           <div className="status-grid">
//             <div className="status-card">
//               <span>Camera</span>
//               <strong className={isCameraOn ? 'positive' : ''}>{isCameraOn ? 'Live' : 'Off'}</strong>
//             </div>
//             <div className="status-card">
//               <span>Mode</span>
//               <strong>{drawingMode === 'gesture' ? 'Gesture' : 'Manual'}</strong>
//             </div>
//             <div className="status-card">
//               <span>Drawing</span>
//               <strong className={isDrawing ? 'positive' : ''}>
//                 {isDrawing ? 'Active' : 'Standing by'}
//               </strong>
//             </div>
//           </div>
//         </header>

//         <section className="control-panel">
//           <div className="control-card session-card">
//             <div className="card-header">
//               <h3>Session Controls</h3>
//               <p>Power the camera feed, reset the board, and export your art.</p>
//             </div>
//             <div className="button-grid">
//               <button
//                 onClick={startCamera}
//                 disabled={isCameraOn}
//                 className="btn btn-primary"
//               >
//                 ▶ Start Camera
//               </button>

//               <button
//                 onClick={stopCamera}
//                 disabled={!isCameraOn}
//                 className="btn btn-danger"
//               >
//                 ⏹ Stop Camera
//               </button>

//               <button
//                 onClick={clearCanvas}
//                 className="btn btn-secondary"
//               >
//                 🧼 Clear Canvas
//               </button>

//               <button
//                 onClick={() => {
//                   handleSaveArtwork()
//                 }}
//                 className="btn btn-success"
//               >
//                 💾 Save Artwork
//               </button>
//             </div>
//           </div>

//           <div className="control-card brush-card">
//             <div className="card-header">
//               <h3>Brush Studio</h3>
//               <p>Dial-in stroke weight and pick vibrant pigments.</p>
//             </div>
//             <div className="tool-mode-row">
//               <button
//                 type="button"
//                 className={`btn ${!isErasing ? 'btn-primary' : 'btn-secondary'}`}
//                 onClick={setBrushMode}
//               >
//                 ✏️ Brush
//               </button>
//               <button
//                 type="button"
//                 className={`btn ${isErasing ? 'btn-primary' : 'btn-secondary'}`}
//                 onClick={setEraserMode}
//               >
//                 🧽 Eraser
//               </button>
//             </div>

//             {isErasing ? (
//               <div className="slider-group">
//                 <label htmlFor="eraserSize">
//                   Eraser Size
//                   <span>{eraserSize}px</span>
//                 </label>
//                 <input
//                   type="range"
//                   id="eraserSize"
//                   min="10"
//                   max="120"
//                   value={eraserSize}
//                   onChange={(e) => setEraserSize(parseInt(e.target.value, 10))}
//                 />
//               </div>
//             ) : (
//               <>
//                 <div className="slider-group">
//                   <label htmlFor="brushSize">
//                     Brush Size
//                     <span>{brushSize}px</span>
//                   </label>
//                   <input
//                     type="range"
//                     id="brushSize"
//                     min="5"
//                     max="50"
//                     value={brushSize}
//                     onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
//                   />
//                 </div>

//                 <div className="color-row">
//                   <div className="color-picker">
//                     <label htmlFor="colorPicker">Custom Color</label>
//                     <input
//                       type="color"
//                       id="colorPicker"
//                       value={brushColor}
//                       onChange={(e) => {
//                         setBrushColor(e.target.value);
//                         setIsErasing(false);
//                       }}
//                     />
//                   </div>

//                   <div className="color-palette" aria-label="Preset colors">
//                     {presetColors.map((color) => (
//                       <button
//                         key={color}
//                         type="button"
//                         className={`color-swatch ${brushColor === color ? 'active' : ''}`}
//                         style={{ backgroundColor: color }}
//                         onClick={() => setBrushColor(color)}
//                         aria-label={`Select ${color}`}
//                       />
//                     ))}
//                   </div>
//                 </div>
//               </>
//             )}
//           </div>

//           <div className="control-card detection-card">
//             <div className="card-header">
//               <h3>Detection & Modes</h3>
//               <p>Choose how you want to draw and what helpers stay visible.</p>
//             </div>

//             <label className="toggle">
//               <input
//                 type="checkbox"
//                 checked={showHands}
//                 onChange={(e) => setShowHands(e.target.checked)}
//               />
//               <span>Show hand landmarks for debugging</span>
//             </label>

//             <div className="mode-select">
//               <label htmlFor="drawingMode">Drawing Mode</label>
//               <select
//                 id="drawingMode"
//                 value={drawingMode}
//                 onChange={(e) => {
//                   const nextMode = e.target.value
//                   setDrawingMode(nextMode)
//                   setIsDrawing(false)
//                   isDrawingRef.current = false
//                   resetStrokeState()
//                   setManualDrawingEnabled(false)
//                 }}
//               >
//                 <option value="gesture">Gesture — thumb tucked to draw</option>
//                 <option value="manual">Manual — toggle button control</option>
//               </select>
//             </div>

//             {drawingMode === 'manual' && (
//               <button
//                 onClick={() => {
//                   setManualDrawingEnabled((prev) => {
//                     const next = !prev
//                     if (next) {
//                       smoothedPointRef.current = null
//                       lastPointRef.current = null
//                       lastMidPointRef.current = null
//                     } else {
//                       resetStrokeState()
//                     }
//                     return next
//                   })
//                 }}
//                 className={`btn stretch ${manualDrawingEnabled ? 'btn-danger' : 'btn-primary'}`}
//               >
//                 {manualDrawingEnabled ? '⏸ Stop Drawing' : '▶ Start Drawing'}
//               </button>
//             )}

//             <div className="drawing-status">
//               <span className={`status-indicator ${isDrawing ? 'drawing' : 'stopped'}`}>
//                 {isDrawing ? '✏️ Drawing now' : '⏸ Waiting for gesture'}
//               </span>
//               {drawingMode === 'gesture' && isCameraOn && (
//                 <span className="status-tip">
//                   💡 Tuck your thumb inside a gentle fist to paint
//                 </span>
//               )}
//             </div>
//           </div>
//         </section>

//         <section className="video-shell">
//           <div className="video-header">
//             <div>
//               <p className="eyebrow">Live canvas</p>
//               <h3>Camera feed & overlay</h3>
//             </div>
//             <p className="resolution">
//               {isCameraOn ? 'Streaming in HD' : 'Camera idle'}
//             </p>
//           </div>
//           <div className="video-container">
//             <video
//               ref={videoRef}
//               className="video"
//               autoPlay
//               playsInline
//               muted
//             />
//             <canvas
//               ref={canvasRef}
//               className="canvas overlay-canvas"
//             />
//             <canvas
//               ref={drawCanvasRef}
//               className="canvas draw-canvas"
//             />
//           </div>
//         </section>

//         <section className="info-grid">
//           <article className="info-card">
//             <h4>How to start</h4>
//             <ul>
//               <li>Tap <strong>Start Camera</strong> and grant permissions.</li>
//               <li>Align your hand inside the frame; index tip becomes the brush.</li>
//               <li>Use the brush slider and palette to define your stroke.</li>
//             </ul>
//           </article>

//           <article className="info-card">
//             <h4>Gesture cheatsheet</h4>
//             <ul>
//               <li>
//                 <strong>Draw</strong>: make a soft fist with your <strong>thumb tucked inside</strong>.
//               </li>
//               <li>
//                 <strong>Pause</strong>: open your hand to instantly stop.
//               </li>
//               <li>
//                 Switch to <strong>manual mode</strong> when calibrating or testing.
//               </li>
//             </ul>
//           </article>

//           <article className="info-card">
//             <h4>Pro tips</h4>
//             <ul>
//               <li>Keep consistent lighting so landmarks stay steady.</li>
//               <li>Toggle hand landmarks to inspect the tracking mesh.</li>
//               <li>Export your masterpiece anytime with Save Artwork.</li>
//             </ul>
//           </article>
//         </section>
//       </div>
//     </div>
//   )
// }

// export default VirtualPaint

import { useEffect, useRef, useState } from 'react'
import './VirtualPaint.css'

const GridSpacing = 50

const VirtualPaint = () => {
  // Refs for DOM elements
  const videoElement = useRef(null)
  const overlayCanvas = useRef(null)
  const drawingCanvas = useRef(null)
  const handsProcessor = useRef(null)
  const cameraProcessor = useRef(null)
  
  // Drawing state
  const [brushWidth, setBrushWidth] = useState(5)
  const [currentColor, setCurrentColor] = useState('#ff0000')
  const [usingEraser, setUsingEraser] = useState(false)
  const [eraserWidth, setEraserWidth] = useState(40)
  const [displayHands, setDisplayHands] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [currentlyDrawing, setCurrentlyDrawing] = useState(false)
  const [manualModeActive, setManualModeActive] = useState(false)
  const [controlMode, setControlMode] = useState('gesture')

  // Color options
  const colorPalette = ['#ff5c8d', '#ffb347', '#ffe066', '#4ade80', '#60a5fa', '#c084fc', '#111827']

  // Drawing references
  const previousPosition = useRef(null)
  const lastMiddlePoint = useRef(null)
  const canvasContext = useRef(null)
  const smoothedPosition = useRef(null)
  const drawingActive = useRef(false)
  
  // Gesture tracking
  const gestureTracker = useRef({
    pointing: false,
    pointingCount: 0,
    notPointingCount: 0
  })
  
  // Refs for current values
  const currentBrushColor = useRef(currentColor)
  const currentBrushSize = useRef(brushWidth)
  const eraserActive = useRef(usingEraser)
  const currentEraserSize = useRef(eraserWidth)
  
  // Button interaction state
  const buttonInteraction = useRef({
    brushHighlighted: false,
    eraserHighlighted: false,
    activeColorIndex: null,
    lastClickTime: 0,
    hoverStartTime: null,
    currentHoverTarget: null
  })
  
  // UI constants
  const ButtonDimensions = 80
  const ButtonMargin = 20
  const PinchDistance = 0.05
  const ColorButtonCount = 4
  const ColorButtonSize = 54
  const ColorButtonGap = 12

  const resetDrawing = () => {
    previousPosition.current = null
    lastMiddlePoint.current = null
    smoothedPosition.current = null
  }

  // Check if thumb and index finger are pinching
  const checkPinch = (handPoints) => {
    if (!handPoints || handPoints.length < 21) return false
    
    try {
      const thumbEnd = handPoints[4]
      const indexEnd = handPoints[8]
      
      const pinchSpace = Math.sqrt(
        Math.pow(thumbEnd.x - indexEnd.x, 2) + 
        Math.pow(thumbEnd.y - indexEnd.y, 2)
      )
      
      return pinchSpace < PinchDistance
    } catch (error) {
      return false
    }
  }

  // Check if finger is over interactive buttons
  const checkButtonHover = (x, y, canvasWidth, canvasHeight) => {
    const brushButtonArea = {
      x: canvasWidth - ButtonDimensions - ButtonMargin,
      y: ButtonMargin,
      width: ButtonDimensions,
      height: ButtonDimensions
    }
    
    const eraserButtonArea = {
      x: canvasWidth - ButtonDimensions - ButtonMargin,
      y: ButtonMargin + ButtonDimensions + 10,
      width: ButtonDimensions,
      height: ButtonDimensions
    }

    const colorOptions = colorPalette.slice(0, ColorButtonCount)
    const colorButtonAreas = colorOptions.map((color, index) => {
      const colorX = canvasWidth - ColorButtonSize - ButtonMargin
      const colorY = eraserButtonArea.y + eraserButtonArea.height + 20 + index * (ColorButtonSize + ColorButtonGap)
      return {
        x: colorX,
        y: colorY,
        width: ColorButtonSize,
        height: ColorButtonSize,
        color
      }
    })

    const hoveringBrush = x >= brushButtonArea.x && x <= brushButtonArea.x + brushButtonArea.width &&
                      y >= brushButtonArea.y && y <= brushButtonArea.y + brushButtonArea.height
    
    const hoveringEraser = x >= eraserButtonArea.x && x <= eraserButtonArea.x + eraserButtonArea.width &&
                       y >= eraserButtonArea.y && y <= eraserButtonArea.y + eraserButtonArea.height

    const hoveredColorIndex = colorButtonAreas.findIndex((btn) =>
      x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height
    )
    const hoveringColor = hoveredColorIndex !== -1
    
    return { 
      hoveringBrush, 
      hoveringEraser, 
      hoveringColor, 
      hoveredColorIndex, 
      brushButtonArea, 
      eraserButtonArea, 
      colorButtonAreas 
    }
  }

  // Draw rounded rectangles for buttons
  const drawRoundedButton = (ctx, x, y, width, height, cornerRadius) => {
    ctx.beginPath()
    ctx.moveTo(x + cornerRadius, y)
    ctx.lineTo(x + width - cornerRadius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius)
    ctx.lineTo(x + width, y + height - cornerRadius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height)
    ctx.lineTo(x + cornerRadius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius)
    ctx.lineTo(x, y + cornerRadius)
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y)
    ctx.closePath()
  }

  // Draw all interactive buttons
  const renderButtons = (ctx, canvasWidth, canvasHeight) => {
    if (!ctx) return
    
    const { brushButtonArea, eraserButtonArea, colorButtonAreas } = checkButtonHover(0, 0, canvasWidth, canvasHeight)
    
    // Draw brush button
    ctx.save()
    ctx.fillStyle = buttonInteraction.current.brushHighlighted 
      ? 'rgba(74, 222, 128, 0.9)' 
      : (usingEraser ? 'rgba(148, 163, 184, 0.7)' : 'rgba(74, 222, 128, 0.8)')
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    drawRoundedButton(ctx, brushButtonArea.x, brushButtonArea.y, brushButtonArea.width, brushButtonArea.height, 12)
    ctx.fill()
    ctx.stroke()
    
    // Brush icon
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('✏️', brushButtonArea.x + brushButtonArea.width / 2, brushButtonArea.y + brushButtonArea.height / 2)
    
    // Draw eraser button
    ctx.fillStyle = buttonInteraction.current.eraserHighlighted 
      ? 'rgba(251, 113, 133, 0.9)' 
      : (usingEraser ? 'rgba(251, 113, 133, 0.8)' : 'rgba(148, 163, 184, 0.7)')
    drawRoundedButton(ctx, eraserButtonArea.x, eraserButtonArea.y, eraserButtonArea.width, eraserButtonArea.height, 12)
    ctx.fill()
    ctx.stroke()
    
    // Eraser icon
    ctx.fillText('🧽', eraserButtonArea.x + eraserButtonArea.width / 2, eraserButtonArea.y + eraserButtonArea.height / 2)

    // Color selection buttons
    colorButtonAreas.forEach((button, index) => {
      ctx.save()
      const isSelectedColor = !usingEraser && currentBrushColor.current === button.color
      const isHovered = buttonInteraction.current.activeColorIndex === index
      
      const centerX = button.x + button.width / 2
      const centerY = button.y + button.height / 2
      const radius = button.width / 2

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = button.color
      ctx.fill()

      if (isSelectedColor) {
        ctx.lineWidth = 5
        ctx.strokeStyle = '#ffffff'
      } else if (isHovered) {
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      } else {
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      }

      ctx.stroke()
      ctx.restore()
    })
    
    ctx.restore()
  }

  // Detect closed fist with thumb inside
  const checkFistGesture = (handPoints) => {
    if (!handPoints || handPoints.length < 21) return false
    
    try {
      const thumbEnd = handPoints[4]
      const thumbJoint = handPoints[3]
      const thumbBase = handPoints[2]
      const indexEnd = handPoints[8]
      const indexJoint = handPoints[7]
      const indexMiddleJoint = handPoints[6]
      const indexBase = handPoints[5]
      const middleEnd = handPoints[12]
      const middleJoint = handPoints[10]
      const middleBase = handPoints[9]
      const ringEnd = handPoints[16]
      const ringJoint = handPoints[14]
      const pinkyEnd = handPoints[20]
      const pinkyJoint = handPoints[18]
      const wristPoint = handPoints[0]
      
      const FingerThreshold = 0.02
      const indexClosed = indexEnd.y > indexMiddleJoint.y - FingerThreshold && 
                          indexEnd.y > indexJoint.y - FingerThreshold
      const middleClosed = middleEnd.y > middleJoint.y - FingerThreshold
      const ringClosed = ringEnd.y > ringJoint.y - FingerThreshold
      const pinkyClosed = pinkyEnd.y > pinkyJoint.y - FingerThreshold
      
      const closedFingers = [indexClosed, middleClosed, ringClosed, pinkyClosed].filter(Boolean).length
      const fistMade = closedFingers >= 2
      
      if (!fistMade) {
        return false
      }
      
      const thumbUnderFingers = thumbEnd.y > indexBase.y - 0.03 && 
                                thumbEnd.y > middleBase.y - 0.03
      
      const thumbBent = thumbEnd.y > thumbJoint.y
      
      const thumbToBaseDistance = Math.sqrt(
        Math.pow(thumbEnd.x - indexBase.x, 2) + 
        Math.pow(thumbEnd.y - indexBase.y, 2)
      )
      const thumbNearHand = thumbToBaseDistance < 0.20
      
      const thumbToWrist = Math.sqrt(
        Math.pow(thumbEnd.x - wristPoint.x, 2) + 
        Math.pow(thumbEnd.y - wristPoint.y, 2)
      )
      const indexToWrist = Math.sqrt(
        Math.pow(indexEnd.x - wristPoint.x, 2) + 
        Math.pow(indexEnd.y - wristPoint.y, 2)
      )
      const thumbCloser = thumbToWrist < indexToWrist * 0.9
      
      const thumbInside = (thumbUnderFingers && thumbNearHand) || 
                         (thumbBent && thumbNearHand) ||
                         (thumbCloser && thumbNearHand)
      
      return fistMade && thumbInside
    } catch (error) {
      console.error('Fist detection error:', error)
      return false
    }
  }

  const setupCanvasStyle = () => {
    if (!canvasContext.current) return
    const ctx = canvasContext.current
    
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2

    if (eraserActive.current) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000000'
      ctx.fillStyle = '#000000'
      ctx.lineWidth = currentEraserSize.current
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = currentBrushColor.current
      ctx.fillStyle = currentBrushColor.current
      ctx.lineWidth = Math.max(currentBrushSize.current, 1)
    }
  }

  const drawBackgroundGrid = (ctx, width, height, gridSize = GridSpacing) => {
    if (!ctx) return
    ctx.save()
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
    ctx.lineWidth = 1

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
      ctx.stroke()
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
      ctx.stroke()
    }

    ctx.restore()
  }

  useEffect(() => {
    currentBrushColor.current = currentColor
  }, [currentColor])

  useEffect(() => {
    currentBrushSize.current = brushWidth
  }, [brushWidth])

  useEffect(() => {
    eraserActive.current = usingEraser
  }, [usingEraser])

  useEffect(() => {
    currentEraserSize.current = eraserWidth
  }, [eraserWidth])

  useEffect(() => {
    setupCanvasStyle()
  }, [currentColor, brushWidth, usingEraser, eraserWidth])

  const loadHandTracking = () => {
    const checkForLibrary = setInterval(() => {
      if (typeof window.Hands !== 'undefined' && typeof window.Camera !== 'undefined') {
        clearInterval(checkForLibrary)
        setupHandTracking()
      }
    }, 100)

    setTimeout(() => {
      clearInterval(checkForLibrary)
      if (typeof window.Hands === 'undefined') {
        console.error('Hand tracking library not available')
        alert('Library loading failed. Please refresh and check connection.')
      }
    }, 5000)
  }

  const setupHandTracking = () => {
    if (!videoElement.current) return

    const handDetector = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      }
    })

    handDetector.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    })

    handDetector.onResults(processHandResults)
    handsProcessor.current = handDetector

    const camera = new window.Camera(videoElement.current, {
      onFrame: async () => {
        if (handsProcessor.current && videoElement.current) {
          await handsProcessor.current.send({ image: videoElement.current })
        }
      },
      width: 2560,
      height: 1440
    })

    cameraProcessor.current = camera
    camera.start()
    setCameraActive(true)
  }

  const smoothMovement = (newPoint, drawingNow) => {
    if (!smoothedPosition.current) {
      smoothedPosition.current = { x: newPoint.x, y: newPoint.y }
      return smoothedPosition.current
    }

    const drawingSmoothness = 0.65
    const movingSmoothness = 0.95
    const smoothAmount = drawingNow ? drawingSmoothness : movingSmoothness

    smoothedPosition.current = {
      x: smoothAmount * newPoint.x + (1 - smoothAmount) * smoothedPosition.current.x,
      y: smoothAmount * newPoint.y + (1 - smoothAmount) * smoothedPosition.current.y
    }

    return smoothedPosition.current
  }

  const drawSmoothLine = (ctx, currentPos, size) => {
    const lastPos = previousPosition.current
    if (!lastPos) {
      ctx.beginPath()
      ctx.arc(currentPos.x, currentPos.y, size / 2, 0, 2 * Math.PI)
      ctx.fill()
      previousPosition.current = currentPos
      lastMiddlePoint.current = currentPos
      return
    }

    const lastMid = lastMiddlePoint.current || lastPos
    const midPoint = {
      x: (lastPos.x + currentPos.x) / 2,
      y: (lastPos.y + currentPos.y) / 2
    }

    ctx.beginPath()
    ctx.moveTo(lastMid.x, lastMid.y)
    ctx.quadraticCurveTo(lastPos.x, lastPos.y, midPoint.x, midPoint.y)
    ctx.stroke()

    previousPosition.current = currentPos
    lastMiddlePoint.current = midPoint
  }

  const processHandResults = (results) => {
    if (!overlayCanvas.current || !drawingCanvas.current || !canvasContext.current) return

    const overlayCtx = overlayCanvas.current.getContext('2d')
    const drawCtx = canvasContext.current

    overlayCtx.clearRect(0, 0, overlayCanvas.current.width, overlayCanvas.current.height)

    const canvasWidth = overlayCanvas.current.width
    const canvasHeight = overlayCanvas.current.height
    renderButtons(overlayCtx, canvasWidth, canvasHeight)

    if (displayHands && results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          window.drawConnectors(overlayCtx, landmarks, window.HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
          })
        }
        if (window.drawLandmarks) {
          window.drawLandmarks(overlayCtx, landmarks, {
            color: '#FF0000',
            lineWidth: 1,
            radius: 3
          })
        }
      }
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const handPoints = results.multiHandLandmarks[0]
      const indexTip = handPoints[8]
      
      let shouldDrawNow = false
      if (controlMode === 'gesture') {
        const fistWithThumb = checkFistGesture(handPoints)
        
        if (fistWithThumb) {
          gestureTracker.current.pointingCount++
          gestureTracker.current.notPointingCount = 0
          
          if (gestureTracker.current.pointingCount >= 3) {
            if (!gestureTracker.current.pointing) {
              resetDrawing()
            }
            gestureTracker.current.pointing = true
          }
        } else {
          gestureTracker.current.notPointingCount++
          gestureTracker.current.pointingCount = 0
          
          if (gestureTracker.current.notPointingCount >= 3) {
            gestureTracker.current.pointing = false
            resetDrawing()
          }
        }
        
        shouldDrawNow = gestureTracker.current.pointing
      } else {
        shouldDrawNow = manualModeActive
        if (!manualModeActive && drawingActive.current) {
          resetDrawing()
        }
      }
      
      drawingActive.current = shouldDrawNow
      setCurrentlyDrawing(shouldDrawNow)
      
      const canvasWidth = drawingCanvas.current.width
      const canvasHeight = drawingCanvas.current.height
      
      if (canvasWidth === 0 || canvasHeight === 0) {
        return
      }
      
      const rawX = (1 - indexTip.x) * canvasWidth
      const rawY = indexTip.y * canvasHeight
      
      const smoothPos = smoothMovement({ x: rawX, y: rawY }, shouldDrawNow)
      
      const buttonX = canvasWidth - smoothPos.x
      const buttonY = smoothPos.y
      
      const buttonCheck = checkButtonHover(buttonX, buttonY, canvasWidth, canvasHeight)
      const hoverAction = buttonCheck.hoveringBrush
        ? { type: 'brush' }
        : buttonCheck.hoveringEraser
          ? { type: 'eraser' }
          : buttonCheck.hoveringColor
            ? { type: 'color', color: buttonCheck.colorButtonAreas[buttonCheck.hoveredColorIndex].color, index: buttonCheck.hoveredColorIndex }
            : null
      const overButton = Boolean(hoverAction)
      
      buttonInteraction.current.brushHighlighted = buttonCheck.hoveringBrush
      buttonInteraction.current.eraserHighlighted = buttonCheck.hoveringEraser
      buttonInteraction.current.activeColorIndex = buttonCheck.hoveringColor ? buttonCheck.hoveredColorIndex : null
      
      const pinching = checkPinch(handPoints)
      const now = Date.now()
      const ClickDelay = 500
      const HoverTime = 700
      
      const activateButtonAction = (action) => {
        if (now - buttonInteraction.current.lastClickTime <= ClickDelay) return
        
        if (!action) return

        if (action.type === 'brush') {
          switchToBrush()
        } else if (action.type === 'eraser') {
          switchToEraser()
        } else if (action.type === 'color') {
          setCurrentColor(action.color)
          currentBrushColor.current = action.color
          setUsingEraser(false)
          eraserActive.current = false
          setupCanvasStyle()
        }
        
        buttonInteraction.current.lastClickTime = now
      }
      
      if (pinching && hoverAction) {
        activateButtonAction(hoverAction)
      }
      
      if (hoverAction) {
        const currentTarget = hoverAction.type === 'color'
          ? `color-${hoverAction.index}`
          : hoverAction.type
        
        if (buttonInteraction.current.currentHoverTarget !== currentTarget) {
          buttonInteraction.current.currentHoverTarget = currentTarget
          buttonInteraction.current.hoverStartTime = now
        } else if (
          buttonInteraction.current.hoverStartTime &&
          now - buttonInteraction.current.hoverStartTime >= HoverTime &&
          !pinching
        ) {
          activateButtonAction(hoverAction)
          buttonInteraction.current.hoverStartTime = null
          buttonInteraction.current.currentHoverTarget = null
        }
      } else {
        buttonInteraction.current.hoverStartTime = null
        buttonInteraction.current.currentHoverTarget = null
        buttonInteraction.current.activeColorIndex = null
      }
      
      if (overButton) {
        shouldDrawNow = false
        if (drawingActive.current) {
          resetDrawing()
          drawingActive.current = false
          setCurrentlyDrawing(false)
        }
      }
      
      if (shouldDrawNow && !overButton) {
        const toolSize = eraserActive.current ? currentEraserSize.current : currentBrushSize.current
        
        drawCtx.lineCap = 'round'
        drawCtx.lineJoin = 'round'
        drawCtx.miterLimit = 2
        drawCtx.lineWidth = toolSize
        drawCtx.globalCompositeOperation = eraserActive.current ? 'destination-out' : 'source-over'
        drawCtx.strokeStyle = eraserActive.current ? '#000000' : currentBrushColor.current
        drawCtx.fillStyle = eraserActive.current ? '#000000' : currentBrushColor.current
        
        if (smoothPos.x < 0 || smoothPos.x > canvasWidth || smoothPos.y < 0 || smoothPos.y > canvasHeight) {
          return
        }
        
        if (previousPosition.current) {
          const moveX = smoothPos.x - previousPosition.current.x
          const moveY = smoothPos.y - previousPosition.current.y
          const moveDistance = Math.sqrt(moveX * moveX + moveY * moveY)
          
          const MinMove = 1.0
          const MaxMove = 200
          
          if (moveDistance < MaxMove) {
            if (moveDistance > MinMove) {
              drawSmoothLine(drawCtx, smoothPos, toolSize)
            } else {
              previousPosition.current = smoothPos
              lastMiddlePoint.current = smoothPos
            }
          } else {
            previousPosition.current = smoothPos
            lastMiddlePoint.current = smoothPos
            smoothedPosition.current = smoothPos
          }
        } else {
          drawSmoothLine(drawCtx, smoothPos, toolSize)
        }
      } else {
        if (drawingActive.current) {
          resetDrawing()
        }
      }
    } else {
      if (drawingActive.current) {
        drawingActive.current = false
        setCurrentlyDrawing(false)
        resetDrawing()
        gestureTracker.current = {
          pointing: false,
          pointingCount: 0,
          notPointingCount: 0
        }
      }
    }
  }

  const startCameraFeed = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 2560, min: 1280 },
          height: { ideal: 1440, min: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } 
      })
      
      if (videoElement.current) {
        videoElement.current.srcObject = stream
        
        videoElement.current.onloadedmetadata = () => {
          if (overlayCanvas.current && drawingCanvas.current && videoElement.current) {
            const videoWidth = videoElement.current.videoWidth
            const videoHeight = videoElement.current.videoHeight
            
            overlayCanvas.current.width = videoWidth
            overlayCanvas.current.height = videoHeight
            
            drawingCanvas.current.width = videoWidth
            drawingCanvas.current.height = videoHeight
            
            canvasContext.current = drawingCanvas.current.getContext('2d', {
              willReadFrequently: false,
              alpha: true
            })

            if (canvasContext.current) {
              canvasContext.current.clearRect(0, 0, videoWidth, videoHeight)
              canvasContext.current.imageSmoothingEnabled = true
              canvasContext.current.imageSmoothingQuality = 'high'
              canvasContext.current.textBaseline = 'top'
              canvasContext.current.textAlign = 'left'
              setupCanvasStyle()
            }
          }
          
          loadHandTracking()
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      alert('Camera access needed. Please allow camera permissions.')
    }
  }

  const stopCameraFeed = () => {
    if (cameraProcessor.current) {
      cameraProcessor.current.stop()
      cameraProcessor.current = null
    }
    
    if (videoElement.current && videoElement.current.srcObject) {
      const tracks = videoElement.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoElement.current.srcObject = null
    }
    
    if (handsProcessor.current) {
      handsProcessor.current.close()
      handsProcessor.current = null
    }
    
    setCameraActive(false)
    setManualModeActive(false)
    setCurrentlyDrawing(false)
    drawingActive.current = false
    resetDrawing()
  }

  const clearDrawingArea = () => {
    if (canvasContext.current && drawingCanvas.current) {
      canvasContext.current.clearRect(0, 0, drawingCanvas.current.width, drawingCanvas.current.height)
    }

    resetDrawing()
    drawingActive.current = false
    setCurrentlyDrawing(false)

    gestureTracker.current = {
      pointing: false,
      pointingCount: 0,
      notPointingCount: 0
    }
  }

  const switchToBrush = () => {
    setUsingEraser(false)
    eraserActive.current = false
    setupCanvasStyle()
    resetDrawing()
  }

  const switchToEraser = () => {
    setUsingEraser(true)
    eraserActive.current = true
    setupCanvasStyle()
    resetDrawing()
  }

  const saveArtwork = () => {
    if (!drawingCanvas.current) return

    const width = drawingCanvas.current.width
    const height = drawingCanvas.current.height
    const saveCanvas = document.createElement('canvas')
    saveCanvas.width = width
    saveCanvas.height = height
    const saveCtx = saveCanvas.getContext('2d')

    if (!saveCtx) return

    saveCtx.fillStyle = '#ffffff'
    saveCtx.fillRect(0, 0, width, height)
    drawBackgroundGrid(saveCtx, width, height)
    saveCtx.drawImage(drawingCanvas.current, 0, 0)

    const imageData = saveCanvas.toDataURL('image/png')
    const downloadLink = document.createElement('a')
    downloadLink.href = imageData
    downloadLink.download = 'my_drawing.png'
    downloadLink.click()
  }

  useEffect(() => {
    return () => {
      stopCameraFeed()
    }
  }, [])

  return (
    <div className="virtual-paint-page">
      <div className="ambient-light ambient-light--one" aria-hidden="true" />
      <div className="ambient-light ambient-light--two" aria-hidden="true" />

      <div className="virtual-paint-container">
        <header className="hero">
          <div className="hero-text">
            <p className="eyebrow">Hand-gesture creative lab</p>
            <h1>
              Virtual Paint <span>Studio</span>
            </h1>
            <p className="subhead">
              Control vivid strokes with nothing but your hands. Start the camera, tuck your thumb,
              and sketch in mid-air with gesture-precise tracking.
            </p>
          </div>

          <div className="status-grid">
            <div className="status-card">
              <span>Camera</span>
              <strong className={cameraActive ? 'positive' : ''}>{cameraActive ? 'Live' : 'Off'}</strong>
            </div>
            <div className="status-card">
              <span>Mode</span>
              <strong>{controlMode === 'gesture' ? 'Gesture' : 'Manual'}</strong>
            </div>
            <div className="status-card">
              <span>Drawing</span>
              <strong className={currentlyDrawing ? 'positive' : ''}>
                {currentlyDrawing ? 'Active' : 'Standing by'}
              </strong>
            </div>
          </div>
        </header>

        <section className="control-panel">
          <div className="control-card session-card">
            <div className="card-header">
              <h3>Session Controls</h3>
              <p>Power the camera feed, reset the board, and export your art.</p>
            </div>
            <div className="button-grid">
              <button
                onClick={startCameraFeed}
                disabled={cameraActive}
                className="btn btn-primary"
              >
                ▶ Start Camera
              </button>

              <button
                onClick={stopCameraFeed}
                disabled={!cameraActive}
                className="btn btn-danger"
              >
                ⏹ Stop Camera
              </button>

              <button
                onClick={clearDrawingArea}
                className="btn btn-secondary"
              >
                🧼 Clear Canvas
              </button>

              <button
                onClick={() => {
                  saveArtwork()
                }}
                className="btn btn-success"
              >
                💾 Save Artwork
              </button>
            </div>
          </div>

          <div className="control-card brush-card">
            <div className="card-header">
              <h3>Brush Studio</h3>
              <p>Dial-in stroke weight and pick vibrant pigments.</p>
            </div>
            <div className="tool-mode-row">
              <button
                type="button"
                className={`btn ${!usingEraser ? 'btn-primary' : 'btn-secondary'}`}
                onClick={switchToBrush}
              >
                ✏️ Brush
              </button>
              <button
                type="button"
                className={`btn ${usingEraser ? 'btn-primary' : 'btn-secondary'}`}
                onClick={switchToEraser}
              >
                🧽 Eraser
              </button>
            </div>

            {usingEraser ? (
              <div className="slider-group">
                <label htmlFor="eraserSize">
                  Eraser Size
                  <span>{eraserWidth}px</span>
                </label>
                <input
                  type="range"
                  id="eraserSize"
                  min="10"
                  max="120"
                  value={eraserWidth}
                  onChange={(e) => setEraserWidth(parseInt(e.target.value, 10))}
                />
              </div>
            ) : (
              <>
                <div className="slider-group">
                  <label htmlFor="brushSize">
                    Brush Size
                    <span>{brushWidth}px</span>
                  </label>
                  <input
                    type="range"
                    id="brushSize"
                    min="5"
                    max="50"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="color-row">
                  <div className="color-picker">
                    <label htmlFor="colorPicker">Custom Color</label>
                    <input
                      type="color"
                      id="colorPicker"
                      value={currentColor}
                      onChange={(e) => {
                        setCurrentColor(e.target.value);
                        setUsingEraser(false);
                      }}
                    />
                  </div>

                  <div className="color-palette" aria-label="Preset colors">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setCurrentColor(color)}
                        aria-label={`Select ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="control-card detection-card">
            <div className="card-header">
              <h3>Detection & Modes</h3>
              <p>Choose how you want to draw and what helpers stay visible.</p>
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={displayHands}
                onChange={(e) => setDisplayHands(e.target.checked)}
              />
              <span>Show hand landmarks for debugging</span>
            </label>

            <div className="mode-select">
              <label htmlFor="drawingMode">Drawing Mode</label>
              <select
                id="drawingMode"
                value={controlMode}
                onChange={(e) => {
                  const newMode = e.target.value
                  setControlMode(newMode)
                  setCurrentlyDrawing(false)
                  drawingActive.current = false
                  resetDrawing()
                  setManualModeActive(false)
                }}
              >
                <option value="gesture">Gesture — thumb tucked to draw</option>
                <option value="manual">Manual — toggle button control</option>
              </select>
            </div>

            {controlMode === 'manual' && (
              <button
                onClick={() => {
                  setManualModeActive((prev) => {
                    const newState = !prev
                    if (newState) {
                      smoothedPosition.current = null
                      previousPosition.current = null
                      lastMiddlePoint.current = null
                    } else {
                      resetDrawing()
                    }
                    return newState
                  })
                }}
                className={`btn stretch ${manualModeActive ? 'btn-danger' : 'btn-primary'}`}
              >
                {manualModeActive ? '⏸ Stop Drawing' : '▶ Start Drawing'}
              </button>
            )}

            <div className="drawing-status">
              <span className={`status-indicator ${currentlyDrawing ? 'drawing' : 'stopped'}`}>
                {currentlyDrawing ? '✏️ Drawing now' : '⏸ Waiting for gesture'}
              </span>
              {controlMode === 'gesture' && cameraActive && (
                <span className="status-tip">
                  💡 Tuck your thumb inside a gentle fist to paint
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="video-shell">
          <div className="video-header">
            <div>
              <p className="eyebrow">Live canvas</p>
              <h3>Camera feed & overlay</h3>
            </div>
            <p className="resolution">
              {cameraActive ? 'Streaming in HD' : 'Camera idle'}
            </p>
          </div>
          <div className="video-container">
            <video
              ref={videoElement}
              className="video"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={overlayCanvas}
              className="canvas overlay-canvas"
            />
            <canvas
              ref={drawingCanvas}
              className="canvas draw-canvas"
            />
          </div>
        </section>

        <section className="info-grid">
          <article className="info-card">
            <h4>How to start</h4>
            <ul>
              <li>Tap <strong>Start Camera</strong> and grant permissions.</li>
              <li>Align your hand inside the frame; index tip becomes the brush.</li>
              <li>Use the brush slider and palette to define your stroke.</li>
            </ul>
          </article>

          <article className="info-card">
            <h4>Gesture cheatsheet</h4>
            <ul>
              <li>
                <strong>Draw</strong>: make a soft fist with your <strong>thumb tucked inside</strong>.
              </li>
              <li>
                <strong>Pause</strong>: open your hand to instantly stop.
              </li>
              <li>
                Switch to <strong>manual mode</strong> when calibrating or testing.
              </li>
            </ul>
          </article>

          <article className="info-card">
            <h4>Pro tips</h4>
            <ul>
              <li>Keep consistent lighting so landmarks stay steady.</li>
              <li>Toggle hand landmarks to inspect the tracking mesh.</li>
              <li>Export your masterpiece anytime with Save Artwork.</li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  )
}

export default VirtualPaint