
import { Info, Wrench } from 'lucide-react';

interface FeatureStatusBannerProps {
  status: 'info' | 'maintenance';
  message: string;
}

export default function FeatureStatusBanner({ status, message }: FeatureStatusBannerProps) {
  const isMaintenance = status === 'maintenance';

  const containerClasses = isMaintenance
    ? 'bg-yellow-900/50 border-yellow-700/50'
    : 'bg-blue-900/50 border-blue-700/50';

  const textClasses = isMaintenance ? 'text-yellow-200' : 'text-blue-200';
  const Icon = isMaintenance ? Wrench : Info;

  return (
    <div className={`mb-8 flex items-center gap-4 rounded-lg border p-4 ${containerClasses}`}>
      <Icon className={`h-6 w-6 ${textClasses}`} />
      <p className={`text-sm font-medium ${textClasses}`}>{message}</p>
    </div>
  );
}