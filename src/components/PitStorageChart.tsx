import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlantSummary } from '@/types';

interface PitStorageChartProps {
    plants: PlantSummary[];
}

export default function PitStorageChart({ plants }: PitStorageChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>各廠貯坑佔比</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {plants.map((plant) => {
                    const percentage = plant.pitStoragePercentage;
                    const isHigh = percentage > 80;
                    const isMedium = percentage > 60 && percentage <= 80;

                    return (
                        <div key={plant.plantName} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{plant.plantName}</span>
                                <span className={`font-semibold ${isHigh ? 'text-red-600' : isMedium ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                    {percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-300 ${isHigh ? 'bg-red-600' : isMedium ? 'bg-yellow-500' : 'bg-green-600'
                                        }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
                {plants.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        暫無資料
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
