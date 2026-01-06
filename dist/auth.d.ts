import { Models } from 'appwrite';
interface SessionData {
    userId: string;
    email: string;
    name: string;
    sessionId: string;
    jwt: string;
    expiresAt: string;
}
export declare function initAuth(): void;
export declare function login(email: string, password: string): Promise<SessionData | null>;
export declare function logout(): Promise<boolean>;
export declare function getSession(): SessionData | null;
export declare function getCurrentUser(): Promise<Models.User<Models.Preferences> | null>;
export declare function isAuthenticated(): boolean;
export {};
//# sourceMappingURL=auth.d.ts.map