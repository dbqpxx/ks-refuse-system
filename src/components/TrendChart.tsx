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
}

export default function TrendChart({ data }: TrendChartProps) {
    // Transform data for the chart
    const chartData = data.map(item => ({
        date: item.date,
        displayDate: formatDate(item.date),
        進廠量: item.summary.totalIntake,
        焚化量: item.summary.totalIncineration,
        平均貯坑: item.summary.plants.length > 0
            ? item.summary.plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / item.summary.plants.length
            : 0,
    }));

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
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    📈 營運趨勢
                    <span className="text-sm font-normal text-muted-foreground">
                        (最近 {chartData.length} 天)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                {/* Intake & Incineration Chart */}
                <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                                formatter={(value: number | undefined) => [value !== undefined ? `${value.toFixed(0)} 噸` : '--']}
                                labelFormatter={(label) => `日期: ${label}`}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="進廠量"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#colorIntake)"
                                dot={{ r: 3, fill: '#3b82f6' }}
                                activeDot={{ r: 5 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="焚化量"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fill="url(#colorIncineration)"
                                dot={{ r: 3, fill: '#ef4444' }}
                                activeDot={{ r: 5 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pit Storage Percentage Chart */}
                <div className="h-48 sm:h-56 w-full mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2 px-4 sm:px-0">
                        📊 平均貯坑佔比趨勢
                    </p>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 150]}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                                formatter={(value: number | undefined) => [value !== undefined ? `${value.toFixed(1)}%` : '--', '平均貯坑佔比']}
                            />
                            {/* Reference lines for threshold */}
                            <Line
                                type="monotone"
                                dataKey="平均貯坑"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#f59e0b' }}
                                activeDot={{ r: 5 }}
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
