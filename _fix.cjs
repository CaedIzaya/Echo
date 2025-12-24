const fs = require("fs");
let t = fs.readFileSync("src/pages/dashboard/EchoSpirit.tsx","utf8");
const newBlock = `const handleInteract = () => {
    if (isAnimating) return;

    // 捕获点击瞬间的外部状态，避免闭包落后
    const capturedStateAtClick = state;

    if (onClick) onClick();
    if (disableInternalAnimationOnClick) return;

    // �?idle（如处于 highfive/highfive-success）时不触发内部随机动�?    if (capturedStateAtClick !== "idle") return;

    setIsAnimating(true);

    const actions: ("happy" | "nod" | "excited")[] = ["happy", "nod", "excited"];
    const nextState = actions[Math.floor(Math.random() * actions.length)];
    setCurrentState(nextState);
    if (onStateChange) onStateChange(nextState);

    timerRef.current = setTimeout(() => {
      setIsAnimating(false);
      setCurrentState("idle");
      if (onStateChange) onStateChange("idle");
    }, 2000);
  };`;

t = t.replace(/const handleInteract = \(\) => \{[\s\S]*?\};/, newBlock);
fs.writeFileSync("src/pages/dashboard/EchoSpirit.tsx", t);
