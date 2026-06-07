import { AuthForm } from "./components/AuthForm";
import { BrandingPanel } from "./components/BrandingPanel";

export default function App() {
  return (
    <div className="flex min-h-screen w-full bg-black text-white">
      {/* Left: branding panel (hidden on mobile) */}
      <div className="relative hidden w-1/2 lg:block">
        <BrandingPanel />
      </div>

      {/* Right: auth form */}
      <div className="relative w-full lg:w-1/2">
        <AuthForm />
      </div>
    </div>
  );
}
