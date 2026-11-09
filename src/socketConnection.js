export function waitForSocketConnection(socket, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error("Gameverse connection abhi initialize ho rahi hai. Ek baar phir try karo."));
    if (socket.connected) return resolve();
    let lastError = "";
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      callback(value);
    };
    const onConnect = () => finish(resolve);
    const onError = (error) => { lastError = error?.message || "Socket connection failed"; };
    const timer = setTimeout(() => finish(reject, new Error(lastError ? `Server connection failed: ${lastError}` : "Server se connection nahi bana. PC par dono servers running hain ya nahi check karo.")), timeoutMs);
    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
    if (!socket.connected) socket.connect();
  });
}
