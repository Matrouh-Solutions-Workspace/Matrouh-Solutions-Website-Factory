const steps = [
  { id: "identity", label: "Identity" },
  { id: "design", label: "Design" },
  { id: "content", label: "Content" },
  { id: "review", label: "Review & publish" },
] as const;

export type DraftSetupStep = (typeof steps)[number]["id"];

export function draftSetupStep(value: string | undefined): DraftSetupStep {
  return steps.some((step) => step.id === value) ? (value as DraftSetupStep) : "identity";
}

export function DraftSetupSteps({
  current,
  websiteId,
}: {
  current: DraftSetupStep;
  websiteId: string;
}) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <nav aria-label="Website setup progress" className="draftSetupProgress">
      <ol>
        {steps.map((step, index) => (
          <li
            className={index === currentIndex ? "current" : index < currentIndex ? "complete" : ""}
            key={step.id}
          >
            <a
              aria-current={index === currentIndex ? "step" : undefined}
              href={`/websites/${websiteId}?setupStep=${step.id}`}
            >
              <span>{index + 1}</span>
              {step.label}
            </a>
          </li>
        ))}
      </ol>
      <div className="draftSetupActions">
        {currentIndex > 0 && (
          <a
            className="secondaryButton"
            href={`/websites/${websiteId}?setupStep=${steps[currentIndex - 1]?.id}`}
          >
            Back
          </a>
        )}
        {currentIndex < steps.length - 1 && (
          <a
            className="buttonLink"
            href={`/websites/${websiteId}?setupStep=${steps[currentIndex + 1]?.id}`}
          >
            Continue
          </a>
        )}
      </div>
    </nav>
  );
}
