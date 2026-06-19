import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Calculator from "@/pages/Calculator";
import Journal from "@/pages/Journal";
import NotFound from "@/pages/not-found";
import { CalculatorIcon, BookOpen } from "lucide-react";

const queryClient = new QueryClient();

function Nav() {
  const [location] = useLocation();
  return (
    <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-border/50">
      <Link href="/">
        <button
          data-testid="nav-calculator"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
            location === "/"
              ? "bg-card text-primary border-x border-t border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalculatorIcon size={13} />
          Calculator
        </button>
      </Link>
      <Link href="/journal">
        <button
          data-testid="nav-journal"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
            location === "/journal"
              ? "bg-card text-primary border-x border-t border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={13} />
          Journal
        </button>
      </Link>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-3 px-3">
      <div className="w-full max-w-[480px] flex flex-col">
        {/* Bot header */}
        <div className="flex items-center gap-2.5 bg-secondary border border-border px-4 py-2.5 rounded-t-2xl sticky top-3 z-10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            📊
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-foreground">LotCalc Bot</div>
            <div className="text-xs text-green-400 font-medium">● online</div>
          </div>
        </div>
        <Nav />
        <div className="bg-card border-x border-b border-border rounded-b-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Calculator} />
        <Route path="/journal" component={Journal} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}
