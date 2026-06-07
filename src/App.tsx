import { AuthForm } from "./components/AuthForm";
import { BrandingPanel } from "./components/BrandingPanel";

export default function App() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-black text-white lg:flex-row">
      {/* Left: branding panel (hidden on mobile) */}
      <div className="relative hidden w-full lg:block lg:w-1/2">
        <BrandingPanel />
      </div>

      {/* Right: auth form */}
      <div className="relative w-full lg:w-1/2">
        <AuthForm />
      </div>
    </div>
  );
}
