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

        // Weighted Linear Regression - Recent data has higher weight
        // Using exponential decay: weight = decay^(n-1-i), where decay = 0.95
        const predict = (points: number[], steps: number) => {
            const n = points.length;
            const decay = 0.95; // Recent data weight decay factor

            let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWXX = 0;
            for (let i = 0; i < n; i++) {
                // Higher weight for more recent data
                const weight = Math.pow(decay, n - 1 - i);
                sumW += weight;
                sumWX += weight * i;
                sumWY += weight * points[i];
                sumWXY += weight * i * points[i];
                sumWXX += weight * i * i;
            }

            const denominator = sumW * sumWXX - sumWX * sumWX;
            if (denominator === 0) return sumWY / sumW; // Fallback to weighted average

            const slope = (sumW * sumWXY - sumWX * sumWY) / denominator;
            const intercept = (sumWY - slope * sumWX) / sumW;
            return Math.max(0, slope * (n - 1 + steps) + intercept);
        };

        for (let i = 1; i <= 3; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            const dateStr = nextDate.toISOString().split('T')[0];

            next3Days.push({
                date: dateStr,
                displayDate: formatDate(dateStr) + ' (預測)',
                進廠量_預測: predict(allIntakePoints, i),
                焚化量_預測: predict(allIncinerationPoints, i),
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
