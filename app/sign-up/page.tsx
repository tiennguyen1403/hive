import type { Metadata } from "next";
import { SignUpScreen } from "@/components/account/SignUpScreen";

export const metadata: Metadata = { title: "Đăng ký" };

export default function SignUpPage() {
  return <SignUpScreen />;
}
