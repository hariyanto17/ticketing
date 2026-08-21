import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

interface DateTimePickerProps {
  mode?: "date" | "time" | "datetime";
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  mode = "datetime",
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position coordinates state
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Calendar states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Internal values
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHours, setSelectedHours] = useState(12);
  const [selectedMinutes, setSelectedMinutes] = useState(0);

  // Initialize values
  useEffect(() => {
    if (value) {
      if (mode === "time") {
        const [h, m] = value.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          setSelectedHours(h);
          setSelectedMinutes(m);
        }
      } else if (mode === "date") {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
        }
      } else {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setSelectedHours(d.getHours());
          setSelectedMinutes(0);
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
        }
      }
    } else {
      setSelectedDate(null);
      setSelectedHours(12);
      setSelectedMinutes(0);
    }
  }, [value, mode, isOpen]);

  // Position calculation logic
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = mode === "datetime" ? 480 : 320;
      const popoverHeight = mode === "datetime" ? 380 : 300;

      let left = rect.left;
      // Adjust horizontally to stay within viewport
      if (left + popoverWidth > window.innerWidth) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }

      // Check vertical space (open upwards if limited below)
      let top = rect.bottom + window.scrollY + 8;
      if (rect.bottom + popoverHeight > window.innerHeight && rect.top > popoverHeight) {
        top = rect.top + window.scrollY - popoverHeight - 8;
      }

      setCoords({ top, left, width: rect.width });
    }
  };

  // Event listeners for window changes
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true); // capture-phase captures modal scrolls

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // Outside click & Escape listener
  useEffect(() => {
    const handleOutsideInteraction = (event: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideInteraction);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Calendar logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };

  const adjustHours = (amount: number) => {
    setSelectedHours((prev) => (prev + amount + 24) % 24);
  };

  const adjustMinutes = (amount: number) => {
    setSelectedMinutes((prev) => (prev + amount + 60) % 60);
  };

  const handleConfirm = () => {
    if (mode === "time") {
      const hStr = String(selectedHours).padStart(2, "0");
      const mStr = String(selectedMinutes).padStart(2, "0");
      onChange(`${hStr}:${mStr}`);
    } else if (mode === "date") {
      if (!selectedDate) {
        onChange(null);
      } else {
        const yStr = selectedDate.getFullYear();
        const mStr = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dStr = String(selectedDate.getDate()).padStart(2, "0");
        onChange(`${yStr}-${mStr}-${dStr}`);
      }
    } else {
      if (!selectedDate) {
        onChange(null);
      } else {
        const yStr = selectedDate.getFullYear();
        const mStr = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dStr = String(selectedDate.getDate()).padStart(2, "0");
        const hStr = String(selectedHours).padStart(2, "0");
        const minStr = String(selectedMinutes).padStart(2, "0");
        onChange(`${yStr}-${mStr}-${dStr}T${hStr}:${minStr}`);
      }
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder || (mode === "time" ? "Select time" : mode === "date" ? "Select date" : "Select date and time");

    if (mode === "time") return value;

    if (mode === "date") {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].substring(0, 3)} ${d.getFullYear()} • ${hours}:${minutes}`;
  };

  const isDaySelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const isDateDisabled = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    if (minDate) {
      const checkMin = new Date(minDate);
      checkMin.setHours(0, 0, 0, 0);
      if (dateToCheck < checkMin) return true;
    }
    if (maxDate) {
      const checkMax = new Date(maxDate);
      checkMax.setHours(23, 59, 59, 999);
      if (dateToCheck > checkMax) return true;
    }
    return false;
  };

  // Render the Popover inside a react portal attached to document.body
  const renderPopover = () => {
    if (!isOpen) return null;

    const popoverWidthClass = mode === "datetime" ? "w-[320px] sm:w-[480px]" : "w-[320px]";

    return createPortal(
      <div
        ref={popoverRef}
        style={{
          position: "absolute",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
        }}
        className={`z-[9999] p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xl rounded-2xl select-none text-zinc-900 dark:text-zinc-100 ${popoverWidthClass}`}
      >
        <div className={`grid grid-cols-1 ${mode === "datetime" ? "sm:grid-cols-[1fr_auto] gap-4" : ""}`}>

          {/* Calendar Picker Column */}
          {(mode === "date" || mode === "datetime") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-855 rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-855 rounded-lg cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const isSel = isDaySelected(day);
                  const isTod = isToday(day);
                  const isDis = isDateDisabled(day);

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      disabled={isDis}
                      onClick={() => handleDateSelect(day)}
                      className={`py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${isSel
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : isTod
                          ? "bg-zinc-150 dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-850"
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time Picker Column */}
          {(mode === "time" || mode === "datetime") && (
            <div className={`flex flex-col justify-center px-4 ${mode === "datetime" ? "border-t sm:border-t-0 sm:border-l border-zinc-150 dark:border-zinc-800 pt-4 sm:pt-0 sm:pl-4" : ""}`}>
              <span className="text-xs font-semibold text-zinc-450 uppercase tracking-wider block mb-2 text-center sm:text-left">
                Time
              </span>
              <div className="flex items-center justify-center gap-4 text-center">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => adjustHours(-1)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-650 dark:text-zinc-400 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 rounded-lg min-w-[40px]">
                    {String(selectedHours).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustHours(1)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-650 dark:text-zinc-400 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xl font-bold">:</span>

                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => adjustMinutes(-5)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-855 rounded-lg text-zinc-650 dark:text-zinc-400 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 rounded-lg min-w-[40px]">
                    {String(selectedMinutes).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustMinutes(5)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-855 rounded-lg text-zinc-650 dark:text-zinc-400 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action Controls Footer */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-zinc-500 hover:text-rose-500 cursor-pointer"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg cursor-pointer bg-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </div>

      </div>,
      document.body
    );
  };

  return (
    <div className={`flex flex-col gap-1 w-full relative ${className}`}>
      {label && (
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border text-left ${error
          ? "border-rose-500 focus:ring-rose-500/20"
          : "border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20"
          } rounded-xl text-sm ${value ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
          } focus:outline-none focus:ring-2 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span>{getDisplayValue()}</span>
        {mode === "time" ? (
          <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        ) : (
          <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        )}
      </button>

      {error && <span className="text-xs text-rose-500 mt-0.5">{error}</span>}

      {renderPopover()}
    </div>
  );
};
