import { AuthThemeWrapper } from "./AuthThemeWrapper";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthThemeWrapper>
      <div className="w-full max-w-md">{children}</div>
    </AuthThemeWrapper>
  );
}
