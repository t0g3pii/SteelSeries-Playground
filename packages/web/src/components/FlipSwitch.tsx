import "./FlipSwitch.css";

interface FlipSwitchOption<T extends string> {
  value: T;
  label: string;
}

interface FlipSwitchProps<T extends string> {
  value: T;
  options: [FlipSwitchOption<T>, FlipSwitchOption<T>];
  disabled?: boolean;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function FlipSwitch<T extends string>({
  value,
  options,
  disabled = false,
  onChange,
  ariaLabel = "Auswahl",
}: FlipSwitchProps<T>) {
  const [left, right] = options;
  const isRight = value === right.value;

  return (
    <div
      className={`flip-switch ${isRight ? "is-right" : ""} ${disabled ? "is-disabled" : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={`flip-switch-option ${value === left.value ? "active" : ""}`}
        onClick={() => onChange(left.value)}
        disabled={disabled}
        aria-pressed={value === left.value}
      >
        {left.label}
      </button>
      <button
        type="button"
        className={`flip-switch-option ${value === right.value ? "active" : ""}`}
        onClick={() => onChange(right.value)}
        disabled={disabled}
        aria-pressed={value === right.value}
      >
        {right.label}
      </button>
      <span className="flip-switch-thumb" aria-hidden="true" />
    </div>
  );
}
