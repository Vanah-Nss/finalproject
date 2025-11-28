import { useEffect, useState } from "react";

export default function Toast({ message, type = "info", duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration - 300);
    const removeTimer = setTimeout(() => onClose(), duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-100 text-green-800"
      : type === "error"
      ? "bg-red-100 text-red-800"
      : "bg-blue-100 text-blue-800";

  return (
    <div
      className={`p-4 rounded-lg shadow-lg mb-2 w-80 max-w-full transition-transform duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } ${bgColor}`}
    >
      {message}
      <div
        className="h-1 bg-current mt-2 rounded-full"
        style={{
          animation: `progressBar ${duration}ms linear forwards`,
        }}
      />
    </div>
  );
}
