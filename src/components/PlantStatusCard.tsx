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

    const isStorageHigh = pitStoragePercentage > 100;
    const isStorageWarning = pitStoragePercentage > 80 && pitStoragePercentage <= 100;
    const isStorageMedium = pitStoragePercentage > 60 && pitStoragePercentage <= 80;

    const getStatusColor = () => {
        if (isStorageHigh) return 'red';
        if (isStorageWarning) return 'orange';
        if (isStorageMedium) return 'yellow';
        return 'green';
    };

    const statusColor = getStatusColor();

    const gradientClasses = {
        red: 'from-red-500 to-red-600',
        orange: 'from-orange-500 to-orange-600',
        yellow: 'from-yellow-500 to-yellow-600',
        green: 'from-green-500 to-green-600',
    };

    const textClasses = {
        red: 'text-red-700',
        orange: 'text-orange-700',
        yellow: 'text-yellow-700',
        green: 'text-green-700',
    };

    return (
        <Card className={`relative transition-all duration-200 hover:shadow-lg border-l-4 ${config.bg} ${config.border} dark:bg-card dark:border-border`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className={`text-lg font-bold flex items-center gap-3 ${config.text}`}>
                        <div className={`p-2 rounded-xl ${config.iconBg} ${config.color} shadow-sm`}>
                            <Flame className="h-6 w-6" fill="currentColor" />
                        </div>
                        {plantName}
                    </CardTitle>
                    {isStorageHigh && (
                        <div className="flex items-center gap-1 text-red-600 animate-pulse">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">超量</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/80 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs">進廠量</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                            {totalIntake.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">噸</span>
                        </p>
                    </div>
                    <div className="bg-background/80 rounded-lg p-3 shadow-sm">
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
                                className="h-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 animate-pulse"
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
