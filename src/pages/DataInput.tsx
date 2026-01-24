import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, FormInput, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/api';
import { parseOperationalText, EXAMPLE_FORMAT, hasRequiredFields } from '@/utils/textParser';
import { validatePlantData, formatValidationErrors } from '@/utils/validators';
import { PLANTS } from '@/types';
import type { PlantData, PlantName } from '@/types';

export default function DataInputPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('text');
    const [textInput, setTextInput] = useState('');
    const [parsedData, setParsedData] = useState<Partial<PlantData>[] | null>(null);
    const [showExample, setShowExample] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [parseDate, setParseDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Form state
    const [formData, setFormData] = useState<Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>>({
        date: new Date().toISOString().split('T')[0],
        plantName: undefined,
        furnaceCount: 0,
        totalIntake: 0,
        incinerationAmount: 0,
        pitStorage: 0,
        pitCapacity: 1000,
    });

    const updateParsedItem = (index: number, field: keyof PlantData, value: any) => {
        if (!parsedData) return;
        const newData = [...parsedData];
        newData[index] = { ...newData[index], [field]: value };
        setParsedData(newData);
    };


    const handleTextParse = () => {
        setSubmitStatus(null);
        console.log("handleTextParse called");
        console.log("textInput:", textInput);
        console.log("textInput length:", textInput.length);

        const parsed = parseOperationalText(textInput);
        console.log("parsed result:", parsed);

        if (!parsed || parsed.length === 0) {
            setSubmitStatus({
                type: 'error',
                message: '無法解析文字，請確認格式是否正確或使用範例格式',
            });
            setParsedData(null);
            return;
        }

        // Apply selected date to all parsed records ONLY if they don't have one
        const datedParsed = parsed.map(p => ({
            ...p,
            date: p.date ? p.date : parseDate
        }));

        // Optional: Check for incomplete records, but allow user to see them
        const validCount = datedParsed.filter(p => hasRequiredFields(p)).length;
        if (validCount < datedParsed.length) {
            setSubmitStatus({
                type: 'error',
                message: `解析出 ${datedParsed.length} 筆資料，但其中 ${datedParsed.length - validCount} 筆資料欄位不完整。`,
            });
        } else {
            setSubmitStatus({
                type: 'success',
                message: `成功解析 ${datedParsed.length} 筆資料！請檢查下方資料是否正確，確認後點擊「儲存資料」`,
            });
        }
        setParsedData(datedParsed);
    };

    const handleTextSubmit = async () => {
        if (!parsedData || parsedData.length === 0) return;

        // Filter for strictly valid data
        const validData = parsedData.filter(p => validatePlantData(p).isValid);

        if (validData.length === 0) {
            setSubmitStatus({
                type: 'error',
                message: '沒有有效的資料可供儲存，請檢查輸入內容',
            });
            return;
        }

        if (validData.length < parsedData.length) {
            // Confirm if user wants to proceed with partial save (in a real app, uses a dialog)
            // For now, we'll just parse and save what's valid or error out if critical
            // But let's imply we save valid ones
        }

        try {
            await apiService.savePlantData(validData as Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>[]);

            setSubmitStatus({
                type: 'success',
                message: `成功儲存 ${validData.length} 筆資料！`,
            });
            setTextInput('');
            setParsedData(null);

            // Reload page after 1.5 seconds to show updated system state
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (error) {
            setSubmitStatus({
                type: 'error',
                message: '儲存失敗，請稍後再試',
            });
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus(null);

        const validation = validatePlantData(formData);
        if (!validation.isValid) {
            setSubmitStatus({
                type: 'error',
                message: formatValidationErrors(validation.errors),
            });
            return;
        }

        try {
            await apiService.savePlantData(formData as Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>);
            setSubmitStatus({
                type: 'success',
                message: '資料已成功儲存！',
            });

            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                plantName: undefined,
                furnaceCount: 0,
                totalIntake: 0,
                incinerationAmount: 0,
                pitStorage: 0,
                pitCapacity: 1000,
            });

            // Reload page
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (error) {
            setSubmitStatus({
                type: 'error',
                message: '儲存失敗，請稍後再試',
            });
        }
    };

    const pitStoragePercentage = formData.pitCapacity && formData.pitStorage
        ? ((formData.pitStorage / formData.pitCapacity) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">數據輸入</h1>
                <p className="text-muted-foreground mt-2">輸入焚化廠營運數據</p>
            </div>

            {submitStatus && (
                <div
                    className={`p-4 rounded-lg border flex items-start gap-3 ${submitStatus.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                >
                    {submitStatus.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                    )}
                    <div className="flex-1 whitespace-pre-line">{submitStatus.message}</div>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        文字解析輸入
                    </TabsTrigger>
                    <TabsTrigger value="form" className="flex items-center gap-2">
                        <FormInput className="h-4 w-4" />
                        表單輸入
                    </TabsTrigger>
                </TabsList>

                {/* Text Parsing Tab */}
                <TabsContent value="text" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>文字解析輸入 (支援 CSV 批次)</CardTitle>
                            <CardDescription>
                                貼上包含營運數據的文字或 CSV，系統將自動解析。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="parse-date">資料日期</Label>
                                        <Input
                                            id="parse-date"
                                            type="date"
                                            value={parseDate}
                                            onChange={(e) => setParseDate(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">若未指定，系統將使用此日期作為資料日期</p>
                                    </div>
                                    <div className="flex items-end justify-end pb-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowExample(!showExample)}
                                        >
                                            {showExample ? '隱藏' : '顯示'}範例格式
                                        </Button>
                                    </div>
                                </div>

                                {showExample && (
                                    <div className="p-3 bg-muted rounded-md overflow-x-auto">
                                        <pre className="text-sm whitespace-pre-wrap">{EXAMPLE_FORMAT}</pre>
                                    </div>
                                )}
                                <Textarea
                                    id="text-input"
                                    placeholder="貼上單筆資料或 CSV 格式內容..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    rows={10}
                                    className="font-mono whitespace-pre"
                                />
                            </div>

                            <Button onClick={handleTextParse} className="w-full">
                                解析文字
                            </Button>

                            {parsedData && parsedData.length > 0 && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="font-semibold">
                                        解析結果 共 {parsedData.length} 筆
                                    </h3>

                                    {parsedData.length === 1 ? (
                                        // Single Record Review
                                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                            <div>
                                                <p className="text-sm text-muted-foreground">日期</p>
                                                <p className="font-medium">{parsedData[0].date}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">廠區</p>
                                                <p className="font-medium">{parsedData[0].plantName}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">爐數</p>
                                                <p className="font-medium">{parsedData[0].furnaceCount}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">平台預約量</p>
                                                <p className="font-medium">{parsedData[0].platformReserved ?? 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">超約車次</p>
                                                <p className="font-medium">{parsedData[0].overReservedTrips ?? 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">調整車次</p>
                                                <p className="font-medium">{parsedData[0].adjustedTrips ?? 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">實際進廠量</p>
                                                <p className="font-medium">{parsedData[0].actualIntake ?? 0} 噸</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">總進廠量</p>
                                                <p className="font-medium">{parsedData[0].totalIntake} 噸</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">焚化量</p>
                                                <p className="font-medium">{parsedData[0].incinerationAmount} 噸</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">貯坑量</p>
                                                <p className="font-medium">{parsedData[0].pitStorage} 噸</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">貯坑容量</p>
                                                <p className="font-medium">{parsedData[0].pitCapacity} 噸</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">貯坑佔比</p>
                                                <p className="font-medium">
                                                    {parsedData[0].pitStorage && parsedData[0].pitCapacity
                                                        ? ((parsedData[0].pitStorage! / parsedData[0].pitCapacity!) * 100).toFixed(1)
                                                        : '0'}
                                                    %
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        // Batch Records Table Review
                                        <div className="rounded-md border overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                                    <tr>
                                                        <th className="px-3 py-2">日期</th>
                                                        <th className="px-3 py-2">廠區</th>
                                                        <th className="px-3 py-2 text-right">爐數</th>
                                                        <th className="px-3 py-2 text-right">平台預約</th>
                                                        <th className="px-3 py-2 text-right">超約車次</th>
                                                        <th className="px-3 py-2 text-right">調整車次</th>
                                                        <th className="px-3 py-2 text-right">實際進廠</th>
                                                        <th className="px-3 py-2 text-right">總進廠</th>
                                                        <th className="px-3 py-2 text-right">焚化量</th>
                                                        <th className="px-3 py-2 text-right">貯坑量</th>
                                                        <th className="px-3 py-2 text-right">貯坑容量</th>
                                                        <th className="px-3 py-2 text-right">佔比</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedData.map((row, idx) => (
                                                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs min-w-[100px]" value={row.date} onChange={(e) => updateParsedItem(idx, 'date', e.target.value)} /></td>
                                                            <td className="px-1 py-1">
                                                                <Select value={row.plantName} onValueChange={(v) => updateParsedItem(idx, 'plantName', v)}>
                                                                    <SelectTrigger className="h-8 text-xs min-w-[100px]"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{PLANTS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            </td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-16 text-right" type="number" value={row.furnaceCount} onChange={(e) => updateParsedItem(idx, 'furnaceCount', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-20 text-right" type="number" value={row.platformReserved ?? 0} onChange={(e) => updateParsedItem(idx, 'platformReserved', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-16 text-right" type="number" value={row.overReservedTrips ?? 0} onChange={(e) => updateParsedItem(idx, 'overReservedTrips', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-16 text-right" type="number" value={row.adjustedTrips ?? 0} onChange={(e) => updateParsedItem(idx, 'adjustedTrips', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-20 text-right" type="number" value={row.actualIntake ?? 0} onChange={(e) => updateParsedItem(idx, 'actualIntake', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-20 text-right" type="number" step="0.1" value={row.totalIntake} onChange={(e) => updateParsedItem(idx, 'totalIntake', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-20 text-right" type="number" step="0.1" value={row.incinerationAmount} onChange={(e) => updateParsedItem(idx, 'incinerationAmount', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-20 text-right" type="number" step="0.1" value={row.pitStorage} onChange={(e) => updateParsedItem(idx, 'pitStorage', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1"><Input className="h-8 text-xs w-20 text-right" type="number" step="0.1" value={row.pitCapacity} onChange={(e) => updateParsedItem(idx, 'pitCapacity', Number(e.target.value))} /></td>
                                                            <td className="px-1 py-1 text-right text-xs">
                                                                {row.pitStorage && row.pitCapacity
                                                                    ? ((row.pitStorage / row.pitCapacity) * 100).toFixed(1)
                                                                    : '0'}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <Button onClick={handleTextSubmit} className="w-full">
                                        儲存資料
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Form Input Tab */}
                <TabsContent value="form">
                    <Card>
                        <CardHeader>
                            <CardTitle>表單輸入</CardTitle>
                            <CardDescription>手動輸入營運數據</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                {/* Date and Plant Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">日期 *</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="plant">廠區 *</Label>
                                        <Select
                                            value={formData.plantName}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, plantName: value as PlantName })
                                            }
                                        >
                                            <SelectTrigger id="plant">
                                                <SelectValue placeholder="選擇廠區" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PLANTS.map((plant) => (
                                                    <SelectItem key={plant.name} value={plant.name}>
                                                        {plant.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Basic Data */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">基本資料</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="furnaceCount">爐數 *</Label>
                                            <Input
                                                id="furnaceCount"
                                                type="number"
                                                min="0"
                                                value={formData.furnaceCount}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, furnaceCount: parseInt(e.target.value) || 0 })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="totalIntake">總進廠量 (噸) *</Label>
                                            <Input
                                                id="totalIntake"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={formData.totalIntake}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, totalIntake: parseFloat(e.target.value) || 0 })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="incinerationAmount">焚化量 (噸) *</Label>
                                            <Input
                                                id="incinerationAmount"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={formData.incinerationAmount}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        incinerationAmount: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pit Data */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">貯坑資料</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="pitStorage">貯坑量 (噸) *</Label>
                                            <Input
                                                id="pitStorage"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={formData.pitStorage}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, pitStorage: parseFloat(e.target.value) || 0 })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pitCapacity">貯坑容量 (噸) *</Label>
                                            <Input
                                                id="pitCapacity"
                                                type="number"
                                                min="1"
                                                step="0.1"
                                                value={formData.pitCapacity}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, pitCapacity: parseFloat(e.target.value) || 1000 })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>貯坑佔比</Label>
                                            <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                                                <span className="font-semibold">{pitStoragePercentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Platform Data (Optional) */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">平台資料 (選填)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="platformReserved">平台預約</Label>
                                            <Input
                                                id="platformReserved"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={formData.platformReserved || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        platformReserved: e.target.value ? parseFloat(e.target.value) : undefined,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="actualIntake">實際進廠</Label>
                                            <Input
                                                id="actualIntake"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={formData.actualIntake || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        actualIntake: e.target.value ? parseFloat(e.target.value) : undefined,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="overReservedTrips">超約車次</Label>
                                            <Input
                                                id="overReservedTrips"
                                                type="number"
                                                min="0"
                                                value={formData.overReservedTrips || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        overReservedTrips: e.target.value ? parseInt(e.target.value) : undefined,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="adjustedTrips">調整車次</Label>
                                            <Input
                                                id="adjustedTrips"
                                                type="number"
                                                min="0"
                                                value={formData.adjustedTrips || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        adjustedTrips: e.target.value ? parseInt(e.target.value) : undefined,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" size="lg">
                                    儲存資料
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
