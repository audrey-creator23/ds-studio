import { useEffect, useState } from 'react';
import { request } from './api.js';
import type { TaskId, TaskState, TaskStatus } from '../shared/tasks.js';

// Statuts de la checklist, partagés par le Brief et le Dashboard Volcan.
export function useTasks() {
  const [state, setState] = useState<TaskState>();
  const [error, setError] = useState('');
  useEffect(() => {
    request<TaskState>('tasks').then(setState, (e: Error) =>
      setError(e.message),
    );
  }, []);
  async function update(id: TaskId, status: TaskStatus) {
    if (!state) return;
    const previous = state;
    setState({ statuses: { ...state.statuses, [id]: status } });
    try {
      setState(await request<TaskState>('tasks', { id, status }));
      setError('');
    } catch (e) {
      setState(previous);
      setError((e as Error).message);
    }
  }
  return { state, error, update };
}
