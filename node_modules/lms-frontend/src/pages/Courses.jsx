import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

export default function CourseView() {
  const [sp] = useSearchParams();
  const id = sp.get("id");
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    if (id) {
      api(`/assignments?courseId=${id}`)
        .then(setAssignments)
        .catch((err) => console.error("Failed to fetch assignments:", err));
    }
  }, [id]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Course Assignments</h1>
      <ul className="space-y-2">
        {assignments.map((a) => (
          <li key={a._id} className="card-base p-4">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-muted">
              Due: {a.dueDate ? new Date(a.dueDate).toLocaleString() : "—"}
            </div>
            <p className="text-sm mt-2">{a.description}</p>
          </li>
        ))}
        {assignments.length === 0 && (
          <li className="text-muted text-sm">No assignments yet.</li>
        )}
      </ul>
    </div>
  );
}
