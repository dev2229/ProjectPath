
import React from 'react';
import { ProjectSummary } from '../types.ts';
import Card from './Card.tsx';
import Button from './Button.tsx';

interface ProjectListProps {
  summaries: ProjectSummary[];
  onSelect: (summary: ProjectSummary) => void;
  onBack: () => void;
  isLoadingDetail: boolean;
}

const ProjectList: React.FC<ProjectListProps> = ({ summaries, onSelect, onBack, isLoadingDetail }) => {
  return (
    <div className="space-y-12 md:space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 max-w-7xl mx-auto pb-16 md:pb-24 relative z-10 w-full">
      <div className="text-center space-y-4 md:space-y-6 px-4">
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">Curated For You</h2>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
          We've filtered these based on your current semester and experience level.
        </p>
        <button onClick={onBack} className="text-[#ff5c00] font-black uppercase tracking-widest text-[10px] md:text-xs hover:text-white transition-all flex items-center justify-center mx-auto group py-2">
          <svg className="w-3 h-3 md:w-4 md:h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Update Search Criteria
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2 sm:px-0">
        {(summaries || []).map((project, idx) => (
          <Card 
            key={project.id || idx} 
            className="group flex flex-col h-full bg-[#0a0a0a]/40 border border-white/5 hover:border-orange-500/30 transition-all duration-500 rounded-[2rem] p-6 md:p-8 overflow-hidden relative shadow-2xl cursor-pointer"
            onClick={() => onSelect(project)}
          >
            <div className="absolute inset-0 z-20 cursor-pointer" aria-hidden="true"></div>
            
            <div className="mb-4 md:mb-6 flex flex-wrap gap-2 justify-between items-start relative z-10">
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  project.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  project.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {project.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10">
                  {project.expectedEffort}
                </span>
              </div>
              <div className="text-slate-600 group-hover:text-[#ff5c00] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-white mb-3 group-hover:text-[#ff5c00] transition-colors leading-tight relative z-10">
              {project.title}
            </h3>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-grow relative z-10 font-medium">
              {project.shortDescription}
            </p>

            <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 relative z-10">
              <div className="text-[9px] text-orange-500 font-black uppercase tracking-widest mb-1">Mastery Goal</div>
              <div className="text-xs text-white font-bold leading-tight">{project.learningOutcomes}</div>
            </div>
            
            <div className="pt-4 border-t border-white/5 relative z-10 mt-auto">
              <div className="flex items-center text-[9px] text-slate-500 font-black uppercase tracking-[0.25em] mb-2">
                Confidence Guide
              </div>
              <p className="text-[11px] text-slate-300 italic font-bold leading-relaxed">
                "{project.suitability}"
              </p>
            </div>
            
            <div className="mt-6 relative z-10">
              <Button variant="outline" className="w-full text-[10px] py-3 rounded-2xl group-hover:bg-[#ff5c00] group-hover:border-[#ff5c00] group-hover:text-white transition-all">
                VIEW ROADMAP
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
