import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon?: LucideIcon;
    description?: string;
    trend?: {
        value: number | null;
        isPositive?: boolean;
    };
    variant?: 'default' | 'blue' | 'red' | 'green' | 'yellow';
}

const variantStyles = {
    default: 'bg-card',
    blue: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50',
    red: 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200/50',
    green: 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50',
    yellow: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200/50',
};

const iconVariantStyles = {
    default: 'text-muted-foreground',
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
};

export default function MetricCard({
    title,
    value,
    unit,
    icon: Icon,
    description,
    trend,
    variant = 'default',
}: MetricCardProps) {
    const renderTrend = () => {
        if (!trend || trend.value === null) return null;

        const isPositive = trend.isPositive ?? trend.value >= 0;
        const absValue = Math.abs(trend.value);

        if (absValue < 0.1) {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    持平
                </span>
            );
        }

        return (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                ) : (
                    <TrendingDown className="h-3 w-3" />
                )}
                {absValue.toFixed(1)}%
            </span>
        );
    };

    return (
        <Card className={`transition-all duration-200 hover:shadow-md ${variantStyles[variant]}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && (
                    <div className={`p-2 rounded-lg bg-background/50 ${iconVariantStyles[variant]}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {value}
                    </span>
                    {unit && (
                        <span className="text-sm font-medium text-muted-foreground">
                            {unit}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between mt-2">
                    {description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[60%]">
                            {description}
                        </p>
                    )}
                    {renderTrend()}
                </div>
            </CardContent>
        </Card>
    );
}
