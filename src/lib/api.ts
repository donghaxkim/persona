async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  influencers: {
    list: () => fetchAPI<any[]>("/api/influencers"),
    create: (name: string, niche: string) =>
      fetchAPI<any>("/api/influencers", {
        method: "POST",
        body: JSON.stringify({ name, niche }),
      }),
    update: (id: string, patch: { name?: string; niche?: string }) =>
      fetchAPI<any>(`/api/influencers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      fetchAPI<any>(`/api/influencers/${id}`, { method: "DELETE" }),
  },
  references: {
    upload: (influencerId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("influencerId", influencerId);
      return fetchAPI<any>("/api/references/upload", {
        method: "POST",
        body: form,
        headers: {},
      });
    },
    delete: (id: string) =>
      fetchAPI<any>(`/api/references/${id}`, { method: "DELETE" }),
  },
  roster: {
    get: () => fetchAPI<any>("/api/roster"),
    save: (orderData: any[], folders: any[], lastUpdatedAt: string | null) =>
      fetchAPI<any>("/api/roster", {
        method: "PUT",
        body: JSON.stringify({ order_data: orderData, folders, last_updated_at: lastUpdatedAt }),
      }),
  },
  pipeline: {
    create: (influencerId: string, prompt: string, template: string, duration: number, resolution: string) =>
      fetchAPI<{ runId: string; videoId: string }>("/api/pipeline", {
        method: "POST",
        body: JSON.stringify({ influencerId, prompt, template, duration, resolution }),
      }),
    status: (runId: string) =>
      fetchAPI<any>(`/api/pipeline/${runId}`),
    listActive: (influencerId: string) =>
      fetchAPI<any[]>(`/api/pipeline?influencerId=${influencerId}&status=active`),
    advance: (runId: string, body: Record<string, any>) =>
      fetchAPI<any>(`/api/pipeline/${runId}/advance`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    retry: (runId: string) =>
      fetchAPI<any>(`/api/pipeline/${runId}/retry`, {
        method: "PATCH",
      }),
    abandon: (runId: string) =>
      fetchAPI<any>(`/api/pipeline/${runId}`, {
        method: "DELETE",
      }),
  },
};
