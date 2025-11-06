import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [health, setHealth] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: "", code: "" });

  useEffect(() => {
    api.health().then(setHealth);
    api.listCourses().then(setCourses);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.code) return;
    const created = await api.addCourse(form);
    setCourses((c) => [...c, created]);
    setForm({ title: "", code: "" });
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>LMS Frontend</h1>
      <p>
        API health:{" "}
        <code>{health ? JSON.stringify(health) : "Checking..."}</code>
      </p>

      <h2>Courses</h2>
      <ul>
        {courses.map((c) => (
          <li key={c.id}>
            <strong>{c.code}</strong> — {c.title}
          </li>
        ))}
      </ul>

      <h3>Add Course</h3>
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          placeholder="Code (unique)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
