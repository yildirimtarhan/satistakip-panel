"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function IdefixQAPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [answering, setAnswering] = useState(null);
  const [answerBody, setAnswerBody] = useState("");

  const fetchQuestions = () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError("");
    fetch(`/api/idefix/questions/filter?page=${page}&limit=20`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setQuestions(d.questions || []);
        else setError(d.message || "Sorular yüklenemedi.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchQuestions();
    else setLoading(false);
  }, [page]);

  const submitAnswer = async (q) => {
    if (!answerBody.trim()) return;
    setAnswering(q.id);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/idefix/questions/${q.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer_body: answerBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Cevap gönderilemedi");
      setAnswerBody("");
      setAnswering(null);
      fetchQuestions();
    } catch (e) {
      alert(e.message);
      setAnswering(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-700 mb-2">İdefix Soru Cevap</h1>
      <p className="text-sm text-gray-500 mb-6">Müşteri sorularını listeleyin ve cevaplayın.</p>
      <Link href="/dashboard/api-settings?tab=idefix" className="text-amber-600 hover:underline text-sm mb-4 inline-block">API Ayarları</Link>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      {loading && !questions.length ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : !questions.length ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">Soru bulunamadı.</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-xs text-gray-500">#{q.id}</span>
                  <span className="ml-2 text-sm font-medium text-gray-700">{q.product ?? "—"}</span>
                </div>
                <span className="text-xs text-gray-400">{q.createdAt ? new Date(q.createdAt).toLocaleDateString("tr-TR") : ""}</span>
              </div>
              <p className="mt-2 text-gray-800">{q.question ?? "—"}</p>
              {q.productQuestionAnswer?.length > 0 && (
                <div className="mt-2 pl-3 border-l-2 border-amber-200 text-sm text-gray-600">
                  {q.productQuestionAnswer.map((a) => (
                    <div key={a.id}>Cevap: {a.answerBody}</div>
                  ))}
                </div>
              )}
              {(!q.productQuestionAnswer || q.productQuestionAnswer.length === 0) && (
                <div className="mt-3">
                  {answering === q.id ? (
                    <div>
                      <textarea
                        value={answerBody}
                        onChange={(e) => setAnswerBody(e.target.value)}
                        placeholder="Cevabınızı yazın..."
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows={3}
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => submitAnswer(q)} className="px-3 py-1.5 bg-amber-500 text-white rounded text-sm">Gönder</button>
                        <button onClick={() => { setAnswering(null); setAnswerBody(""); }} className="px-3 py-1.5 border rounded text-sm">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAnswering(q.id)} className="text-sm text-amber-600 hover:underline">Cevap yaz</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
