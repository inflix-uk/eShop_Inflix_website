"use client";
import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";
import LoadingBar from "react-top-loading-bar";
import axios from "axios";
import { useAuth } from "@/app/context/Auth"; // Adjust the path to your Auth context
import { getLogoUrl } from "@/app/services/logoService";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [errState, setErrState] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [logoSrc, setLogoSrc] = useState<string>(
    "/1775033425417_1773417790440_aroma_psd_logo__2_.png"
  );
  const [logoAlt, setLogoAlt] = useState<string>("Store logo");

  useEffect(() => {
    let cancelled = false;
    const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!base) return () => void 0;

    const endpoints = [
      `${base}/get/logo/public`,
      `${base}/api/get/logo/public`,
      `${base}/get/logo`,
      `${base}/api/get/logo`,
    ];

    const loadLogo = async () => {
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { method: "GET" });
          if (!res.ok) continue;
          const data = await res.json();
          const resolved = getLogoUrl(data?.data?.logoUrl);
          if (!resolved) continue;
          if (!cancelled) {
            setLogoSrc(resolved);
            setLogoAlt(data?.data?.altText || "Store logo");
          }
          return;
        } catch {
          // try next endpoint
        }
      }
    };

    void loadLogo();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetPass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProgress(50);

    if (email === "") {
      setErr("Enter a valid Email");
      setErrState(true);
      setTimeout(() => {
        setErr("");
        setErrState(false);
      }, 3000);
      setProgress(100);
      return;
    }

    try {
      const response = await axios.post(`${auth.ip}forgotpassword`, { email });
      if (response.data.status === 201) {
        setErr(response.data.message);
        setErrState(false);
        setTimeout(() => {
          setErr("");
          setErrState(false);
        }, 3000);
      } else {
        setErr(response.data.message);
        setErrState(true);
        setTimeout(() => {
          setErr("");
          setErrState(false);
        }, 3000);
      }
    } catch (error: any) {
      setErr("An error occurred. Please try again." + error.message);
      setErrState(true);

    } finally {
      setProgress(100);
    }
  };

  return (
    <>
      <LoadingBar
        color="#046d38"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />

      {/* If you have a toast or notification system, you can integrate it here */}
      {err && (
        <div
          className={`my-2 text-center ${
            errState ? "text-red-600" : "text-green-600"
          }`}
        >
          {err}
        </div>
      )}

      <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Image
            className="mx-auto h-20 w-auto"
            src={logoSrc}
            alt={logoAlt}
            width={384}
            height={195}
            priority
          />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Reset Password
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={resetPass}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Send Password reset link
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
