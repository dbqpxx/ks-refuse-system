import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { PlantSummary, PlantName } from "@/types"

interface AlertHubProps {
    plants: PlantSummary[]
}

const PLANT_ORDER: PlantName[] = ['中區廠', '南區廠', '仁武廠', '岡山廠'];

export default function AlertHub({ plants }: AlertHubProps) {
    if (plants.length === 0) return null

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {PLANT_ORDER.map(name => {
                const plant = plants.find(p => p.plantName === name);
                const pct = plant?.pitStoragePercentage || 0;
                const isAlert = pct > 100;

                return (
                    <div
                        key={name}
                        className={`
                            relative overflow-hidden rounded-lg border px-3 py-2 transition-all duration-300
                            ${isAlert
                                ? 'bg-red-600 border-red-700 text-white shadow-md animate-pulse-slow'
                                : 'bg-muted/30 border-border text-muted-foreground opacity-60'}
                        `}
                    >
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${isAlert ? 'text-white/80' : 'text-muted-foreground'}`}>
                                    {name}
                                </span>
                                {isAlert ? (
                                    <AlertTriangle className="h-3 w-3 text-white" />
                                ) : (
                                    <CheckCircle2 className="h-3 w-3 text-muted-foreground/30" />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-base font-black ${isAlert ? 'text-white' : 'text-foreground'}`}>
                                    {pct.toFixed(0)}%
                                </span>
                                <span className="text-[9px] opacity-80">
                                    {isAlert ? '飽和' : '正常'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}
