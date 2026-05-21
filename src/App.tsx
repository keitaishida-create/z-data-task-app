import { useState, useCallback, useMemo } from 'react';
import { isLoggedIn, clearSession, getCurrentPic, getCurrentName } from './api/client';
import { useTasks } from './hooks/useTasks';
import { useOffline } from './hooks/useOffline';
import { LoginScreen } from './components/LoginScreen';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';
import { OfflineBanner } from './components/OfflineBanner';
import type { Task, ViewMode } from './types';
import './App.css';

const ARCHIVE_STATUSES = ['完了', 'キャンセル'];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [view, setView] = useState<ViewMode>('tasks');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const isOffline = useOffline();

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return <MainApp
    view={view}
    setView={setView}
    editingTask={editingTask}
    setEditingTask={setEditingTask}
    showAddForm={showAddForm}
    setShowAddForm={setShowAddForm}
    isOffline={isOffline}
    onLogout={() => { clearSession(); setLoggedIn(false); }}
  />;
}

interface MainAppProps {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  isOffline: boolean;
  onLogout: () => void;
}

function MainApp({
  view, setView, editingTask, setEditingTask,
  showAddForm, setShowAddForm, isOffline, onLogout,
}: MainAppProps) {
  const {
    tasks, categories, statuses, pics, loading, error, reload,
    addTask, updateTask,
  } = useTasks();

  const currentPic = getCurrentPic() || '';
  const currentName = getCurrentName() || currentPic;

  const activeTasks = useMemo(() => tasks.filter(t => !ARCHIVE_STATUSES.includes(t.status)), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => ARCHIVE_STATUSES.includes(t.status)), [tasks]);

  const handleSaveTask = useCallback(async (data: Task | Omit<Task, 'rowIndex'>) => {
    try {
      if ('rowIndex' in data) {
        await updateTask(data);
      } else {
        await addTask(data);
      }
      setEditingTask(null);
      setShowAddForm(false);
    } catch { /* error は useTasks が管理 */ }
  }, [updateTask, addTask, setEditingTask, setShowAddForm]);

  const handleCancelTask = useCallback(async (task: Task) => {
    if (!confirm(`「${task.task}」をキャンセルしますか？`)) return;
    try {
      await updateTask({ ...task, status: 'キャンセル' });
    } catch { /* error は useTasks が管理 */ }
  }, [updateTask]);

  const handleStatusChange = useCallback(async (task: Task, newStatus: string) => {
    try {
      await updateTask({ ...task, status: newStatus });
    } catch { /* error は useTasks が管理 */ }
  }, [updateTask]);

  return (
    <div className="app">
      {isOffline && <OfflineBanner />}

      <header className="app-header">
        <h1>z-data Task</h1>
        <div className="header-actions">
          <span className="header-user">{currentName}</span>
          <button className="icon-btn" onClick={reload} title="更新">↻</button>
          <button className="icon-btn" onClick={onLogout} title="ログアウト">⏻</button>
        </div>
      </header>

      {error && <div className="error-bar">{error}</div>}
      {loading && <div className="loading-bar">読み込み中...</div>}

      <main className="app-main">
        {view === 'tasks' && (
          <TaskList
            tasks={activeTasks}
            statuses={statuses}
            pics={pics}
            currentPic={currentPic}
            isOffline={isOffline}
            onEdit={setEditingTask}
            onCancel={handleCancelTask}
            onStatusChange={handleStatusChange}
          />
        )}
        {view === 'archive' && (
          <TaskList
            tasks={archivedTasks}
            statuses={statuses}
            pics={pics}
            currentPic={currentPic}
            isOffline={isOffline}
            onEdit={setEditingTask}
            onCancel={handleCancelTask}
            onStatusChange={handleStatusChange}
            defaultStatusFilter="all"
          />
        )}
      </main>

      {view === 'tasks' && !isOffline && (
        <button className="fab" onClick={() => setShowAddForm(true)}>+</button>
      )}

      {(showAddForm || editingTask) && (
        <TaskForm
          task={editingTask}
          categories={categories}
          statuses={statuses}
          pics={pics}
          currentPic={currentPic}
          onSave={handleSaveTask}
          onCancel={() => { setEditingTask(null); setShowAddForm(false); }}
        />
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${view === 'tasks' ? 'active' : ''}`}
          onClick={() => setView('tasks')}
        >
          <span className="nav-icon">☰</span>
          <span>タスク</span>
        </button>
        <button
          className={`nav-btn ${view === 'archive' ? 'active' : ''}`}
          onClick={() => setView('archive')}
        >
          <span className="nav-icon">✓</span>
          <span>アーカイブ</span>
        </button>
      </nav>
    </div>
  );
}
