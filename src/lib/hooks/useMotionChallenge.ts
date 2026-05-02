import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';
import { DETECTION_THRESHOLDS } from '../../constants/detectionThresholds';
import type { MotionSample } from '../../types/skyResult';

const GRAVITY = 9.8;
const COLLECTION_INTERVAL_MS = 100; // 10 Hz
const DURATION_MS = DETECTION_THRESHOLDS.fallbackMotionDurationMs;
// Fallback is less strict — user just needs to be moving around
const FALLBACK_CUMULATIVE_THRESHOLD = 50;

export function useMotionChallenge() {
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(DURATION_MS / 1000));
  const [totalMotion, setTotalMotion] = useState(0);

  const startTimeRef = useRef<number>(0);
  const cumulativeMotionRef = useRef(0);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsActive(false);
  }, []);

  const start = useCallback(() => {
    if (isActive) return;
    cumulativeMotionRef.current = 0;
    startTimeRef.current = Date.now();
    setProgress(0);
    setIsComplete(false);
    setSecondsRemaining(Math.ceil(DURATION_MS / 1000));
    setTotalMotion(0);
    setIsActive(true);

    Accelerometer.setUpdateInterval(COLLECTION_INTERVAL_MS);
    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(magnitude - GRAVITY);
      cumulativeMotionRef.current += delta;
      setTotalMotion(cumulativeMotionRef.current);
    });

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(p);
      setSecondsRemaining(Math.ceil((DURATION_MS - elapsed) / 1000));

      if (elapsed >= DURATION_MS) {
        stop();
        const passed = cumulativeMotionRef.current >= FALLBACK_CUMULATIVE_THRESHOLD;
        setIsComplete(passed);
      }
    }, 1000);
  }, [isActive, stop]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, progress, secondsRemaining, isComplete, isActive, totalMotion };
}

// ── Short motion sample collection for anti-spoof ──────────────────────────

export function useShortMotionSamples(): { samples: MotionSample[]; startCollecting: () => void } {
  const samplesRef = useRef<MotionSample[]>([]);
  const [samples, setSamples] = useState<MotionSample[]>([]);

  const startCollecting = useCallback(() => {
    samplesRef.current = [];
    Accelerometer.setUpdateInterval(50); // 20 Hz
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      samplesRef.current.push({ ax: x, ay: y, az: z, timestamp: Date.now() });
      if (samplesRef.current.length >= 40) {
        // 2 seconds of data collected
        setSamples([...samplesRef.current]);
        sub.remove();
      }
    });
  }, []);

  return { samples, startCollecting };
}
