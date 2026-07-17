import { useEffect, useRef } from "react";
import { readKeybindings } from "../config/keybindings";

export default function useKeyboard() {
  const keysRef = useRef({});

  useEffect(() => {
    let bindings = readKeybindings();
    const refreshBindings = (event) => { bindings = event?.detail || readKeybindings(); };
    const setActionState = (code, value) => {
      Object.entries(bindings).forEach(([action, boundCode]) => {
        if (boundCode === code) keysRef.current[action] = value;
      });
      // Keep raw codes available for older systems and third-party extensions.
      keysRef.current[code] = value;
    };
    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      setActionState(event.code, true);
      if ([bindings.jump, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    };
    const onKeyUp = (event) => setActionState(event.code, false);
    const clearKeys = () => { keysRef.current = {}; };

    window.addEventListener("voxel:keybindings-changed", refreshBindings);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("voxel:keybindings-changed", refreshBindings);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);

  return keysRef;
}
