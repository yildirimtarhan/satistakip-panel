"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrendyolQAPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answering, setAnswering] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const fetchQuestions = () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    fetch("/api/trendyol/questions", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setQuestions(d.questions || []);
        else setError(d.message || "Sorular yüklenemedi.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetchQuestions(), []);

  const submitAnswer = async (q) => {
    if (!answerText.trim()) return;
    setAnswering(q.id);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/trendyol/questions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ questionId: q.id, answer: answerText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Cevap gönderilemedi");
      setAnswerText("");
      setAnswering(null);
      fetchQuestions();
    } catch (e) {
      alert(e.message);
      setAnswering(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Soru Cevap</h1>
      <p className="text-slate-600 mb-6">Müşteri sorularını görüntüleyin ve cevaplayın.</p>
      <div className="flex gap-3 mb-6">
        <button
          onClick={fetchQuestions}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          Yenile
        </button>
        <Link href="/dashboard/api-settings?tab=trendyol" className="text-orange-600 hover:underline py-2">
          API Ayarları
        </Link>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          {error}
          <p className="text-sm mt-1">Soru-Cevap rolü API anahtarında aktif olmalı.</p>
        </div>
      )}
      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Yükleniyor…</p>
        ) : questions.length === 0 ? (
          <p className="text-slate-500">Bekleyen soru yok.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-sm text-slate-500 mb-1">#{q.id} · {q.status ?? "—"}</p>
              <p className="font-medium text-slate-800">{q.question ?? q.text ?? "—"}</p>
              {q.productName && (
                <p className="text-sm text-slate-600 mt-1">Ürün: {q.productName}</p>
              )}
              {answering === q.id ? (
                <div className="mt-3">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Cevabınız..."
                    rows={3}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => submitAnswer(q)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm"
                    >
                      Gönder
                    </button>
                    <button
                      onClick={() => { setAnswering(null); setAnswerText(""); }}
                      className="px-4 py-2 bg-slate-200 rounded-lg text-sm"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAnswering(q.id)}
                  className="mt-2 text-orange-600 hover:underline text-sm font-medium"
                >
                  Cevap yaz
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
