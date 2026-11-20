import React from 'react';
import { Briefcase, Car, CheckCircle2, DollarSign, Plane, Wrench, X } from 'lucide-react';
import { JOB_CATALOG, JobType } from '../game/types';

interface JobsModalProps {
  activeJob: JobType;
  jobStepLabel: string | null;
  onStartJob: (job: Exclude<JobType, 'none'>) => void;
  onCancelJob: () => void;
  onClose: () => void;
}

const JOB_ICONS: Record<Exclude<JobType, 'none'>, React.ReactNode> = {
  taxi: <Car className="w-5 h-5 text-amber-400" />,
  delivery: <Briefcase className="w-5 h-5 text-sky-400" />,
  mechanic: <Wrench className="w-5 h-5 text-emerald-400" />,
  dealer: <DollarSign className="w-5 h-5 text-amber-400" />,
  parking: <Car className="w-5 h-5 text-purple-400" />,
  courier: <Plane className="w-5 h-5 text-cyan-400" />,
};

export const JobsModal: React.FC<JobsModalProps> = ({
  activeJob,
  jobStepLabel,
  onStartJob,
  onCancelJob,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/78">
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-zinc-50">Metro Career Dispatch &amp; Jobs</h2>
              <p className="text-xs text-zinc-400">
                Accept contracts, follow green city waypoints, and earn cash toward cars &amp; real estate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeJob !== 'none' && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-600/50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Active Contract: {JOB_CATALOG.find((j) => j.id === activeJob)?.title}
              </div>
              <div className="text-xs text-zinc-200 mt-0.5">{jobStepLabel}</div>
            </div>
            <button
              onClick={onCancelJob}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 cursor-pointer"
            >
              End Shift
            </button>
          </div>
        )}

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto">
          {JOB_CATALOG.map((job) => {
            const isActive = activeJob === job.id;
            return (
              <div
                key={job.id}
                className={`p-4 rounded-xl border space-y-2.5 ${
                  isActive ? 'bg-amber-500/10 border-amber-500' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {JOB_ICONS[job.id]}
                    <div>
                      <h3 className="font-display font-bold text-base text-zinc-100">{job.title}</h3>
                      <span className="text-[11px] font-mono-num text-emerald-400">{job.payRange} / run</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{job.description}</p>
                <button
                  onClick={() => {
                    onStartJob(job.id);
                    onClose();
                  }}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  {isActive ? 'Reset Active Waypoint' : 'Start Shift & Dispatch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
