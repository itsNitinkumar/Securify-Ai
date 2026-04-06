import { Badge } from '../ui/badge';

interface StatusPulseProps {
  status: 'active' | 'ready';
  label: string;
}

const StatusPulse = ({ status, label }: StatusPulseProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Badge 
          variant="outline"
          className={`
            w-2 h-2 p-0 rounded-full border-0
            ${status === 'active' ? 'bg-[#00fc40]' : 'bg-[#9cff93]'}
          `}
        />
        <div className={`
          absolute inset-0 w-2 h-2 rounded-full pulse-ring
          ${status === 'active' ? 'bg-[#00fc40]' : 'bg-[#9cff93]'}
        `} />
      </div>
      <span className="text-[10px] font-technical uppercase tracking-wider text-[#adaaaa]">
        {label}
      </span>
    </div>
  );
};

export default StatusPulse;