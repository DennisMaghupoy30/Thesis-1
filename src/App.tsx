import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaf, Video, Brain, Clock } from 'lucide-react'
import CameraGrid from './components/CameraGrid'
import PredictionLog from './components/PredictionLog'
import { io } from "socket.io-client"

interface Camera {
  id: number;
  name?: string;
  device: string;
  streamPort: number;
  streamUrl: string;
}

interface Prediction {
  cameraId: number;
  model: string;
  timestamp: string;
  result: any;
}

interface Status {
  cameras: number;
  models: string[];
  currentModel: string | null;
  totalPredictions: number;
  uptime: number;
}

interface SystemError {
  cameraId: number;
  error: string;
  timestamp: string;
}

function App() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [isLogExpanded, setIsLogExpanded] = useState(false);

  const fetchData = async () => {
    try {
      const [camerasRes, predictionsRes, statusRes, errorsRes] = await Promise.all([
        fetch('http://localhost:9003/api/cameras'),
        fetch('http://localhost:9003/api/predictions'),
        fetch('http://localhost:9003/api/status'),
        fetch('http://localhost:9003/api/errors')
      ]);

      if (camerasRes.ok) setCameras(await camerasRes.json());
      if (predictionsRes.ok) setPredictions(await predictionsRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
      if (errorsRes.ok) setErrors(await errorsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    console.log("\n ====== Connecting to WebSocket and fetching initial data...\n =====");
    fetchData();

    const socket = io('https://vertiapp.xyz', {
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('send_sensor_data', (data: any) => {
      const parsedData = JSON.parse(data);
      setPredictions((prevPredictions) => [parsedData, ...prevPredictions]);
    });

    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5"
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-semibold tracking-tight truncate">VertiPlant</h1>
                <p className="text-[10px] sm:text-xs text-zinc-500 hidden sm:block">Monitoring System</p>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-400">{cameras.length}</span>
                <span className="text-zinc-600">cameras</span>
              </div>

              {status && (
                <>
                  <div className="w-px h-4 bg-white/10"></div>
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-400 font-mono">{status.currentModel || 'N/A'}</span>
                  </div>

                  <div className="w-px h-4 bg-white/10"></div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-400 font-mono">{formatUptime(status.uptime)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[10px] sm:text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-6">
        <CameraGrid cameras={cameras} predictions={predictions} errors={errors} />
      </main>

      {/* Prediction Log */}
      <PredictionLog
        predictions={predictions}
        isExpanded={isLogExpanded}
        onToggle={() => setIsLogExpanded(!isLogExpanded)}
      />
    </div>
  )
}

export default App
