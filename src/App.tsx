/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  BookOpen, 
  Target, 
  Clock, 
  Languages, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  GraduationCap,
  Briefcase,
  Lightbulb,
  Plus,
  X,
  Mic,
  MicOff,
  Search,
  LayoutDashboard,
  User,
  ShieldCheck,
  Train,
  Building2,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Live API Types ---
interface LiveSession {
  sendRealtimeInput: (data: { media: { data: string; mimeType: string } }) => void;
  close: () => void;
}

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Step = 'welcome' | 'login' | 'dashboard' | 'basic-info' | 'interests' | 'discovery' | 'generating' | 'results';

interface UserData {
  studyTime: string;
  shortTermGoal: string;
  longTermGoal: string;
  language: string;
  interests: string[];
  discoveryAnswers?: Record<string, string>;
}

interface CareerOption {
  title: string;
  matchScore: number;
  whyFits: string;
  technicalSkills?: string[];
  examSubjects?: string[];
  physicalEligibility?: string;
  softSkills: string[];
  roadmap: {
    day30: string;
    day60: string;
    day90: string;
  };
  learningResources: { name: string; url: string; description: string }[];
  jobReadinessTime: string;
  competitionLevel?: string;
}

// --- Constants ---
const DISCOVERY_QUESTIONS = [
  {
    id: 'q1',
    question: "Do you prefer fast-paced technology roles or stable government jobs?",
    options: ["Technology Sector", "Government Sector", "Open to both", "Not sure yet"]
  },
  {
    id: 'q2',
    question: "Do you enjoy coding or preparing for competitive exams?",
    options: ["I love coding", "I prefer competitive exams", "I like both", "Neither"]
  },
  {
    id: 'q3',
    question: "Are you interested in physical service roles like Defence?",
    options: ["Yes, very much", "No, I prefer desk jobs", "Maybe", "Only if it involves tech"]
  },
  {
    id: 'q4',
    question: "Do you prefer structured syllabus-based exams?",
    options: ["Yes, I like structure", "No, I like project-based learning", "I can adapt to both", "I prefer creative work"]
  },
  {
    id: 'q5',
    question: "Are you comfortable with mathematics and reasoning?",
    options: ["Yes, it's my strength", "I find it challenging", "I'm okay with it", "I prefer visual/creative tasks"]
  }
];

const COMMON_INTERESTS = [
  "Frontend Dev", "Backend Dev", "Full-Stack Dev", 
  "Banking (IBPS/SBI)", "Railway (RRB)", "Defence (NDA/CDS)",
  "UI/UX Design", "Data Management", "Public Service", "Cybersecurity",
  "Quantitative Aptitude", "Reasoning", "Physical Fitness", "General Awareness"
];

// --- Gemini Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateCareerRoadmap(userData: UserData): Promise<CareerOption[]> {
  const prompt = `
    You are EduPath AI, an intelligent and inclusive career roadmap generator.
    Based on the following student profile, generate 2-3 personalized career paths from either the Technology Sector (Frontend, Backend, Full-Stack) or the Government Sector (Banking, Railway, Defence).
    
    Profile:
    - Interests: ${userData.interests.length > 0 ? userData.interests.join(', ') : 'None provided (see discovery answers)'}
    - Discovery Answers: ${userData.discoveryAnswers ? JSON.stringify(userData.discoveryAnswers) : 'N/A'}
    - Daily Study Time: ${userData.studyTime}
    - Short-term Goal: ${userData.shortTermGoal}
    - Long-term Goal: ${userData.longTermGoal}
    - Preferred Language: ${userData.language || 'English'}

    Mandatory Roadmap Structure:
    - 30 Days (Foundation): 
      - Tech: Programming basics, HTML/CSS/JS or Python basics, Git & GitHub.
      - Govt: Quantitative aptitude basics, Reasoning fundamentals, English grammar, General awareness basics.
    - 60 Days (Intermediate): 
      - Tech: Framework learning, Build 2 mini projects, API & database basics.
      - Banking: Mock tests, Speed math practice, Previous year papers.
      - Railway: Technical subject revision, Practice mock exams.
      - Defence: Physical training schedule, Written exam preparation, Current affairs.
    - 90 Days (Advanced): 
      - Tech: 3 portfolio projects, Deployment, Resume building, Interview preparation.
      - Banking: Full-length mock exams, Interview preparation.
      - Railway: Exam-focused revision, CBT practice.
      - Defence: SSB interview preparation, Medical standards awareness.

    Guidelines:
    - Use Google Search to find current exam dates, trending technologies, and the best free learning resources (freeCodeCamp, MDN, IBPS official, RRB official, etc.).
    - Keep recommendations realistic and beginner-friendly.
    - Include low-cost/free resources.
    - Mention competition level clearly.
    - Provide realistic timelines based on ${userData.studyTime} daily study hours.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            whyFits: { type: Type.STRING },
            technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            examSubjects: { type: Type.ARRAY, items: { type: Type.STRING } },
            physicalEligibility: { type: Type.STRING },
            softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            competitionLevel: { type: Type.STRING },
            roadmap: {
              type: Type.OBJECT,
              properties: {
                day30: { type: Type.STRING },
                day60: { type: Type.STRING },
                day90: { type: Type.STRING }
              },
              required: ["day30", "day60", "day90"]
            },
            learningResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  url: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "url", "description"]
              }
            },
            jobReadinessTime: { type: Type.STRING }
          },
          required: ["title", "matchScore", "whyFits", "softSkills", "roadmap", "learningResources", "jobReadinessTime"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className, 
  disabled,
  isLoading
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
}) => {
  const variants = {
    primary: "bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300",
    secondary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    outline: "border border-stone-200 text-stone-600 hover:bg-stone-50",
    ghost: "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || isLoading}
      className={cn(
        "px-6 py-3 rounded-full font-medium transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

export default function App() {
  const [step, setStep] = useState<Step>('welcome');
  const [userData, setUserData] = useState<UserData>({
    studyTime: '2 hours',
    shortTermGoal: '',
    longTermGoal: '',
    language: 'English',
    interests: [],
  });
  const [discoveryIndex, setDiscoveryIndex] = useState(0);
  const [results, setResults] = useState<CareerOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [session, setSession] = useState<LiveSession | null>(null);

  // --- Live API Logic ---
  const startLiveSession = async () => {
    try {
      const liveSession = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            setLiveTranscript("Connected! Start speaking...");
            // Start audio capture
            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
              const audioContext = new AudioContext({ sampleRate: 16000 });
              const source = audioContext.createMediaStreamSource(stream);
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              source.connect(processor);
              processor.connect(audioContext.destination);
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                liveSession.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
              };
            });
          },
          onmessage: (message) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setLiveTranscript(prev => prev + "\n" + message.serverContent?.modelTurn?.parts[0].text);
            }
            // Audio output handling would go here
          },
          onclose: () => {
            setIsLiveActive(false);
            setSession(null);
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsLiveActive(false);
          }
        },
        config: {
          systemInstruction: "You are EduPath AI. Help the user with career guidance. Be encouraging and concise.",
        }
      });
      setSession(liveSession);
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
    }
  };

  const stopLiveSession = () => {
    session?.close();
    setIsLiveActive(false);
  };

  const handleNext = () => {
    if (step === 'welcome') setStep('login');
    else if (step === 'login') setStep('dashboard');
    else if (step === 'dashboard') setStep('basic-info');
    else if (step === 'basic-info') setStep('interests');
    else if (step === 'interests') {
      if (userData.interests.length > 0) {
        handleGenerate();
      } else {
        setStep('discovery');
      }
    }
  };

  const handleBack = () => {
    if (step === 'login') setStep('welcome');
    else if (step === 'dashboard') setStep('login');
    else if (step === 'basic-info') setStep('dashboard');
    else if (step === 'interests') setStep('basic-info');
    else if (step === 'discovery') {
      if (discoveryIndex > 0) setDiscoveryIndex(prev => prev - 1);
      else setStep('interests');
    }
    else if (step === 'results') setStep('interests');
  };

  const handleGenerate = async () => {
    setStep('generating');
    setIsGenerating(true);
    try {
      const data = await generateCareerRoadmap(userData);
      setResults(data);
      setStep('results');
    } catch (error) {
      console.error("Failed to generate roadmap:", error);
      setStep('interests');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setUserData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleDiscoveryAnswer = (answer: string) => {
    const qId = DISCOVERY_QUESTIONS[discoveryIndex].id;
    setUserData(prev => ({
      ...prev,
      discoveryAnswers: { ...prev.discoveryAnswers, [qId]: answer }
    }));

    if (discoveryIndex < DISCOVERY_QUESTIONS.length - 1) {
      setDiscoveryIndex(prev => prev + 1);
    } else {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-stone-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCFB]/80 backdrop-blur-md border-bottom border-stone-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('welcome')}>
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">EduPath AI</span>
          </div>
          {step !== 'welcome' && step !== 'generating' && (
            <div className="flex items-center gap-4">
              <button 
                onClick={isLiveActive ? stopLiveSession : startLiveSession}
                className={cn(
                  "p-2 rounded-full transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                  isLiveActive ? "bg-red-50 text-red-600 animate-pulse" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                )}
              >
                {isLiveActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isLiveActive ? "Live Voice On" : "Voice Help"}
              </button>
              <div className="h-1.5 w-32 bg-stone-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: step === 'basic-info' ? '25%' : 
                           step === 'interests' ? '50%' : 
                           step === 'discovery' ? '75%' : '100%' 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100"
                >
                  <Sparkles className="w-4 h-4" />
                  Your Career, Your Path, Your Future.
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-stone-900 leading-[1.1]">
                  Tech Innovation or <br />
                  <span className="text-stone-400 italic font-serif">Public Service.</span>
                </h1>
                <p className="text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
                  EduPath AI is your intelligent companion for navigating the complex landscape of modern careers. We bridge the gap between cutting-edge technology and stable government service.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={handleNext} className="w-full sm:w-auto px-10 py-4 text-lg">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Button>
                <p className="text-sm text-stone-400">Free & accessible for everyone</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
                <div className="p-8 rounded-3xl bg-white border border-stone-100 text-left space-y-4 hover:shadow-lg transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Technology Sector</h3>
                  <p className="text-stone-500">Master Frontend, Backend, or Full-Stack development with modern stacks like MERN or Python/Django. High growth, creative, and dynamic.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Frontend', 'Backend', 'Full-Stack', 'UI/UX'].map(t => <span key={t} className="px-2 py-1 bg-stone-50 rounded text-xs text-stone-400">{t}</span>)}
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-white border border-stone-100 text-left space-y-4 hover:shadow-lg transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Government Sector</h3>
                  <p className="text-stone-500">Prepare for Banking (IBPS/SBI), Railway (RRB), or Defence (NDA/CDS) with structured syllabus roadmaps. Stability, service, and security.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Banking', 'Railway', 'Defence', 'SSC'].map(t => <span key={t} className="px-2 py-1 bg-emerald-50 rounded text-xs text-emerald-600/70">{t}</span>)}
                  </div>
                </div>
              </div>

              <div className="pt-12 space-y-6">
                <h3 className="text-2xl font-bold">Why EduPath AI?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: Target, title: "Personalized Roadmaps", desc: "Tailored to your specific ambitions, study hours, and timeline." },
                    { icon: Search, title: "Search Grounded", desc: "Up-to-date information on exam dates and trending tech stacks." },
                    { icon: Mic, title: "Voice Interaction", desc: "Talk to our AI for real-time career advice and guidance." }
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-stone-50 border border-stone-100 text-left space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-stone-600 shadow-sm">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-md mx-auto space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Login to EduPath</h2>
                <p className="text-stone-500">Access your dashboard and track your progress.</p>
              </div>

              <Card className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue="student@edupath.ai"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Password</label>
                    <input 
                      type="password" 
                      defaultValue="password123"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <Button onClick={handleNext} className="w-full">Login Now</Button>
                <div className="text-center text-sm text-stone-400">
                  Don't have an account? <span className="text-emerald-600 font-medium cursor-pointer">Register</span>
                </div>
              </Card>

              <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 space-y-4">
                <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Demo Credentials
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-emerald-600 font-semibold">Student Role</div>
                    <div className="text-emerald-700/70">Access roadmaps, track progress, and view dashboard.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-emerald-600 font-semibold">Admin Role</div>
                    <div className="text-emerald-700/70">Manage resources, view analytics, and user data.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'basic-info' && (
            <motion.div 
              key="basic-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tell us about your goals</h2>
                <p className="text-stone-500">This helps us calibrate the intensity and focus of your roadmap.</p>
              </div>

              <div className="grid gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
                    <Clock className="w-4 h-4" /> Available Study Time
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['30 mins', '1 hour', '2 hours', '4+ hours'].map(time => (
                      <button
                        key={time}
                        onClick={() => setUserData(prev => ({ ...prev, studyTime: time }))}
                        className={cn(
                          "px-4 py-3 rounded-2xl border text-sm font-medium transition-all",
                          userData.studyTime === time 
                            ? "bg-stone-900 border-stone-900 text-white shadow-md" 
                            : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
                      <Target className="w-4 h-4" /> Short-term Goal
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g., Learn basic Python"
                      value={userData.shortTermGoal}
                      onChange={e => setUserData(prev => ({ ...prev, shortTermGoal: e.target.value }))}
                      className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
                      <Briefcase className="w-4 h-4" /> Long-term Goal
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g., Become a Data Analyst"
                      value={userData.longTermGoal}
                      onChange={e => setUserData(prev => ({ ...prev, longTermGoal: e.target.value }))}
                      className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
                    <Languages className="w-4 h-4" /> Preferred Language
                  </label>
                  <select 
                    value={userData.language}
                    onChange={e => setUserData(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Hindi</option>
                    <option>Chinese</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Button variant="ghost" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!userData.shortTermGoal || !userData.longTermGoal}
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'interests' && (
            <motion.div 
              key="interests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">What sparks your interest?</h2>
                <p className="text-stone-500">Select at least one, or skip to take our discovery quiz.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {COMMON_INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      "px-6 py-3 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                      userData.interests.includes(interest)
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                    )}
                  >
                    {interest}
                    {userData.interests.includes(interest) ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="font-semibold">Not sure where to start?</h4>
                  <p className="text-sm text-stone-500">Take our 2-minute discovery quiz to find your strengths.</p>
                </div>
                <Button variant="outline" onClick={() => setStep('discovery')}>
                  Start Quiz
                </Button>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Button variant="ghost" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={handleGenerate} disabled={userData.interests.length === 0}>
                  Generate Roadmap <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'discovery' && (
            <motion.div 
              key="discovery"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl mx-auto space-y-10"
            >
              <div className="text-center space-y-4">
                <div className="inline-block px-3 py-1 rounded-full bg-stone-100 text-xs font-bold uppercase tracking-widest text-stone-500">
                  Question {discoveryIndex + 1} of {DISCOVERY_QUESTIONS.length}
                </div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {DISCOVERY_QUESTIONS[discoveryIndex].question}
                </h2>
              </div>

              <div className="grid gap-4">
                {DISCOVERY_QUESTIONS[discoveryIndex].options.map((option, i) => (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleDiscoveryAnswer(option)}
                    className="w-full p-6 text-left rounded-3xl border border-stone-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group flex items-center justify-between"
                  >
                    <span className="text-lg font-medium text-stone-700 group-hover:text-emerald-900">{option}</span>
                    <div className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-center">
                <Button variant="ghost" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4" /> Previous Question
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div 
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-8 py-20"
            >
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">Crafting your roadmap...</h2>
                <p className="text-stone-500 max-w-sm mx-auto">
                  Our AI is analyzing your goals and interests to build the perfect learning path for you.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                {['Analyzing interests...', 'Mapping skills...', 'Curating resources...', 'Finalizing roadmap...'].map((text, i) => (
                  <motion.div 
                    key={text}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 1.5 }}
                    className="text-sm text-stone-400 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {text}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight">Student Dashboard</h2>
                  <p className="text-stone-500">Welcome back, Student! Track your career progress here.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-stone-600" />
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold">student@edupath.ai</div>
                    <div className="text-xs text-stone-400">Student Account</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Active</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">Career Progress</h3>
                    <p className="text-sm text-stone-500">You haven't started a roadmap yet.</p>
                  </div>
                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-0" />
                  </div>
                </Card>
                <Card className="p-6 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-600">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">Recent Activity</h3>
                    <p className="text-sm text-stone-500">Logged in from AI Studio.</p>
                  </div>
                </Card>
                <Card className="p-6 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-600">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">Goals Set</h3>
                    <p className="text-sm text-stone-500">0 active goals.</p>
                  </div>
                </Card>
              </div>

              <div className="p-10 rounded-3xl bg-stone-900 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-2xl font-bold">Ready to find your path?</h3>
                  <p className="text-stone-400">Start our AI-powered guidance to get your personalized roadmap.</p>
                </div>
                <Button onClick={handleNext} variant="secondary" className="px-10">
                  Start Guidance <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {isLiveActive && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-24 right-6 w-80 bg-white rounded-3xl shadow-2xl border border-stone-100 p-6 z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Live Assistant</span>
                </div>
                <button onClick={stopLiveSession} className="text-stone-400 hover:text-stone-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto text-sm text-stone-600 whitespace-pre-wrap font-medium leading-relaxed">
                {liveTranscript}
              </div>
            </motion.div>
          )}
          {step === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold tracking-tight">Your Career Paths</h2>
                  <p className="text-stone-500">We've identified {results.length} paths that align with your profile.</p>
                </div>
                <Button variant="outline" onClick={() => setStep('interests')}>
                  Start Over
                </Button>
              </div>

              <div className="grid gap-12">
                {results.map((option, idx) => (
                  <Card key={idx} className="p-0 border-none bg-transparent shadow-none space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                              Path {idx + 1}
                            </div>
                            <h3 className="text-3xl font-bold">{option.title}</h3>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-emerald-600">{option.matchScore}%</div>
                            <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Match Score</div>
                          </div>
                        </div>

                        <p className="text-stone-600 leading-relaxed italic">
                          "{option.whyFits}"
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {option.technicalSkills && option.technicalSkills.length > 0 && (
                            <div className="p-5 rounded-3xl bg-white border border-stone-100 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Technical Skills
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {option.technicalSkills.map(skill => (
                                  <span key={skill} className="px-3 py-1 rounded-full bg-stone-50 text-stone-600 text-xs font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {option.examSubjects && option.examSubjects.length > 0 && (
                            <div className="p-5 rounded-3xl bg-white border border-stone-100 space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                <BookOpen className="w-3 h-3" /> Exam Subjects
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {option.examSubjects.map(subject => (
                                  <span key={subject} className="px-3 py-1 rounded-full bg-stone-50 text-stone-600 text-xs font-medium">
                                    {subject}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="p-5 rounded-3xl bg-white border border-stone-100 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3" /> Soft Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {option.softSkills.map(skill => (
                                <span key={skill} className="px-3 py-1 rounded-full bg-stone-50 text-stone-600 text-xs font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          {option.physicalEligibility && (
                            <div className="p-5 rounded-3xl bg-white border border-stone-100 space-y-3 col-span-full">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                <Target className="w-3 h-3" /> Physical Eligibility
                              </h4>
                              <p className="text-sm text-stone-600">{option.physicalEligibility}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:w-72 space-y-6">
                        <div className="p-6 rounded-3xl bg-stone-900 text-white space-y-4">
                          <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Job Readiness</div>
                            <div className="text-2xl font-bold">{option.jobReadinessTime}</div>
                          </div>
                          {option.competitionLevel && (
                            <div className="space-y-1">
                              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Competition Level</div>
                              <div className="text-sm font-semibold text-emerald-400">{option.competitionLevel}</div>
                            </div>
                          )}
                          <div className="h-px bg-stone-800" />
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Learning Resources</h4>
                            <div className="space-y-3">
                              {option.learningResources.map((res, i) => (
                                <a 
                                  key={i} 
                                  href={res.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block group"
                                >
                                  <div className="text-sm font-semibold group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                                    {res.name} <ArrowRight className="w-3 h-3" />
                                  </div>
                                  <div className="text-xs text-stone-500 line-clamp-1">{res.description}</div>
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-500" /> 30-60-90 Day Roadmap
                      </h4>
                      <div className="grid md:grid-cols-3 gap-6 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-stone-100 -translate-y-1/2 z-0" />
                        
                        {[
                          { day: '30', title: 'Foundation', content: option.roadmap.day30, color: 'bg-stone-100' },
                          { day: '60', title: 'Practical', content: option.roadmap.day60, color: 'bg-emerald-50' },
                          { day: '90', title: 'Advanced', content: option.roadmap.day90, color: 'bg-emerald-600 text-white' }
                        ].map((milestone, i) => (
                          <div key={i} className="relative z-10 p-6 rounded-3xl bg-white border border-stone-100 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg", milestone.color)}>
                              {milestone.day}
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-bold">{milestone.title}</h5>
                              <div className="text-sm text-stone-500 leading-relaxed prose prose-sm prose-stone">
                                <ReactMarkdown>{milestone.content}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {idx < results.length - 1 && <div className="h-px bg-stone-100 my-12" />}
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-stone-400 text-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span>EduPath AI © 2026</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-stone-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Accessibility</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
