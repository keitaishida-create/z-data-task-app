import type { Task, Category, ApiResponse, LoginResult } from '../types';

const GAS_URL = import.meta.env.VITE_GAS_URL || '';

const STORAGE_KEY_TOKEN = 'z_data_token';
const STORAGE_KEY_PIC = 'z_data_pic';
const STORAGE_KEY_NAME = 'z_data_name';
const CACHE_KEY_TASKS = 'z_data_cached_tasks';
const CACHE_KEY_CATEGORIES = 'z_data_cached_categories';
const CACHE_KEY_STATUSES = 'z_data_cached_statuses';
const CACHE_KEY_PICS = 'z_data_cached_pics';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function getCurrentPic(): string | null {
  return localStorage.getItem(STORAGE_KEY_PIC);
}

export function getCurrentName(): string | null {
  return localStorage.getItem(STORAGE_KEY_NAME);
}

export function saveSession(result: LoginResult) {
  localStorage.setItem(STORAGE_KEY_TOKEN, result.token);
  localStorage.setItem(STORAGE_KEY_PIC, result.pic);
  localStorage.setItem(STORAGE_KEY_NAME, result.name);
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_PIC);
  localStorage.removeItem(STORAGE_KEY_NAME);
}

export function isLoggedIn(): boolean {
  return !!getStoredToken() && !!getCurrentPic();
}

function cacheData(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota — 無視 */ }
}

function getCachedData<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function rawCall<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!GAS_URL) throw new Error('GAS URL未設定 (ビルド時に VITE_GAS_URL が必要)');
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ ...body, action }),
    headers: { 'Content-Type': 'text/plain' },
    redirect: 'follow',
  });
  const text = await res.text();
  const json: ApiResponse<T> = JSON.parse(text);
  if (!json.success) throw new Error(json.error || 'APIエラー');
  return json.data as T;
}

async function apiCall<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = getStoredToken();
  const pic = getCurrentPic();
  if (!token || !pic) throw new Error('未ログイン');
  return rawCall<T>(action, { ...body, token, pic });
}

// ===== 認証 =====

export async function login(id: string, password: string): Promise<LoginResult> {
  return rawCall<LoginResult>('login', { id, password });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  await apiCall<unknown>('changePassword', { currentPassword, newPassword });
  return true;
}

// ===== タスク =====

export async function fetchTasks(): Promise<Task[]> {
  try {
    const tasks = await apiCall<Task[]>('getTasks');
    cacheData(CACHE_KEY_TASKS, tasks);
    return tasks;
  } catch (e) {
    if (!navigator.onLine) {
      const cached = getCachedData<Task[]>(CACHE_KEY_TASKS);
      if (cached) return cached;
    }
    throw e;
  }
}

export async function addTask(task: Omit<Task, 'rowIndex'>): Promise<Task[]> {
  const tasks = await apiCall<Task[]>('addTask', task as unknown as Record<string, unknown>);
  cacheData(CACHE_KEY_TASKS, tasks);
  return tasks;
}

export async function updateTask(task: Task): Promise<Task[]> {
  const tasks = await apiCall<Task[]>('updateTask', task as unknown as Record<string, unknown>);
  cacheData(CACHE_KEY_TASKS, tasks);
  return tasks;
}

export async function deleteTask(rowIndex: number): Promise<Task[]> {
  const tasks = await apiCall<Task[]>('deleteTask', { rowIndex });
  cacheData(CACHE_KEY_TASKS, tasks);
  return tasks;
}

// ===== カテゴリ =====

export async function fetchCategories(): Promise<Category[]> {
  try {
    const cats = await apiCall<Category[]>('getCategories');
    cacheData(CACHE_KEY_CATEGORIES, cats);
    return cats;
  } catch (e) {
    if (!navigator.onLine) {
      const cached = getCachedData<Category[]>(CACHE_KEY_CATEGORIES);
      if (cached) return cached;
    }
    throw e;
  }
}

export async function addCategory(majorCategory: string, minorCategory: string, defaultAssignees: string[]): Promise<Category[]> {
  const cats = await apiCall<Category[]>('addCategory', { majorCategory, minorCategory, defaultAssignees });
  cacheData(CACHE_KEY_CATEGORIES, cats);
  return cats;
}

export async function deleteCategory(rowIndex: number): Promise<Category[]> {
  const cats = await apiCall<Category[]>('deleteCategory', { rowIndex });
  cacheData(CACHE_KEY_CATEGORIES, cats);
  return cats;
}

// ===== ステータス =====

export async function fetchStatuses(): Promise<string[]> {
  try {
    const statuses = await apiCall<string[]>('getStatuses');
    cacheData(CACHE_KEY_STATUSES, statuses);
    return statuses;
  } catch (e) {
    if (!navigator.onLine) {
      const cached = getCachedData<string[]>(CACHE_KEY_STATUSES);
      if (cached) return cached;
    }
    throw e;
  }
}

// ===== PIC =====

export async function fetchPics(): Promise<string[]> {
  try {
    const pics = await apiCall<string[]>('getPics');
    cacheData(CACHE_KEY_PICS, pics);
    return pics;
  } catch (e) {
    if (!navigator.onLine) {
      const cached = getCachedData<string[]>(CACHE_KEY_PICS);
      if (cached) return cached;
    }
    throw e;
  }
}
