import { Client, Account, ID, Models } from 'appwrite';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const APPWRITE_ENDPOINT = 'https://singularity-labs.org/v1';
const APPWRITE_PROJECT_ID = '6917d0a50033ebe8d013';
const SESSION_DIR = path.join(os.homedir(), '.zosia');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

interface SessionData {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  jwt: string;
  expiresAt: string;
}

let client: Client;
let account: Account;

function debugLog(message: string): void {
  if (process.env.ZOSIA_DEBUG) {
    console.log(`[AUTH] ${message}`);
  }
}

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    debugLog(`Created session directory: ${SESSION_DIR}`);
  }
}

function saveSession(session: SessionData): void {
  ensureSessionDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
  debugLog(`Session saved for user: ${session.email}`);
}

function loadSession(): SessionData | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      return null;
    }
    const data = fs.readFileSync(SESSION_FILE, 'utf-8');
    const session = JSON.parse(data) as SessionData;
    
    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      debugLog('Session expired, removing');
      fs.unlinkSync(SESSION_FILE);
      return null;
    }
    
    return session;
  } catch (error) {
    debugLog(`Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      debugLog('Session cleared');
    }
  } catch (error) {
    debugLog(`Failed to clear session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function initAuth(): void {
  client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);
  
  account = new Account(client);
  debugLog('Appwrite client initialized');
}

export async function login(email: string, password: string): Promise<SessionData | null> {
  try {
    debugLog(`Attempting login for: ${email}`);

    // Create session with email/password
    const session = await account.createEmailPasswordSession(email, password);

    // Get user info
    const user = await account.get();

    // Create a JWT for future authenticated requests
    const jwtResponse = await account.createJWT();

    // Calculate expiration (JWT expires in 15 minutes by default, session lasts longer)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Use 7 days for session

    const sessionData: SessionData = {
      userId: user.$id,
      email: user.email,
      name: user.name || '',
      sessionId: session.$id,
      jwt: jwtResponse.jwt,
      expiresAt: expiresAt.toISOString(),
    };

    saveSession(sessionData);
    debugLog(`Login successful for: ${email}`);

    return sessionData;
  } catch (error) {
    debugLog(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

export async function logout(): Promise<boolean> {
  try {
    const session = loadSession();
    if (session) {
      try {
        await account.deleteSession('current');
        debugLog('Session deleted from Appwrite');
      } catch (error) {
        debugLog(`Failed to delete session from Appwrite: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    clearSession();
    return true;
  } catch (error) {
    debugLog(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

export function getSession(): SessionData | null {
  const session = loadSession();
  if (session) {
    debugLog(`Session loaded for user: ${session.email}`);
  }
  return session;
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    const session = loadSession();
    if (!session) {
      debugLog('No session found, cannot get current user');
      return null;
    }
    
    // Set the JWT for authenticated requests
    client.setJWT(session.jwt);
    
    const user = await account.get();
    debugLog(`Current user retrieved: ${user.email}`);
    
    return user;
  } catch (error) {
    debugLog(`Failed to get current user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // If we can't get the user, clear the invalid session
    clearSession();
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = loadSession();
  const authenticated = session !== null;
  debugLog(`Authentication status: ${authenticated}`);
  return authenticated;
}

// Initialize the client when module loads
initAuth();