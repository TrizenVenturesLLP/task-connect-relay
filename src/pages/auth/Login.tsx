import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithEmailAndPassword, signInWithPhoneNumber } from "firebase/auth";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const phoneSchema = z.object({ phone: z.string().min(8), code: z.string().min(4).optional() });

type LoginValues = z.infer<typeof loginSchema>;

type WindowWithRecaptcha = Window & { recaptchaVerifier?: RecaptchaVerifier };

export default function Login() {
  useEffect(() => { document.title = "Login | Extrahand"; }, []);

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const confirmationRef = useRef<import("firebase/auth").ConfirmationResult | null>(null);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } });

  const recaptchaId = useMemo(() => `recaptcha-container-${Math.random().toString(36).slice(2)}`,[/* once */]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const w = window as WindowWithRecaptcha;
    if (!w.recaptchaVerifier) {
      try {
        w.recaptchaVerifier = new RecaptchaVerifier(auth!, recaptchaId, { size: "invisible" });
      } catch {/* ignore duplicate init */}
    }
  }, [recaptchaId]);

  const onLogin = async (values: LoginValues) => {
    if (!isFirebaseConfigured) {
      toast.info("Firebase not configured", { description: "Fill src/lib/firebase.ts to enable client login." });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth!, values.email, values.password);
      toast.success("Logged in");
    } catch (e: any) {
      toast.error("Login failed", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!isFirebaseConfigured) {
      toast.info("Firebase not configured", { description: "Fill src/lib/firebase.ts to enable phone OTP." });
      return;
    }
    try {
      const phone = phoneForm.getValues("phone");
      const w = window as WindowWithRecaptcha;
      if (!w.recaptchaVerifier) throw new Error("reCAPTCHA not ready");
      const confirmation = await signInWithPhoneNumber(auth!, phone, w.recaptchaVerifier);
      confirmationRef.current = confirmation;
      setOtpSent(true);
      toast.success("OTP sent");
    } catch (e: any) {
      toast.error("Failed to send OTP", { description: e.message });
    }
  };

  const verifyOtp = async () => {
    try {
      const code = phoneForm.getValues("code") || "";
      await confirmationRef.current?.confirm(code);
      toast.success("Phone verified and signed in");
    } catch (e: any) {
      toast.error("Invalid code", { description: e.message });
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Login</h1>
      </header>

      <section className="space-y-6">
        <article>
          <h2 className="mb-3 text-lg font-medium">Email & Password</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in..." : "Sign in"}</Button>
            </form>
          </Form>
        </article>

        <article>
          <h2 className="mb-3 text-lg font-medium">Phone OTP</h2>
          <div id={recaptchaId} />
          <Form {...phoneForm}>
            <form className="space-y-3" onSubmit={(e)=>{e.preventDefault(); otpSent ? verifyOtp() : sendOtp();}}>
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {otpSent && (
                <FormField
                  control={phoneForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTP code</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" className="w-full">{otpSent ? "Verify OTP" : "Send OTP"}</Button>
            </form>
          </Form>
        </article>
      </section>
    </main>
  );
}
