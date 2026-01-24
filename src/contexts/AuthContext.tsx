import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import { apiService } from '@/services/api';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        console.log(`[Auth] Attempting login for: ${username}`);
        try {
            const users = await apiService.fetchUsers();
            console.log(`[Auth] Fetched ${users.length} users`);

            const foundUser = users.find(u =>
                String(u.username || "").trim() === String(username || "").trim() &&
                String(u.password || "").trim() === String(password || "").trim()
            );

            if (!foundUser) {
                console.warn(`[Auth] User not found or password mismatch for: ${username}`);
                // Debug: list available usernames (be careful with PII, but this is for debugging internal system)
                console.debug(`[Auth] Available usernames:`, users.map(u => u.username));
                throw new Error('帳號或密碼錯誤');
            }

            // Rescue Logic: If this is the ONLY user and they are an admin, allow login regardless of isApproved
            // This handles cases where the first user was created before the auto-approval fix.
            const isFirstAdminRescue = users.length === 1 && foundUser.role === 'admin';

            if (!foundUser.isApproved && !isFirstAdminRescue) {
                console.warn(`[Auth] User found but not approved: ${username}`);
                throw new Error('您的帳號尚未通過管理員許可，請稍後再試');
            }

            console.log(`[Auth] Login successful: ${username}`);
            setUser(foundUser);
            localStorage.setItem('auth_user', JSON.stringify(foundUser));
        } catch (error) {
            console.error(`[Auth] Login error:`, error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            const existingUsers = await apiService.fetchUsers();
            const isFirstUser = existingUsers.length === 0;
            const role = isFirstUser ? 'admin' : 'user';
            const isApproved = isFirstUser;

            await apiService.registerUser({
                username,
                email,
                password,
                role,
                isApproved
            });
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth_user');
    };

    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
