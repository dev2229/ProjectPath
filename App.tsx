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
   * Pre-flight check to ensure the environment has a key.
   */
  const preflightKeyCheck = async (): Promise<boolean> => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey && !process.env.API_KEY) {
        await aistudio.openSelectKey();
      }
    }
    return true;
  };

  const handleFormSubmit = async (newPrefs: UserPreferences) => {
    setIsLoading(true);
    setError(null);
    try {
      await preflightKeyCheck();
      setPrefs(newPrefs);
      const projectList = await generateProjectSummaries(newPrefs);
      setSummaries(projectList);
      setView(AppView.LIST);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("ProjectPath Critical Failure:", err);
      const errMsg = err.message || "";
      if (errMsg.includes("500") || errMsg.includes("UNKNOWN") || errMsg.includes("API_KEY_MISSING")) {
        setError("SYSTEM AUTHENTICATION FAILED: The engine requires a valid API Key. Please re-select your project key from the dialog.");
        (window as any).aistudio?.openSelectKey();
      } else {
        setError(errMsg || 'Network disruption in architectural engine.');
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
      await preflightKeyCheck();
      const detail = await generateProjectDeepDive(summary, prefs);
      setSelectedDetail(detail);
      setView(AppView.DETAIL);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      if (errMsg.includes("500")) {
        setError("AUTHENTICATION ERROR: The engine lost connection. Please re-select your key.");
        (window as any).aistudio?.openSelectKey();
      } else {
        setError(err.message || 'Blueprint initialization failed.');
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setView(AppView.LIST);
    setSelectedDetail(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToForm = () => {
    setView(AppView.FORM);
    setSummaries([]);
    setSelectedDetail(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <div className="inline-flex items-center px-5 py-2 bg-orange-500/10 border border-orange-500/20 text-[#ff5c00] text-[11px] font-black uppercase tracking-[0.4em] rounded-full mb-10 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#ff5c00] mr-3 animate-pulse"></span>
            Strategic Engineering Guidance
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.82] drop-shadow-2xl max-w-5xl mx-auto uppercase">
            Build projects with clarity,<br/>
            not <span className="text-[#ff5c00]">confusion</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed mt-4">
            Architect your academic journey with precision. 
            AI-powered roadmaps for the next generation of engineers.
          </p>
        </header>

        <main className="container mx-auto px-6 pb-40 flex-grow">
          {error && (
            <div className="max-w-4xl mx-auto mb-16 p-8 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-3xl text-center font-bold animate-in slide-in-from-top-4 sticky top-4 z-50 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-4">
                  <svg className="w-10 h-10 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="text-lg tracking-tight leading-relaxed">{error}</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => (window as any).aistudio?.openSelectKey()} className="px-8 py-3 bg-rose-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all">Re-Select Key</button>
                  <button onClick={() => setError(null)} className="px-8 py-3 bg-white/5 text-rose-400 rounded-full text-xs font-black uppercase tracking-widest border border-rose-500/20">Dismiss</button>
                </div>
              </div>
            </div>
          )}

          {view === AppView.FORM && (
            <div id="project-form-container" className="max-w-4xl mx-auto bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] p-10 sm:p-14 md:p-20 border border-white/10 animate-in zoom-in-95 duration-700">
              <div className="mb-16 text-center">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Project Configuration</h2>
                <p className="text-slate-400 font-medium text-lg">Input your parameters to generate actionable engineering solutions.</p>
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
          <div className="fixed inset-0 bg-black z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-[#0a0a0a] rounded-[3rem] p-16 text-center max-w-md w-full shadow-[0_0_100px_rgba(255,92,0,0.2)] border border-white/10 animate-in zoom-in-95">
              <div className="relative mb-10">
                <div className="w-20 h-20 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(255,92,0,0.5)]">
                  <svg className="w-10 h-10 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
              </div>
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase tracking-wider">Initializing</h3>
              <p className="text-slate-500 font-semibold text-lg leading-relaxed">Processing architectural roadmap and viva protocols...</p>
            </div>
          </div>
        )}

        <footer className="pt-24 pb-16 border-t border-white/5 bg-[#050505] relative z-20">
          <div className="container mx-auto px-8 max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-12 mb-24">
              <div className="space-y-8 text-center sm:text-left">
                <div className="text-4xl font-black tracking-tighter text-white">
                  Project<span className="text-[#ff5c00]">Path</span>
                </div>
                <p className="text-slate-400 font-medium text-base leading-relaxed max-w-xs mx-auto sm:mx-0">
                  Precision-engineered roadmaps for the builders of tomorrow. Reduce chaos, increase clarity.
                </p>
              </div>
              {/* Footer columns... */}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;