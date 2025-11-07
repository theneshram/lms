import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

type QuizQuestion = {
  prompt: string;
  options?: string[];
};

type Quiz = {
  _id: string;
  title: string;
  questions: QuizQuestion[];
};

type AttemptResult = {
  score: number;
  total?: number;
  correctIndexes?: number[]; // adjust to whatever your API returns
};

export default function QuizTake() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [responses, setResponses] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<Quiz>(`/quizzes/${id}`)
      .then((r) => {
        setQuiz(r.data);
        // reset responses to empty for each question
        setResponses(Array(r.data.questions.length).fill(-1));
      })
      .finally(() => setLoading(false));
  }, [id]);

  function setAns(qIndex: number, optionIndex: number) {
    setResponses((prev) => {
      const copy = [...prev];
      copy[qIndex] = optionIndex;
      return copy;
    });
  }

  async function submit() {
    if (!id) return;
    const res = await api.post<AttemptResult>(`/quizzes/${id}/attempt`, { responses });
    const { score, total } = res.data;
    alert(`Score: ${score}${typeof total === 'number' ? ` / ${total}` : ''}`);
  }

  if (loading) return <Layout>Loading…</Layout>;
  if (!quiz) return <Layout>Quiz not found.</Layout>;

  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-3">{quiz.title}</h2>
      <div className="space-y-3">
        {quiz.questions.map((q, i) => (
          <div key={i} className="border rounded p-3">
            <div className="font-medium mb-2">Q{i + 1}. {q.prompt}</div>

            <div className="space-y-1">
              {(q.options ?? []).map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${i}`}               // string, not arithmetic
                    checked={responses[i] === oi} // keep UI in sync
                    onChange={() => setAns(i, oi)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="mt-4 px-3 py-2 bg-black text-white rounded disabled:opacity-50"
        onClick={submit}
        disabled={responses.some((r) => r < 0)} // optional: require all answered
      >
        Submit
      </button>
    </Layout>
  );
}
