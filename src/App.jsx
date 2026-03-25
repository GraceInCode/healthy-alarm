import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Camera, Clock, Award } from "lucide-react";

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alarmTime, setAlarmTime] = useState("7:00");
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [streak, setStreak] = useState(7); // demo value
  const [todayPhoto, setTodayPhoto] = useState(null);

  // Camera & capture refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [skyValid, setSkyValid] = useState(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Alarm Checker
  useEffect(() => {
    const checkAlarm = () => {
      const now = format(currentTime, "HH:mm");
      if (now === alarmTime && !isAlarmRinging) {
        setIsAlarmRinging(true);
      }
    };
    const interval = setInterval(checkAlarm, 30000);
    return () => clearInterval(interval);
  }, [currentTime, alarmTime, isAlarmRinging]);

  // Alarm trigger
  const triggerAlarm = async () => {
    setIsAlarmRinging(true);
    setCapturedPhoto(null);
    setSkyValid(false);

    // Start loud beeping noise
    const audioContext = new (
      window.AudioContext || window["webkitAudioContext"]
    )();
    let oscillator = null;
    const beep = () => {
      oscillator = audioContext.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 800;
      const gain = audioContext.createGain();
      gain.gain.value = 0.9;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      setTimeout(() => {
        if (oscillator) oscillator.stop();
      }, 400);
    };
    const beepInterval = setInterval(beep, 600);

    // Keep screen awake
    if ("wakelock" in navigator) {
      try {
        await navigator.wakelock.request("screen");
      } catch {}
    }

    // Start Camera (prefers rear camera)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      alert(
        "Camera access denied. Please enable camera permissions to use SkyWake.",
      );
    }

    // Store the stop function to clear everything
    window.stopAlarmSound = () => {
      clearInterval(beepInterval);
      if (oscillator) oscillator.stop();
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  };

  // Take Photo
  const takeSkyPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.width;
    canvas.height = video.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(photoData);

    // For now: Simple sky validation (average brightness + blue tint)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r = 0,
      g = 0,
      b = 0,
      brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      ((r += data[i]), (g += data[i + 1]), (b += data[i + 2]));
      brightness += data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    }
    const avgR = r / (data.length / 4);
    const avgB = b / (data.length / 4);
    const avgBrightness = brightness / (data.length / 4);

    const isSky = avgB > avgR * 1.1 && avgBrightness > 40;
    setSkyValid(isSky);

    // auto-stop if it looks like sky
    if (isSky) {
      stopAlarm();
      setTodayPhoto(photoData);
      setStreak((prev) => prev + 1);
      localStorage.setItem("todaySkyPhoto", photoData);
      localStorage.setItem("streak", streak + 1).toString();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <h1 className="text-5xl font-bold text-sky-400 mb-2">🌤️ SkyWake</h1>
      <p className="text-slate-400 mb-8">Look up. Wake up.</p>

      <div className="text-center mb-12">
        <div className="text-7xl font-mono font-bold text-white mb-1">
          {format(currentTime, "HH:mm")}
        </div>
        <p className="text-slate-500">{format(currentTime, "EEEE, MMMM d")}</p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-3 bg-slate-800/50 rounded-2xl px-8 py-4 mb-8">
        <Award className="w-10 h-10 text-amber-400" />
        <div>
          <div className="text-3xl font-bold">{streak}</div>
          <div className="text-sm text-slate-400">day streak</div>
        </div>
      </div>

      {/* Set alarm */}
      <div className="w-full max-w-xs bg-slate-900 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Your wake-up time</span>
        </div>
        <input
          type="time"
          value={alarmTime}
          onChange={(e) => setAlarmTime(e.target.value)}
          className="w-full bg-transparent text-5xl text-center font-mono focus:outline-none"
        />
        <button
          className="mt-6 w-full bg-sky-500 hover:bg-sky-600 py-4 rounded-2xl font-semibold transition"
          onClick={() => alert("Alarm set for " + alarmTime)}
        >
          Save Alarm
        </button>
      </div>

      <div className="mt-auto pt-12 text-xs text-slate-500">
        Built with ❤️ for better mornings
      </div>
    </div>
  );
}

export default App;
