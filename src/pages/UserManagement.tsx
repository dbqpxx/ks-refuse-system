import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import type { User, UserRole } from '@/types';
import { Loader2, UserCheck, UserX, User as UserIcon } from 'lucide-react';

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleApproval = async (user: User) => {
        try {
            await apiService.updateUser({
                ...user,
                isApproved: !user.isApproved
            });
            loadUsers();
        } catch (error) {
            console.error('Failed to update approval:', error);
        }
    };

    const handleChangeRole = async (user: User, newRole: UserRole) => {
        try {
            await apiService.updateUser({
                ...user,
                role: newRole
            });
            loadUsers();
        } catch (error) {
            console.error('Failed to update role:', error);
        }
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
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">用戶管理</h1>
                <p className="text-muted-foreground mt-2">管理系統存取權限與人員角色</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>使用者列表</CardTitle>
                    <CardDescription>總計 {users.length} 位註冊使用者</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>使用者代號</TableHead>
                                    <TableHead>電子郵件</TableHead>
                                    <TableHead>角色</TableHead>
                                    <TableHead>狀態</TableHead>
                                    <TableHead>註冊時間</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                                {u.username}
                                                {u.id === currentUser?.id && (
                                                    <Badge variant="secondary" className="text-[10px]">目前帳號</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={u.role}
                                                onValueChange={(val) => handleChangeRole(u, val as UserRole)}
                                                disabled={u.id === currentUser?.id}
                                            >
                                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">管理者</SelectItem>
                                                    <SelectItem value="user">使用者</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={u.isApproved ? "default" : "destructive"}>
                                                {u.isApproved ? "已許可" : "待審核"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant={u.isApproved ? "outline" : "default"}
                                                size="sm"
                                                onClick={() => handleToggleApproval(u)}
                                                disabled={u.id === currentUser?.id}
                                                className="h-8 gap-1"
                                            >
                                                {u.isApproved ? (
                                                    <>
                                                        <UserX className="h-3 w-3" />
                                                        <span>取消許可</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCheck className="h-3 w-3" />
                                                        <span>核准登入</span>
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            尚無註冊使用者
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
