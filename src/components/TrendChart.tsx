import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import type { DailySummary } from '@/types';

interface TrendChartProps {
    data: { date: string; summary: DailySummary }[];
    allHistoricalData?: { date: string; summary: DailySummary }[]; // Full data for prediction
}

export default function TrendChart({ data, allHistoricalData }: TrendChartProps) {
    // Use allHistoricalData for prediction if available, otherwise use data
    const predictionSource = allHistoricalData || data;

    // Transform data for display (recent days only)
    const historicalData = data.map(item => ({
        date: item.date,
        displayDate: formatDate(item.date),
        進廠量: item.summary.totalIntake,
        焚化量: item.summary.totalIncineration,
        平均貯坑: item.summary.plants.length > 0
            ? item.summary.plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / item.summary.plants.length
            : 0,
        isPrediction: false
    }));

    // Use ALL historical data for prediction calculation
    const allIntakePoints = predictionSource.map(item => item.summary.totalIntake);
    const allIncinerationPoints = predictionSource.map(item => item.summary.totalIncineration);
    const allPitPoints = predictionSource.map(item =>
        item.summary.plants.length > 0
            ? item.summary.plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / item.summary.plants.length
            : 0
    );

    // Calculate predictions for next 3 days using ALL historical data
    const next3Days: any[] = [];
    if (allIntakePoints.length >= 2 && historicalData.length > 0) {
        const lastDate = new Date(historicalData[historicalData.length - 1].date);

        // Helper: Get available furnaces based on maintenance schedule
        const getAvailableFurnaces = (date: Date): number => {
            const month = date.getMonth() + 1; // 1-12
            const day = date.getDate();

            // Full operation periods (12 furnaces)
            if ((month === 1 && day >= 15) || (month === 2 && day <= 15)) return 12;
            if ((month === 5 && day >= 15) || (month >= 6 && month <= 9) || (month === 10 && day <= 15)) return 12;

            // Plant-wide maintenance (9 furnaces, -3 per plant)
            if (month === 10 && day >= 15 && day <= 31) return 9; // Plant 1
            if (month === 11 && day >= 1 && day <= 15) return 9;  // Plant 2
            if (month === 3 && day >= 15 && day <= 31) return 9;  // Plant 3
            if (month === 4 && day >= 1 && day <= 15) return 9;   // Plant 4

            // Rolling single-furnace maintenance (11 furnaces, -1)
            // All other periods have continuous single-furnace maintenance
            return 11;
        };

        // Capacity-based incineration prediction
        const predictIncineration = (incinerationPoints: number[], steps: number): number => {
            const n = incinerationPoints.length;
            if (n < 7) return incinerationPoints[n - 1] || 0; // Fallback

            // Calculate per-furnace capacity from recent 7 days
            const recent7Days = incinerationPoints.slice(-7);
            const recent7DaysTotal = recent7Days.reduce((a, b) => a + b, 0);

            // Get furnace counts from recent 7 days (from historical data)
            const recent7DaysData = predictionSource.slice(-7);
            const avgRecentFurnaces = recent7DaysData.reduce((sum, item) =>
                sum + (item.summary.furnacesRunning || 12), 0) / 7;

            // Per-furnace daily capacity
            const perFurnaceCapacity = avgRecentFurnaces > 0
                ? recent7DaysTotal / avgRecentFurnaces / 7
                : recent7DaysTotal / 12 / 7; // Fallback to 12 furnaces

            // Calculate available furnaces for target date
            const targetDate = new Date(lastDate);
            targetDate.setDate(lastDate.getDate() + steps);
            const availableFurnaces = getAvailableFurnaces(targetDate);

            // Prediction = available furnaces × per-furnace capacity
            return Math.max(0, availableFurnaces * perFurnaceCapacity);
        };

        // Day-of-Week Aware Prediction with Trend Adjustment
        // Groups historical data by weekday and applies recent trend
        const predict = (points: number[], steps: number) => {
            const n = points.length;
            if (n < 7) return points[n - 1]; // Fallback: use last value if insufficient data

            // Determine target date and its weekday
            const targetDate = new Date(lastDate);
            targetDate.setDate(lastDate.getDate() + steps);
            const targetWeekday = targetDate.getDay(); // 0=Sunday, 6=Saturday

            // Group historical data by weekday
            const weekdayData: { [key: number]: number[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
            for (let i = 0; i < n; i++) {
                const histDate = new Date(lastDate);
                histDate.setDate(lastDate.getDate() - (n - 1 - i));
                const weekday = histDate.getDay();
                weekdayData[weekday].push(points[i]);
            }

            // Calculate weighted baseline for target weekday
            // Recent occurrences have higher weight (decay = 0.9 per week)
            const targetDayPoints = weekdayData[targetWeekday];
            if (targetDayPoints.length === 0) {
                // Fallback: use overall weighted average if no same-weekday data
                const decay = 0.95;
                let sumW = 0, sumWY = 0;
                for (let i = 0; i < n; i++) {
                    const weight = Math.pow(decay, n - 1 - i);
                    sumW += weight;
                    sumWY += weight * points[i];
                }
                return sumWY / sumW;
            }

            const weeklyDecay = 0.9; // Decay per occurrence (weekly)
            let sumW = 0, sumWY = 0;
            for (let i = 0; i < targetDayPoints.length; i++) {
                const weight = Math.pow(weeklyDecay, targetDayPoints.length - 1 - i);
                sumW += weight;
                sumWY += weight * targetDayPoints[i];
            }
            const baseline = sumWY / sumW;

            // Calculate trend factor using SAME WEEKDAY comparison
            // Compare recent same-weekday performance vs baseline
            const recentSameWeekdays = targetDayPoints.slice(-3);
            const recentSameAvg = recentSameWeekdays.length > 0
                ? recentSameWeekdays.reduce((a, b) => a + b, 0) / recentSameWeekdays.length
                : baseline;
            const trendFactor = baseline > 0 ? recentSameAvg / baseline : 1.0;

            // Safety cap: limit to ±30% deviation
            const cappedTrend = Math.max(0.7, Math.min(1.3, trendFactor));

            return Math.max(0, baseline * cappedTrend);
        };

        for (let i = 1; i <= 3; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            const dateStr = nextDate.toISOString().split('T')[0];

            next3Days.push({
                date: dateStr,
                displayDate: formatDate(dateStr) + ' (預測)',
                進廠量_預測: predict(allIntakePoints, i),
                焚化量_預測: predictIncineration(allIncinerationPoints, i),
                平均貯坑_預測: predict(allPitPoints, i),
                isPrediction: true
            });
        }

        // To connect the lines, the last historical point needs the first prediction value
        const lastHistorical = historicalData[historicalData.length - 1] as any;
        lastHistorical.進廠量_預測 = lastHistorical.進廠量;
        lastHistorical.焚化量_預測 = lastHistorical.焚化量;
        lastHistorical.平均貯坑_預測 = lastHistorical.平均貯坑;
    }

    const chartData = [...historicalData, ...next3Days];

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">歷史趨勢</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                        暫無歷史資料
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-sm transition-all duration-300">
            <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="text-lg flex items-center gap-2">
                    📈 營運趨勢
                    <span className="text-sm font-normal text-muted-foreground ml-auto sm:ml-0">
                        (最近 {chartData.length} 天)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 pb-4 sm:pb-6">
                {/* Intake & Incineration Chart */}
                <div className="h-64 sm:h-72 w-full px-2 sm:px-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIntake" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorIncineration" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-50" vertical={false} />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                width={35}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                                formatter={(value: number | undefined) => [value !== undefined ? `${value.toFixed(0)} 噸` : '--']}
                                labelFormatter={(label) => `日期: ${label}`}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                iconType="circle"
                            />
                            <Area
                                type="monotone"
                                dataKey="進廠量"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#colorIntake)"
                                dot={{ r: 2, fill: '#3b82f6' }}
                                activeDot={{ r: 4 }}
                                animationDuration={1000}
                            />
                            <Area
                                type="monotone"
                                dataKey="焚化量"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fill="url(#colorIncineration)"
                                dot={{ r: 2, fill: '#ef4444' }}
                                activeDot={{ r: 4 }}
                                animationDuration={1000}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                dataKey="進廠量_預測"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                                name="進廠量 (預測)"
                            />
                            <Line
                                type="monotone"
                                dataKey="焚化量_預測"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                                name="焚化量 (預測)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pit Storage Percentage Chart */}
                <div className="h-48 sm:h-56 w-full mt-6 border-t pt-4 px-2 sm:px-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 px-2 sm:px-0 flex items-center gap-1">
                        <span className="w-1 h-3 bg-amber-500 rounded-full" />
                        平均貯坑佔比趨勢 (%)
                    </p>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-50" vertical={false} />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 150]}
                                tickFormatter={(value) => `${value}%`}
                                width={35}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                                formatter={(value: number | undefined) => [value !== undefined ? `${value.toFixed(1)}%` : '--', '平均貯坑佔比']}
                                labelFormatter={(label) => `日期: ${label}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="平均貯坑"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 2, fill: '#f59e0b' }}
                                activeDot={{ r: 4 }}
                                animationDuration={1000}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                dataKey="平均貯坑_預測"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                                name="平均貯坑 (預測)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
        return dateStr;
    }
}
