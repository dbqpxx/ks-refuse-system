import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import type { DowntimeRecord, DowntimeType, PlantName } from '@/types';
import { PLANTS } from '@/types';
import { Loader2, Plus, Pencil, Trash2, Wrench, AlertTriangle, Calendar } from 'lucide-react';

type FormData = {
    plantName: PlantName;
    furnaceNumber: number;
    downtimeType: DowntimeType;
    startDateTime: string;
    endDateTime: string;
    notes: string;
};

const emptyForm: FormData = {
    plantName: '中區廠',
    furnaceNumber: 1,
    downtimeType: '計畫歲修',
    startDateTime: '',
    endDateTime: '',
    notes: '',
};

export default function DowntimeManagementPage() {
    const [records, setRecords] = useState<DowntimeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DowntimeRecord | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<DowntimeRecord | null>(null);

    // Filter state
    const [filterPlant, setFilterPlant] = useState<PlantName | 'all'>('all');

    useEffect(() => {
        loadRecords();
    }, []);

    const loadRecords = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchDowntimeRecords();
            // Sort by start date descending (newest first)
            data.sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
            setRecords(data);
        } catch (error) {
            console.error('Failed to load downtime records:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddDialog = () => {
        setEditingRecord(null);
        // Set default start/end to now and tomorrow
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formatDateTime = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${mins}`;
        };

        setFormData({
            ...emptyForm,
            startDateTime: formatDateTime(now),
            endDateTime: formatDateTime(tomorrow),
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (record: DowntimeRecord) => {
        setEditingRecord(record);
        setFormData({
            plantName: record.plantName,
            furnaceNumber: record.furnaceNumber,
            downtimeType: record.downtimeType,
            startDateTime: record.startDateTime.slice(0, 16), // Format for datetime-local input
            endDateTime: record.endDateTime.slice(0, 16),
            notes: record.notes || '',
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.startDateTime || !formData.endDateTime) {
            alert('請填寫開始與結束時間');
            return;
        }

        setSaving(true);
        try {
            if (editingRecord) {
                await apiService.updateDowntimeRecord({
                    ...editingRecord,
                    ...formData,
                    startDateTime: new Date(formData.startDateTime).toISOString(),
                    endDateTime: new Date(formData.endDateTime).toISOString(),
                });
            } else {
                await apiService.saveDowntimeRecord({
                    ...formData,
                    startDateTime: new Date(formData.startDateTime).toISOString(),
                    endDateTime: new Date(formData.endDateTime).toISOString(),
                });
            }
            setIsDialogOpen(false);
            loadRecords();
        } catch (error) {
            console.error('Failed to save record:', error);
            alert('儲存失敗，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiService.deleteDowntimeRecord(deleteTarget.id);
            setDeleteTarget(null);
            loadRecords();
        } catch (error) {
            console.error('Failed to delete record:', error);
            alert('刪除失敗，請稍後再試');
        }
    };

    const getMaxFurnaces = (plantName: PlantName): number => {
        const plant = PLANTS.find(p => p.name === plantName);
        return plant?.maxFurnaces || 4;
    };

    const filteredRecords = filterPlant === 'all'
        ? records
        : records.filter(r => r.plantName === filterPlant);

    const formatLocalDateTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isActive = (record: DowntimeRecord) => {
        const now = new Date();
        const start = new Date(record.startDateTime);
        const end = new Date(record.endDateTime);
        return now >= start && now <= end;
    };

    const isFuture = (record: DowntimeRecord) => {
        return new Date(record.startDateTime) > new Date();
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">停機管理</h1>
                    <p className="text-muted-foreground mt-2">管理各廠焚化爐的歲修與停機計畫</p>
                </div>
                <Button onClick={openAddDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    新增停機紀錄
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>停機紀錄列表</CardTitle>
                            <CardDescription>共 {filteredRecords.length} 筆紀錄</CardDescription>
                        </div>
                        <Select value={filterPlant} onValueChange={(val) => setFilterPlant(val as PlantName | 'all')}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="篩選廠區" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部廠區</SelectItem>
                                {PLANTS.map(p => (
                                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>廠區</TableHead>
                                    <TableHead>爐號</TableHead>
                                    <TableHead>類型</TableHead>
                                    <TableHead>開始時間</TableHead>
                                    <TableHead>結束時間</TableHead>
                                    <TableHead>狀態</TableHead>
                                    <TableHead>備註</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">{record.plantName}</TableCell>
                                        <TableCell>第 {record.furnaceNumber} 爐</TableCell>
                                        <TableCell>
                                            <Badge variant={record.downtimeType === '計畫歲修' ? 'secondary' : 'destructive'} className="gap-1">
                                                {record.downtimeType === '計畫歲修' ? (
                                                    <Wrench className="h-3 w-3" />
                                                ) : (
                                                    <AlertTriangle className="h-3 w-3" />
                                                )}
                                                {record.downtimeType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{formatLocalDateTime(record.startDateTime)}</TableCell>
                                        <TableCell className="text-sm">{formatLocalDateTime(record.endDateTime)}</TableCell>
                                        <TableCell>
                                            {isActive(record) ? (
                                                <Badge variant="default" className="bg-orange-500">進行中</Badge>
                                            ) : isFuture(record) ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    預定
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">已結束</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                                            {record.notes || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(record)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            尚無停機紀錄
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingRecord ? '編輯停機紀錄' : '新增停機紀錄'}</DialogTitle>
                        <DialogDescription>
                            {editingRecord ? '修改停機計畫資訊' : '登記新的歲修或臨時停機計畫'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>廠區</Label>
                                <Select
                                    value={formData.plantName}
                                    onValueChange={(val) => setFormData({ ...formData, plantName: val as PlantName, furnaceNumber: 1 })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLANTS.map(p => (
                                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>爐號</Label>
                                <Select
                                    value={String(formData.furnaceNumber)}
                                    onValueChange={(val) => setFormData({ ...formData, furnaceNumber: Number(val) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: getMaxFurnaces(formData.plantName) }, (_, i) => i + 1).map(n => (
                                            <SelectItem key={n} value={String(n)}>第 {n} 爐</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>停機類型</Label>
                            <Select
                                value={formData.downtimeType}
                                onValueChange={(val) => setFormData({ ...formData, downtimeType: val as DowntimeType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="計畫歲修">計畫歲修</SelectItem>
                                    <SelectItem value="臨時停機">臨時停機</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>開始時間</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.startDateTime}
                                    onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>預計結束時間</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.endDateTime}
                                    onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>備註</Label>
                            <Textarea
                                placeholder="選填，可填寫停機原因或其他說明"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingRecord ? '儲存變更' : '新增紀錄'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>確認刪除</DialogTitle>
                        <DialogDescription>
                            確定要刪除 {deleteTarget?.plantName} 第 {deleteTarget?.furnaceNumber} 爐的停機紀錄嗎？此操作無法復原。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
                        <Button variant="destructive" onClick={handleDelete}>刪除</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
