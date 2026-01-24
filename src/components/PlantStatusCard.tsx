import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Flame, TrendingUp, AlertTriangle } from 'lucide-react';
import type { PlantSummary } from '@/types';

interface PlantStatusCardProps {
    plant: PlantSummary;
}

export default function PlantStatusCard({ plant }: PlantStatusCardProps) {
    const { plantName, totalIntake, incinerationAmount, pitStoragePercentage, furnaceCount } = plant;

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

    const bgClasses = {
        red: 'bg-red-50 border-red-200',
        orange: 'bg-orange-50 border-orange-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        green: 'bg-green-50 border-green-200',
    };

    const textClasses = {
        red: 'text-red-700',
        orange: 'text-orange-700',
        yellow: 'text-yellow-700',
        green: 'text-green-700',
    };

    return (
        <Card className={`transition-all duration-200 hover:shadow-lg ${bgClasses[statusColor]} dark:bg-card dark:border-border`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Factory className="h-4 w-4 text-muted-foreground" />
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
                    <div className="bg-background/60 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs">進廠量</span>
                        </div>
                        <p className="text-lg font-bold">
                            {totalIntake.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">噸</span>
                        </p>
                    </div>
                    <div className="bg-background/60 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Flame className="h-3 w-3" />
                            <span className="text-xs">焚化量</span>
                        </div>
                        <p className="text-lg font-bold">
                            {incinerationAmount.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground ml-1">噸</span>
                        </p>
                    </div>
                </div>

                {/* Pit Storage Progress */}
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
                    {pitStoragePercentage > 100 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 animate-pulse"
                                style={{ width: `${Math.min(pitStoragePercentage - 100, 50)}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Furnace Count */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">運轉爐數</span>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: furnaceCount }).map((_, i) => (
                            <div
                                key={i}
                                className="w-2 h-4 rounded-sm bg-gradient-to-t from-orange-500 to-yellow-400"
                            />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - furnaceCount) }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="w-2 h-4 rounded-sm bg-gray-200 dark:bg-gray-600"
                            />
                        ))}
                        <span className="text-sm font-semibold ml-2">{furnaceCount} 座</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
