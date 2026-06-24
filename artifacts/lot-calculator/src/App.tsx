import { Router as WouterRouter, Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Calculator from "@/pages/Calculator";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-3 px-3">
      <div className="w-full max-w-[480px] flex flex-col">
        <div className="flex items-center gap-2.5 bg-secondary border border-border px-4 py-2.5 rounded-t-2xl sticky top-3 z-10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            📊
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-foreground">LotCalc Bot</div>
            <div className="text-xs text-green-400 font-medium">● online</div>
          </div>
        </div>
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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}>
        <Router />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}
