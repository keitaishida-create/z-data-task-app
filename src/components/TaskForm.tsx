import { useState, useEffect, useMemo, useRef } from 'react';
import type { Task, Category } from '../types';

interface Props {
  task: Task | null; // null = 新規追加
  categories: Category[];
  statuses: string[];
  pics: string[];
  currentPic: string;
  onSave: (task: Task | Omit<Task, 'rowIndex'>) => void;
  onCancel: () => void;
}

export function TaskForm({ task, categories, statuses, pics, currentPic, onSave, onCancel }: Props) {
  const [majorCategory, setMajorCategory] = useState(task?.majorCategory || '');
  const [minorCategory, setMinorCategory] = useState(task?.minorCategory || '');
  const [taskName, setTaskName] = useState(task?.task || '');
  const [assignees, setAssignees] = useState<string[]>(task?.assignees || [currentPic]);
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [status, setStatus] = useState(task?.status || '未着手');
  const userTouchedAssignees = useRef(!!task); // 編集時は触らない

  const majorCategories = useMemo(() => {
    return [...new Set(categories.map(c => c.majorCategory))];
  }, [categories]);

  const minorCategoryObjs = useMemo(() => {
    return categories.filter(c => c.majorCategory === majorCategory);
  }, [categories, majorCategory]);

  // 大カテゴリ変更時に小カテゴリをリセット
  useEffect(() => {
    if (!task && minorCategoryObjs.length > 0 && !minorCategoryObjs.find(c => c.minorCategory === minorCategory)) {
      setMinorCategory(minorCategoryObjs[0].minorCategory);
    }
  }, [majorCategory, minorCategoryObjs, minorCategory, task]);

  // 大カテゴリ初期値
  useEffect(() => {
    if (!task && majorCategories.length > 0 && !majorCategory) {
      setMajorCategory(majorCategories[0]);
    }
  }, [majorCategories, majorCategory, task]);

  // 小カテゴリ変更時に defaultAssignees を反映 (新規 & ユーザーが触ってない時のみ)
  useEffect(() => {
    if (task) return;
    if (userTouchedAssignees.current) return;
    const matched = minorCategoryObjs.find(c => c.minorCategory === minorCategory);
    if (matched && matched.defaultAssignees.length > 0) {
      setAssignees(matched.defaultAssignees);
    }
  }, [minorCategory, minorCategoryObjs, task]);

  const dueDateForInput = useMemo(() => {
    if (!dueDate) return '';
    const m = dueDate.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (m) {
      const year = new Date().getFullYear();
      return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }
    return dueDate;
  }, [dueDate]);

  const handleDueDateChange = (val: string) => {
    if (!val) { setDueDate(''); return; }
    const parts = val.split('-');
    if (parts.length === 3) {
      setDueDate(`${parseInt(parts[1])}/${parseInt(parts[2])}`);
    } else {
      setDueDate(val);
    }
  };

  const toggleAssignee = (pic: string) => {
    userTouchedAssignees.current = true;
    setAssignees(prev =>
      prev.includes(pic) ? prev.filter(p => p !== pic) : [...prev, pic]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    if (assignees.length === 0) return;

    const data = {
      majorCategory,
      minorCategory,
      task: taskName.trim(),
      assignees,
      dueDate,
      status,
    };

    if (task) {
      onSave({ ...data, rowIndex: task.rowIndex });
    } else {
      onSave(data);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>{task ? 'タスク編集' : 'タスク追加'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            大カテゴリ
            <select value={majorCategory} onChange={e => setMajorCategory(e.target.value)}>
              {majorCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            小カテゴリ
            <select value={minorCategory} onChange={e => setMinorCategory(e.target.value)}>
              {minorCategoryObjs.map(c => (
                <option key={c.minorCategory} value={c.minorCategory}>{c.minorCategory}</option>
              ))}
            </select>
          </label>

          <label>
            タスク名
            <input
              type="text"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="タスク名を入力"
              required
              autoFocus
            />
          </label>

          <label>
            担当者
            <div className="assignee-picker">
              {pics.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`assignee-chip ${assignees.includes(p) ? 'selected' : ''}`}
                  onClick={() => toggleAssignee(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </label>

          <label>
            期日
            <input
              type="date"
              value={dueDateForInput}
              onChange={e => handleDueDateChange(e.target.value)}
            />
          </label>

          <label>
            ステータス
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="btn-primary" disabled={assignees.length === 0}>保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
