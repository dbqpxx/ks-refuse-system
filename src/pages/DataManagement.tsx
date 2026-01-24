import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/api';
import type { PlantData } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function DataManagementPage() {
    const [data, setData] = useState<PlantData[]>([]);
    const [filteredData, setFilteredData] = useState<PlantData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterData();
    }, [data, searchTerm, dateFilter]);

    const loadData = async () => {
        try {
            const allData = await apiService.fetchPlantData();
            setData(allData);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const filterData = () => {
        let result = [...data];

        if (searchTerm) {
            result = result.filter(item =>
                item.plantName.includes(searchTerm)
            );
        }

        if (dateFilter) {
            result = result.filter(item =>
                item.date === dateFilter
            );
        }

        setFilteredData(result);
    };

    const handleDelete = () => {
        // Implement delete via API later if needed
        alert("刪除功能尚未實作於 Google Sheets 版本");
    };

    const handleClearAll = () => {
        alert("清除功能尚未實作於 Google Sheets 版本");
        setIsClearDialogOpen(false);
    };

    const handleRepairDates = () => {
        alert("修復功能不需要於 Google Sheets 版本");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">資料管理</h1>
                    <p className="text-muted-foreground mt-2">檢視與管理所有營運數據</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRepairDates}>
                        修復日期
                    </Button>
                    <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">清除所有資料</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>確定要清除所有資料嗎？</DialogTitle>
                                <DialogDescription>
                                    此動作無法復原。這將會永久刪除本機儲存的所有營運數據。
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>取消</Button>
                                <Button variant="destructive" onClick={handleClearAll}>確認清除</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>資料篩選</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">搜尋廠區</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="輸入廠區名稱..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date-filter">日期篩選</Label>
                            <Input
                                id="date-filter"
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                                className="w-full"
                            >
                                清除篩選
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>日期</TableHead>
                            <TableHead>廠區</TableHead>
                            <TableHead className="text-right">爐數</TableHead>
                            <TableHead className="text-right">平台預約</TableHead>
                            <TableHead className="text-right">超約車次</TableHead>
                            <TableHead className="text-right">調整車次</TableHead>
                            <TableHead className="text-right">實際進廠</TableHead>
                            <TableHead className="text-right">總進廠量</TableHead>
                            <TableHead className="text-right">焚化量</TableHead>
                            <TableHead className="text-right">貯坑量</TableHead>
                            <TableHead className="text-right">貯坑容量</TableHead>
                            <TableHead className="text-right">貯坑佔比</TableHead>
                            <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-24 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <AlertCircle className="h-6 w-6 mb-2" />
                                        <p>沒有符合的資料</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.plantName}</TableCell>
                                    <TableCell className="text-right">{item.furnaceCount}</TableCell>
                                    <TableCell className="text-right">{item.platformReserved ?? 0}</TableCell>
                                    <TableCell className="text-right">{item.overReservedTrips ?? 0}</TableCell>
                                    <TableCell className="text-right">{item.adjustedTrips ?? 0}</TableCell>
                                    <TableCell className="text-right">{item.actualIntake ?? 0}</TableCell>
                                    <TableCell className="text-right">{item.totalIntake}</TableCell>
                                    <TableCell className="text-right">{item.incinerationAmount}</TableCell>
                                    <TableCell className="text-right">{item.pitStorage}</TableCell>
                                    <TableCell className="text-right">{item.pitCapacity}</TableCell>
                                    <TableCell className="text-right">
                                        {((item.pitStorage / item.pitCapacity) * 100).toFixed(1)}%
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete()}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-sm text-muted-foreground text-right">
                顯示 {filteredData.length} 筆資料 (共 {data.length} 筆)
            </div>
        </div>
    );
}
