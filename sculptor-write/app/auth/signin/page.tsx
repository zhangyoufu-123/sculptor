"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg(result.error);
        setState("error");
      } else {
        setState("success");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0d0d0d",
        color: "#e0d8c8",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "32px 24px",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 8,
            color: "#e0d8c8",
            textAlign: "center",
          }}
        >
          Sign in with Email
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#8a8578",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Enter your email to receive a magic link
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #2a2a2a",
              backgroundColor: "#1a1a1a",
              color: "#e0d8c8",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#c4a565";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#2a2a2a";
            }}
          />

          <button
            type="submit"
            disabled={state === "loading"}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 16,
              fontWeight: 500,
              borderRadius: 8,
              border: "none",
              backgroundColor:
                state === "loading" ? "#3a3028" : "#c4a565",
              color: state === "loading" ? "#8a8578" : "#0d0d0d",
              cursor: state === "loading" ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
            }}
          >
            {state === "loading" ? "Sending link..." : "Send Magic Link"}
          </button>
        </form>

        {state === "success" && (
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              borderRadius: 8,
              backgroundColor: "#1a2a1a",
              border: "1px solid #2a4a2a",
              color: "#8cc88c",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Check your email! We sent a magic link to{" "}
            <strong>{email}</strong>.
          </div>
        )}

        {state === "error" && (
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              borderRadius: 8,
              backgroundColor: "#2a1a1a",
              border: "1px solid #4a2a2a",
              color: "#c88c8c",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
