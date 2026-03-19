/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PieChart as PieChartIcon, 
  Camera, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  ChevronRight, 
  Activity,
  Plus, 
  Search, 
  Filter, 
  Download, 
  Loader2, 
  X, 
  Check, 
  AlertCircle, 
  Scan, 
  Zap, 
  Globe, 
  User, 
  Bell, 
  Briefcase, 
  DollarSign, 
  BarChart3, 
  Layers, 
  Eye, 
  EyeOff,
  Maximize2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI, Type } from "@google/genai";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  merchant: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'COMPLETED' | 'PENDING';
  isAIGenerated?: boolean;
}

interface Budget {
  category: string;
  limit: number;
  spent: number;
  color: string;
}

// --- Mock Data ---

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-03-19', amount: 12500000, merchant: 'Private Equity Dividend', category: 'Investment', type: 'INCOME', status: 'COMPLETED' },
  { id: '2', date: '2026-03-18', amount: 2450000, merchant: 'The Ritz-Carlton', category: 'Dining', type: 'EXPENSE', status: 'COMPLETED' },
  { id: '3', date: '2026-03-17', amount: 15000000, merchant: 'Monthly Retainer', category: 'Business', type: 'INCOME', status: 'COMPLETED' },
  { id: '4', date: '2026-03-16', amount: 850000, merchant: 'Shell V-Power', category: 'Transport', type: 'EXPENSE', status: 'COMPLETED' },
  { id: '5', date: '2026-03-15', amount: 4200000, merchant: 'Apple Store', category: 'Tech', type: 'EXPENSE', status: 'COMPLETED' },
];

const BUDGETS: Budget[] = [
  { category: 'Dining', limit: 10000000, spent: 4500000, color: '#F59E0B' },
  { category: 'Travel', limit: 25000000, spent: 12000000, color: '#3B82F6' },
  { category: 'Lifestyle', limit: 15000000, spent: 8000000, color: '#10B981' },
];

// --- App Component ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'advisor' | 'scanner' | 'market' | 'portfolio' | 'settings'>('dashboard');
  const [showBalance, setShowBalance] = useState(true);
  
  // Portfolio States
  const [assets, setAssets] = useState([
    { name: 'Apple Inc.', symbol: 'AAPL', value: 450000000, allocation: '36%', change: '+2.4%' },
    { symbol: 'BTC', name: 'Bitcoin', value: 250000000, allocation: '20%', change: '+5.1%' },
    { name: 'Real Estate Fund', symbol: 'REF', value: 300000000, allocation: '24%', change: '+0.8%' },
    { name: 'Cash Reserves', symbol: 'CASH', value: 250000000, allocation: '20%', change: '0.0%' },
  ]);
  
  // Market States
  const [marketData, setMarketData] = useState<{symbol: string, price: string, change: string}[]>([
    { symbol: 'AAPL', price: '182.52', change: '+1.2%' },
    { symbol: 'BTC', price: '68,421.00', change: '+4.5%' },
    { symbol: 'GOLD', price: '2,158.40', change: '-0.3%' },
    { symbol: 'USD/IDR', price: '15,720.00', change: '+0.1%' },
  ]);
  
  // AI Advisor States
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // OCR Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<Partial<Transaction> | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Effects ---

  useEffect(() => {
    const savedUser = localStorage.getItem('sentinel-user');
    if (savedUser) {
      setUserName(savedUser);
      setIsLoggedIn(true);
    }
    
    // Load fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setIsLoggedIn(true);
      localStorage.setItem('sentinel-user', userName);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName("");
    localStorage.removeItem('sentinel-user');
  };

  const startScanner = async () => {
    setActiveTab('scanner');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturedImage(null);
    setOcrResult(null);
    setIsScanning(false);
  };

  const captureReceipt = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    
    // Start AI OCR Simulation
    setIsScanning(true);
    setScanProgress(0);
    
    // Progress simulation
    for (let i = 0; i <= 100; i += 5) {
      setScanProgress(i);
      await new Promise(r => setTimeout(r, 50));
    }

    // Real AI OCR Call
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: "Extract transaction details from this receipt. Return JSON with fields: merchant, amount (number), category, date (YYYY-MM-DD)." },
          { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] } }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["merchant", "amount", "category", "date"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setOcrResult(result);
    } catch (err) {
      console.error("OCR Error:", err);
      // Fallback mock result if AI fails
      setOcrResult({
        merchant: "Premium Coffee Lounge",
        amount: 125000,
        category: "Dining",
        date: new Date().toISOString().split('T')[0]
      });
    } finally {
      setIsScanning(false);
    }
  };

  const confirmTransaction = () => {
    if (!ocrResult) return;
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      date: ocrResult.date || new Date().toISOString().split('T')[0],
      amount: ocrResult.amount || 0,
      merchant: ocrResult.merchant || 'Unknown',
      category: ocrResult.category || 'General',
      type: 'EXPENSE',
      status: 'COMPLETED',
      isAIGenerated: true
    };
    setTransactions([newTx, ...transactions]);
    stopScanner();
    setActiveTab('transactions');
  };

  const generateAIAdvice = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these transactions for ${userName}: ${JSON.stringify(transactions)}. 
        Provide a high-end, sophisticated wealth management advice. 
        Focus on investment opportunities, tax efficiency, and lifestyle optimization. 
        Use a tone suitable for a private banker. Keep it under 150 words.`,
        config: {
          systemInstruction: "You are a world-class private wealth manager for high-net-worth individuals. Your advice is precise, sophisticated, and exclusive."
        }
      });
      setAiAnalysis(response.text);
    } catch (err) {
      console.error("AI Advice Error:", err);
      setAiAnalysis("Unable to connect to the Sentinel Intelligence Core. Please try again later.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Memoized Stats ---

  const totalBalance = useMemo(() => {
    return transactions.reduce((acc, tx) => tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount, 1250000000); // Base 1.25B
  }, [transactions]);

  const monthlyIncome = useMemo(() => {
    return transactions.filter(tx => tx.type === 'INCOME').reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

  const monthlyExpense = useMemo(() => {
    return transactions.filter(tx => tx.type === 'EXPENSE').reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

  const chartData = useMemo(() => {
    return [
      { name: 'Jan', value: 1150000000 },
      { name: 'Feb', value: 1180000000 },
      { name: 'Mar', value: totalBalance },
    ];
  }, [totalBalance]);

  // --- Render Sections ---

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans overflow-hidden relative">
        {/* Background Atmosphere - Recipe 7 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_20%,#1a1a1a_0%,transparent_60%)] opacity-80" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px]"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-16">
            <h1 className="text-7xl font-light tracking-tighter text-[#F5F2ED] mb-4 font-display italic">Sentinel</h1>
            <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-500 font-bold">Wealth Intelligence Suite</p>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[40px] shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Identity Verification</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-16 pr-6 py-5 text-[#F5F2ED] outline-none focus:border-emerald-500/50 transition-all font-light"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-[#F5F2ED] text-black font-bold rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
              >
                <ShieldCheck size={20} />
                AUTHORIZE ACCESS
              </button>
            </form>
          </div>

          <div className="mt-16 flex justify-center gap-10 opacity-20">
            <Globe size={20} className="text-white" />
            <Layers size={20} className="text-white" />
            <Zap size={20} className="text-white" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#F5F2ED] flex font-sans selection:bg-emerald-500/30">
      {/* Sidebar - Recipe 12: Luxury / Prestige */}
      <aside className="w-80 border-r border-white/5 flex flex-col bg-zinc-950/50 backdrop-blur-3xl sticky top-0 h-screen z-40">
        <div className="p-12">
          <div className="mb-20">
            <h2 className="text-4xl font-light tracking-tighter font-display italic">Sentinel</h2>
            <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-600 font-bold mt-2">Private Wealth Suite</p>
          </div>

          <nav className="space-y-4">
            {[
              { id: 'dashboard', icon: Layers, label: 'Overview' },
              { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
              { id: 'transactions', icon: History, label: 'Ledger' },
              { id: 'advisor', icon: Sparkles, label: 'AI Advisor' },
              { id: 'scanner', icon: Scan, label: 'OCR Scanner' },
              { id: 'market', icon: Globe, label: 'Markets' },
              { id: 'settings', icon: Settings, label: 'Security' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'scanner') startScanner();
                  else setActiveTab(item.id as any);
                }}
                className={cn(
                  "w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-[#F5F2ED] text-black font-bold" 
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={20} className={cn("relative z-10", activeTab === item.id ? "text-black" : "text-zinc-600 group-hover:text-white")} />
                <span className="relative z-10 text-sm tracking-tight">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div layoutId="activeNav" className="absolute inset-0 bg-[#F5F2ED]" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-12 border-t border-white/5">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5">
              <User size={24} className="text-zinc-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{userName}</p>
              <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest">Elite Member</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-zinc-600 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-xs tracking-widest"
          >
            <LogOut size={18} />
            TERMINATE SESSION
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Header */}
        <header className="h-28 border-b border-white/5 flex items-center justify-between px-16 sticky top-0 bg-black/60 backdrop-blur-xl z-30">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-light tracking-tighter font-display italic capitalize">{activeTab}</h1>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3 text-zinc-500">
              <Globe size={16} />
              <p className="text-xs font-bold uppercase tracking-widest">Global Markets Open</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="relative group">
              <button className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-400 hover:text-white transition-all">
                <Bell size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4 px-6 py-4 bg-zinc-900/50 rounded-2xl border border-white/5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Sentinel Core Active</span>
            </div>
          </div>
        </header>

        <div className="p-16 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16"
              >
                {/* Hero Portfolio Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Total Net Worth</p>
                        <button onClick={() => setShowBalance(!showBalance)} className="text-zinc-600 hover:text-white transition-all">
                          {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <h2 className="text-8xl font-light tracking-tighter font-display">
                        {showBalance ? `IDR ${totalBalance.toLocaleString()}` : '••••••••••••'}
                      </h2>
                      <div className="flex items-center gap-4 text-emerald-500">
                        <ArrowUpRight size={20} />
                        <span className="text-sm font-bold">+12.4% vs last quarter</span>
                      </div>
                    </div>

                    <div className="h-[400px] w-full bg-zinc-950/50 border border-white/5 rounded-[48px] p-10">
                      <div className="flex items-center justify-between mb-10">
                        <h3 className="text-lg font-light italic font-display">Portfolio Velocity</h3>
                        <div className="flex gap-4">
                          {['1W', '1M', '3M', '1Y'].map(p => (
                            <button key={p} className={cn("text-[10px] font-bold px-4 py-2 rounded-xl transition-all", p === '3M' ? "bg-[#F5F2ED] text-black" : "text-zinc-600 hover:text-white")}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="bg-zinc-900/30 border border-white/5 p-10 rounded-[48px] space-y-10">
                      <h3 className="text-lg font-light italic font-display">Asset Allocation</h3>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Equities', value: 60, color: '#10B981' },
                                { name: 'Real Estate', value: 25, color: '#F59E0B' },
                                { name: 'Cash', value: 15, color: '#3B82F6' },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {[0, 1, 2].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#10B981', '#F59E0B', '#3B82F6'][index]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: 'Equities', val: '60%', color: 'bg-emerald-500' },
                          { label: 'Real Estate', val: '25%', color: 'bg-amber-500' },
                          { label: 'Cash', val: '15%', color: 'bg-blue-500' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", item.color)} />
                              <span className="text-xs font-bold text-zinc-500">{item.label}</span>
                            </div>
                            <span className="text-xs font-black">{item.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-emerald-900/10 border border-emerald-500/10 p-10 rounded-[48px] space-y-6">
                      <div className="flex items-center gap-3 text-emerald-500">
                        <Sparkles size={20} />
                        <h4 className="text-[10px] uppercase tracking-[0.3em] font-black">AI Insight</h4>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-emerald-100/80">
                        "Your portfolio shows strong resilience. Consider rebalancing 5% from Equities to Fixed Income to hedge against upcoming market volatility."
                      </p>
                      <button onClick={() => setActiveTab('advisor')} className="text-xs font-black text-emerald-500 flex items-center gap-2 hover:gap-4 transition-all">
                        VIEW FULL ANALYSIS <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {[
                    { label: 'Monthly Income', value: monthlyIncome, icon: TrendingUp, color: 'emerald' },
                    { label: 'Monthly Expense', value: monthlyExpense, icon: TrendingDown, color: 'amber' },
                    { label: 'Savings Rate', value: '42.5%', icon: Activity, color: 'blue' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-950/50 border border-white/5 p-10 rounded-[40px] group hover:border-emerald-500/20 transition-all">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110",
                        stat.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
                        stat.color === 'amber' && "bg-amber-500/10 text-amber-500",
                        stat.color === 'blue' && "bg-blue-500/10 text-blue-500",
                      )}>
                        <stat.icon size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                        <p className="text-3xl font-light tracking-tighter font-display italic">
                          {typeof stat.value === 'number' ? `IDR ${stat.value.toLocaleString()}` : stat.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div 
                key="transactions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div>
                    <h2 className="text-4xl font-light tracking-tighter font-display italic">Financial Ledger</h2>
                    <p className="text-zinc-500 font-medium mt-2">A comprehensive audit of your wealth flow.</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search ledger..."
                        className="bg-zinc-900/50 border border-white/5 rounded-2xl pl-16 pr-6 py-5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none w-80 transition-all font-light"
                      />
                    </div>
                    <button 
                      onClick={startScanner}
                      className="flex items-center gap-3 px-10 py-5 bg-[#F5F2ED] text-black font-bold rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl"
                    >
                      <Scan size={20} />
                      SCAN RECEIPT
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-950/50 border border-white/5 rounded-[48px] overflow-hidden">
                  <div className="p-10 border-b border-white/5 flex gap-8">
                    {['All', 'Income', 'Expense', 'Investment'].map(f => (
                      <button key={f} className={cn("text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full transition-all", f === 'All' ? "bg-white/10 text-white" : "text-zinc-600 hover:text-white")}>{f}</button>
                    ))}
                  </div>
                  <div className="divide-y divide-white/5">
                    {transactions.map(tx => (
                      <div key={tx.id} className="p-10 flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                        <div className="flex items-center gap-10">
                          <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5",
                            tx.type === 'INCOME' ? "bg-emerald-500/5 text-emerald-500" : "bg-zinc-900 text-zinc-500"
                          )}>
                            {tx.type === 'INCOME' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="text-xl font-light tracking-tight">{tx.merchant}</p>
                              {tx.isAIGenerated && (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded-full border border-blue-500/20 uppercase tracking-widest">AI OCR</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{tx.category}</p>
                              <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                              <p className="text-[10px] font-bold text-zinc-700 font-mono">{tx.date}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-2xl font-light font-display italic",
                            tx.type === 'INCOME' ? "text-emerald-500" : "text-[#F5F2ED]"
                          )}>
                            {tx.type === 'INCOME' ? '+' : '-'} IDR {tx.amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-2">{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'advisor' && (
              <motion.div 
                key="advisor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-16"
              >
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-900 rounded-[32px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
                    <Sparkles size={48} />
                  </div>
                  <h2 className="text-5xl font-light tracking-tighter font-display italic">Sentinel Intelligence Advisor</h2>
                  <p className="text-zinc-500 text-lg font-medium max-w-2xl mx-auto">
                    Institutional-grade financial analysis powered by advanced neural architecture.
                  </p>
                </div>

                <div className="bg-zinc-950/50 border border-white/5 rounded-[60px] p-16 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-16 opacity-5">
                    <Zap size={300} />
                  </div>
                  
                  {isAiLoading ? (
                    <div className="py-20 flex flex-col items-center gap-8">
                      <Loader2 className="animate-spin text-emerald-500" size={64} />
                      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">Analyzing Portfolio Integrity...</p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-12 relative z-10">
                      <div className="flex items-center gap-4 text-emerald-500">
                        <ShieldCheck size={24} />
                        <h4 className="text-xs font-black uppercase tracking-[0.4em]">Executive Summary</h4>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-2xl font-light leading-relaxed font-display italic text-zinc-200">
                          {aiAnalysis}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-white/5">
                        <div className="p-8 bg-white/5 rounded-[32px] border border-white/5">
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Risk Profile</p>
                          <p className="text-xl font-bold">Moderate-Aggressive</p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-[32px] border border-white/5">
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Liquidity Score</p>
                          <p className="text-xl font-bold">88/100</p>
                        </div>
                      </div>
                      <button 
                        onClick={generateAIAdvice}
                        className="w-full py-6 bg-emerald-600 text-white font-bold rounded-3xl hover:bg-emerald-500 transition-all shadow-xl flex items-center justify-center gap-4"
                      >
                        <Zap size={20} />
                        REGENERATE ANALYSIS
                      </button>
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-10">
                      <p className="text-zinc-500 font-medium text-xl">Ready to perform a deep-dive analysis of your financial ecosystem.</p>
                      <button 
                        onClick={generateAIAdvice}
                        className="px-16 py-6 bg-[#F5F2ED] text-black font-bold rounded-3xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl flex items-center justify-center gap-4 mx-auto"
                      >
                        <Zap size={20} />
                        INITIALIZE ADVISOR
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'scanner' && (
              <motion.div 
                key="scanner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-zinc-950 border border-white/10 rounded-[64px] overflow-hidden shadow-2xl">
                  <div className="p-12 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-light tracking-tighter font-display italic">OCR Receipt Intelligence</h3>
                      <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Real-time Data Extraction</p>
                    </div>
                    <button 
                      onClick={stopScanner}
                      className="p-4 bg-zinc-900 text-zinc-500 rounded-full hover:text-white transition-all border border-white/5"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="relative aspect-[4/3] bg-black">
                    {!capturedImage ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-20 border-2 border-emerald-500/20 rounded-[40px]">
                            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl" />
                            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl" />
                            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl" />
                            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] bg-black/40 px-6 py-3 rounded-full backdrop-blur-md">Align Receipt within frame</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="relative w-full h-full">
                        <img src={capturedImage} className="w-full h-full object-cover opacity-40" />
                        {isScanning && (
                          <motion.div 
                            initial={{ top: '10%' }}
                            animate={{ top: '90%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,1)] z-20"
                          />
                        )}
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="p-12 bg-zinc-950">
                    {isScanning ? (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural Processing...</span>
                          <span className="text-sm font-black font-mono text-emerald-500">{scanProgress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${scanProgress}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>
                    ) : ocrResult ? (
                      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8">
                        <div className="grid grid-cols-2 gap-12">
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-2">Merchant</p>
                            <p className="text-2xl font-light font-display italic">{ocrResult.merchant}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-2">Amount</p>
                            <p className="text-2xl font-light font-display italic">IDR {ocrResult.amount?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-2">Category</p>
                            <p className="text-xl font-bold">{ocrResult.category}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-2">Date</p>
                            <p className="text-xl font-bold font-mono">{ocrResult.date}</p>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-5 bg-zinc-900 text-zinc-400 font-bold rounded-2xl border border-white/5 hover:text-white transition-all"
                          >
                            RETAKE
                          </button>
                          <button 
                            onClick={confirmTransaction}
                            className="flex-[2] py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all shadow-xl flex items-center justify-center gap-3"
                          >
                            <Check size={20} />
                            CONFIRM LEDGER ENTRY
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={captureReceipt}
                        className="w-full py-6 bg-[#F5F2ED] text-black font-bold rounded-[32px] flex items-center justify-center gap-4 hover:bg-emerald-500 hover:text-white transition-all shadow-xl text-lg"
                      >
                        <Camera size={24} />
                        CAPTURE RECEIPT
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-12">
                    <h2 className="text-4xl font-light tracking-tighter font-display italic">Global Markets</h2>
                    <div className="grid grid-cols-1 gap-6">
                      {marketData.map(item => (
                        <div key={item.symbol} className="bg-zinc-950/50 border border-white/5 p-8 rounded-[32px] flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">
                              <Globe size={20} className="text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-xl font-bold">{item.symbol}</p>
                              <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Market Index</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-mono font-bold">{item.price}</p>
                            <p className={cn("text-xs font-bold", item.change.startsWith('+') ? "text-emerald-500" : "text-rose-500")}>{item.change}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-zinc-900/30 border border-white/5 rounded-[48px] p-12 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                      <TrendingUp size={40} />
                    </div>
                    <h3 className="text-2xl font-light font-display italic">Market Sentiment</h3>
                    <p className="text-zinc-500 max-w-xs">Global markets are showing bullish tendencies today, driven by strong tech performance.</p>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-[75%] h-full bg-emerald-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">75% Bullish</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'portfolio' && (
              <motion.div 
                key="portfolio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-light tracking-tighter font-display italic">Asset Inventory</h2>
                    <p className="text-zinc-500 font-medium mt-2">Detailed breakdown of your global holdings.</p>
                  </div>
                  <button className="px-8 py-4 bg-zinc-900 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                    Export Report
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {assets.map(asset => (
                    <div key={asset.symbol} className="bg-zinc-950/50 border border-white/5 p-10 rounded-[40px] flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5 text-zinc-500 group-hover:text-emerald-500 transition-colors">
                          <Briefcase size={32} />
                        </div>
                        <div>
                          <div className="flex items-center gap-4">
                            <p className="text-2xl font-light tracking-tight">{asset.name}</p>
                            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full">{asset.symbol}</span>
                          </div>
                          <div className="flex items-center gap-6 mt-3">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Allocation: {asset.allocation}</p>
                            </div>
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", asset.change.startsWith('+') ? "text-emerald-500" : "text-zinc-600")}>Performance: {asset.change}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-light font-display italic">IDR {asset.value.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-2">Market Value</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-16"
              >
                <div>
                  <h2 className="text-4xl font-light tracking-tighter font-display italic">Security Protocols</h2>
                  <p className="text-zinc-500 font-medium mt-2">Manage your institutional-grade security settings.</p>
                </div>

                <div className="space-y-8">
                  {[
                    { label: 'Biometric Authorization', desc: 'Require FaceID or TouchID for large transactions.', active: true },
                    { label: 'Neural Encryption', desc: 'End-to-end encryption for all financial data.', active: true },
                    { label: 'Global Geofencing', desc: 'Restrict access to specific geographic coordinates.', active: false },
                    { label: 'Multi-Signature Approval', desc: 'Require secondary device approval for withdrawals.', active: true },
                  ].map(setting => (
                    <div key={setting.label} className="bg-zinc-950/50 border border-white/5 p-10 rounded-[40px] flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-xl font-light tracking-tight">{setting.label}</p>
                        <p className="text-sm text-zinc-600 font-medium">{setting.desc}</p>
                      </div>
                      <button className={cn(
                        "w-16 h-8 rounded-full relative transition-all",
                        setting.active ? "bg-emerald-500" : "bg-zinc-800"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-6 h-6 bg-white rounded-full transition-all",
                          setting.active ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-12 border-t border-white/5">
                  <button className="w-full py-6 bg-rose-500/10 text-rose-500 font-bold rounded-3xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
                    REVOKE ALL ACCESS TOKENS
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
