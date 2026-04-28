import { usePersistentState } from "./usePersistentState.js";

const STORAGE_KEY = "life-improver:custom-practices:v1";

// Lets users append their own practices to any sub. Stored under the same
// `${domainId}-${subIndex}` key shape as scores. Custom practices live in
// localStorage and never modify the curated framework data.
const key = (domainId, subIndex) => `${domainId}-${subIndex}`;

export function useCustomPractices() {
  const [practices, setPractices] = usePersistentState(STORAGE_KEY, {});

  const list = (domainId, subIndex) => practices[key(domainId, subIndex)] || [];

  const add = (domainId, subIndex, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPractices(prev => {
      const k = key(domainId, subIndex);
      return { ...prev, [k]: [...(prev[k] || []), trimmed] };
    });
  };

  const remove = (domainId, subIndex, index) =>
    setPractices(prev => {
      const k = key(domainId, subIndex);
      const next = (prev[k] || []).filter((_, i) => i !== index);
      const out = { ...prev };
      if (next.length) out[k] = next;
      else delete out[k];
      return out;
    });

  return { list, add, remove };
}
