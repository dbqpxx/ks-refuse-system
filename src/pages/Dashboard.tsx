import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Gauge, Factory, Calendar, RefreshCw, Wrench, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MetricCard from '@/components/MetricCard';
import PitStorageChart from '@/components/PitStorageChart';
import PlantStatusCard from '@/components/PlantStatusCard';
import TrendChart from '@/components/TrendChart';
import AlertHub from '@/components/AlertHub';
import PlantMap from '@/components/PlantMap';
import { apiService } from '@/services/api';
import { PLANTS, type DailySummary, type DowntimeRecord } from '@/types';

export default function DashboardPage() {
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [trendData, setTrendData] = useState<{ date: string; summary: DailySummary }[]>([]);
    const [allTrendData, setAllTrendData] = useState<{ date: string; summary: DailySummary }[]>([]); // Full history for prediction
    // Updated Trend Interface for 7-Day Average Comparison
    const [weeklyTrend, setWeeklyTrend] = useState<{
        intakeTrend: number | null;
        incinerationTrend: number | null;
        pitStorageTrend: number | null;
        ratioTrend: number | null;
        averages?: {
            avgIntake: number;
            avgIncineration: number;
            avgPitStoragePct: number;
            avgRatio: number;
        };
    } | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [activeDowntimes, setActiveDowntimes] = useState<DowntimeRecord[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, [selectedDate]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const allData = await apiService.fetchPlantData();

            if (allData.length === 0) {
                setLoading(false);
                setIsInitialLoad(false);
                return;
            }

            // If initial load and no date selected, find the latest date with data
            let dateToLoad = selectedDate;
            if (isInitialLoad && !selectedDate) {
                const dates = allData.map(d => d.date).sort().reverse();
                dateToLoad = dates[0];
                setSelectedDate(dateToLoad);
                // The useEffect will trigger again, so we can return early or continue
                // To avoid multiple loads, let's just proceed with dateToLoad
            }

            const dayData = allData.filter(d => d.date === dateToLoad);

            // Calculate Daily Summary
            const totalIntake = dayData.reduce((sum, r) => sum + r.totalIntake, 0);
            const totalIncineration = dayData.reduce((sum, r) => sum + r.incinerationAmount, 0);
            const furnacesRunning = dayData.reduce((sum, r) => sum + r.furnaceCount, 0);
            const plants = dayData.map(r => {
                const plantConfig = PLANTS.find(p => p.name === r.plantName);
                return {
                    plantName: r.plantName,
                    totalIntake: r.totalIntake,
                    incinerationAmount: r.incinerationAmount,
                    pitStoragePercentage: r.pitCapacity ? (r.pitStorage / r.pitCapacity) * 100 : 0,
                    pitStorage: r.pitStorage,
                    pitCapacity: r.pitCapacity,
                    furnaceCount: r.furnaceCount,
                    maxFurnaces: plantConfig?.maxFurnaces || 4
                };
            });

            setSummary({
                date: dateToLoad,
                totalIntake,
                totalIncineration,
                furnacesRunning,
                furnacesStopped: dayData.reduce((sum, r) => {
                    const plantConfig = PLANTS.find(p => p.name === r.plantName);
                    return sum + ((plantConfig?.maxFurnaces || 4) - r.furnaceCount);
                }, 0),
                plants
            });

            // Fetch downtime records and filter for current date
            try {
                const downtimeRecords = await apiService.fetchDowntimeRecords();
                // Filter downtimes that overlap with the selected date
                const selectedDateObj = new Date(dateToLoad);
                const selectedDayStart = new Date(selectedDateObj);
                selectedDayStart.setHours(0, 0, 0, 0);
                const selectedDayEnd = new Date(selectedDateObj);
                selectedDayEnd.setHours(23, 59, 59, 999);

                const activeForDate = downtimeRecords.filter(d => {
                    const start = new Date(d.startDateTime);
                    const end = new Date(d.endDateTime);
                    // Overlaps if start <= day end AND end >= day start
                    return start <= selectedDayEnd && end >= selectedDayStart;
                });
                setActiveDowntimes(activeForDate);
            } catch (err) {
                console.error('Failed to fetch downtime records:', err);
                setActiveDowntimes([]);
            }

            // Trend Data (Last 7 days)
            const uniqueDates = [...new Set(allData.map(d => d.date))].sort().reverse().slice(0, 7).reverse();
            const trend = uniqueDates.map(date => {
                const dData = allData.filter(d => d.date === date);
                return {
                    date,
                    summary: {
                        date,
                        totalIntake: dData.reduce((sum, r) => sum + r.totalIntake, 0),
                        totalIncineration: dData.reduce((sum, r) => sum + r.incinerationAmount, 0),
                        furnacesRunning: dData.reduce((sum, r) => sum + r.furnaceCount, 0),
                        furnacesStopped: 0,
                        plants: dData.map(r => {
                            const plantConfig = PLANTS.find(p => p.name === r.plantName);
                            return {
                                plantName: r.plantName,
                                totalIntake: r.totalIntake,
                                incinerationAmount: r.incinerationAmount,
                                pitStoragePercentage: r.pitCapacity ? (r.pitStorage / r.pitCapacity) * 100 : 0,
                                pitStorage: r.pitStorage,
                                pitCapacity: r.pitCapacity,
                                furnaceCount: r.furnaceCount,
                                maxFurnaces: plantConfig?.maxFurnaces || 4
                            };
                        })
                    }
                };
            });
            setTrendData(trend);

            // ALL historical data for prediction (using all available dates)
            const allUniqueDates = [...new Set(allData.map(d => d.date))].sort();
            const allTrend = allUniqueDates.map(date => {
                const dData = allData.filter(d => d.date === date);
                return {
                    date,
                    summary: {
                        date,
                        totalIntake: dData.reduce((sum, r) => sum + r.totalIntake, 0),
                        totalIncineration: dData.reduce((sum, r) => sum + r.incinerationAmount, 0),
                        furnacesRunning: dData.reduce((sum, r) => sum + r.furnaceCount, 0),
                        furnacesStopped: 0,
                        plants: dData.map(r => {
                            const plantConfig = PLANTS.find(p => p.name === r.plantName);
                            return {
                                plantName: r.plantName,
                                totalIntake: r.totalIntake,
                                incinerationAmount: r.incinerationAmount,
                                pitStoragePercentage: r.pitCapacity ? (r.pitStorage / r.pitCapacity) * 100 : 0,
                                pitStorage: r.pitStorage,
                                pitCapacity: r.pitCapacity,
                                furnaceCount: r.furnaceCount,
                                maxFurnaces: plantConfig?.maxFurnaces || 4
                            };
                        })
                    }
                };
            });
            setAllTrendData(allTrend);

            // Day over Day Trend
            // Day over Day Trend - REMOVED in favor of Weekly Trend
            // Variables for daily trend filtered out to avoid unused variable warnings

            // Avg Pit Storage (Current)
            const currentAvgPit = plants.length > 0 ? plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / plants.length : 0;

            // Global Metrics for Layout Fill
            const totalCapacity = dayData.reduce((sum, r) => sum + (r.pitCapacity || 0), 0);
            const totalPitStorage = dayData.reduce((sum, r) => sum + (r.pitStorage || 0), 0);
            const remainingCapacity = totalCapacity - totalPitStorage;
            const intakeRatio = totalIncineration > 0 ? (totalIntake / totalIncineration) * 100 : 0;

            // 7-Day Average Calculation (Including Today)
            // Filter last 7 days including selectedDate
            // Range: [selectedDate-6, selectedDate]

            const sevenDaysAgoObj = new Date(dateToLoad);
            sevenDaysAgoObj.setDate(sevenDaysAgoObj.getDate() - 6); // Go back 6 days to include start day + 6 days = 7 days
            const sevenDaysAgoDateStr = sevenDaysAgoObj.toISOString().split('T')[0];

            // Get data for the 7 day window ending on dateToLoad
            const sevenDayData = allData.filter(d => d.date >= sevenDaysAgoDateStr && d.date <= dateToLoad);

            // Calculate Daily Totals for the 7-day window
            const uniqueSevenDayDates = [...new Set(sevenDayData.map(d => d.date))];

            // Calculate Daily Totals for each day in the window
            const dailyTotals = uniqueSevenDayDates.map(date => {
                const dayRecords = sevenDayData.filter(d => d.date === date);
                return {
                    date,
                    totalIntake: dayRecords.reduce((sum, r) => sum + r.totalIntake, 0),
                    totalIncineration: dayRecords.reduce((sum, r) => sum + r.incinerationAmount, 0),
                    // For Pit Storage, we want the average percentage across plants for that day
                    dailyAvgPitPct: dayRecords.reduce((sum, r) => sum + (r.pitCapacity ? (r.pitStorage / r.pitCapacity) * 100 : 0), 0) / (dayRecords.length || 1)
                };
            });

            // Calculate 7-Day Averages (Average of Daily Totals)
            const daysCount = dailyTotals.length || 1;
            const avgIntake = dailyTotals.reduce((sum, d) => sum + d.totalIntake, 0) / daysCount;
            const avgIncineration = dailyTotals.reduce((sum, d) => sum + d.totalIncineration, 0) / daysCount;

            const avgPitStoragePct = dailyTotals.reduce((sum, d) => sum + d.dailyAvgPitPct, 0) / daysCount;

            // Avg Ratio (Weighted Average: Total Intake / Total Incineration over 7 days)
            const total7DayIntake = sevenDayData.reduce((sum, r) => sum + r.totalIntake, 0);
            const total7DayIncineration = sevenDayData.reduce((sum, r) => sum + r.incinerationAmount, 0);
            const avgRatio = total7DayIncineration > 0 ? (total7DayIntake / total7DayIncineration) * 100 : 0;

            // Set Trends: (Today - Average) / Average
            // Set Trends: (Today - Average) / Average
            setWeeklyTrend({
                intakeTrend: avgIntake > 0 ? ((totalIntake - avgIntake) / avgIntake) * 100 : null,
                incinerationTrend: avgIncineration > 0 ? ((totalIncineration - avgIncineration) / avgIncineration) * 100 : null,
                pitStorageTrend: avgPitStoragePct > 0 ? ((currentAvgPit - avgPitStoragePct) / avgPitStoragePct) * 100 : null,
                ratioTrend: avgRatio > 0 ? ((intakeRatio - avgRatio) / avgRatio) * 100 : null,
                averages: {
                    avgIntake,
                    avgIncineration,
                    avgPitStoragePct,
                    avgRatio
                }
            });

            // Update Summary with extra global stats
            setSummary(prev => prev ? {
                ...prev,
                totalCapacity,
                remainingCapacity,
                intakeRatio
            } : null);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value);
    };

    const handleRefresh = () => {
        loadDashboardData();
    };



    // Calculate average pit storage
    const avgPitStorage = summary && summary.plants.length > 0
        ? summary.plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / summary.plants.length
        : 0;

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-muted rounded w-48" />
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-muted rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Date Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        儀表板總覽
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {new Date(selectedDate).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                        })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="w-40 text-sm"
                        />
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Alert Hub - High Level Suggestions */}
            {summary && <AlertHub plants={summary.plants} />}

            {/* Downtime / Stoppage Info Section */}
            {activeDowntimes.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-orange-600" />
                            營運趨勢 - 停機狀態
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {activeDowntimes.map(d => {
                                const numerals = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
                                const furnaceLabel = numerals[d.furnaceNumber] || d.furnaceNumber;
                                const endDate = new Date(d.endDateTime);
                                const endDateStr = endDate.toLocaleDateString('zh-TW', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                                return (
                                    <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant={d.downtimeType === '計畫歲修' ? 'secondary' : 'destructive'} className="gap-1">
                                            {d.downtimeType === '計畫歲修' ? (
                                                <Wrench className="h-3 w-3" />
                                            ) : (
                                                <AlertTriangle className="h-3 w-3" />
                                            )}
                                            {d.downtimeType}
                                        </Badge>
                                        <span className="font-medium">{d.plantName}</span>
                                        <span>{furnaceLabel}號爐</span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="text-orange-700 dark:text-orange-400">
                                            預計 {endDateStr} 上線
                                        </span>
                                        {d.notes && (
                                            <span className="text-muted-foreground text-xs">({d.notes})</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Analysis Section: Metrics + Map */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
                {/* Left: Key Metrics Matrix (3x2) */}
                <div className="lg:col-span-3">
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                        <MetricCard
                            title="總進廠量"
                            value={summary?.totalIntake.toLocaleString() || '--'}
                            unit="噸"
                            icon={TrendingUp}
                            description={`avg7: ${Math.round(weeklyTrend?.averages?.avgIntake || 0).toLocaleString()}`}
                            variant="blue"
                            trend={weeklyTrend?.intakeTrend !== null ? {
                                value: weeklyTrend?.intakeTrend ?? null,
                                isGood: (weeklyTrend?.intakeTrend ?? 0) <= 0
                            } : undefined}
                        />
                        <MetricCard
                            title="總焚化量"
                            value={summary?.totalIncineration.toLocaleString() || '--'}
                            unit="噸"
                            icon={Flame}
                            description={`avg7: ${Math.round(weeklyTrend?.averages?.avgIncineration || 0).toLocaleString()}`}
                            variant="red"
                            trend={weeklyTrend?.incinerationTrend !== null ? {
                                value: weeklyTrend?.incinerationTrend ?? null,
                                isGood: (weeklyTrend?.incinerationTrend ?? 0) >= 0
                            } : undefined}
                        />
                        <MetricCard
                            title="進焚比"
                            value={(summary as any)?.intakeRatio?.toFixed(1) || '--'}
                            unit="%"
                            icon={Gauge}
                            description={`avg7: ${(weeklyTrend?.averages?.avgRatio || 0).toFixed(1)}%`}
                            variant={(summary as any)?.intakeRatio > 100 ? 'red' : 'green'}
                            trend={weeklyTrend?.ratioTrend !== null ? {
                                value: weeklyTrend?.ratioTrend ?? null,
                                isGood: (weeklyTrend?.ratioTrend ?? 0) <= 0
                            } : undefined}
                        />
                        <MetricCard
                            title="平均貯坑容量佔比"
                            value={avgPitStorage.toFixed(1)}
                            unit="%"
                            icon={Gauge}
                            description={`avg7: ${(weeklyTrend?.averages?.avgPitStoragePct || 0).toFixed(1)}%`}
                            variant={avgPitStorage > 80 ? 'red' : avgPitStorage > 60 ? 'yellow' : 'green'}
                            trend={weeklyTrend?.pitStorageTrend !== null ? {
                                value: weeklyTrend?.pitStorageTrend ?? null,
                                isGood: (weeklyTrend?.pitStorageTrend ?? 0) <= 0
                            } : undefined}
                        />
                        <MetricCard
                            title="總剩餘容量"
                            value={(summary as any)?.remainingCapacity?.toLocaleString() || '--'}
                            unit="噸"
                            headerContent={
                                <div className="flex flex-col items-end gap-0.5">
                                    {summary?.plants.map(p => {
                                        const remaining = (p.pitCapacity || 0) - (p.pitStorage || 0);
                                        // Red = storage exceeds capacity (>100%), Green = has remaining capacity
                                        const isOverCapacity = (p.pitStorage || 0) > (p.pitCapacity || 0);
                                        const firstChar = p.plantName?.charAt(0) || '?';
                                        return (
                                            <div key={p.plantName} className="flex items-center gap-0.5" title={`${p.plantName}: ${remaining.toLocaleString()}噸`}>
                                                <span className="text-[10px] text-muted-foreground">{firstChar}</span>
                                                <span className={`w-2 h-2 rounded-full ${isOverCapacity ? 'bg-red-500' : 'bg-green-500'}`} />
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                            description="各廠剩餘量"
                            variant={(summary as any)?.remainingCapacity > 0 ? 'green' : 'red'}
                            trend={undefined} // No trend for this card
                        />
                        <MetricCard
                            title="運轉爐數"
                            value={summary?.furnacesRunning.toLocaleString() || 0}
                            unit="座"
                            icon={Factory}
                            description={`${summary?.plants.length || 0} 廠營運中`}
                            variant="default"
                        />
                    </div>
                </div>

                {/* Right: Geographic Insights - Height Matched to 2 rows of metrics */}
                <div className="lg:col-span-1 bg-white dark:bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col justify-center min-h-[320px]">
                    {summary && <PlantMap plants={summary.plants} />}
                </div>
            </div>

            {/* Trend Chart - Full Width */}
            {trendData.length > 1 && (
                <TrendChart data={trendData} allHistoricalData={allTrendData} activeDowntimes={activeDowntimes} />
            )}

            {/* Pit Storage Overview */}
            {summary && summary.plants.length > 0 && (
                <PitStorageChart plants={summary.plants} />
            )}

            {/* Plant Status Cards */}
            {summary && summary.plants.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Factory className="h-5 w-5" />
                        各廠營運狀態
                    </h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {summary.plants.map((plant) => (
                            <PlantStatusCard key={plant.plantName} plant={plant} />
                        ))}
                    </div>
                </div>
            )}

            {/* No Data Message */}
            {(!summary || summary.plants.length === 0) && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                    <Factory className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">尚無當日資料</h3>
                    <p className="text-muted-foreground mb-4">
                        請前往「數據輸入」頁面新增營運資料
                    </p>

                </div>
            )}
        </div>
    );
}
