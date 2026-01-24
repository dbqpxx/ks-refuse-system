import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import { apiService } from '@/services/api';

interface AuthContextType {
    user: User | null;
    login: (username: string, email: string) => Promise<void>;
    register: (username: string, email: string) => Promise<void>;
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

    const login = async (username: string, email: string) => {
        setIsLoading(true);
        try {
            const users = await apiService.fetchUsers();
            const foundUser = users.find(u => u.username === username && u.email === email);

            if (!foundUser) {
                throw new Error('帳號或電子郵件錯誤');
            }

            if (!foundUser.isApproved) {
                throw new Error('您的帳號尚未通過管理員許可，請稍後再試');
            }

            setUser(foundUser);
            localStorage.setItem('auth_user', JSON.stringify(foundUser));
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, email: string) => {
        setIsLoading(true);
        try {
            const existingUsers = await apiService.fetchUsers();
            const role = existingUsers.length === 0 ? 'admin' : 'user';

            await apiService.registerUser({
                username,
                email,
                role
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
