import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, TrendingUp, AlertTriangle } from 'lucide-react';
import type { PlantSummary, PlantName } from '@/types';

interface PlantStatusCardProps {
    plant: PlantSummary;
}

const plantColorConfig: Record<PlantName, { color: string; bg: string; border: string; text: string; iconBg: string }> = {
    '中區廠': {
        color: 'text-blue-600',
        bg: 'bg-blue-50/50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        iconBg: 'bg-blue-100',
    },
    '南區廠': {
        color: 'text-red-600',
        bg: 'bg-red-50/50',
        border: 'border-red-200',
        text: 'text-red-700',
        iconBg: 'bg-red-100',
    },
    '仁武廠': {
        color: 'text-green-600',
        bg: 'bg-green-50/50',
        border: 'border-green-200',
        text: 'text-green-700',
        iconBg: 'bg-green-100',
    },
    '岡山廠': {
        color: 'text-indigo-600',
        bg: 'bg-indigo-50/50',
        border: 'border-indigo-200',
        text: 'text-indigo-700',
        iconBg: 'bg-indigo-100',
    },
};

export default function PlantStatusCard({ plant }: PlantStatusCardProps) {
    const { plantName, totalIntake, incinerationAmount, pitStoragePercentage, pitStorage, pitCapacity, furnaceCount, maxFurnaces } = plant;

    const config = plantColorConfig[plantName];

    const isStorageHigh = pitStoragePercentage > 110;

    const getStatusColor = () => {
        if (pitStoragePercentage > 110) return 'purple';
        if (pitStoragePercentage > 100) return 'red';
        if (pitStoragePercentage > 90) return 'orange';
        if (pitStoragePercentage > 80) return 'yellow';
        return 'green';
    };

    const statusColor = getStatusColor();

    // Calculate Days to Full (DToF)
    // Formula: (Capacity - Current Storage) / (Daily Intake - Daily Incineration)
    const dailyNetChange = totalIntake - incinerationAmount;
    const remainingCapacity = pitCapacity - pitStorage;
    const dtof = dailyNetChange > 0 ? Math.floor(remainingCapacity / dailyNetChange) : null;

    const getDtofColor = (days: number) => {
        if (days <= 2) return 'text-red-600 font-black animate-pulse';
        if (days <= 5) return 'text-orange-600 font-bold';
        return 'text-green-600';
    };

    // Efficiency Index: Incineration per Furnace
    const efficiencyIndex = furnaceCount > 0 ? (incinerationAmount / furnaceCount).toFixed(0) : null;

    const gradientClasses = {
        red: 'from-red-500 to-red-600',
        orange: 'from-orange-500 to-orange-600',
        yellow: 'from-yellow-500 to-yellow-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
    };

    const textClasses = {
        red: 'text-red-700',
        orange: 'text-orange-700',
        yellow: 'text-yellow-700',
        green: 'text-green-700',
        purple: 'text-purple-700',
    };

    return (
        <Card className={`relative transition-all duration-200 hover:shadow-lg border-l-4 ${config.bg} ${config.border} dark:bg-card dark:border-border ${isStorageHigh ? 'animate-glow-red ring-2 ring-red-500/50' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <CardTitle className={`text-lg font-bold flex items-center gap-2 ${config.text} truncate`}>
                        <div className={`p-1.5 rounded-lg ${config.iconBg} ${config.color} shadow-sm shrink-0`}>
                            <Flame className="h-5 w-5 animate-flicker" fill="currentColor" />
                        </div>
                        <span className="truncate">{plantName}</span>
                    </CardTitle>
                    {isStorageHigh && (
                        <div className="px-1 rounded-[2px] bg-red-600 text-white text-[7px] font-black animate-pulse flex items-center gap-0.5 shadow-sm shrink-0 whitespace-nowrap leading-tight">
                            <AlertTriangle className="h-2 w-2" />
                            <span>容量超限</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Decision Metric: DToF */}
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between border border-dashed border-muted-foreground/20">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">預計滿坑天數</span>
                    <span className={`text-sm ${dtof !== null ? getDtofColor(dtof) : 'text-muted-foreground'}`}>
                        {dtof !== null ? `${dtof} 天` : '穩定 (負增長)'}
                    </span>
                </div>

                {/* Performance Insight: Efficiency */}
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between border border-dashed border-muted-foreground/20">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">單爐平均效能</span>
                    <span className="text-xs font-semibold text-primary">
                        {efficiencyIndex ? `${efficiencyIndex} 噸/爐` : '--'}
                    </span>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/80 rounded-lg p-3 shadow-sm border border-border/50">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs">進廠量</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                            {totalIntake.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">噸</span>
                        </p>
                    </div>
                    <div className="bg-background/80 rounded-lg p-3 shadow-sm border border-border/50">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Flame className="h-3 w-3" />
                            <span className="text-xs">焚化量</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                            {incinerationAmount.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">噸</span>
                        </p>
                    </div>
                </div>

                {/* Detailed Intake Info */}
                <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-[10px] sm:text-xs">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-muted-foreground">平台預約</span>
                        <span className="font-semibold">{plant.platformReserved?.toLocaleString() || '--'} 噸</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-muted-foreground">事業進廠</span>
                        <span className="font-semibold">{plant.actualIntake?.toLocaleString() || '--'} 噸</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-muted-foreground">家戶垃圾</span>
                        <span className="font-semibold">
                            {plant.actualIntake !== undefined ? (totalIntake - plant.actualIntake).toLocaleString() : '--'} 噸
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">貯坑佔比</span>
                        <span className={`text-sm font-bold ${textClasses[statusColor]}`}>
                            {pitStoragePercentage.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-3 rounded-full bg-gradient-to-r ${gradientClasses[statusColor]} transition-all duration-500 ease-out`}
                            style={{ width: `${Math.min(pitStoragePercentage, 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>存量: {pitStorage.toLocaleString()} 噸</span>
                        <span>容量: {pitCapacity.toLocaleString()} 噸</span>
                    </div>
                    {pitStoragePercentage > 100 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                                className={`h-1.5 rounded-full bg-gradient-to-r ${gradientClasses[statusColor as keyof typeof gradientClasses]} animate-pulse`}
                                style={{ width: `${Math.min(pitStoragePercentage - 100, 50)}%` }}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">運轉爐數</span>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: furnaceCount }).map((_, i) => (
                            <div
                                key={i}
                                className="w-2.5 h-5 rounded-sm bg-gradient-to-t from-orange-500 to-yellow-400 shadow-sm"
                            />
                        ))}
                        {Array.from({ length: Math.max(0, maxFurnaces - furnaceCount) }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="w-2.5 h-5 rounded-sm bg-gray-200 dark:bg-gray-600"
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
