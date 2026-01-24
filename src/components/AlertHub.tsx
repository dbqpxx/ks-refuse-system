import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, AlertTriangle, ArrowRightLeft } from "lucide-react"
import type { PlantSummary } from "@/types"

interface AlertHubProps {
    plants: PlantSummary[]
}

export default function AlertHub({ plants }: AlertHubProps) {
    const alerts: { type: 'warning' | 'info' | 'suggest', title: string, description: string, icon: any }[] = []

    // 1. Critical Storage Alerts
    plants.forEach(plant => {
        if (plant.pitStoragePercentage > 110) {
            alerts.push({
                type: 'warning',
                title: `${plant.plantName} 貯坑告警`,
                description: `目前佔比 ${plant.pitStoragePercentage.toFixed(1)}% 已接近飽和，建議減少進廠預約。`,
                icon: AlertTriangle
            })
        }
    })

    // 2. Diversion Suggestions
    const highPlant = plants.find(p => p.pitStoragePercentage > 85)
    const lowPlant = plants.find(p => p.pitStoragePercentage < 60)

    if (highPlant && lowPlant) {
        alerts.push({
            type: 'suggest',
            title: '調度平衡建議',
            description: `建議將部分原本進入「${highPlant.plantName}」的車輛引流至「${lowPlant.plantName}」以平衡貯坑壓力。`,
            icon: ArrowRightLeft
        })
    }

    // 3. Efficiency Check
    plants.forEach(plant => {
        if (plant.furnaceCount > 0 && plant.incinerationAmount / plant.furnaceCount < 150) {
            alerts.push({
                type: 'info',
                title: `${plant.plantName} 效能提示`,
                description: `平均單爐焚化量較低，請確認垃圾熱值或設備運轉狀況。`,
                icon: Lightbulb
            })
        }
    })

    if (alerts.length === 0) return null

    return (
        <div className="space-y-3 mb-6">
            {alerts.map((alert, index) => (
                <Alert key={index} variant={alert.type === 'warning' ? 'destructive' : 'default'} className={alert.type === 'suggest' ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                    <alert.icon className="h-4 w-4" />
                    <AlertDescription className="text-xs leading-relaxed">
                        <span className="font-bold mr-2">{alert.title}</span>
                        <span>{alert.description}</span>
                    </AlertDescription>
                </Alert>
            ))}
        </div>
    )
}
