
import React, { useState, useEffect, useRef } from 'react';
import { ProjectDeepDive } from '../types.ts';
import Card from './Card.tsx';
import Button from './Button.tsx';

interface ProjectDetailProps {
  data: ProjectDeepDive;
  onBack: () => void;
}

const TimelineItem: React.FC<{
  step: { phase: string; week: string; task: string; details: string[] };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ step, index, isExpanded, onToggle }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); }
    }, { threshold: 0.1 });
    if (itemRef.current) observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={itemRef} className={`relative pl-10 md:pl-20 pb-8 transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="absolute left-[13px] md:left-[27px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-orange-500/50 to-transparent"></div>
      <div className={`absolute left-0 top-0 w-7 h-7 md:w-14 md:h-14 rounded-full border-2 transition-all duration-500 flex items-center justify-center z-10 ${isExpanded ? 'bg-[#ff5c00] border-[#ff5c00] shadow-[0_0_30px_rgba(255,92,0,0.6)]' : 'bg-[#0a0a0a] border-white/20'}`}>
        <span className={`text-[8px] md:text-xs font-black ${isExpanded ? 'text-white' : 'text-slate-500'}`}>{index + 1}</span>
      </div>

      <div onClick={onToggle} className={`cursor-pointer group relative overflow-hidden transition-all duration-500 border rounded-[2rem] p-5 md:p-10 ${isExpanded ? 'bg-orange-500/[0.05] border-orange-500/40' : 'bg-white/[0.02] border-white/5'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
                {step.phase}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{step.week}</span>
            </div>
            <h3 className={`text-lg md:text-2xl font-black tracking-tight ${isExpanded ? 'text-white' : 'text-slate-300'}`}>{step.task}</h3>
          </div>
          <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-8' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="pt-6 border-t border-white/10">
              <ul className="space-y-4">
                {step.details.map((detail, i) => (
                  <li key={i} className="text-sm md:text-base text-slate-400 flex items-start font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-4 mt-2 shrink-0"></span> 
                    {detail}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Mentor Guidance</div>
                <p className="text-xs text-slate-400 italic">"Focus on completing this phase before worrying about UI styling. Getting the logic right first is the best engineering practice."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ data, onBack }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  if (!data) return null;

  return (
    <div className="space-y-12 md:space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 max-w-6xl mx-auto pb-20 md:pb-32 relative z-10 w-full px-2">
      <div className="flex justify-center">
        <button onClick={onBack} className="group flex items-center text-slate-400 font-black uppercase tracking-widest text-[9px] md:text-[10px] px-6 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
          <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Return to Hub
        </button>
      </div>

      <div className="text-center space-y-6 md:space-y-8 px-4">
        <div className="inline-block px-5 py-2 bg-orange-500/10 text-[#ff5c00] text-[10px] font-black uppercase tracking-[0.4em] rounded-full border border-orange-500/20">
          V1.1 Blueprint Active
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-tight max-w-4xl mx-auto break-words">
          {data.title}
        </h1>
        <p className="text-lg md:text-2xl text-slate-400 leading-relaxed max-w-3xl mx-auto font-medium italic">
          "{data.intro}"
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2">
          <Card title="Executive Summary" className="h-full border-none bg-white/[0.02] p-8 md:p-12">
            <p className="text-slate-300 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">{data.fullDescription}</p>
          </Card>
        </div>
        <div>
          <Card title="Technical Stack" className="h-full border-orange-500/20 bg-orange-500/[0.03] p-8 md:p-12">
            <div className="space-y-10">
              {data.techStack.map((stack, idx) => (
                <div key={idx}>
                  <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-4">{stack.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {stack.items.map((item, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 text-white text-[10px] font-black rounded-xl uppercase tracking-wider">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <section className="relative px-2">
        <div className="mb-16 md:mb-20 text-center">
          <h2 className="text-3xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase">5-Phase Roadmap</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Follow this structure to avoid common pitfalls</p>
        </div>
        <div className="max-w-4xl mx-auto relative">
          {data.roadmap.map((step, idx) => (
            <TimelineItem key={idx} step={step} index={idx} isExpanded={expandedIndex === idx} onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)} />
          ))}
        </div>
      </section>

      <section className="bg-black rounded-[3rem] p-8 md:p-16 text-white border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-orange-500 rounded-full blur-[120px] opacity-10"></div>
        <h2 className="text-3xl md:text-4xl font-black mb-16 flex items-center relative uppercase tracking-tighter">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center mr-6 shrink-0">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          Viva Preparation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 relative">
          <div className="space-y-12">
            <div>
              <h4 className="text-orange-400 font-black mb-6 uppercase tracking-[0.3em] text-[10px]">Likely Questions</h4>
              <ul className="space-y-5">
                {data.vivaPrep.questions.map((q, i) => (
                  <li key={i} className="text-sm md:text-base text-slate-400 leading-relaxed pl-6 border-l border-orange-500/30 font-medium italic">{q}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-slate-500 font-black mb-6 uppercase tracking-[0.3em] text-[10px]">Key Concepts</h4>
              <div className="flex flex-wrap gap-2">
                {data.vivaPrep.concepts.map((c, i) => (
                  <span key={i} className="bg-white/5 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-200 border border-white/10 uppercase tracking-widest">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-12">
            <div>
              <h4 className="text-rose-400 font-black mb-6 uppercase tracking-[0.3em] text-[10px]">Common Mistakes</h4>
              <ul className="space-y-4">
                {data.vivaPrep.mistakes.map((m, i) => (
                  <li key={i} className="text-xs md:text-sm text-slate-400 flex items-start bg-white/5 p-4 rounded-3xl border border-white/5 font-medium">
                    <span className="text-rose-500 mr-4 font-black">✕</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center pt-10 px-4">
        <div className="inline-block relative group w-full max-w-2xl">
          <div className="absolute inset-0 bg-[#ff5c00] rounded-[3rem] blur-3xl opacity-10"></div>
          <div className="relative px-8 py-16 bg-[#0a0a0a] text-white rounded-[3rem] border border-orange-500/20">
            <p className="text-2xl md:text-4xl font-black mb-6 tracking-tight uppercase">Ready to start?</p>
            <p className="text-orange-400 font-bold text-base md:text-xl italic opacity-90 leading-relaxed max-w-2xl mx-auto">
              "{data.closing}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
