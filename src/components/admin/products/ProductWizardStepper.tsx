"use client";

import { Check } from "lucide-react";

interface ProductWizardStepperProps {
  currentStep: number;
  completedSteps?: number[];
}

export function ProductWizardStepper({ currentStep, completedSteps = [] }: ProductWizardStepperProps) {
  const steps = [
    { number: 1, label: "Análise Visual (IA)", id: "analise" },
    { number: 2, label: "Estúdio Criativo", id: "estudio" },
    { number: 3, label: "Detalhes de Venda", id: "venda" },
  ];

  const getStepStatus = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber) || stepNumber < currentStep) {
      return "completed";
    }
    if (stepNumber === currentStep) {
      return "active";
    }
    return "pending";
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Product Creation Wizard
      </h1>
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    status === "completed"
                      ? "bg-green-500 text-white"
                      : status === "active"
                      ? "bg-blue-600 text-white ring-4 ring-blue-200"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {status === "completed" ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    status === "active"
                      ? "text-blue-600"
                      : status === "completed"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step.number < currentStep
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

