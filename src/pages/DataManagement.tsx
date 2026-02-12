import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, AlertCircle, Edit, Save, Loader2, Download, MessageSquare, Plus, Image as ImageIcon } from 'lucide-react';
import { apiService } from '@/services/api';
import { PLANTS, type PlantData, type PlantName, type DailyComment } from '@/types';
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

    // Daily Comment State
    const [dailyComments, setDailyComments] = useState<DailyComment[]>([]);
    const [commentDate, setCommentDate] = useState(new Date().toISOString().split('T')[0]);
    const [commentContent, setCommentContent] = useState('');
    const [commentImageUrl, setCommentImageUrl] = useState('');
    const [isCommentLoading, setIsCommentLoading] = useState(false);
    const [editingComment, setEditingComment] = useState<DailyComment | null>(null);
    const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);

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

            const comments = await apiService.fetchDailyComments();
            setDailyComments(comments);
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

    const handleSaveComment = async () => {
        if (!commentDate || !commentContent) {
            alert("請填寫日期與內容");
            return;
        }

        setIsCommentLoading(true);
        try {
            if (editingComment) {
                await apiService.updateDailyComment({
                    ...editingComment,
                    date: commentDate,
                    content: commentContent,
                    imageUrl: commentImageUrl
                });
            } else {
                // Check if comment exists for this date
                const existing = dailyComments.find(c => c.date === commentDate);
                if (existing) {
                    if (confirm(`日期 ${commentDate} 已有短評，是否覆蓋？`)) {
                        await apiService.updateDailyComment({
                            ...existing,
                            content: commentContent,
                            imageUrl: commentImageUrl
                        });
                    }
                } else {
                    await apiService.saveDailyComment({
                        date: commentDate,
                        content: commentContent,
                        imageUrl: commentImageUrl
                    });
                }
            }

            // Refresh
            const comments = await apiService.fetchDailyComments();
            setDailyComments(comments);

            // Reset
            setEditingComment(null);
            setCommentContent('');
            setCommentImageUrl('');
            setIsCommentDialogOpen(false);
        } catch (error) {
            console.error("Failed to save comment", error);
            alert("儲存失敗");
        } finally {
            setIsCommentLoading(false);
        }
    };

    const handleDeleteComment = async (id: string) => {
        if (!confirm("確定要刪除此短評？")) return;
        setIsCommentLoading(true);
        try {
            await apiService.deleteDailyComment(id);
            const comments = await apiService.fetchDailyComments();
            setDailyComments(comments);
        } catch (error) {
            console.error("Failed to delete comment", error);
            alert("刪除失敗");
        } finally {
            setIsCommentLoading(false);
        }
    };

    const openCommentDialog = (comment?: DailyComment) => {
        if (comment) {
            setEditingComment(comment);
            setCommentDate(comment.date);
            setCommentContent(comment.content);
            setCommentImageUrl(comment.imageUrl || '');
        } else {
            setEditingComment(null);
            setCommentDate(new Date().toISOString().split('T')[0]);
            setCommentContent('');
            setCommentImageUrl('');
        }
        setIsCommentDialogOpen(true);
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


            {/* AI Short Comment Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-indigo-600" />
                            AI 營運短評管理
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            管理每日顯示於儀表板的營運短評與圖片
                        </p>
                    </div>
                    <Button onClick={() => openCommentDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        新增短評
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">日期</TableHead>
                                    <TableHead>內容摘要</TableHead>
                                    <TableHead className="w-[100px]">圖片</TableHead>
                                    <TableHead className="w-[100px] text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyComments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            尚無短評資料
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    dailyComments.sort((a, b) => b.date.localeCompare(a.date)).map((comment) => (
                                        <TableRow key={comment.id}>
                                            <TableCell className="font-medium">{comment.date}</TableCell>
                                            <TableCell className="max-w-[300px] truncate" title={comment.content}>
                                                {comment.content}
                                            </TableCell>
                                            <TableCell>
                                                {comment.imageUrl ? (
                                                    <ImageIcon className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openCommentDialog(comment)}>
                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Comment Edit Dialog */}
            <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingComment ? '編輯短評' : '新增短評'}</DialogTitle>
                        <DialogDescription>
                            輸入當日營運重點摘要，將顯示於儀表板首頁。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c-date" className="text-right">
                                日期
                            </Label>
                            <Input
                                id="c-date"
                                type="date"
                                value={commentDate}
                                onChange={(e) => setCommentDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c-content" className="text-right">
                                短評內容
                            </Label>
                            <textarea
                                id="c-content"
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                placeholder="請輸入今日營運重點..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c-image" className="text-right">
                                圖片連結
                            </Label>
                            <Input
                                id="c-image"
                                value={commentImageUrl}
                                onChange={(e) => setCommentImageUrl(e.target.value)}
                                placeholder="https://..."
                                className="col-span-3"
                            />
                        </div>
                        {commentImageUrl && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="col-start-2 col-span-3">
                                    <img src={commentImageUrl} alt="Preview" className="max-h-32 rounded-md object-cover border"
                                        onError={(e) => (e.currentTarget.style.display = 'none')} />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSaveComment} disabled={isCommentLoading}>
                            {isCommentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            儲存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
        </div >
    );
}
