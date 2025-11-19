/**
 * Sensor Ingestion Service
 * 
 * Continuous data collection from all sensors (camera, mic, GPS, uploads)
 * Feeds data to PerceptionOrchestrator and RAG backends
 */

export interface SensorReading {
  type: 'camera' | 'microphone' | 'gps' | 'upload' | 'accelerometer' | 'gyroscope';
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

export interface SensorPolicy {
  enabled: boolean;
  samplingInterval: number; // milliseconds
  minConfidence?: number;
  storeInRAG: boolean;
}

export interface SensorConfig {
  camera: SensorPolicy;
  microphone: SensorPolicy;
  gps: SensorPolicy;
  accelerometer: SensorPolicy;
  gyroscope: SensorPolicy;
}

const DEFAULT_CONFIG: SensorConfig = {
  camera: {
    enabled: false,
    samplingInterval: 5000, // 5 seconds
    minConfidence: 0.6,
    storeInRAG: true
  },
  microphone: {
    enabled: false,
    samplingInterval: 1000, // 1 second
    storeInRAG: true
  },
  gps: {
    enabled: false,
    samplingInterval: 10000, // 10 seconds
    storeInRAG: true
  },
  accelerometer: {
    enabled: false,
    samplingInterval: 500, // 500ms
    storeInRAG: false
  },
  gyroscope: {
    enabled: false,
    samplingInterval: 500, // 500ms
    storeInRAG: false
  }
};

type SensorListener = (reading: SensorReading) => void | Promise<void>;

export class SensorIngestionService {
  private static instance: SensorIngestionService;
  
  private config: SensorConfig = DEFAULT_CONFIG;
  private listeners: Set<SensorListener> = new Set();
  private intervalHandles: Map<string, number> = new Map();
  private gpsWatchId: number | null = null;
  private lastGPSReading: GeolocationPosition | null = null;
  
  private constructor() {
    this.loadConfig();
  }

  static getInstance(): SensorIngestionService {
    if (!SensorIngestionService.instance) {
      SensorIngestionService.instance = new SensorIngestionService();
    }
    return SensorIngestionService.instance;
  }

  private loadConfig(): void {
    const stored = localStorage.getItem('sensor-ingestion-config');
    if (stored) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      } catch (e) {
        console.warn('[SensorIngestion] Failed to load config, using defaults');
      }
    }
  }

  private saveConfig(): void {
    localStorage.setItem('sensor-ingestion-config', JSON.stringify(this.config));
  }

  subscribe(listener: SensorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async emit(reading: SensorReading): Promise<void> {
    const promises = Array.from(this.listeners).map(listener => 
      Promise.resolve(listener(reading))
    );
    await Promise.allSettled(promises);
  }

  updateConfig(updates: Partial<SensorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.restart();
  }

  getConfig(): SensorConfig {
    return { ...this.config };
  }

  // Camera sensor
  enableCamera(captureCallback: () => Promise<string | null>): void {
    this.config.camera.enabled = true;
    this.saveConfig();
    
    const intervalId = window.setInterval(async () => {
      if (!this.config.camera.enabled) return;
      
      const imageData = await captureCallback();
      if (imageData) {
        await this.emit({
          type: 'camera',
          timestamp: Date.now(),
          data: imageData,
          metadata: { source: 'continuous_ingestion' }
        });
      }
    }, this.config.camera.samplingInterval);
    
    this.intervalHandles.set('camera', intervalId);
  }

  // Microphone sensor (ambient audio analysis)
  enableMicrophone(analyzeCallback: () => Promise<{ volume: number; features: any }>): void {
    this.config.microphone.enabled = true;
    this.saveConfig();
    
    const intervalId = window.setInterval(async () => {
      if (!this.config.microphone.enabled) return;
      
      const audioFeatures = await analyzeCallback();
      await this.emit({
        type: 'microphone',
        timestamp: Date.now(),
        data: audioFeatures,
        metadata: { source: 'ambient_monitoring' }
      });
    }, this.config.microphone.samplingInterval);
    
    this.intervalHandles.set('microphone', intervalId);
  }

  // GPS sensor
  enableGPS(): void {
    if (!('geolocation' in navigator)) {
      console.warn('[SensorIngestion] Geolocation API not available');
      return;
    }

    this.config.gps.enabled = true;
    this.saveConfig();

    // Use watchPosition for continuous GPS tracking
    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastGPSReading = position;
        this.emit({
          type: 'gps',
          timestamp: Date.now(),
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          },
          metadata: {
            timestamp: position.timestamp,
            source: 'continuous_gps'
          }
        });
      },
      (error) => {
        console.error('[SensorIngestion] GPS error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  disableGPS(): void {
    this.config.gps.enabled = false;
    this.saveConfig();
    
    if (this.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
  }

  getLastGPSReading(): GeolocationPosition | null {
    return this.lastGPSReading;
  }

  // Motion sensors (accelerometer, gyroscope)
  enableMotionSensors(): void {
    if (!('DeviceMotionEvent' in window)) {
      console.warn('[SensorIngestion] DeviceMotion API not available');
      return;
    }

    window.addEventListener('devicemotion', this.handleDeviceMotion);
    this.config.accelerometer.enabled = true;
    this.config.gyroscope.enabled = true;
    this.saveConfig();
  }

  disableMotionSensors(): void {
    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    this.config.accelerometer.enabled = false;
    this.config.gyroscope.enabled = false;
    this.saveConfig();
  }

  private handleDeviceMotion = (event: DeviceMotionEvent): void => {
    if (this.config.accelerometer.enabled && event.acceleration) {
      this.emit({
        type: 'accelerometer',
        timestamp: Date.now(),
        data: {
          x: event.acceleration.x,
          y: event.acceleration.y,
          z: event.acceleration.z
        }
      });
    }

    if (this.config.gyroscope.enabled && event.rotationRate) {
      this.emit({
        type: 'gyroscope',
        timestamp: Date.now(),
        data: {
          alpha: event.rotationRate.alpha,
          beta: event.rotationRate.beta,
          gamma: event.rotationRate.gamma
        }
      });
    }
  };

  disableSensor(sensorType: keyof SensorConfig): void {
    const handle = this.intervalHandles.get(sensorType);
    if (handle) {
      window.clearInterval(handle);
      this.intervalHandles.delete(sensorType);
    }

    this.config[sensorType].enabled = false;
    this.saveConfig();

    if (sensorType === 'gps') {
      this.disableGPS();
    } else if (sensorType === 'accelerometer' || sensorType === 'gyroscope') {
      this.disableMotionSensors();
    }
  }

  restart(): void {
    this.stop();
    // Restart will be handled by components re-enabling sensors
  }

  stop(): void {
    for (const handle of this.intervalHandles.values()) {
      window.clearInterval(handle);
    }
    this.intervalHandles.clear();
    
    this.disableGPS();
    this.disableMotionSensors();
  }

  isEnabled(sensorType: keyof SensorConfig): boolean {
    return this.config[sensorType].enabled;
  }
}
