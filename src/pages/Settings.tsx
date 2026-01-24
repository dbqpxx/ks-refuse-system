import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Trash2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { storageService } from '@/services/storage';

export default function SettingsPage() {
    const [recordCount, setRecordCount] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = () => {
        const count = storageService.getRecordCount();
        setRecordCount(count);
    };

    const handleExportAll = () => {
        try {
            const filename = `焚化廠完整數據_${new Date().toISOString().split('T')[0]}.csv`;
            storageService.downloadCSV(filename);
            setMessage({ type: 'success', text: '資料已成功匯出！' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: '匯出失敗，請稍後再試' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleClearData = () => {
        try {
            storageService.clearAllData();
            setRecordCount(0);
            setShowConfirm(false);
            setMessage({ type: 'success', text: '所有資料已清除' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: '清除失敗，請稍後再試' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">設定</h1>
                <p className="text-muted-foreground mt-2">系統設定與資料管理</p>
            </div>

            {message && (
                <div
                    className={`p-4 rounded-lg border flex items-start gap-3 ${message.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                    )}
                    <div className="flex-1">{message.text}</div>
                </div>
            )}

            {/* Local Data Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        本地資料統計
                    </CardTitle>
                    <CardDescription>
                        資料儲存在瀏覽器的 localStorage 中
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <p className="text-sm text-muted-foreground">總資料筆數</p>
                            <p className="text-3xl font-bold mt-1">{recordCount}</p>
                        </div>
                        <Database className="h-12 w-12 text-muted-foreground opacity-50" />
                    </div>

                    <div className="grid gap-3 pt-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">儲存位置</span>
                            <span className="font-medium">瀏覽器 localStorage</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">資料格式</span>
                            <span className="font-medium">JSON</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">同步狀態</span>
                            <span className="font-medium text-green-600">本地儲存</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
                <CardHeader>
                    <CardTitle>資料管理</CardTitle>
                    <CardDescription>
                        匯出或清除本地儲存的資料
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Export All Data */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold">匯出所有資料</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                將所有營運資料匯出為 CSV 檔案，方便備份或離線分析
                            </p>
                            <Button
                                onClick={handleExportAll}
                                variant="outline"
                                className="mt-3"
                                disabled={recordCount === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                匯出 CSV
                            </Button>
                        </div>
                    </div>

                    {/* Clear All Data */}
                    <div className="flex items-start gap-4 p-4 border border-red-200 rounded-lg bg-red-50/50">
                        <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-900">清除所有資料</h3>
                            <p className="text-sm text-red-700 mt-1">
                                ⚠️ 此操作將永久刪除所有本地儲存的營運資料，無法復原
                            </p>

                            {!showConfirm ? (
                                <Button
                                    onClick={() => setShowConfirm(true)}
                                    variant="destructive"
                                    className="mt-3"
                                    disabled={recordCount === 0}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    清除資料
                                </Button>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm font-semibold text-red-900">
                                        確定要清除所有 {recordCount} 筆資料嗎？
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleClearData}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            確認清除
                                        </Button>
                                        <Button
                                            onClick={() => setShowConfirm(false)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            取消
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Information */}
            <Card>
                <CardHeader>
                    <CardTitle>系統資訊</CardTitle>
                    <CardDescription>
                        應用程式版本與技術資訊
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">應用程式名稱</span>
                            <span className="font-medium">焚化廠營運數據管理系統</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">版本</span>
                            <span className="font-medium">1.0.0</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">技術框架</span>
                            <span className="font-medium">React + TypeScript + Vite</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">UI 組件</span>
                            <span className="font-medium">shadcn/ui + Tailwind CSS</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
