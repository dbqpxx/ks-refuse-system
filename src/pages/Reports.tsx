import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    ComposedChart,
    ReferenceLine,
} from 'recharts';
import { Download, BarChart3, TableIcon, Calendar } from 'lucide-react';
import { apiService } from '@/services/api';
import { PLANTS } from '@/types';
import type { PlantData, DataFilter, RangeStatistics, PlantName } from '@/types';
import { format } from 'date-fns';

// Plant color scheme matching original
const PLANT_COLORS: Record<string, string> = {
    '中區廠': '#f97316', // Orange
    '南區廠': '#0ea5e9', // Blue
    '仁武廠': '#22c55e', // Green
    '岡山廠': '#a855f7', // Purple
};

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('table');
    const [data, setData] = useState<PlantData[]>([]);
    const [rawData, setRawData] = useState<PlantData[]>([]); // Store unfiltered data for cumulative chart
    const [statistics, setStatistics] = useState<RangeStatistics | null>(null);
    const [showFullDetails, setShowFullDetails] = useState(false);

    // Filter state - initialized with empty dates, will be set from storage
    const [filter, setFilter] = useState<DataFilter>({
        startDate: '',
        endDate: '',
        plantName: 'all',
    });

    // Initialize date range from stored data and load initial data
    useEffect(() => {
        // Initial load with default date (today) or empty
        // Since we are fetching all data from API, we can just fetch once and then apply filters
        // But to keep structure similar, let's load all data first.
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allData = await apiService.fetchPlantData();
            setRawData(allData);

            // Client-side filtering
            let filtered = allData;

            if (filter.startDate) {
                filtered = filtered.filter(d => d.date >= filter.startDate!);
            }
            if (filter.endDate) {
                filtered = filtered.filter(d => d.date <= filter.endDate!);
            }
            if (filter.plantName && filter.plantName !== 'all') {
                filtered = filtered.filter(d => d.plantName === filter.plantName);
            }

            // Sort by date
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setData(filtered);

            // Calculate Stats
            const totalIntake = filtered.reduce((sum, r) => sum + r.totalIntake, 0);
            const totalIncineration = filtered.reduce((sum, r) => sum + r.incinerationAmount, 0);
            const avgPitStorage = filtered.length > 0
                ? filtered.reduce((sum, r) => sum + (r.pitCapacity ? (r.pitStorage / r.pitCapacity) * 100 : 0), 0) / filtered.length
                : 0;

            setStatistics({
                totalIntake,
                totalIncineration,
                averagePitStorage: avgPitStorage,
                recordCount: filtered.length
            });

            // 預設日期範圍：最近 1 個月
            if (!filter.startDate && !filter.endDate) {
                const end = new Date();
                const start = new Date(end);
                start.setMonth(start.getMonth() - 1); // Default to last 1 month

                const startStr = start.toISOString().split('T')[0];
                const endStr = end.toISOString().split('T')[0];

                setFilter(prev => ({
                    ...prev,
                    startDate: startStr,
                    endDate: endStr
                }));
                // 重新過濾當前已抓取的資料
                filtered = allData.filter(d => d.date >= startStr && d.date <= endStr);
                if (filter.plantName && filter.plantName !== 'all') {
                    filtered = filtered.filter(d => d.plantName === filter.plantName);
                }
            }

        } catch (error) {
            console.error("Failed to load report data", error);
        }
    };

    const handleQuery = () => {
        loadData();
    };

    const handleExport = () => {
        const filename = `焚化廠數據_${filter.startDate}_${filter.endDate}.csv`;
        // Generate CSV content client-side
        const headers = [
            '日期', '廠區', '爐數', '總進廠量(噸)', '焚化量(噸)', '貯坑量(噸)', '貯坑容量(噸)', '貯坑佔比(%)', '平台預約', '實際進廠', '超約車次', '調整車次'
        ];
        const rows = data.map(record => [
            record.date,
            record.plantName,
            record.furnaceCount,
            record.totalIntake,
            record.incinerationAmount,
            record.pitStorage,
            record.pitCapacity,
            record.pitCapacity ? ((record.pitStorage / record.pitCapacity) * 100).toFixed(2) : 0,
            record.platformReserved ?? '',
            record.actualIntake ?? '',
            record.overReservedTrips ?? '',
            record.adjustedTrips ?? ''
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Prepare intake chart data (grouped by date, with plant breakdown)
    const intakeChartData = data.reduce((acc, record) => {
        const existingDate = acc.find(item => item.date === record.date);
        if (existingDate) {
            existingDate[record.plantName] = record.totalIntake;
            existingDate.total = (existingDate.total || 0) + record.totalIntake;
        } else {
            const newEntry: any = {
                date: record.date,
                displayDate: formatDate(record.date),
                total: record.totalIntake,
            };
            newEntry[record.plantName] = record.totalIntake;
            acc.push(newEntry);
        }
        return acc;
    }, [] as any[])
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Prepare incineration chart data
    const incinerationChartData = data.reduce((acc, record) => {
        const existingDate = acc.find(item => item.date === record.date);
        if (existingDate) {
            existingDate[record.plantName] = record.incinerationAmount;
            existingDate.total = (existingDate.total || 0) + record.incinerationAmount;
        } else {
            const newEntry: any = {
                date: record.date,
                displayDate: formatDate(record.date),
                total: record.incinerationAmount,
            };
            newEntry[record.plantName] = record.incinerationAmount;
            acc.push(newEntry);
        }
        return acc;
    }, [] as any[])
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Prepare pit storage chart data
    const pitStorageChartData = data.reduce((acc, record) => {
        const pitPercentage = record.pitCapacity > 0 ? (record.pitStorage / record.pitCapacity) * 100 : 0;
        const existingDate = acc.find(item => item.date === record.date);
        if (existingDate) {
            existingDate[record.plantName] = pitPercentage;
        } else {
            const newEntry: any = {
                date: record.date,
                displayDate: formatDate(record.date),
            };
            newEntry[record.plantName] = pitPercentage;
            acc.push(newEntry);
        }
        return acc;
    }, [] as any[])
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Prepare per-furnace incineration chart data (incineration per furnace)
    const perFurnaceChartData = data.reduce((acc, record) => {
        const perFurnace = record.furnaceCount > 0 ? record.incinerationAmount / record.furnaceCount : 0;
        const existingDate = acc.find(item => item.date === record.date);
        if (existingDate) {
            existingDate[record.plantName] = perFurnace;
        } else {
            const newEntry: any = {
                date: record.date,
                displayDate: formatDate(record.date),
            };
            newEntry[record.plantName] = perFurnace;
            acc.push(newEntry);
        }
        return acc;
    }, [] as any[])
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Prepare cumulative trend chart data
    const cumulativeChartData = (() => {
        // Determine the target year based on the filter end date or current date
        const targetYear = filter.endDate ? new Date(filter.endDate).getFullYear() : new Date().getFullYear();

        // Filter rawData for the target year
        const yearData = rawData.filter(d => new Date(d.date).getFullYear() === targetYear);

        // Group data by date first and calculate daily totals
        const dailyTotals = yearData.reduce((acc, record) => {
            const pitPercentage = record.pitCapacity > 0 ? (record.pitStorage / record.pitCapacity) * 100 : 0;
            const existingDate = acc.find(item => item.date === record.date);
            if (existingDate) {
                existingDate.intake += record.totalIntake;
                existingDate.incineration += record.incinerationAmount;
                existingDate.pitSum += pitPercentage;
                existingDate.pitCount += 1;
            } else {
                acc.push({
                    date: record.date,
                    displayDate: formatDate(record.date),
                    intake: record.totalIntake,
                    incineration: record.incinerationAmount,
                    pitSum: pitPercentage,
                    pitCount: 1,
                });
            }
            return acc;
        }, [] as any[])
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate cumulative values
        let cumulativeIntake = 0;
        let cumulativeIncineration = 0;
        return dailyTotals.map((day: any) => {
            cumulativeIntake += day.intake;
            cumulativeIncineration += day.incineration;
            const avgPitStorage = day.pitCount > 0 ? day.pitSum / day.pitCount : 0;
            return {
                date: day.date,
                displayDate: day.displayDate,
                累積進廠量: cumulativeIntake,
                累積焚化量: cumulativeIncineration,
                平均貯坑佔比: avgPitStorage,
            };
        });
    })();

    // Get available plants from data
    const availablePlants = [...new Set(data.map(r => r.plantName))];

    // Data for display in table
    const latestDate = data.length > 0 ? data[0].date : null;
    const displayedData = showFullDetails ? data : data.filter(d => d.date === latestDate);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">報表查詢</h1>
                <p className="text-muted-foreground mt-2">查詢歷史營運數據</p>
            </div>

            {/* Filter Section */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5" />
                        篩選條件
                    </CardTitle>
                    <CardDescription>選擇日期範圍和廠區進行查詢</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">開始日期</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={filter.startDate}
                                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">結束日期</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={filter.endDate}
                                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plant">廠區</Label>
                            <Select
                                value={filter.plantName || 'all'}
                                onValueChange={(value) =>
                                    setFilter({ ...filter, plantName: value === 'all' ? 'all' : (value as PlantName) })
                                }
                            >
                                <SelectTrigger id="plant">
                                    <SelectValue placeholder="選擇廠區" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部廠區</SelectItem>
                                    {PLANTS.map((plant) => (
                                        <SelectItem key={plant.name} value={plant.name}>
                                            {plant.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={handleQuery} className="flex-1">
                                查詢
                            </Button>
                            <Button onClick={handleExport} variant="outline" disabled={data.length === 0}>
                                <Download className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">匯出 CSV</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Statistics */}
            {statistics && statistics.recordCount > 0 && (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">
                                總進廠量
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-blue-900">{statistics.totalIntake.toFixed(0)} 噸</div>
                            <p className="text-xs text-blue-600 mt-1">
                                查詢期間累計
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">
                                總焚化量
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-red-900">{statistics.totalIncineration.toFixed(0)} 噸</div>
                            <p className="text-xs text-red-600 mt-1">
                                查詢期間累計
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-700">
                                平均貯坑佔比
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-amber-900">{statistics.averagePitStorage.toFixed(1)}%</div>
                            <p className="text-xs text-amber-600 mt-1">
                                查詢期間平均
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">
                                資料筆數
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-purple-900">{statistics.recordCount}</div>
                            <p className="text-xs text-purple-600 mt-1">
                                查詢結果
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Data Display Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
                    <TabsTrigger value="table" className="flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        <span>資料表格</span>
                    </TabsTrigger>
                    <TabsTrigger value="chart" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>趨勢圖</span>
                    </TabsTrigger>
                </TabsList>

                {/* Table View */}
                <TabsContent value="table">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle>{showFullDetails ? '完整資料明細' : '最新資料摘要'}</CardTitle>
                                <CardDescription>
                                    {showFullDetails
                                        ? `顯示查詢範圍內共 ${data.length} 筆資料`
                                        : `顯示 ${latestDate || ''} 最新資料 (${displayedData.length} 筆)`
                                    }
                                </CardDescription>
                            </div>
                            {data.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowFullDetails(!showFullDetails)}
                                    className="ml-auto"
                                >
                                    {showFullDetails ? '收合至今日' : '詳細資料明細'}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {displayedData.length > 0 ? (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="whitespace-nowrap">日期</TableHead>
                                                <TableHead className="whitespace-nowrap">廠區</TableHead>
                                                <TableHead className="text-right whitespace-nowrap">爐數</TableHead>
                                                <TableHead className="text-right whitespace-nowrap">進廠量</TableHead>
                                                <TableHead className="text-right whitespace-nowrap">焚化量</TableHead>
                                                <TableHead className="text-right whitespace-nowrap">貯坑量</TableHead>
                                                <TableHead className="text-right whitespace-nowrap">貯坑容量</TableHead>
                                                <TableHead className="text-right whitespace-nowrap">貯坑佔比</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {displayedData.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell className="font-medium whitespace-nowrap">{record.date}</TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1">
                                                            <span
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: PLANT_COLORS[record.plantName] }}
                                                            />
                                                            {record.plantName}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">{record.furnaceCount}</TableCell>
                                                    <TableCell className="text-right">{record.totalIntake.toFixed(0)}</TableCell>
                                                    <TableCell className="text-right">{record.incinerationAmount.toFixed(0)}</TableCell>
                                                    <TableCell className="text-right">{record.pitStorage.toFixed(0)}</TableCell>
                                                    <TableCell className="text-right">{record.pitCapacity.toFixed(0)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span
                                                            className={`font-semibold ${(record.pitStorage / record.pitCapacity) * 100 > 100
                                                                ? 'text-red-600'
                                                                : (record.pitStorage / record.pitCapacity) * 100 > 80
                                                                    ? 'text-yellow-600'
                                                                    : 'text-green-600'
                                                                }`}
                                                        >
                                                            {((record.pitStorage / record.pitCapacity) * 100).toFixed(1)}%
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>查詢期間無資料</p>
                                    <p className="text-sm mt-2">請調整篩選條件或新增資料</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Chart View */}
                <TabsContent value="chart">
                    <div className="space-y-6">
                        {/* Intake Trend Chart */}
                        <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="text-lg">📦 進廠量趨勢</CardTitle>
                                <CardDescription>各廠區進廠量變化趨勢（公噸）</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 sm:px-6">
                                {intakeChartData.length > 0 ? (
                                    <div className="h-72 sm:h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={intakeChartData} margin={{ top: 20, right: 40, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="displayDate"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    label={{ value: '公噸', angle: -90, position: 'insideLeft', fontSize: 11 }}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#374151' }}
                                                    label={{ value: '總量 (噸)', angle: 90, position: 'insideRight', offset: 10, fontSize: 11, fill: '#374151' }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                    }}
                                                    formatter={(value: number | undefined, name: string | undefined) => [
                                                        `${(value ?? 0).toFixed(0)} 噸`,
                                                        name === 'total' ? '總量' : (name ?? '')
                                                    ]}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                {availablePlants.map(plant => (
                                                    <Bar
                                                        key={plant}
                                                        dataKey={plant}
                                                        yAxisId="left"
                                                        fill={PLANT_COLORS[plant]}
                                                        radius={[2, 2, 0, 0]}
                                                    />
                                                ))}
                                                <Line
                                                    type="monotone"
                                                    dataKey="total"
                                                    yAxisId="right"
                                                    stroke="#374151"
                                                    strokeWidth={2}
                                                    dot={{ r: 3, fill: '#374151' }}
                                                    name="總量"
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyChartMessage />
                                )}
                            </CardContent>
                        </Card>

                        {/* Incineration Trend Chart */}
                        <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="text-lg">🔥 焚化量趨勢</CardTitle>
                                <CardDescription>各廠區焚化量變化趨勢（公噸）</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 sm:px-6">
                                {incinerationChartData.length > 0 ? (
                                    <div className="h-72 sm:h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={incinerationChartData} margin={{ top: 20, right: 40, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="displayDate"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    label={{ value: '公噸', angle: -90, position: 'insideLeft', fontSize: 11 }}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#374151' }}
                                                    label={{ value: '總量 (噸)', angle: 90, position: 'insideRight', offset: 10, fontSize: 11, fill: '#374151' }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                    }}
                                                    formatter={(value: number | undefined, name: string | undefined) => [
                                                        `${(value ?? 0).toFixed(0)} 噸`,
                                                        name === 'total' ? '總量' : (name ?? '')
                                                    ]}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                {availablePlants.map(plant => (
                                                    <Bar
                                                        key={plant}
                                                        dataKey={plant}
                                                        yAxisId="left"
                                                        fill={PLANT_COLORS[plant]}
                                                        radius={[2, 2, 0, 0]}
                                                    />
                                                ))}
                                                <Line
                                                    type="monotone"
                                                    dataKey="total"
                                                    yAxisId="right"
                                                    stroke="#374151"
                                                    strokeWidth={2}
                                                    dot={{ r: 3, fill: '#374151' }}
                                                    name="總量"
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyChartMessage />
                                )}
                            </CardContent>
                        </Card>

                        {/* Pit Storage Trend Chart */}
                        <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="text-lg">📊 貯坑佔比趨勢</CardTitle>
                                <CardDescription>各廠區貯坑佔比變化趨勢（%）</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 sm:px-6">
                                {pitStorageChartData.length > 0 ? (
                                    <div className="h-72 sm:h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={pitStorageChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="displayDate"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    domain={[0, 150]}
                                                    tickFormatter={(value) => `${value}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                    }}
                                                    formatter={(value: number | undefined, name: string | undefined) => [
                                                        `${(value ?? 0).toFixed(1)}%`,
                                                        `${name ?? ''} 佔比`
                                                    ]}
                                                />
                                                <Legend
                                                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                                    formatter={(value) => `${value} 佔比%`}
                                                />
                                                {availablePlants.map(plant => (
                                                    <Line
                                                        key={plant}
                                                        type="monotone"
                                                        dataKey={plant}
                                                        stroke={PLANT_COLORS[plant]}
                                                        strokeWidth={2}
                                                        dot={{ r: 4, fill: PLANT_COLORS[plant] }}
                                                        activeDot={{ r: 6 }}
                                                        connectNulls
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyChartMessage />
                                )}
                            </CardContent>
                        </Card>

                        {/* Per-Furnace Incineration Trend Chart */}
                        <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="text-lg">⚡ 每爐焚化量趨勢</CardTitle>
                                <CardDescription>各廠區每爐平均焚化量（公噸/爐）</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 sm:px-6">
                                {perFurnaceChartData.length > 0 ? (
                                    <div className="h-72 sm:h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={perFurnaceChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="displayDate"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    domain={[0, 500]}
                                                    label={{ value: '噸/爐', angle: -90, position: 'insideLeft', fontSize: 11 }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                    }}
                                                    formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)} 噸/爐`]}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                {availablePlants.map(plant => (
                                                    <Bar
                                                        key={plant}
                                                        dataKey={plant}
                                                        fill={PLANT_COLORS[plant]}
                                                        radius={[2, 2, 0, 0]}
                                                    />
                                                ))}
                                                {/* Reference lines for each plant's standard */}
                                                {PLANTS.map(plant => (
                                                    <ReferenceLine
                                                        key={`ref-${plant.name}`}
                                                        y={plant.standardPerFurnace}
                                                        stroke={PLANT_COLORS[plant.name]}
                                                        strokeDasharray="5 5"
                                                        strokeWidth={1.5}
                                                        label={{
                                                            value: `${plant.name} 標準: ${plant.standardPerFurnace}`,
                                                            position: 'right',
                                                            fill: PLANT_COLORS[plant.name],
                                                            fontSize: 10,
                                                        }}
                                                    />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyChartMessage />
                                )}
                            </CardContent>
                        </Card>

                        {/* Cumulative Trend Chart */}
                        <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="text-lg">📈 累積進廠量與焚化量趨勢</CardTitle>
                                <CardDescription>查詢期間的累積總量與平均貯坑佔比</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 sm:px-6">
                                {cumulativeChartData.length > 0 ? (
                                    <div className="h-72 sm:h-80 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={cumulativeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="displayDate"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    label={{ value: '累積量（噸）', angle: -90, position: 'insideLeft', fontSize: 10 }}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    tick={{ fontSize: 11 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#374151' }}
                                                    domain={[0, 150]}
                                                    tickFormatter={(value) => `${value}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                    }}
                                                    formatter={(value: number | undefined, name: string | undefined) => [
                                                        name === '平均貯坑佔比' ? `${(value ?? 0).toFixed(1)}%` : `${(value ?? 0).toFixed(0)} 噸`,
                                                        name ?? ''
                                                    ]}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="累積進廠量"
                                                    yAxisId="left"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    dot={{ r: 3, fill: '#3b82f6' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="累積焚化量"
                                                    yAxisId="left"
                                                    stroke="#ef4444"
                                                    strokeWidth={2}
                                                    dot={{ r: 3, fill: '#ef4444' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="平均貯坑佔比"
                                                    yAxisId="right"
                                                    stroke="#f59e0b"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    dot={{ r: 3, fill: '#f59e0b' }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyChartMessage />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyChartMessage() {
    return (
        <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>查詢期間無資料</p>
            <p className="text-sm mt-2">請調整篩選條件或新增資料</p>
        </div>
    );
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return format(date, 'MM/dd');
    } catch {
        return dateStr;
    }
}
