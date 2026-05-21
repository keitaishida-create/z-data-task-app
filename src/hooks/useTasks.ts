import { useState, useEffect, useCallback } from 'react';
import type { Task, Category } from '../types';
import * as api from '../api/client';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [pics, setPics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, c, s, p] = await Promise.all([
        api.fetchTasks(),
        api.fetchCategories(),
        api.fetchStatuses(),
        api.fetchPics(),
      ]);
      setTasks(t);
      setCategories(c);
      setStatuses(s);
      setPics(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddTask = useCallback(async (task: Omit<Task, 'rowIndex'>) => {
    setLoading(true);
    try {
      const updated = await api.addTask(task);
      setTasks(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'タスク追加に失敗しました');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateTask = useCallback(async (task: Task) => {
    setLoading(true);
    try {
      const updated = await api.updateTask(task);
      setTasks(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'タスク更新に失敗しました');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteTask = useCallback(async (rowIndex: number) => {
    setLoading(true);
    try {
      const updated = await api.deleteTask(rowIndex);
      setTasks(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'タスク削除に失敗しました');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tasks,
    categories,
    statuses,
    pics,
    loading,
    error,
    reload: loadAll,
    addTask: handleAddTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
  };
}
