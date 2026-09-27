import "./OrderSteps.css";

type OrderStepsProps = {
  currentStep: 1 | 2 | 3;
};

const STEPS = [
  { number: "01", label: "メニューを選ぶ" },
  { number: "02", label: "受け取り時間を決める" },
  { number: "03", label: "コードを見せて受け取る" },
] as const;

function OrderSteps({ currentStep }: OrderStepsProps) {
  return (
    <ol className="order-steps" aria-label="ご注文の流れ">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const className =
          stepNumber === currentStep
            ? "order-steps__current"
            : stepNumber < currentStep
              ? "order-steps__complete"
              : "";

        return (
          <li
            className={className}
            aria-current={stepNumber === currentStep ? "step" : undefined}
            key={step.number}
          >
            <span className="order-steps__number">{step.number}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export default OrderSteps;
