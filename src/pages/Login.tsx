import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold text-primary">焚化廠營運數據管理系統</CardTitle>
                    <CardDescription>請輸入帳號密碼以登入系統</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="example@gmail.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">密碼</Label>
                        <Input id="password" type="password" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full">登入</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
