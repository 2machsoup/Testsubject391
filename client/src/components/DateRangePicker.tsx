import "./DateRangePicker.css";

export type DatePreset = 7 | 30 | 90;

interface DateRangePickerProps {
  activeDays: DatePreset;
  onChange: (days: DatePreset) => void;
}

const PRESETS: { days: DatePreset; label: string }[] = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

export function DateRangePicker({ activeDays, onChange }: DateRangePickerProps) {
  return (
    <div className="date-range-picker">
      {PRESETS.map((preset) => (
        <button
          key={preset.days}
          className={
            "date-range-picker__preset" +
            (preset.days === activeDays ? " date-range-picker__preset--active" : "")
          }
          onClick={() => onChange(preset.days)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
