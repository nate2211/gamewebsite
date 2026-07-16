import { useEffect, useRef } from "react";

export default function useKeyboard() {
  const keysRef = useRef({});

  useEffect(() => {
    const onKeyDown = (event) => {
      keysRef.current[event.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event) => {
      keysRef.current[event.code] = false;
    };

    const clearKeys = () => {
      keysRef.current = {};
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);

  return keysRef;
}
