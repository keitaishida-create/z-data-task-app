import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
  statuses: string[];
  pics: string[];
  currentPic: string;
  isOffline: boolean;
  onEdit: (task: Task) => void;
  onCancel: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: string) => void;
  defaultStatusFilter?: string;
}

const STATUS_COLORS: Record<string, string> = {
  '未着手': '#9e9e9e',
  '実行中': '#1976d2',
  '完了': '#388e3c',
  'キャンセル': '#c62828',
  '外部依頼中': '#f57c00',
};

function isDueToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return false;
  const now = new Date();
  return parseInt(m[1]) === now.getMonth() + 1 && parseInt(m[2]) === now.getDate();
}

function isDuePast(dateStr: string): boolean {
  if (!dateStr) return false;
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(now.getFullYear(), parseInt(m[1]) - 1, parseInt(m[2]));
  return d < now;
}

function useSwipeRight(onSwipe: () => void) {
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swiping.current) {
      e.preventDefault();
      onSwipe();
    }
  }, [onSwipe]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (dx > 80 && dy < 40) {
      swiping.current = true;
    }
  }, []);

  return { onTouchStart, onTouchEnd, onTouchMove };
}

export function TaskList({ tasks, statuses, pics, currentPic, isOffline, onEdit, onCancel, onStatusChange, defaultStatusFilter }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatusFilter || 'active');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('me'); // 'all' | 'me' | <PIC>
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [swipeTarget, setSwipeTarget] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    // ステータスフィルタ
    if (statusFilter === 'active') {
      list = list.filter(t => t.status !== '完了' && t.status !== 'キャンセル');
    } else if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter);
    }
    // 担当者フィルタ
    if (assigneeFilter === 'me') {
      list = list.filter(t => t.assignees.includes(currentPic));
    } else if (assigneeFilter !== 'all') {
      list = list.filter(t => t.assignees.includes(assigneeFilter));
    }
    return list;
  }, [tasks, statusFilter, assigneeFilter, currentPic]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(t => {
      const list = map.get(t.majorCategory) || [];
      list.push(t);
      map.set(t.majorCategory, list);
    });
    return map;
  }, [filteredTasks]);

  // 初回は全展開
  useEffect(() => {
    if (expandedCategories.size === 0 && grouped.size > 0) {
      setExpandedCategories(new Set(grouped.keys()));
    }
  }, [grouped, expandedCategories.size]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const overdueCount = useMemo(() =>
    filteredTasks.filter(t => isDuePast(t.dueDate) && t.status !== '完了' && t.status !== 'キャンセル').length,
    [filteredTasks]
  );

  return (
    <div className="task-list">
      {overdueCount > 0 && (
        <div className="overdue-banner">
          ⚠ 期限切れのタスクが {overdueCount} 件あります
        </div>
      )}

      <div className="filter-bar">
        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
          <option value="me">自分 ({currentPic})</option>
          <option value="all">全員</option>
          {pics.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="active">未完了</option>
          <option value="all">すべて</option>
          {statuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="task-count">{filteredTasks.length}件</span>
      </div>

      {Array.from(grouped.entries()).map(([category, categoryTasks]) => (
        <div key={category} className="category-group">
          <div className="category-header" onClick={() => toggleCategory(category)}>
            <span className="category-toggle">{expandedCategories.has(category) ? '▼' : '▶'}</span>
            <span className="category-name">{category}</span>
            <span className="category-count">{categoryTasks.length}</span>
          </div>
          {expandedCategories.has(category) && (
            <div className="category-tasks">
              {categoryTasks.map(task => (
                <TaskCard
                  key={task.rowIndex}
                  task={task}
                  isOffline={isOffline}
                  onEdit={onEdit}
                  onCancel={onCancel}
                  onSwipeRight={() => setSwipeTarget(task)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {filteredTasks.length === 0 && (
        <div className="empty-state">タスクがありません</div>
      )}

      {swipeTarget && (
        <div className="modal-overlay" onClick={() => setSwipeTarget(null)}>
          <div className="swipe-popup" onClick={e => e.stopPropagation()}>
            <h3>ステータスを変更</h3>
            <p className="swipe-popup-task">{swipeTarget.task}</p>
            <div className="swipe-popup-statuses">
              {statuses.map(s => (
                <button
                  key={s}
                  className={`swipe-status-btn ${s === swipeTarget.status ? 'current' : ''}`}
                  style={{ borderColor: STATUS_COLORS[s] || '#757575', color: s === swipeTarget.status ? '#fff' : (STATUS_COLORS[s] || '#757575'), backgroundColor: s === swipeTarget.status ? (STATUS_COLORS[s] || '#757575') : 'transparent' }}
                  disabled={s === swipeTarget.status}
                  onClick={() => { onStatusChange(swipeTarget, s); setSwipeTarget(null); }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="swipe-btn-close" onClick={() => setSwipeTarget(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, isOffline, onEdit, onCancel, onSwipeRight }: {
  task: Task;
  isOffline: boolean;
  onEdit: (task: Task) => void;
  onCancel: (task: Task) => void;
  onSwipeRight: () => void;
}) {
  const swipe = useSwipeRight(onSwipeRight);
  const overdue = isDuePast(task.dueDate) && task.status !== '完了' && task.status !== 'キャンセル';

  return (
    <div
      className={`task-card ${overdue ? 'overdue' : ''}`}
      onClick={() => !isOffline && onEdit(task)}
      onTouchStart={!isOffline ? swipe.onTouchStart : undefined}
      onTouchMove={!isOffline ? swipe.onTouchMove : undefined}
      onTouchEnd={!isOffline ? swipe.onTouchEnd : undefined}
    >
      <div className="task-top">
        <span className="task-minor">{task.minorCategory}</span>
        <span
          className="task-status"
          style={{ backgroundColor: STATUS_COLORS[task.status] || '#757575' }}
        >
          {task.status}
        </span>
      </div>
      <div className="task-name">{task.task}</div>
      <div className="task-assignees">
        {task.assignees.map(a => (
          <span key={a} className="task-assignee-chip">{a}</span>
        ))}
      </div>
      <div className="task-bottom">
        <span className={`task-due ${isDueToday(task.dueDate) ? 'due-today' : ''} ${overdue ? 'due-overdue' : ''}`}>
          {task.dueDate ? (overdue ? `⚠ 期限切れ (${task.dueDate})` : `期日: ${task.dueDate}`) : '期日なし'}
        </span>
        {!isOffline && task.status !== '完了' && task.status !== 'キャンセル' && (
          <button
            className="task-cancel-btn"
            onClick={e => { e.stopPropagation(); onCancel(task); }}
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}
