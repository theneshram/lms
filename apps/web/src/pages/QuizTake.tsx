import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

type Quiz = { _id:string; title:string; questions: { prompt:string; options?:string[] }[] };

export default function QuizTake(){
  const { id } = useParams();
  const [quiz, setQuiz] = useState<Quiz|null>(null);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(()=>{ api.get(/quizzes/).then(r=>setQuiz(r.data)); },[id]);
  if(!quiz) return null;

  function setAns(i:number, val:any){
    const copy = [...responses];
    copy[i] = val; setResponses(copy);
  }

  async function submit(){
    const res = await api.post(/quizzes//attempt, { responses });
    alert(Score: );
  }

  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-3">{quiz.title}</h2>
      <div className="space-y-3">
        {quiz.questions.map((q, i)=> (
          <div key={i} className="border rounded p-3">
            <div className="font-medium mb-2">Q{i+1}. {q.prompt}</div>
            <div className="space-y-1">
              {q.options?.map((opt, oi)=> (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" name={q-} onChange={()=>setAns(i, oi)} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 px-3 py-2 bg-black text-white rounded" onClick={submit}>Submit</button>
    </Layout>
  );
}