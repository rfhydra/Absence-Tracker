/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  LogOut, 
  LogIn, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Settings,
  Map as MapIcon,
  Loader2,
  Camera,
  Download,
  Search,
  Filter,
  BarChart3,
  X,
  ShieldCheck,
  Building2,
  TrendingUp,
  PieChart as PieChartIcon,
  Fingerprint,
  Scan,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Activity,
  Plus,
  Trash2,
  MoreVertical,
  Sparkles,
  Trophy,
  Bell,
  Globe,
  Moon,
  Sun,
  Cpu,
  Zap,
  Briefcase,
  FileText,
  Check
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface OfficeConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  shiftStart: string;
}

interface AttendanceRecord {
  id: string;
  userName: string;
  type: 'IN' | 'OUT';
  timestamp: number;
  location: {
    lat: number;
    lng: number;
  };
  officeId: string;
  isWithinRadius: boolean;
  photo?: string;
  isLate?: boolean;
  biometricVerified: boolean;
  biometricType: 'FACE' | 'FINGERPRINT';
}

interface LeaveRequest {
  id: string;
  userName: string;
  type: 'SICK' | 'VACATION' | 'PERSONAL';
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
}

// --- Constants ---

const DEFAULT_OFFICES: OfficeConfig[] = [
  {
    id: 'hq-jakarta',
    name: 'Titan HQ Jakarta',
    lat: -6.175392,
    lng: 106.827153,
    radius: 100,
    shiftStart: "08:00",
  },
  {
    id: 'tech-hub-bandung',
    name: 'Titan Tech Hub Bandung',
    lat: -6.917464,
    lng: 107.619123,
    radius: 150,
    shiftStart: "09:00",
  },
  {
    id: 'global-singapore',
    name: 'Titan Global Singapore',
    lat: 1.287953,
    lng: 103.851784,
    radius: 200,
    shiftStart: "08:30",
  }
];

const LANGUAGES = {
  EN: {
    dashboard: "Dashboard",
    attendance: "Attendance",
    logs: "Activity Logs",
    analytics: "AI Analytics",
    settings: "System Config",
    leaderboard: "Leaderboard",
    leaves: "Leave Requests",
    checkIn: "Check-in",
    checkOut: "Check-out",
    verified: "Verified",
    late: "Late",
    onTime: "On Time",
    totalLogs: "Total Activity",
    systemOnline: "Titan Core Active",
    aiInsights: "Exclusive AI Insights",
    generateAI: "Analyze with Gemini",
    scanning: "Scanning Identity...",
    readyScan: "Ready for Biometric Scan",
    capture: "Capture & Verify",
    fingerprint: "Fingerprint Scan",
    face: "Face Recognition"
  },
  ID: {
    dashboard: "Dasbor",
    attendance: "Absensi",
    logs: "Riwayat Aktivitas",
    analytics: "Analitik AI",
    settings: "Konfigurasi Sistem",
    leaderboard: "Papan Peringkat",
    leaves: "Pengajuan Cuti",
    checkIn: "Absen Masuk",
    checkOut: "Absen Pulang",
    verified: "Terverifikasi",
    late: "Terlambat",
    onTime: "Tepat Waktu",
    totalLogs: "Total Aktivitas",
    systemOnline: "Titan Core Aktif",
    aiInsights: "Wawasan AI Eksklusif",
    generateAI: "Analisis dengan Gemini",
    scanning: "Memindai Identitas...",
    readyScan: "Siap Pemindaian Biometrik",
    capture: "Ambil & Verifikasi",
    fingerprint: "Sidik Jari",
    face: "Pengenalan Wajah"
  }
};

// --- App Component ---

export default function App() {
  const [userName, setUserName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [offices, setOffices] = useState<OfficeConfig[]>(DEFAULT_OFFICES);
  const [selectedOfficeId, setSelectedOfficeId] = useState(DEFAULT_OFFICES[0].id);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scan' | 'logs' | 'analytics' | 'settings' | 'leaderboard' | 'leaves'>('dashboard');
  
  // Exclusive States
  const [lang, setLang] = useState<'EN' | 'ID'>('EN');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<{ id: string, msg: string, time: number }[]>([]);
  
  // Camera & Biometric states
  const [showCamera, setShowCamera] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'FACE' | 'FINGERPRINT'>('FACE');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [pendingType, setPendingType] = useState<'IN' | 'OUT' | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const t = LANGUAGES[lang];
  const selectedOffice = useMemo(() => 
    offices.find(o => o.id === selectedOfficeId) || offices[0], 
  [offices, selectedOfficeId]);

  // --- Effects ---

  useEffect(() => {
    const savedRecords = localStorage.getItem('titan-records');
    const savedUser = localStorage.getItem('titan-user');
    const savedOffices = localStorage.getItem('titan-offices');
    const savedLeaves = localStorage.getItem('titan-leaves');

    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedUser) {
      setUserName(savedUser);
      setIsLoggedIn(true);
    }
    if (savedOffices) setOffices(JSON.parse(savedOffices));
    if (savedLeaves) setLeaveRequests(JSON.parse(savedLeaves));

    // Initial Notification
    addNotification("Titan Core initialized. Welcome back.");
  }, []);

  useEffect(() => {
    localStorage.setItem('titan-records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('titan-offices', JSON.stringify(offices));
  }, [offices]);

  useEffect(() => {
    localStorage.setItem('titan-leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  // --- Helpers ---

  const addNotification = (msg: string) => {
    const newNotif = { id: crypto.randomUUID(), msg, time: Date.now() };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setIsLoggedIn(true);
      localStorage.setItem('titan-user', userName);
      addNotification(`Session authenticated for ${userName}`);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName("");
    localStorage.removeItem('titan-user');
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startBiometric = async (type: 'IN' | 'OUT', mode: 'FACE' | 'FINGERPRINT') => {
    setPendingType(type);
    setBiometricMode(mode);
    setShowCamera(true);
    
    if (mode === 'FACE') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setStatus({ type: 'error', msg: "Failed to access camera." });
        setShowCamera(false);
      }
    }
  };

  const stopBiometric = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setPendingType(null);
    setIsScanning(false);
  };

  const simulateScan = async () => {
    if (!pendingType) return;
    
    setIsScanning(true);
    setScanProgress(0);

    for (let i = 0; i <= 100; i += 2) {
      setScanProgress(i);
      await new Promise(r => setTimeout(r, 30));
    }

    let photo = undefined;
    if (biometricMode === 'FACE' && videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        photo = canvasRef.current.toDataURL('image/jpeg', 0.7);
      }
    }

    performAttendance(pendingType, photo);
    stopBiometric();
  };

  const performAttendance = (type: 'IN' | 'OUT', photo?: string) => {
    setIsLocating(true);
    setStatus(null);

    if (!navigator.geolocation) {
      setStatus({ type: 'error', msg: "Geolocation not supported." });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        const distance = calculateDistance(latitude, longitude, selectedOffice.lat, selectedOffice.lng);
        const isWithinRadius = distance <= selectedOffice.radius;

        if (!isWithinRadius) {
          setStatus({ 
            type: 'error', 
            msg: `Out of geofence range (${Math.round(distance)}m from ${selectedOffice.name}).` 
          });
          setIsLocating(false);
          return;
        }

        let isLate = false;
        if (type === 'IN') {
          const now = new Date();
          const [h, m] = selectedOffice.shiftStart.split(':').map(Number);
          const shiftDate = new Date();
          shiftDate.setHours(h, m, 0, 0);
          if (now > shiftDate) isLate = true;
        }

        const newRecord: AttendanceRecord = {
          id: crypto.randomUUID(),
          userName,
          type,
          timestamp: Date.now(),
          location: { lat: latitude, lng: longitude },
          officeId: selectedOffice.id,
          isWithinRadius,
          photo,
          isLate,
          biometricVerified: true,
          biometricType: biometricMode
        };

        setRecords([newRecord, ...records]);
        setStatus({ 
          type: 'success', 
          msg: `Verified ${type === 'IN' ? 'Check-in' : 'Check-out'} at ${selectedOffice.name}!` 
        });
        addNotification(`${type} recorded at ${selectedOffice.name}`);
        setIsLocating(false);
      },
      (error) => {
        setStatus({ type: 'error', msg: "Location access denied. Please enable GPS." });
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const generateAIInsights = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this attendance data for employee ${userName}: ${JSON.stringify(records.slice(0, 10))}. Provide a professional, concise executive summary of their performance, punctuality, and any patterns. Use a tone suitable for a high-end corporate environment. Keep it under 100 words.`
      });
      const response = await model;
      setAiInsight(response.text);
    } catch (err) {
      console.error("AI Error:", err);
      setAiInsight("Unable to generate AI insights at this time. Titan Core is busy.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLeaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newLeave: LeaveRequest = {
      id: crypto.randomUUID(),
      userName,
      type: formData.get('type') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      status: 'PENDING',
      reason: formData.get('reason') as string,
    };

    setLeaveRequests([newLeave, ...leaveRequests]);
    form.reset();
    addNotification("Leave request submitted for review.");
  };

  const exportToCSV = () => {
    const headers = ["ID", "User", "Type", "Time", "Office", "Location", "Late", "Biometric"];
    const rows = records.map(r => [
      r.id,
      r.userName,
      r.type,
      new Date(r.timestamp).toLocaleString(),
      offices.find(o => o.id === r.officeId)?.name || 'Unknown',
      `${r.location.lat},${r.location.lng}`,
      r.isLate ? "YES" : "NO",
      r.biometricType
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `titan_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification("Exported attendance data to CSV.");
  };

  const handleAddOffice = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const newOffice: OfficeConfig = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      lat: parseFloat(formData.get('lat') as string),
      lng: parseFloat(formData.get('lng') as string),
      radius: parseInt(formData.get('radius') as string),
      shiftStart: formData.get('shiftStart') as string,
    };
    setOffices([...offices, newOffice]);
    form.reset();
    addNotification(`New office added: ${newOffice.name}`);
  };

  const deleteOffice = (id: string) => {
    if (offices.length <= 1) {
      setStatus({ type: 'error', msg: "Cannot delete the last remaining office." });
      return;
    }
    setOffices(offices.filter(o => o.id !== id));
    addNotification("Office configuration removed.");
  };

  // --- Memoized Data ---

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            new Date(r.timestamp).toLocaleDateString().includes(searchQuery);
      const matchesFilter = filterType === 'ALL' || r.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [records, searchQuery, filterType]);

  const stats = useMemo(() => ({
    in: records.filter(r => r.type === 'IN').length,
    out: records.filter(r => r.type === 'OUT').length,
    late: records.filter(r => r.isLate).length,
    total: records.length,
    punctuality: records.length > 0 ? Math.round(((records.filter(r => r.type === 'IN' && !r.isLate).length) / records.filter(r => r.type === 'IN').length) * 100) : 100
  }), [records]);

  const leaderboard = useMemo(() => {
    const users: Record<string, { name: string, score: number }> = {};
    records.forEach(r => {
      if (!users[r.userName]) users[r.userName] = { name: r.userName, score: 0 };
      if (r.type === 'IN' && !r.isLate) users[r.userName].score += 10;
      if (r.type === 'IN' && r.isLate) users[r.userName].score -= 5;
    });
    return Object.values(users).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [records]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }).reverse();

    return days.map(day => ({
      name: day,
      count: records.filter(r => new Date(r.timestamp).toLocaleDateString(undefined, { weekday: 'short' }) === day).length
    }));
  }, [records]);

  const pieData = [
    { name: 'On Time', value: stats.in - stats.late, color: '#10b981' },
    { name: 'Late', value: stats.late, color: '#ef4444' }
  ];

  // --- Render Sections ---

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e1b4b_0%,transparent_70%)] opacity-50" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px]"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/40 backdrop-blur-3xl p-12 rounded-[60px] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-lg relative z-10 text-center"
        >
          <div className="mb-12">
            <motion.div 
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-[32px] flex items-center justify-center text-white mx-auto mb-8 shadow-[0_0_40px_rgba(59,130,246,0.5)]"
            >
              <Cpu size={48} />
            </motion.div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-4">TITAN ULTIMATE</h1>
            <p className="text-zinc-500 text-sm uppercase tracking-[0.4em] font-bold">The Future of Enterprise</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3 text-left">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Secure Identification</label>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-zinc-900 rounded-2xl border border-white/5 flex items-center px-6 py-5">
                  <User className="text-zinc-500 mr-4" size={20} />
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Employee ID or Name"
                    className="bg-transparent border-none text-white w-full outline-none placeholder:text-zinc-700 font-medium"
                    required
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-white text-black font-black py-5 rounded-3xl transition-all hover:bg-blue-500 hover:text-white active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 group"
            >
              <Zap size={20} className="group-hover:animate-pulse" />
              AUTHENTICATE SESSION
            </button>
          </form>

          <div className="mt-16 flex justify-center gap-8 opacity-20">
            <Fingerprint size={24} className="text-white" />
            <Scan size={24} className="text-white" />
            <ShieldCheck size={24} className="text-white" />
            <Globe size={24} className="text-white" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex font-sans selection:bg-blue-500/30">
      {/* Sidebar - Recipe 3: Hardware / Specialist Tool */}
      <aside className="w-72 border-r border-white/5 flex flex-col bg-zinc-900/20 backdrop-blur-3xl sticky top-0 h-screen z-40">
        <div className="p-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Cpu size={28} />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tighter">TITAN</h2>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">Ultimate v4.0</p>
            </div>
          </div>

          <nav className="space-y-3">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
              { id: 'scan', icon: Scan, label: t.attendance },
              { id: 'logs', icon: ClipboardList, label: t.logs },
              { id: 'analytics', icon: Activity, label: t.analytics },
              { id: 'leaderboard', icon: Trophy, label: t.leaderboard },
              { id: 'leaves', icon: Briefcase, label: t.leaves },
              { id: 'settings', icon: Settings, label: t.settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-white text-black font-black shadow-[0_0_30px_rgba(255,255,255,0.1)]" 
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                )}
              >
                {activeTab === item.id && (
                  <motion.div layoutId="activeNav" className="absolute inset-0 bg-white" />
                )}
                <item.icon size={20} className={cn("relative z-10", activeTab === item.id ? "text-black" : "text-zinc-500 group-hover:text-white")} />
                <span className="relative z-10 text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-10 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 border border-white/5">
              <User size={24} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate">{userName}</p>
              <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Titan Elite</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-zinc-600 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Header */}
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 sticky top-0 bg-black/60 backdrop-blur-xl z-30">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black tracking-tighter uppercase">{activeTab}</h1>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-3 text-zinc-500">
              <Calendar size={18} />
              <p className="text-sm font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Language Toggle */}
            <button 
              onClick={() => setLang(lang === 'EN' ? 'ID' : 'EN')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl border border-white/5 hover:border-white/20 transition-all"
            >
              <Globe size={16} className="text-blue-500" />
              <span className="text-xs font-black">{lang}</span>
            </button>

            {/* Notifications */}
            <div className="relative group">
              <button className="p-3 bg-zinc-900 rounded-xl border border-white/5 text-zinc-400 hover:text-white transition-all relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
              </button>
              <div className="absolute right-0 top-full mt-4 w-80 bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Recent Alerts</h4>
                <div className="space-y-4">
                  {notifications.map(n => (
                    <div key={n.id} className="flex gap-3">
                      <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-zinc-300">{n.msg}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">{new Date(n.time).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-blue-500/20">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{t.systemOnline}</span>
            </div>
          </div>
        </header>

        <div className="p-12 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* AI Insights Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent border border-white/10 rounded-[48px] p-10">
                  <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Sparkles size={200} />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500 rounded-lg text-white">
                          <Sparkles size={16} />
                        </div>
                        <span className="text-xs font-black text-blue-500 uppercase tracking-widest">{t.aiInsights}</span>
                      </div>
                      <h2 className="text-3xl font-black mb-4 tracking-tighter">Welcome back, {userName}.</h2>
                      <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                        {aiInsight || "Your Titan AI is ready to analyze your performance. Generate your exclusive report now."}
                      </p>
                    </div>
                    <button 
                      onClick={generateAIInsights}
                      disabled={isAiLoading}
                      className="px-10 py-5 bg-white text-black font-black rounded-3xl hover:bg-blue-500 hover:text-white transition-all shadow-xl flex items-center gap-3 shrink-0 disabled:opacity-50"
                    >
                      {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                      {t.generateAI}
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {[
                    { label: t.totalLogs, value: stats.total, icon: ClipboardList, color: 'blue' },
                    { label: t.checkIn, value: stats.in, icon: LogIn, color: 'emerald' },
                    { label: 'Punctuality', value: `${stats.punctuality}%`, icon: Activity, color: 'purple' },
                    { label: t.late, value: stats.late, icon: AlertCircle, color: 'red' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-900/30 border border-white/5 p-8 rounded-[40px] group hover:border-white/20 transition-all">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                        stat.color === 'blue' && "bg-blue-500/10 text-blue-500",
                        stat.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
                        stat.color === 'purple' && "bg-purple-500/10 text-purple-500",
                        stat.color === 'red' && "bg-red-500/10 text-red-500",
                      )}>
                        <stat.icon size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts & Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 bg-zinc-900/20 border border-white/5 p-10 rounded-[48px]">
                    <h3 className="text-xl font-black mb-10 flex items-center gap-3">
                      <TrendingUp size={24} className="text-blue-500" />
                      Performance Velocity
                    </h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900/20 border border-white/5 p-10 rounded-[48px]">
                    <h3 className="text-xl font-black mb-10 flex items-center gap-3">
                      <Trophy size={24} className="text-yellow-500" />
                      {t.leaderboard}
                    </h3>
                    <div className="space-y-6">
                      {leaderboard.map((user, idx) => (
                        <div key={user.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                              idx === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-zinc-800 text-zinc-400"
                            )}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-black">{user.name}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Titan Elite</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-blue-500">{user.score} pts</p>
                          </div>
                        </div>
                      ))}
                      {leaderboard.length === 0 && (
                        <p className="text-center text-zinc-600 py-10 font-bold">No data available yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'scan' && (
              <motion.div 
                key="scan"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto"
              >
                <div className="bg-zinc-900/30 border border-white/10 rounded-[60px] overflow-hidden shadow-2xl">
                  <div className="p-12 border-b border-white/5">
                    <h2 className="text-3xl font-black tracking-tighter mb-2">TITAN ACCESS CONTROL</h2>
                    <p className="text-zinc-500 font-medium">Multi-biometric verification for secure corporate access.</p>
                  </div>

                  <div className="p-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Global Office Network</label>
                        <div className="grid gap-4">
                          {offices.map((office) => (
                            <button
                              key={office.id}
                              onClick={() => setSelectedOfficeId(office.id)}
                              className={cn(
                                "flex items-center justify-between p-6 rounded-[28px] border transition-all text-left group",
                                selectedOfficeId === office.id 
                                  ? "bg-white text-black border-white shadow-2xl" 
                                  : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/20"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <Building2 size={24} className={cn(selectedOfficeId === office.id ? "text-black" : "text-zinc-600 group-hover:text-white")} />
                                <div>
                                  <p className="text-base font-black">{office.name}</p>
                                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Shift Start: {office.shiftStart}</p>
                                </div>
                              </div>
                              {selectedOfficeId === office.id && <Check size={20} />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-8 bg-blue-600/5 rounded-[40px] border border-blue-500/10 space-y-6">
                        <div className="flex items-center gap-3 text-blue-500">
                          <MapPin size={24} />
                          <h4 className="font-black text-sm uppercase tracking-widest">Active Geofence</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-1">Secure Radius</p>
                            <p className="text-lg font-black font-mono">{selectedOffice.radius}m</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-1">GPS Anchor</p>
                            <p className="text-lg font-black font-mono">{selectedOffice.lat.toFixed(4)}, {selectedOffice.lng.toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Select Verification Method</label>
                      <div className="grid grid-cols-2 gap-6 h-full">
                        <button 
                          onClick={() => startBiometric('IN', 'FACE')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-[40px] p-10 flex flex-col items-center justify-center gap-6 transition-all active:scale-[0.98] shadow-2xl group"
                        >
                          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera size={40} />
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black uppercase tracking-tighter">{t.checkIn}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Face ID</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => startBiometric('IN', 'FINGERPRINT')}
                          className="bg-blue-600 hover:bg-blue-500 text-white rounded-[40px] p-10 flex flex-col items-center justify-center gap-6 transition-all active:scale-[0.98] shadow-2xl group"
                        >
                          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Fingerprint size={40} />
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black uppercase tracking-tighter">{t.checkIn}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Fingerprint</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => startBiometric('OUT', 'FACE')}
                          className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[40px] p-10 flex items-center justify-center gap-10 transition-all active:scale-[0.98] shadow-2xl group"
                        >
                          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <LogOut size={40} />
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-black uppercase tracking-tighter">{t.checkOut}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Secure Session Termination</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {status && (
                    <div className={cn(
                      "mx-12 mb-12 p-8 rounded-[32px] flex items-center gap-6 animate-in fade-in slide-in-from-bottom-8",
                      status.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {status.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                      <p className="font-black text-lg tracking-tight">{status.msg}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="bg-zinc-900/30 border border-white/10 rounded-[60px] overflow-hidden">
                  <div className="p-12 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter uppercase">Activity Logs</h2>
                      <p className="text-zinc-500 font-medium">Immutable record of all corporate access events.</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="text" 
                          placeholder="Search records..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-zinc-800/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-80 transition-all"
                        />
                      </div>
                      <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-xl"
                      >
                        <Download size={20} />
                        EXPORT CSV
                      </button>
                    </div>
                  </div>

                  <div className="p-12">
                    <div className="flex gap-3 mb-12">
                      {['ALL', 'IN', 'OUT'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type as any)}
                          className={cn(
                            "px-8 py-3 rounded-full text-xs font-black transition-all uppercase tracking-widest",
                            filterType === type ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {filteredRecords.length === 0 ? (
                        <div className="py-32 text-center">
                          <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-8 text-zinc-700">
                            <History size={48} />
                          </div>
                          <p className="text-zinc-600 font-black text-xl">NO RECORDS DETECTED</p>
                        </div>
                      ) : (
                        filteredRecords.map((record) => (
                          <div key={record.id} className="bg-zinc-800/20 border border-white/5 p-8 rounded-[40px] flex items-center justify-between group hover:border-white/20 transition-all">
                            <div className="flex items-center gap-8">
                              <div className="relative">
                                {record.photo ? (
                                  <img src={record.photo} className="w-20 h-20 rounded-3xl object-cover border border-white/10 shadow-2xl" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600 border border-white/5">
                                    <User size={32} />
                                  </div>
                                )}
                                <div className={cn(
                                  "absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-zinc-900 shadow-xl",
                                  record.type === 'IN' ? "bg-emerald-500 text-white" : "bg-zinc-500 text-white"
                                )}>
                                  {record.type === 'IN' ? <LogIn size={14} /> : <LogOut size={14} />}
                                </div>
                              </div>
                              <div>
                                <p className="text-lg font-black">{record.userName}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-2 text-zinc-500">
                                    <Clock size={14} />
                                    <p className="text-xs font-bold font-mono">{new Date(record.timestamp).toLocaleString()}</p>
                                  </div>
                                  <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                                  <div className="flex items-center gap-2 text-zinc-500">
                                    <Building2 size={14} />
                                    <p className="text-xs font-black uppercase tracking-widest">{offices.find(o => o.id === record.officeId)?.name}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-2">
                                  {record.isLate && (
                                    <span className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black rounded-full border border-red-500/20 uppercase tracking-widest">LATE</span>
                                  )}
                                  <span className="px-4 py-1.5 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-full border border-blue-500/20 uppercase tracking-widest">{record.biometricType} VERIFIED</span>
                                </div>
                                <p className="text-[10px] text-zinc-600 font-mono font-bold">{record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}</p>
                              </div>
                              <button className="p-3 text-zinc-700 hover:text-white transition-all bg-zinc-900 rounded-2xl border border-white/5">
                                <MoreVertical size={20} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'leaves' && (
              <motion.div 
                key="leaves"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-12"
              >
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-10 sticky top-32">
                    <h3 className="text-xl font-black mb-8 uppercase tracking-tighter">Submit Request</h3>
                    <form onSubmit={handleLeaveRequest} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Leave Type</label>
                        <select name="type" className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                          <option value="VACATION">Vacation</option>
                          <option value="SICK">Sick Leave</option>
                          <option value="PERSONAL">Personal Business</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Start Date</label>
                          <input type="date" name="startDate" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">End Date</label>
                          <input type="date" name="endDate" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Reason / Details</label>
                        <textarea name="reason" rows={4} required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Explain your request..."></textarea>
                      </div>
                      <button type="submit" className="w-full bg-white text-black font-black py-5 rounded-3xl hover:bg-blue-500 hover:text-white transition-all shadow-xl">
                        SUBMIT REQUEST
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-10">
                    <h3 className="text-xl font-black mb-10 uppercase tracking-tighter">Request History</h3>
                    <div className="space-y-6">
                      {leaveRequests.length === 0 ? (
                        <div className="py-20 text-center text-zinc-600 font-bold">No leave requests found.</div>
                      ) : (
                        leaveRequests.map(req => (
                          <div key={req.id} className="bg-zinc-800/20 border border-white/5 p-8 rounded-[40px] flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center",
                                req.type === 'VACATION' ? "bg-blue-500/10 text-blue-500" : req.type === 'SICK' ? "bg-red-500/10 text-red-500" : "bg-purple-500/10 text-purple-500"
                              )}>
                                <FileText size={24} />
                              </div>
                              <div>
                                <p className="text-lg font-black">{req.type}</p>
                                <p className="text-xs text-zinc-500 font-bold mt-1">{req.startDate} — {req.endDate}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                req.status === 'PENDING' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                              )}>
                                {req.status}
                              </div>
                              <button className="p-3 text-zinc-700 hover:text-white transition-all bg-zinc-900 rounded-2xl border border-white/5">
                                <MoreVertical size={20} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-10">
                    <h3 className="text-xl font-black mb-10 flex items-center gap-3 uppercase tracking-tighter">
                      <PieChartIcon size={24} className="text-emerald-500" />
                      Punctuality Distribution
                    </h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-12 mt-8">
                      {pieData.map(item => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{item.name}</span>
                          <span className="text-sm font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-10">
                    <h3 className="text-xl font-black mb-10 flex items-center gap-3 uppercase tracking-tighter">
                      <BarChart3 size={24} className="text-blue-500" />
                      Biometric Usage
                    </h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Face ID', count: records.filter(r => r.biometricType === 'FACE').length },
                          { name: 'Fingerprint', count: records.filter(r => r.biometricType === 'FINGERPRINT').length }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-12">
                  <div className="flex items-center gap-4 mb-10">
                    <Sparkles className="text-blue-500" size={32} />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">AI Performance Prediction</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                      { label: 'Predicted Punctuality', value: '94%', trend: '+2.4%', color: 'emerald' },
                      { label: 'Workforce Efficiency', value: '88.2', trend: '+1.1%', color: 'blue' },
                      { label: 'Security Integrity', value: '100%', trend: 'Stable', color: 'purple' },
                    ].map(item => (
                      <div key={item.label} className="p-8 bg-white/5 rounded-[32px] border border-white/5">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{item.label}</p>
                        <div className="flex items-end gap-4">
                          <p className="text-4xl font-black tracking-tighter">{item.value}</p>
                          <p className={cn("text-xs font-black mb-1", item.color === 'emerald' ? "text-emerald-500" : "text-blue-500")}>{item.trend}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-10">
                    <h3 className="text-xl font-black mb-10 uppercase tracking-tighter">Add New Office</h3>
                    <form onSubmit={handleAddOffice} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Office Name</label>
                        <input type="text" name="name" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. London Tech Center" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Latitude</label>
                          <input type="number" step="any" name="lat" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Longitude</label>
                          <input type="number" step="any" name="lng" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Radius (meters)</label>
                          <input type="number" name="radius" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Shift Start Time</label>
                          <input type="time" name="shiftStart" required className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-white text-black font-black py-5 rounded-3xl hover:bg-blue-500 hover:text-white transition-all shadow-xl">
                        REGISTER OFFICE
                      </button>
                    </form>
                  </div>

                  <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-10">
                    <h3 className="text-xl font-black mb-10 uppercase tracking-tighter">Managed Locations</h3>
                    <div className="space-y-4">
                      {offices.map(office => (
                        <div key={office.id} className="bg-white/5 border border-white/5 p-6 rounded-[32px] flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <p className="text-base font-black">{office.name}</p>
                              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{office.lat.toFixed(2)}, {office.lng.toFixed(2)} · {office.radius}m</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteOffice(office.id)}
                            className="p-3 text-zinc-700 hover:text-red-500 transition-all bg-zinc-900 rounded-xl border border-white/5"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-white/10 rounded-[48px] p-12">
                  <h3 className="text-xl font-black mb-10 uppercase tracking-tighter">System Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="flex items-center justify-between p-8 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                          <Globe size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black">System Language</p>
                          <p className="text-xs text-zinc-500 font-medium">Toggle between EN and ID</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setLang(lang === 'EN' ? 'ID' : 'EN')}
                        className="px-6 py-2 bg-white text-black text-xs font-black rounded-xl"
                      >
                        {lang}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-8 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black">Biometric Security</p>
                          <p className="text-xs text-zinc-500 font-medium">Multi-factor simulation active</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-blue-600 rounded-full relative p-1">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other tabs (Analytics, Settings) would follow similar high-end patterns */}
          </AnimatePresence>
        </div>
      </main>

      {/* Biometric Modal - Ultimate Edition */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <div className="relative w-full max-w-xl bg-zinc-900 rounded-[64px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10">
              <div className="p-12 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    {biometricMode === 'FACE' ? <Camera size={24} /> : <Fingerprint size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">{biometricMode === 'FACE' ? t.face : t.fingerprint}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Titan Security Protocol</p>
                  </div>
                </div>
                <button 
                  onClick={stopBiometric}
                  className="p-4 bg-zinc-800 text-zinc-500 rounded-full hover:text-white transition-all border border-white/5"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="relative aspect-square bg-black overflow-hidden">
                {biometricMode === 'FACE' ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
                    <canvas ref={canvasRef} className="hidden" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-blue-500"
                    >
                      <Fingerprint size={200} strokeWidth={1} />
                    </motion.div>
                  </div>
                )}
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-16 border-2 border-blue-500/20 rounded-[60px]">
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl" />
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-blue-500 rounded-br-3xl" />
                  </div>

                  {isScanning && (
                    <motion.div 
                      initial={{ top: '15%' }}
                      animate={{ top: '85%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute left-16 right-16 h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_30px_rgba(59,130,246,0.8)] z-20"
                    />
                  )}
                </div>
              </div>

              <div className="p-12 bg-zinc-900">
                {isScanning ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">{t.scanning}</span>
                      <span className="text-sm font-black font-mono text-blue-500">{scanProgress}%</span>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden p-1 border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${scanProgress}%` }}
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                      />
                    </div>
                    <p className="text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">Do not move during authentication</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white mb-3 tracking-tight">{t.readyScan}</p>
                      <p className="text-sm text-zinc-500 font-medium">Titan Security is active. Please proceed with verification.</p>
                    </div>
                    <button 
                      onClick={simulateScan}
                      className="w-full bg-white text-black font-black py-6 rounded-[32px] flex items-center justify-center gap-4 hover:bg-blue-500 hover:text-white transition-all active:scale-[0.98] shadow-2xl text-lg"
                    >
                      <Zap size={24} />
                      {t.capture}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
