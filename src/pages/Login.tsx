import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { login, register, isLoading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!username || !email) {
            setError("請填寫所有欄位");
            return;
        }

        try {
            if (isRegister) {
                await register(username, email);
                setSuccess("註冊成功！請聯繫管理員進行帳號許可。");
                setIsRegister(false);
            } else {
                await login(username, email);
                navigate("/");
            }
        } catch (err: any) {
            setError(err.message || "發生錯誤，請稍後再試");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
            <Card className="w-full max-w-md shadow-lg border-primary/10">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold text-primary">焚化廠營運數據管理系統</CardTitle>
                    <CardDescription>
                        {isRegister ? "註冊新帳號" : "登入系統以繼續"}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {success && (
                            <Alert className="bg-green-50 text-green-700 border-green-200">
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="username">帳號代號</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="例如: USER001"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">電子郵件</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isRegister ? "註冊" : "登入"}
                        </Button>
                        <Button
                            variant="link"
                            className="text-sm text-muted-foreground"
                            type="button"
                            onClick={() => setIsRegister(!isRegister)}
                            disabled={isLoading}
                        >
                            {isRegister ? "已有帳號？返回登入" : "尚未註冊？申請帳號"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
