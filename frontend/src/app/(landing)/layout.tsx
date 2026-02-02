import { LandingThemeWrapper } from "@/widgets/landing/landing-theme-wrapper";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LandingThemeWrapper>{children}</LandingThemeWrapper>;
}
