import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const schema = z.object({ phone: z.string().min(8), code: z.string().min(4).optional() });

type FormValues = z.infer<typeof schema>;

type WindowWithRecaptcha = Window & { recaptchaVerifier?: RecaptchaVerifier };

export default function VerifyPhone() {
  useEffect(() => { document.title = "Verify Phone | Extrahand"; }, []);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<import("firebase/auth").ConfirmationResult | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { phone: "" } });

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const w = window as WindowWithRecaptcha;
    if (!w.recaptchaVerifier) {
      try {
        w.recaptchaVerifier = new RecaptchaVerifier(auth!, "recaptcha-container", { size: "invisible" });
      } catch {/* ignore */}
    }
  }, []);

  const send = async () => {
    if (!isFirebaseConfigured) {
      toast.info("Firebase not configured", { description: "Fill src/lib/firebase.ts to enable phone OTP." });
      return;
    }
    setLoading(true);
    try {
      const w = window as WindowWithRecaptcha;
      const conf = await signInWithPhoneNumber(auth!, form.getValues("phone"), w.recaptchaVerifier!);
      setConfirmation(conf);
      setOtpSent(true);
      toast.success("OTP sent");
    } catch (e: any) {
      toast.error("Failed to send OTP", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await confirmation?.confirm(form.getValues("code") || "");
      toast.success("Phone verified");
    } catch (e: any) {
      toast.error("Invalid code", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Verify your phone</h1>
      </header>
      <div id="recaptcha-container" />
      <Form {...form}>
        <form className="space-y-4" onSubmit={(e)=>{e.preventDefault(); otpSent ? verify() : send();}}>
          <FormField
            control={form.control}
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
              control={form.control}
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
          <Button type="submit" disabled={loading} className="w-full">{otpSent ? "Verify" : "Send OTP"}</Button>
        </form>
      </Form>
    </main>
  );
}
