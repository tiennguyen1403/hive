import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/account/ForgotPasswordScreen";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
