'use client';

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'purple' | 'default';
  size?: 'sm' | 'md' | 'lg';
}

export default function MetricCard({
  label,
  value,
  subtitle,
  color = 'default',
  size = 'md',
}: MetricCardProps) {
  const colorClasses: Record<string, string> = {
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-info',
    primary: 'text-primary',
    purple: 'text-purple',
    default: '',
  };

  const borderClasses: Record<string, string> = {
    success: 'success',
    danger: 'danger',
    warning: 'warning',
    info: 'info',
    primary: 'primary',
    purple: 'primary',
    default: '',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  // Backwards compatibility
  const colorMap: Record<string, string> = {
    green: 'success',
    red: 'danger',
    orange: 'warning',
    cyan: 'info',
  };

  const mappedColor = colorMap[color] || color;

  return (
    <div className={`metric-card ${borderClasses[mappedColor] || ''}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${sizeClasses[size]} ${colorClasses[mappedColor] || ''}`}>
        {value}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}
