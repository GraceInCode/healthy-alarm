import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Camera, Clock, Award, AlertCircle, Play } from "lucide-react";

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [streak, setStreak] = useState(7);
  const [todayPhoto, setTodayPhoto] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [skyValid, setSkyValid] = useState(false);
  const [cameraPermission, setCameraPermission] = useState("unknown");

  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = format(currentTimeRef.current, "HH:mm");
      if (now === alarmTime && !isAlarmRinging) triggerAlarm();
    }, 5000);
    return () => clearInterval(interval);
  }, [alarmTime, isAlarmRinging]);

  const requestCameraPermission = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      mediaStream.getTracks().forEach((track) => track.stop());
      setCameraPermission("granted");
      alert("✅ Camera permission granted! SkyWake is ready.");
    } catch {
      setCameraPermission("denied");
      alert(
        "❌ Camera permission denied.\n\nSkyWake will still work as a normal alarm clock.",
      );
    }
  };

  const triggerAlarm = async () => {
    setIsAlarmRinging(true);
    setCapturedPhoto(null);
    setSkyValid(false);

    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    let oscillator = null;
    const beep = () => {
      oscillator = audioContext.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 800;
      const gain = audioContext.createGain();
      gain.gain.value = 0.9;
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      setTimeout(() => oscillator?.stop(), 400);
    };
    const beepInterval = setInterval(beep, 600);

    if ("wakeLock" in navigator) {
      try {
        await navigator.wakeLock.request("screen");
      } catch {}
    }

    if (cameraPermission === "granted") {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch {}
    }

    window.stopAlarmSound = () => {
      clearInterval(beepInterval);
      oscillator?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  };

  const takeSkyPhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      alert("Camera not ready. Please grant permission first.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(photoData);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let r = 0,
      g = 0,
      b = 0,
      brightness = 0,
      bluePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      brightness += data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
      if (data[i + 2] > data[i] && data[i + 2] > data[i + 1]) bluePixels++;
    }

    const avgR = r / (data.length / 4);
    const avgG = g / (data.length / 4);
    const avgB = b / (data.length / 4);
    const avgBrightness = brightness / (data.length / 4);
    const blueRatio = bluePixels / (data.length / 4);

    // Super forgiving but smart detection
    const isSkyLike =
      avgBrightness > 70 || // very bright morning
      (avgB > 90 && blueRatio > 0.35) || // clear blue sky
      (avgBrightness > 25 && blueRatio > 0.28) || // cloudy / twilight
      (avgBrightness > 12 && blueRatio > 0.22 && avgB > avgR); // night sky (stars, dark blue)

    setSkyValid(isSkyLike);

    if (isSkyLike) {
      stopAlarm();
      setTodayPhoto(photoData);
      setStreak((prev) => {
        const newStreak = prev + 1;
        localStorage.setItem("streak", newStreak.toString());
        return newStreak;
      });
      localStorage.setItem("todaySkyPhoto", photoData);
    }
  };

  const stopAlarm = () => {
    window.stopAlarmSound?.();
    setIsAlarmRinging(false);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  useEffect(() => {
    const savedPhoto = localStorage.getItem("todaySkyPhoto");
    const savedStreak = localStorage.getItem("streak");
    if (savedPhoto) setTodayPhoto(savedPhoto);
    if (savedStreak) setStreak(parseInt(savedStreak));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <h1 className="text-5xl font-bold text-sky-400 mb-1">🌤️ SkyWake</h1>
      <p className="text-slate-400 mb-6">Look up. Wake up.</p>

      {cameraPermission !== "granted" && (
        <div className="w-full max-w-xs bg-amber-900/80 border border-amber-400 rounded-3xl p-6 mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <span className="font-semibold">Camera Required</span>
          </div>
          <p className="text-sm leading-tight mb-5">
            SkyWake needs camera access to force you to take a real sky photo.
            <br />
            Without it, the alarm works as a normal clock.
          </p>
          <button
            onClick={requestCameraPermission}
            className="bg-white text-black font-bold px-8 py-4 rounded-2xl w-full active:scale-95 transition"
          >
            Grant Camera Access
          </button>
        </div>
      )}

      <div className="text-center mb-12">
        <div className="text-7xl font-mono font-bold tracking-widest">
          {format(currentTime, "HH:mm")}
        </div>
        <p className="text-slate-400 mt-2">
          {format(currentTime, "EEEE, MMMM d")}
        </p>
      </div>

      <div className="flex items-center gap-4 bg-slate-800/70 rounded-3xl px-10 py-6 mb-10">
        <Award className="w-12 h-12 text-amber-400" />
        <div>
          <div className="text-5xl font-bold">{streak}</div>
          <div className="text-sm uppercase tracking-widest text-slate-400">
            day streak
          </div>
        </div>
      </div>

      {todayPhoto && (
        <div className="mb-10">
          <p className="text-xs text-slate-400 mb-2">TODAY'S SKY</p>
          <img
            src={todayPhoto}
            className="w-52 rounded-2xl shadow-2xl border border-sky-500/30"
            alt="Today's sky"
          />
        </div>
      )}

      <div className="w-full max-w-xs bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6" />
          <span className="font-semibold text-lg">Wake-up time</span>
        </div>
        <input
          type="time"
          value={alarmTime}
          onChange={(e) => setAlarmTime(e.target.value)}
          className="w-full bg-transparent text-6xl font-mono text-center focus:outline-none cursor-pointer"
        />
        <button
          onClick={() => alert(`✅ Alarm saved for ${alarmTime}`)}
          className="mt-6 w-full bg-sky-500 hover:bg-sky-600 py-5 rounded-2xl font-semibold text-lg transition active:scale-95"
        >
          Save Alarm
        </button>
        <button
          onClick={triggerAlarm}
          className="mt-4 w-full bg-white text-black hover:bg-slate-100 py-5 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition active:scale-95"
        >
          <Play className="w-5 h-5" /> Test Alarm Now
        </button>
      </div>

      {isAlarmRinging && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6">
          <div className="text-center mb-8">
            <div className="text-red-500 text-6xl font-bold animate-pulse">
              WAKE UP
            </div>
            <p className="text-slate-400 mt-3">
              {cameraPermission === "granted"
                ? "Take a photo of the sky RIGHT NOW"
                : "Camera denied — tap below to dismiss"}
            </p>
          </div>

          {cameraPermission === "granted" && (
            <div className="relative w-full max-w-md aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {cameraPermission === "granted" ? (
            <>
              <button
                onClick={takeSkyPhoto}
                className="mt-8 bg-white text-black font-bold text-2xl px-16 py-6 rounded-full flex items-center gap-4 active:scale-95 transition shadow-xl"
              >
                <Camera className="w-8 h-8" /> TAKE SKY PHOTO
              </button>
              {capturedPhoto && !skyValid && (
                <p className="mt-4 text-red-400 font-semibold text-center">
                  ❌ That doesn't look like the sky. Go outside and try again!
                </p>
              )}
            </>
          ) : (
            <button
              onClick={stopAlarm}
              className="mt-8 bg-white text-black font-bold text-2xl px-16 py-6 rounded-full active:scale-95 transition shadow-xl"
            >
              DISMISS ALARM
            </button>
          )}

          <button
            onClick={stopAlarm}
            className="absolute bottom-8 text-xs text-slate-500 underline"
          >
            (dev) force stop
          </button>
        </div>
      )}

      <div className="mt-auto pt-12 text-[10px] text-slate-600">
        Built by Adam Boufeljat
      </div>
    </div>
  );
}

export default App;
