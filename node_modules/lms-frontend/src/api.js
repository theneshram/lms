const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
export const api = {
  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  },
  async listCourses() {
    const res = await fetch(`${API_BASE}/api/courses`);
    return res.json();
  },
  async addCourse(payload) {
    const res = await fetch(`${API_BASE}/api/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
