import { useState } from 'react';
import type { PlantSummary, PlantName } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Info } from 'lucide-react';

interface PlantMapProps {
    plants: PlantSummary[];
}

// Normalized coordinates for Kaohsiung plants (Approximate)
const PLANT_COORDINATES: Record<PlantName, { x: number, y: number }> = {
    '岡山廠': { x: 35, y: 35 },
    '仁武廠': { x: 55, y: 65 },
    '中區廠': { x: 45, y: 75 },
    '南區廠': { x: 50, y: 85 },
};

const PLANT_COLORS: Record<PlantName, string> = {
    '岡山廠': 'fill-indigo-500',
    '仁武廠': 'fill-green-500',
    '中區廠': 'fill-blue-500',
    '南區廠': 'fill-red-500',
};

export default function PlantMap({ plants }: PlantMapProps) {
    const [hoveredPlant, setHoveredPlant] = useState<PlantSummary | null>(null);

    return (
        <Card className="h-full overflow-hidden border-none shadow-none bg-transparent flex flex-col">
            <CardHeader className="pb-2 px-0 shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    高屏區域廠分佈與壓力
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 relative p-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[280px]">
                <svg viewBox="0 0 100 120" className="w-full h-full max-h-[300px] drop-shadow-sm">
                    {/* Simplified Kaohsiung Path (Symbolic) */}
                    <path
                        d="M20,20 Q40,10 60,30 T80,60 T60,110 T30,100 T15,60 Z"
                        className="fill-slate-200/50 dark:fill-slate-800/50 stroke-slate-300 dark:stroke-slate-700 stroke-[0.5]"
                    />

                    {/* Plants Points */}
                    {plants.map((plant) => {
                        const coord = PLANT_COORDINATES[plant.plantName];
                        const isHigh = plant.pitStoragePercentage > 110;
                        const isWarning = plant.pitStoragePercentage > 85;

                        let pulseClass = "";
                        if (isHigh) pulseClass = "animate-ping";
                        else if (isWarning) pulseClass = "animate-pulse";

                        return (
                            <g
                                key={plant.plantName}
                                transform={`translate(${coord.x}, ${coord.y})`}
                                onMouseEnter={() => setHoveredPlant(plant)}
                                onMouseLeave={() => setHoveredPlant(null)}
                                className="cursor-pointer"
                            >
                                {/* Pulse Effect */}
                                {(isHigh || isWarning) && (
                                    <circle
                                        r={isHigh ? 6 : 4}
                                        className={`${isHigh ? 'fill-red-500' : 'fill-orange-500'} opacity-30 ${pulseClass}`}
                                    />
                                )}
                                {/* Main Point */}
                                <circle
                                    r={2.5}
                                    className={`${PLANT_COLORS[plant.plantName]} stroke-white dark:stroke-slate-900 stroke-[0.5] shadow-lg`}
                                />
                                {/* Label */}
                                <text
                                    y={-5}
                                    textAnchor="middle"
                                    className="text-[3px] font-bold fill-slate-700 dark:fill-slate-300 pointer-events-none"
                                >
                                    {plant.plantName}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Custom Tooltip */}
                {hoveredPlant && (
                    <div
                        className="absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg shadow-xl z-50 pointer-events-none"
                        style={{
                            left: `${PLANT_COORDINATES[hoveredPlant.plantName].x}%`,
                            top: `${PLANT_COORDINATES[hoveredPlant.plantName].y}%`,
                            transform: 'translate(-50%, -110%)',
                            minWidth: '120px'
                        }}
                    >
                        <p className="font-bold text-xs">{hoveredPlant.plantName}</p>
                        <p className="text-[10px] text-muted-foreground">
                            貯坑佔比: <span className={hoveredPlant.pitStoragePercentage > 85 ? 'text-orange-500 font-bold' : ''}>
                                {hoveredPlant.pitStoragePercentage.toFixed(1)}%
                            </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">進廠量: {hoveredPlant.totalIntake} 噸</p>
                        <p className="text-[10px] text-muted-foreground">焚化量: {hoveredPlant.incinerationAmount} 噸</p>
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                        <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-tighter">超限壓力</span>
                    </div>
                </div>

                <div className="absolute top-2 right-2">
                    <Info className="h-3 w-3 text-slate-300" />
                </div>
            </CardContent>
        </Card>
    );
}
