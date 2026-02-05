import React, { useState } from 'react';
import ProjectForm from './components/ProjectForm.tsx';
import ProjectList from './components/ProjectList.tsx';
import ProjectDetail from './components/ProjectDetail.tsx';
import { UserPreferences, ProjectSummary, ProjectDeepDive } from './types.ts';
import { generateProjectSummaries, generateProjectDeepDive } from './services/geminiService.ts';

enum AppView {
  FORM,
  LIST,
  DETAIL
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ProjectDeepDive | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Only prompt for a key if one isn't already provided by the environment.
   */
  const ensureApiKey = async (): Promise<void> => {
    // If the environment already has the key (e.g., Vercel), we don't need to ask.
    if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
      return;
    }

    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
        }
      } catch (e) {
        console.warn("Key selection dialog unavailable.");
      }
    }
  };

  const handleFormSubmit = async (newPrefs: UserPreferences) => {
    setIsLoading(true);
    setError(null);
    try {
      await ensureApiKey();
      setPrefs(newPrefs);
      const projectList = await generateProjectSummaries(newPrefs);
      setSummaries(projectList);
      setView(AppView.LIST);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Critical Engine Failure:", err);
      const msg = err.message || "";
      if (msg.includes("API_KEY_MISSING") || msg.includes("403") || msg.includes("key")) {
        setError("AUTHENTICATION FAILED: A valid Gemini API Key is required. Please ensure it's set in your environment or select one via the dialog.");
        (window as any).aistudio?.openSelectKey();
      } else {
        setError(msg || "The project engine encountered a disruption. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSelect = async (summary: ProjectSummary) => {
    if (!prefs) return;
    setIsLoadingDetail(true);
    setError(null);
    try {
      await ensureApiKey();
      const detail = await generateProjectDeepDive(summary, prefs);
      setSelectedDetail(detail);
      setView(AppView.DETAIL);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Blueprint Failure:", err);
      setError("Failed to initialize project blueprint. Please verify your connection and API key.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => setView(AppView.LIST);
  const handleBackToForm = () => {
    setView(AppView.FORM);
    setSummaries([]);
    setSelectedDetail(null);
  };

  return (
    <div className="premium-bg selection:bg-orange-500/30 selection:text-white flex flex-col min-h-screen">
      <div className="grid-pattern"></div>
      <div className="horizon-glow"></div>
      <div className="horizon-line"></div>
      
      <div className="relative z-10 flex flex-col flex-grow">
        <nav className="flex items-center justify-center px-8 py-8 md:py-12 max-w-7xl mx-auto w-full">
          <div 
            className="text-4xl md:text-5xl font-black tracking-tighter text-white cursor-pointer select-none transition-transform hover:scale-105" 
            onClick={handleBackToForm}
          >
            Project<span className="text-[#ff5c00]">Path</span>
          </div>
        </nav>

        <header className="pt-4 pb-16 px-6 text-center shrink-0">
          <div className="inline-flex items-center px-5 py-2 bg-orange-500/10 border border-orange-500/20 text-[#ff5c00] text-[11px] font-black uppercase tracking-[0.4em] rounded-full mb-10 backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#ff5c00] mr-3 animate-pulse"></span>
            Engineering Mentor Active
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.82] uppercase">
            Build with clarity,<br/>
            not <span className="text-[#ff5c00]">confusion</span>
          </h1>
        </header>

        <main className="container mx-auto px-6 pb-40 flex-grow">
          {error && (
            <div className="max-w-4xl mx-auto mb-16 p-8 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-3xl text-center font-bold animate-in slide-in-from-top-4 backdrop-blur-xl">
              <p className="mb-4">{error}</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => (window as any).aistudio?.openSelectKey()} className="px-6 py-2 bg-rose-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-colors">Select New Key</button>
                <button onClick={() => setError(null)} className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-full text-xs font-black uppercase tracking-widest">Dismiss</button>
              </div>
            </div>
          )}

          {view === AppView.FORM && (
            <div className="max-w-4xl mx-auto bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-[3.5rem] p-10 sm:p-20 border border-white/10 animate-in zoom-in-95">
              <div className="mb-16 text-center">
                <h2 className="text-3xl font-black text-white mb-4">Project Parameters</h2>
                <p className="text-slate-400 font-medium text-lg">Input your criteria to generate tailored engineering blueprints.</p>
              </div>
              <ProjectForm onSubmit={handleFormSubmit} isLoading={isLoading} />
            </div>
          )}

          {view === AppView.LIST && (
            <ProjectList 
              summaries={summaries} 
              onSelect={handleProjectSelect} 
              onBack={handleBackToForm}
              isLoadingDetail={isLoadingDetail}
            />
          )}

          {view === AppView.DETAIL && selectedDetail && (
            <ProjectDetail 
              data={selectedDetail} 
              onBack={handleBackToList} 
            />
          )}
        </main>

        {isLoadingDetail && (
          <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-6 animate-in fade-in">
            <div className="text-center animate-in zoom-in-95">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(255,92,0,0.3)]"></div>
              <h3 className="text-2xl font-black text-white uppercase tracking-widest">Architecting Blueprint</h3>
              <p className="text-slate-500 mt-2 font-medium">Please wait while the engine generates your roadmap...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;