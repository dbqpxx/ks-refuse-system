import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Gauge, Factory, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MetricCard from '@/components/MetricCard';
import PitStorageChart from '@/components/PitStorageChart';
import PlantStatusCard from '@/components/PlantStatusCard';
import TrendChart from '@/components/TrendChart';
import { apiService } from '@/services/api';
import { PLANTS, type DailySummary, type Plant } from '@/types';

export default function DashboardPage() {
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [trendData, setTrendData] = useState<{ date: string; summary: DailySummary }[]>([]);
    const [trend, setTrend] = useState<{
        intakeTrend: number | null;
        incinerationTrend: number | null;
        pitStorageTrend: number | null;
    } | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

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

            // Day over Day Trend
            const sortedDates = [...new Set(allData.map(d => d.date))].sort();
            const currentIndex = sortedDates.indexOf(dateToLoad);
            const prevDateStr = currentIndex > 0 ? sortedDates[currentIndex - 1] : null;

            const prevData = prevDateStr ? allData.filter(d => d.date === prevDateStr) : [];

            const prevIntake = prevData.reduce((sum, r) => sum + r.totalIntake, 0);
            const prevIncineration = prevData.reduce((sum, r) => sum + r.incinerationAmount, 0);

            // Avg Pit Storage
            const currentAvgPit = plants.length > 0 ? plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / plants.length : 0;
            const prevAvgPit = prevData.length > 0
                ? prevData.reduce((sum, r) => sum + (r.pitCapacity ? (r.pitStorage / r.pitCapacity) * 100 : 0), 0) / prevData.length
                : 0;

            setTrend({
                intakeTrend: prevIntake > 0 ? ((totalIntake - prevIntake) / prevIntake) * 100 : null,
                incinerationTrend: prevIncineration > 0 ? ((totalIncineration - prevIncineration) / prevIncineration) * 100 : null,
                pitStorageTrend: prevAvgPit > 0 ? ((currentAvgPit - prevAvgPit) / prevAvgPit) * 100 : null
            });

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

    const handleToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
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
                            className="w-40"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleToday}>
                        今日
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="總進廠量"
                    value={summary?.totalIntake.toLocaleString() || '--'}
                    unit="噸"
                    icon={TrendingUp}
                    description="當日合計"
                    variant="blue"
                    trend={trend?.intakeTrend !== null ? { value: trend?.intakeTrend ?? null } : undefined}
                />
                <MetricCard
                    title="總焚化量"
                    value={summary?.totalIncineration.toLocaleString() || '--'}
                    unit="噸"
                    icon={Flame}
                    description="當日合計"
                    variant="red"
                    trend={trend?.incinerationTrend !== null ? { value: trend?.incinerationTrend ?? null } : undefined}
                />
                <MetricCard
                    title="平均貯坑佔比"
                    value={avgPitStorage.toFixed(1)}
                    unit="%"
                    icon={Gauge}
                    description="各廠平均"
                    variant={avgPitStorage > 80 ? 'red' : avgPitStorage > 60 ? 'yellow' : 'green'}
                    trend={trend?.pitStorageTrend !== null ? {
                        value: trend?.pitStorageTrend ?? null,
                        isPositive: (trend?.pitStorageTrend ?? 0) < 0 // For pit storage, decrease is good
                    } : undefined}
                />
                <MetricCard
                    title="運轉爐數"
                    value={summary?.furnacesRunning.toLocaleString() || 0}
                    unit="座"
                    icon={Factory}
                    description={`${summary?.plants.length || 0} 廠區資料`}
                    variant="default"
                />
            </div>

            {/* Trend Chart - Full Width */}
            {trendData.length > 1 && (
                <TrendChart data={trendData} />
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
                    <Button variant="outline" onClick={handleToday}>
                        切換至今日
                    </Button>
                </div>
            )}
        </div>
    );
}
