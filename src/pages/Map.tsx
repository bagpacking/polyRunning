import { useEffect, useRef, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonSpinner
} from '@ionic/react';
import { Geolocation } from '@capacitor/geolocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';

interface LatLng {
  lat: number;
  lng: number;
}

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

const Map: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const currentPolylineRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const directionMarkerRef = useRef<L.Marker | null>(null);
  const drawingPathRef = useRef<LatLng[]>([]);
  const allPathsRef = useRef<LatLng[][]>([]);
  const isDrawingRef = useRef(false);
  const currentLocationRef = useRef<LatLng | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const [hasPath, setHasPath] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string>('');
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createDirectionIcon = (heading: number) => {
    const svgIcon = `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${heading} 30 30)">
          <circle cx="30" cy="30" r="28" fill="rgba(66, 133, 244, 0.2)" stroke="#4285f4" stroke-width="2"/>
          <path d="M 30 10 L 40 35 L 30 30 L 20 35 Z" fill="#4285f4" stroke="white" stroke-width="1"/>
          <circle cx="30" cy="30" r="4" fill="white" stroke="#4285f4" stroke-width="2"/>
        </g>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'direction-marker',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });
  };

  const createMarkerIcon = () => {
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultLocation: [number, number] = [37.5665, 126.9780];

    const map = L.map(mapRef.current, {
      center: defaultLocation,
      zoom: 15,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    map.whenReady(() => {
      setTimeout(() => {
        try {
          if (map && map.getContainer() && mapRef.current) {
            map.invalidateSize();
          }
        } catch (error) {
          console.warn('지도 크기 조정 오류:', error);
        }
      }, 200);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

    const setupOrientation = () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              startOrientationTracking();
            }
          })
          .catch((error: Error) => {
            console.error('나침반 권한 요청 오류:', error);
          });
      } else {
        startOrientationTracking();
      }
    };

    const startOrientationTracking = () => {
      orientationHandler = (event: DeviceOrientationEvent) => {
        let heading = 0;
        const iosEvent = event as DeviceOrientationEventiOS;

        if (iosEvent.webkitCompassHeading !== undefined) {
          heading = iosEvent.webkitCompassHeading;
        } else if (event.alpha !== null) {
          heading = 360 - event.alpha;
        }

        currentHeadingRef.current = heading;
        setCurrentHeading(heading);
        updateDirectionMarker(currentLocationRef.current, heading);
      };

      window.addEventListener('deviceorientation', orientationHandler);
    };

    setupOrientation();

    return () => {
      if (orientationHandler) {
        window.removeEventListener('deviceorientation', orientationHandler);
      }
    };
  }, []);

  const updateDirectionMarker = (location: LatLng | null, heading: number) => {
    if (!location || !mapInstanceRef.current) return;

    const position: [number, number] = [location.lat, location.lng];
    const icon = createDirectionIcon(heading);

    if (directionMarkerRef.current) {
      directionMarkerRef.current.setLatLng(position);
      directionMarkerRef.current.setIcon(icon);
    } else {
      directionMarkerRef.current = L.marker(position, { 
        icon,
        zIndexOffset: 1000
      }).addTo(mapInstanceRef.current);
    }
  };

  const updateCurrentLocationMarker = (location: LatLng) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const position: [number, number] = [location.lat, location.lng];
    updateDirectionMarker(location, currentHeadingRef.current);
    map.setView(position, 15);
  };

  useEffect(() => {
    let watchId: string | null = null;

    const setupLocation = async () => {
      try {
        const permission = await Geolocation.checkPermissions();

        if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
          const requestResult = await Geolocation.requestPermissions();
          if (requestResult.location === 'denied') {
            setLocationError('위치 권한이 거부되었습니다.');
            setIsLoadingLocation(false);
            return;
          }
        } else if (permission.location === 'denied') {
          setLocationError('위치 권한이 거부되었습니다.');
          setIsLoadingLocation(false);
          return;
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        currentLocationRef.current = location;
        setIsLoadingLocation(false);
        setLocationError('');

        if (mapInstanceRef.current) {
          updateCurrentLocationMarker(location);
        }

        watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          },
          (position, err) => {
            if (err) {
              console.error('위치 추적 오류:', err);
              return;
            }

            if (position) {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };

              currentLocationRef.current = location;

              if (directionMarkerRef.current && mapInstanceRef.current) {
                directionMarkerRef.current.setLatLng([location.lat, location.lng]);
              }
            }
          }
        );
      } catch (error: any) {
        console.error('위치 정보 오류:', error);
        setIsLoadingLocation(false);
        setLocationError('위치 정보를 가져올 수 없습니다.');
      }
    };

    setupLocation();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, []);

  const getDistance = (point1: LatLng, point2: LatLng): number => {
    const R = 6371000;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getLatLngFromPixel = (x: number, y: number, map: L.Map): LatLng | null => {
    if (!map || !mapRef.current) return null;

    try {
      const container = map.getContainer();
      if (!container || !container.offsetParent) {
        return null;
      }

      const rect = mapRef.current.getBoundingClientRect();
      const point = L.point(x - rect.left, y - rect.top);
      const latlng = map.containerPointToLatLng(point);
      return { lat: latlng.lat, lng: latlng.lng };
    } catch (error) {
      console.error('좌표 변환 오류:', error);
      return null;
    }
  };

  const updateCurrentPolyline = (map: L.Map) => {
    if (drawingPathRef.current.length < 2) return;

    const path = drawingPathRef.current.map(
      (point) => [point.lat, point.lng] as [number, number]
    );

    if (currentPolylineRef.current) {
      currentPolylineRef.current.setLatLngs(path);
    } else {
      currentPolylineRef.current = L.polyline(path, {
        color: '#FF0000',
        weight: 4,
        opacity: 1
      }).addTo(map);
      polylinesRef.current.push(currentPolylineRef.current);
    }
  };

  const setupDrawing = (map: L.Map) => {
    const addPointToPath = (latlng: LatLng, minDistance = 0.5) => {
      const path = drawingPathRef.current;
      const lastPoint = path[path.length - 1];

      if (!lastPoint || getDistance(lastPoint, latlng) > minDistance) {
        path.push(latlng);
        setHasPath(allPathsRef.current.length > 0 || path.length >= 2);
        updateCurrentPolyline(map);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isDrawingMode && e.touches.length === 1) {
        isDrawingRef.current = true;
        drawingPathRef.current = [];
        currentPolylineRef.current = null;
        const touch = e.touches[0];
        const latlng = getLatLngFromPixel(touch.clientX, touch.clientY, map);
        if (latlng) {
          addPointToPath(latlng, 0);
          map.dragging.disable();
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDrawingMode && isDrawingRef.current && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const latlng = getLatLngFromPixel(touch.clientX, touch.clientY, map);
        if (latlng && drawingPathRef.current.length > 0) {
          addPointToPath(latlng, 3);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDrawingMode && e.touches.length === 0) {
        if (isDrawingRef.current && drawingPathRef.current.length > 0) {
          if (drawingPathRef.current.length >= 2) {
            allPathsRef.current.push([...drawingPathRef.current]);
          }
          setHasPath(allPathsRef.current.length > 0);
        }
        isDrawingRef.current = false;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isDrawingMode && e.button === 0) {
        isDrawingRef.current = true;
        drawingPathRef.current = [];
        currentPolylineRef.current = null;
        const latlng = getLatLngFromPixel(e.clientX, e.clientY, map);
        if (latlng) {
          addPointToPath(latlng, 0);
          map.dragging.disable();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDrawingMode && isDrawingRef.current && e.buttons === 1) {
        const latlng = getLatLngFromPixel(e.clientX, e.clientY, map);
        if (latlng && drawingPathRef.current.length > 0) {
          addPointToPath(latlng, 3);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDrawingMode && isDrawingRef.current && drawingPathRef.current.length > 0) {
        if (drawingPathRef.current.length >= 2) {
          allPathsRef.current.push([...drawingPathRef.current]);
        }
        setHasPath(allPathsRef.current.length > 0);
      }
      isDrawingRef.current = false;
    };

    const mapDiv = mapRef.current;
    if (!mapDiv) {
      return () => {};
    }

    mapDiv.addEventListener('touchstart', handleTouchStart, { passive: false });
    mapDiv.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapDiv.addEventListener('touchend', handleTouchEnd);
    mapDiv.addEventListener('mousedown', handleMouseDown);
    mapDiv.addEventListener('mousemove', handleMouseMove);
    mapDiv.addEventListener('mouseup', handleMouseUp);
    mapDiv.addEventListener('mouseleave', handleMouseUp);

    return () => {
      if (mapDiv) {
        mapDiv.removeEventListener('touchstart', handleTouchStart);
        mapDiv.removeEventListener('touchmove', handleTouchMove);
        mapDiv.removeEventListener('touchend', handleTouchEnd);
        mapDiv.removeEventListener('mousedown', handleMouseDown);
        mapDiv.removeEventListener('mousemove', handleMouseMove);
        mapDiv.removeEventListener('mouseup', handleMouseUp);
        mapDiv.removeEventListener('mouseleave', handleMouseUp);
      }

      isDrawingRef.current = false;

      if (map && !isDrawingMode) {
        try {
          const container = map.getContainer();
          if (container && container.parentElement && container.offsetParent) {
            map.dragging.enable();
          }
        } catch (error) {
          console.warn('지도 드래그 활성화 오류:', error);
        }
      }
    };
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const cleanup = setupDrawing(mapInstanceRef.current);
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isDrawingMode]);

  const handleConfirm = () => {
    if (allPathsRef.current.length === 0) {
      alert('경로를 그려주세요.');
      return;
    }

    const allCoordinates = allPathsRef.current.flat();

    if (routePolylineRef.current) {
      mapInstanceRef.current?.removeLayer(routePolylineRef.current);
    }

    const routePath = allCoordinates.map(
      (point) => [point.lat, point.lng] as [number, number]
    );

    routePolylineRef.current = L.polyline(routePath, {
      color: '#4285f4',
      weight: 6,
      opacity: 0.8
    }).addTo(mapInstanceRef.current!);

    polylinesRef.current.forEach(polyline => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(polyline);
      }
    });
    polylinesRef.current = [];
    currentPolylineRef.current = null;

    if (currentLocationRef.current && mapInstanceRef.current) {
      updateCurrentLocationMarker(currentLocationRef.current);
    }

    if (mapInstanceRef.current && routePolylineRef.current) {
      try {
        mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), {
          padding: [50, 50]
        });
      } catch (error) {
        console.warn('지도 범위 조정 오류:', error);
      }
    }

    setIsDrawingMode(false);
    setIsRunning(true);
    isDrawingRef.current = false;
    drawingPathRef.current = [];
    allPathsRef.current = [];
    setHasPath(false);
    
    setTimeout(() => {
      if (!mapInstanceRef.current) return;
      try {
        const map = mapInstanceRef.current;
        const container = map.getContainer();
        if (container && container.parentElement && container.offsetParent) {
          if (!map.dragging.enabled()) {
            map.dragging.enable();
          }
          try {
            map.invalidateSize();
          } catch (sizeError) {
            // 무시
          }
        }
      } catch (error) {
        console.warn('지도 드래그 활성화 오류:', error);
      }
    }, 100);
  };

  const handleStartDrawing = () => {
    setIsDrawingMode(true);
    isDrawingRef.current = false;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.dragging.disable();

      if (allPathsRef.current.length > 0) {
        allPathsRef.current.forEach(path => {
          const leafletPath = path.map(
            (point) => [point.lat, point.lng] as [number, number]
          );
          const polyline = L.polyline(leafletPath, {
            color: '#FF0000',
            weight: 4,
            opacity: 1
          }).addTo(mapInstanceRef.current!);
          polylinesRef.current.push(polyline);
        });
      }
    }

    setHasPath(allPathsRef.current.length > 0);
  };

  const handleStopDrawing = () => {
    setIsDrawingMode(false);
    isDrawingRef.current = false;
    
    if (drawingPathRef.current.length >= 2) {
      allPathsRef.current.push([...drawingPathRef.current]);
    }
    drawingPathRef.current = [];
    currentPolylineRef.current = null;
    
    setHasPath(allPathsRef.current.length > 0);

    setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          const container = mapInstanceRef.current.getContainer();
          if (container && container.parentElement && container.offsetParent) {
            mapInstanceRef.current.dragging.enable();
          }
        } catch (error) {
          console.warn('지도 드래그 활성화 오류:', error);
        }
      }
    }, 100);
  };

  const handleStopPress = () => {
    setPressProgress(0);
    
    const timer = setTimeout(() => {
      // 러닝 종료만 하고 경로는 유지
      setIsRunning(false);
      setPressProgress(0);
      setPressTimer(null);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 1500);

    setPressTimer(timer);

    progressIntervalRef.current = setInterval(() => {
      setPressProgress(prev => {
        if (prev >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return 100;
        }
        return prev + (100 / 15); // 1.5초 = 15 * 100ms
      });
    }, 100);
  };

  const handleStopRelease = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPressProgress(0);
  };

  const handleStopClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleClear = () => {
    polylinesRef.current.forEach(polyline => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(polyline);
      }
    });
    polylinesRef.current = [];
    currentPolylineRef.current = null;
    drawingPathRef.current = [];
    allPathsRef.current = [];
    setHasPath(false);
  };

  const handleReset = () => {
    polylinesRef.current.forEach(polyline => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(polyline);
      }
    });
    polylinesRef.current = [];
    currentPolylineRef.current = null;
    
    if (routePolylineRef.current) {
      mapInstanceRef.current?.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    drawingPathRef.current = [];
    allPathsRef.current = [];
    setHasPath(false);
    setIsRunning(false);
  };

  const handleGoToCurrentLocation = async () => {
    if (currentLocationRef.current && mapInstanceRef.current) {
      updateCurrentLocationMarker(currentLocationRef.current);
    } else {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        currentLocationRef.current = location;
        updateCurrentLocationMarker(location);
      } catch (error) {
        alert('현재 위치를 가져올 수 없습니다.');
      }
    }
  };

  const requestCompassPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          alert('나침반 권한이 허용되었습니다!');
        } else {
          alert('나침반 권한이 거부되었습니다.');
        }
      } catch (error) {
        console.error('나침반 권한 요청 오류:', error);
      }
    } else {
      alert('이 기기는 나침반 권한 요청이 필요하지 않습니다.');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div ref={mapRef} className="map-container" />
        
        {isLoadingLocation && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 1000
          }}>
            <IonSpinner name="crescent" />
            <span>위치 정보 가져오는 중...</span>
          </div>
        )}

        {locationError && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ff4444',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            maxWidth: '80%',
            textAlign: 'center',
            zIndex: 1000
          }}>
            {locationError}
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: '20px',
          left: '10px',
          background: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🧭 {Math.round(currentHeading)}°
        </div>

        {!isLoadingLocation && !locationError && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <IonButton
              onClick={handleGoToCurrentLocation}
              style={{
                '--padding-start': '12px',
                '--padding-end': '12px'
              }}
            >
              📍
            </IonButton>
            {typeof (DeviceOrientationEvent as any).requestPermission === 'function' && (
              <IonButton
                onClick={requestCompassPermission}
                size="small"
                style={{
                  '--padding-start': '8px',
                  '--padding-end': '8px',
                  fontSize: '12px'
                }}
              >
                🧭
              </IonButton>
            )}
          </div>
        )}

        <div className="map-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {isRunning ? (
            <IonButton
              color="danger"
              onMouseDown={handleStopPress}
              onMouseUp={handleStopRelease}
              onMouseLeave={handleStopRelease}
              onTouchStart={handleStopPress}
              onTouchEnd={handleStopRelease}
              onClick={handleStopClick}
              style={{
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                margin: 0
              }}
            >
              <span style={{ position: 'relative', zIndex: 2 }}>
                정지 (1.5초간 누르기)
              </span>
              {pressProgress > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  height: '100%',
                  width: `${pressProgress}%`,
                  background: 'rgba(139, 0, 0, 0.5)',
                  transition: 'none',
                  zIndex: 1
                }} />
              )}
            </IonButton>
          ) : routePolylineRef.current ? (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <IonButton
                color="success"
                onClick={() => setIsRunning(true)}
                style={{ flex: 1, margin: 0 }}
              >
                다시 시작
              </IonButton>
              <IonButton
                fill="outline"
                color="medium"
                onClick={handleReset}
                style={{ flex: 1, margin: 0 }}
              >
                초기화
              </IonButton>
            </div>
          ) : !isDrawingMode ? (
            <>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <IonButton
                  onClick={handleStartDrawing}
                  style={{ flex: 1, margin: 0 }}
                >
                  그리기
                </IonButton>
                <IonButton
                  fill="outline"
                  color="medium"
                  onClick={handleReset}
                  style={{ flex: 1, margin: 0 }}
                >
                  초기화
                </IonButton>
              </div>
              {hasPath && (
                <IonButton
                  color="success"
                  onClick={handleConfirm}
                  style={{ width: '100%', margin: 0 }}
                >
                  러닝 시작
                </IonButton>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {hasPath ? (
                <>
                  <IonButton
                    fill="outline"
                    color="medium"
                    onClick={handleClear}
                    style={{ flex: 1, margin: 0 }}
                  >
                    지우기
                  </IonButton>
                  <IonButton
                    onClick={handleStopDrawing}
                    style={{ flex: 1, margin: 0 }}
                  >
                    정지
                  </IonButton>
                  <IonButton
                    color="success"
                    onClick={handleConfirm}
                    style={{ flex: 1, margin: 0 }}
                  >
                    시작
                  </IonButton>
                </>
              ) : (
                <>
                  <IonButton
                    onClick={handleStopDrawing}
                    style={{ flex: 1, margin: 0 }}
                  >
                    정지
                  </IonButton>
                  <IonButton
                    color="success"
                    onClick={handleConfirm}
                    disabled={!hasPath}
                    style={{ flex: 1, margin: 0 }}
                  >
                    시작
                  </IonButton>
                </>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Map;