import { Check } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

interface PasswordStrengthProps {
  password: string;
}

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const checks = [
    { label: 'MIN 12 CHARACTERS', test: password.length >= 12 },
    { label: 'UPPERCASE/LOWERCASE', test: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'NUMERIC VALUES', test: /\d/.test(password) },
    { label: 'SPECIAL CHARACTERS', test: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const strength = checks.filter(c => c.test).length;
  const strengthPercent = (strength / checks.length) * 100;

  return (
    <div className="space-y-3 mt-4">
      {/* Strength Bar using shadcn Progress */}
      <Progress value={strengthPercent} className="h-1" />

      {/* Checks using shadcn Badge */}
      <div className="grid grid-cols-2 gap-2">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge 
              variant={check.test ? "default" : "outline"}
              className={`
                w-4 h-4 p-0 flex items-center justify-center rounded-full
                ${check.test ? 'bg-[#00fc40] border-[#00fc40]' : 'bg-[#131313] border-[#494847]'}
              `}
            >
              {check.test && <Check size={10} className="text-[#005a10]" />}
            </Badge>
            <span className={`
              text-[10px] font-technical uppercase tracking-wider
              ${check.test ? 'text-[#9cff93]' : 'text-[#494847]'}
            `}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;