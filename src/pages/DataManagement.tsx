import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, AlertCircle, Edit, Save, Loader2, Download } from 'lucide-react';
import { apiService } from '@/services/api';
import { PLANTS, type PlantData, type PlantName } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DataManagementPage() {
    const [data, setData] = useState<PlantData[]>([]);
    const [filteredData, setFilteredData] = useState<PlantData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PlantData | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsLoading(true);
        try {
            await apiService.deletePlantData(deleteId);
            await loadData();
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error("Failed to delete data", error);
            alert("刪除失敗");
        } finally {
            setIsLoading(false);
            setDeleteId(null);
        }
    };

    const handleEditSave = async () => {
        if (!editingItem) return;
        setIsLoading(true);
        try {
            await apiService.updatePlantData(editingItem);
            await loadData();
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error("Failed to update data", error);
            alert("更新失敗");
        } finally {
            setIsLoading(false);
            setEditingItem(null);
        }
    };

    const handleClearAll = async () => {
        // Implement batch delete or clear sheet
        alert("批次清除暫不支援");
        setIsClearDialogOpen(false);
    };

    const handleRepairDates = () => {
        alert("數據結構已優化，無需手動修復");
    };

    const handleExport = () => {
        if (filteredData.length === 0) return;

        // Header for CSV
        const headers = ["日期", "廠區", "爐數", "平台預約", "超約車次", "調整車次", "實際進廠", "總進廠量", "焚化量", "貯坑量", "貯坑容量", "貯坑佔比"];

        // Data rows
        const rows = filteredData.map(item => [
            item.date,
            item.plantName,
            item.furnaceCount,
            item.platformReserved ?? 0,
            item.overReservedTrips ?? 0,
            item.adjustedTrips ?? 0,
            item.actualIntake ?? 0,
            item.totalIntake,
            item.incinerationAmount,
            item.pitStorage,
            item.pitCapacity,
            ((item.pitStorage / item.pitCapacity) * 100).toFixed(1) + "%"
        ]);

        // Create CSV content with BOM for Excel UTF-8 support
        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ks_refuse_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">資料管理</h1>
                    <p className="text-muted-foreground mt-2">檢視與管理所有營運數據</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={filteredData.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        匯出 CSV
                    </Button>
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
                                    此動作無法復原。這將會永久刪除雲端儲存的所有營運數據。
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>取消</Button>
                                <Button variant="destructive" onClick={handleClearAll}>確認清除</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>確認刪除</DialogTitle>
                                <DialogDescription>
                                    確定要永久刪除這筆資料嗎？此操作無法還原。
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>取消</Button>
                                <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    確認刪除
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>編輯營運數據</DialogTitle>
                                <DialogDescription>
                                    修改選定的資料筆數。這將會同步更新雲端資料表。
                                </DialogDescription>
                            </DialogHeader>
                            {editingItem && (
                                <div className="grid grid-cols-2 gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>日期</Label>
                                        <Input type="date" value={editingItem.date} onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>廠區</Label>
                                        <Select value={editingItem.plantName} onValueChange={(v) => setEditingItem({ ...editingItem, plantName: v as PlantName })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{PLANTS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>爐數</Label>
                                        <Input type="number" value={editingItem.furnaceCount} onChange={(e) => setEditingItem({ ...editingItem, furnaceCount: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>進廠量 (噸)</Label>
                                        <Input type="number" step="0.1" value={editingItem.totalIntake} onChange={(e) => setEditingItem({ ...editingItem, totalIntake: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>焚化量 (噸)</Label>
                                        <Input type="number" step="0.1" value={editingItem.incinerationAmount} onChange={(e) => setEditingItem({ ...editingItem, incinerationAmount: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>貯坑量 (噸)</Label>
                                        <Input type="number" step="0.1" value={editingItem.pitStorage} onChange={(e) => setEditingItem({ ...editingItem, pitStorage: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>貯坑容量 (噸)</Label>
                                        <Input type="number" step="0.1" value={editingItem.pitCapacity} onChange={(e) => setEditingItem({ ...editingItem, pitCapacity: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>實際進廠 (噸)</Label>
                                        <Input type="number" step="0.1" value={editingItem.actualIntake || 0} onChange={(e) => setEditingItem({ ...editingItem, actualIntake: Number(e.target.value) })} />
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>取消</Button>
                                <Button onClick={handleEditSave} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    儲存變更
                                </Button>
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
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setIsEditDialogOpen(true);
                                                }}
                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setDeleteId(item.id);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
