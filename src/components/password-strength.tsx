"use client";

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type PasswordStrengthProps = {
  password?: string;
};

const PasswordStrength = ({ password = '' }: PasswordStrengthProps) => {
  const [strength, setStrength] = useState({ value: 0, label: 'Weak', color: 'bg-destructive' });

  useEffect(() => {
    let score = 0;
    if (password.length > 7) score++;
    if (password.length > 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
      case 2:
        setStrength({ value: (score / 5) * 100, label: 'Weak', color: 'bg-red-500' });
        break;
      case 3:
        setStrength({ value: (score / 5) * 100, label: 'Medium', color: 'bg-yellow-500' });
        break;
      case 4:
      case 5:
        setStrength({ value: (score / 5) * 100, label: 'Strong', color: 'bg-green-500' });
        break;
      default:
        setStrength({ value: 0, label: 'Weak', color: 'bg-red-500' });
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <Progress value={strength.value} className="h-2" indicatorClassName={strength.color} />
      <p className={cn("text-xs", 
        strength.label === 'Weak' && 'text-red-500',
        strength.label === 'Medium' && 'text-yellow-500',
        strength.label === 'Strong' && 'text-green-500'
      )}>
        Password strength: {strength.label}
      </p>
    </div>
  );
};

export default PasswordStrength;
