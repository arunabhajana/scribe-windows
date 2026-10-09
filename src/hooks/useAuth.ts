import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import {
  authStorageKey,
  supabase,
  supabaseConfigured,
} from "../features/auth/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authCallbackError, setAuthCallbackError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        setSession(error ? null : data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthCallback = useCallback(async (rawUrl: string) => {
    if (!supabase) return;
    let callback: URL;
    try {
      callback = new URL(rawUrl);
    } catch {
      return;
    }
    if (
      callback.protocol !== "com.scribe.notes:" ||
      callback.hostname !== "auth" ||
      callback.pathname !== "/callback"
    )
      return;

    const params = callback.searchParams;
    const hash = new URLSearchParams(callback.hash.replace(/^#/, ""));
    const callbackError =
      params.get("error_description") ??
      params.get("error") ??
      hash.get("error_description") ??
      hash.get("error") ??
      hash.get("error_code");
    if (callbackError) {
      setAuthCallbackError(callbackError.replaceAll("+", " "));
      return;
    }

    const code = params.get("code");
    if (code) {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setAuthCallbackError(error?.message ?? "");
      } catch {
        setAuthCallbackError(
          "The confirmation link could not be completed. Please try signing in again.",
        );
      }
      return;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        setAuthCallbackError(error?.message ?? "");
      } catch {
        setAuthCallbackError(
          "The confirmation link could not be completed. Please try signing in again.",
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isTauri()) return;

    let disposed = false;
    let stopListening: (() => void) | undefined;
    void onOpenUrl((urls) => {
      for (const url of urls) void handleAuthCallback(url);
    }).then((unlisten) => {
      if (disposed) unlisten();
      else stopListening = unlisten;
    });
    void getCurrent()
      .then((urls) => {
        if (urls) for (const url of urls) void handleAuthCallback(url);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      stopListening?.();
    };
  }, [handleAuthCallback]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase)
        return "Supabase is not configured. Add the project URL and publishable key to .env.local.";
      setAuthNotice("");
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error) return null;
      if (/email not confirmed/i.test(error.message)) {
        return "Please confirm your email using the link we sent before signing in.";
      }
      return error.message;
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (displayName: string, email: string, password: string) => {
      if (!supabase)
        return {
          error:
            "Supabase is not configured. Add the project URL and publishable key to .env.local.",
          confirmationRequired: false,
        };
      setAuthNotice("");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: isTauri()
            ? "com.scribe.notes://auth/callback"
            : window.location.origin,
        },
      });
      if (error) return { error: error.message, confirmationRequired: false };
      return { error: null, confirmationRequired: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return null;
    setLoading(true);
    setSession(null);
    let remoteError: string | null;
    let storageError: string | null = null;
    try {
      const { error } = await supabase.auth.signOut();
      remoteError = error?.message ?? null;
    } catch (error) {
      remoteError =
        error instanceof Error
          ? error.message
          : "Sign out could not reach Supabase.";
    } finally {
      try {
        localStorage.removeItem(authStorageKey);
      } catch (error) {
        storageError =
          error instanceof Error
            ? error.message
            : "The local session could not be removed.";
      }
      setLoading(false);
    }
    setAuthNotice(
      storageError
        ? "You are signed out of the app, but local session cleanup could not be confirmed. Restart the app before signing in again."
        : remoteError
          ? "You are signed out on this device. Supabase could not confirm remote session revocation; reconnect and sign in again if you need to retry."
          : "",
    );
    return storageError ?? remoteError;
  }, []);

  return {
    user: session?.user ?? null,
    loading,
    configured: supabaseConfigured,
    signInWithPassword,
    signUpWithPassword,
    authCallbackError,
    authNotice,
    signOut,
  };
}
