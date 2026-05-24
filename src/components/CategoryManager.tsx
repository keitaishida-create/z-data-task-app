import { useState, useMemo } from 'react';
import type { Category } from '../types';

interface Props {
  categories: Category[];
  pics: string[];
  isOffline: boolean;
  onAdd: (major: string, minor: string, defaultAssignees: string[]) => void;
  onDelete: (rowIndex: number) => void;
}

export function CategoryManager({ categories, pics, isOffline, onAdd, onDelete }: Props) {
  const [newMajor, setNewMajor] = useState('');
  const [newMinor, setNewMinor] = useState('');
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories.forEach(c => {
      const list = map.get(c.majorCategory) || [];
      list.push(c);
      map.set(c.majorCategory, list);
    });
    return map;
  }, [categories]);

  const majorCategorySuggestions = useMemo(
    () => [...new Set(categories.map(c => c.majorCategory))],
    [categories]
  );

  const toggleAssignee = (pic: string) => {
    setNewAssignees(prev =>
      prev.includes(pic) ? prev.filter(p => p !== pic) : [...prev, pic]
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMajor.trim() || !newMinor.trim()) return;
    onAdd(newMajor.trim(), newMinor.trim(), newAssignees);
    setNewMajor('');
    setNewMinor('');
    setNewAssignees([]);
    setShowForm(false);
  };

  return (
    <div className="category-manager">
      <div className="section-header">
        <h2>カテゴリ管理</h2>
        {!isOffline && (
          <button className="btn-small" onClick={() => setShowForm(!showForm)}>
            {showForm ? '閉じる' : '+ 追加'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="category-form-vertical" onSubmit={handleAdd}>
          <label>
            大カテゴリ
            <input
              type="text"
              placeholder="例: 経営 / Z_営業 など"
              value={newMajor}
              onChange={e => setNewMajor(e.target.value)}
              list="major-suggestions"
              required
            />
            <datalist id="major-suggestions">
              {majorCategorySuggestions.map(m => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>

          <label>
            小カテゴリ
            <input
              type="text"
              placeholder="例: 戦略・計画策定"
              value={newMinor}
              onChange={e => setNewMinor(e.target.value)}
              required
            />
          </label>

          <label>
            担当者(目安) <span className="label-hint">— 新規タスクの初期担当者として使われる</span>
            <div className="assignee-picker">
              {pics.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`assignee-chip ${newAssignees.includes(p) ? 'selected' : ''}`}
                  onClick={() => toggleAssignee(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </label>

          <button type="submit" className="btn-primary">追加</button>
        </form>
      )}

      {Array.from(grouped.entries()).map(([major, items]) => (
        <div key={major} className="cat-group">
          <div className="cat-major">{major}</div>
          {items.map(c => (
            <div key={c.rowIndex} className="cat-item">
              <div className="cat-item-main">
                <span className="cat-minor-name">{c.minorCategory}</span>
                {c.defaultAssignees.length > 0 && (
                  <span className="cat-default-assignees">
                    {c.defaultAssignees.map(a => (
                      <span key={a} className="task-assignee-chip">{a}</span>
                    ))}
                  </span>
                )}
              </div>
              {!isOffline && (
                <button
                  className="cat-delete-btn"
                  onClick={() => {
                    if (confirm(`「${c.majorCategory} > ${c.minorCategory}」を削除しますか？`)) {
                      onDelete(c.rowIndex);
                    }
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
