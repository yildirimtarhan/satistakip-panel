"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABELS = { 1: "Cevap bekliyor", 2: "Cevaplandı", 3: "Reddedildi", 4: "Otomatik kapatıldı" };

export default function HepsiburadaQAPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("1"); // 1=WaitingForAnswer
  const [answering, setAnswering] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const fetchQuestions = () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError("");
    fetch(`/api/hepsiburada/questions?status=${status}&size=50`, {
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

  useEffect(() => fetchQuestions(), [status]);

  const submitAnswer = async (q) => {
    if (!answerText.trim()) return;
    setAnswering(q.issueNumber ?? q.id ?? q.number);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hepsiburada/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          questionId: q.issueNumber ?? q.id ?? q.number,
          answer: answerText.trim(),
        }),
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

  const getQuestion = (q) => q.question ?? q.subject ?? q.text ?? q.description ?? "—";
  const getProduct = (q) => q.productName ?? q.productTitle ?? q.merchantSku ?? "";
  const getQId = (q) => q.issueNumber ?? q.id ?? q.number ?? "";

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Soru Cevap</h1>
      <p className="text-slate-600 mb-6">Müşteri sorularını görüntüleyin ve cevaplayın (Satıcıya Sor).</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="1">Cevap bekliyor</option>
          <option value="2">Cevaplandı</option>
          <option value="4">Otomatik kapatıldı</option>
          <option value="">Tümü</option>
        </select>
        <button
          onClick={fetchQuestions}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
        >
          Yenile
        </button>
        <Link href="/dashboard/api-settings" className="text-orange-600 hover:underline py-2 text-sm">
          API Ayarları
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          {error}
          <p className="text-sm mt-1">Soru-Cevap yetkisi ve servis anahtarı gerekebilir.</p>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Yükleniyor…</p>
        ) : questions.length === 0 ? (
          <p className="text-slate-500">Seçili durumda soru yok.</p>
        ) : (
          questions.map((q) => (
            <div key={getQId(q) || Math.random()} className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-sm text-slate-500 mb-1">
                #{getQId(q)} · {STATUS_LABELS[q.status] ?? q.status ?? "—"}
              </p>
              <p className="font-medium text-slate-800">{getQuestion(q)}</p>
              {getProduct(q) && (
                <p className="text-sm text-slate-600 mt-1">Ürün: {getProduct(q)}</p>
              )}
              {q.createdAt && (
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(q.createdAt).toLocaleString("tr-TR")}
                </p>
              )}
              {answering === getQId(q) ? (
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
                      onClick={() => {
                        setAnswering(null);
                        setAnswerText("");
                      }}
                      className="px-4 py-2 bg-slate-200 rounded-lg text-sm"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                q.status === 1 && (
                  <button
                    onClick={() => setAnswering(getQId(q))}
                    className="mt-2 text-orange-600 hover:underline text-sm font-medium"
                  >
                    Cevap yaz
                  </button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
