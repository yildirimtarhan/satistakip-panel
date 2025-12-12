// 📁 components/EDonusum/Wizard.js

"use client";
import { useState } from "react";

export default function Wizard({ steps }) {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const CurrentStep = steps[step].component;

  return (
    <div className="space-y-6">

      {/* Üstte adım göstergesi */}
      <div className="flex justify-center gap-3">
        {steps.map((s, index) => (
          <div
            key={index}
            className={`px-4 py-2 rounded-lg text-sm font-semibold 
              ${index === step ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-700"}
            `}
          >
            {s.title}
          </div>
        ))}
      </div>

      {/* Adım İçeriği */}
      <div className="bg-white shadow rounded-xl p-5">
        <CurrentStep next={next} back={back} />
      </div>

    </div>
  );
}
