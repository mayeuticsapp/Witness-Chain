import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Capture from "@/pages/capture";
import Verify from "@/pages/verify";
import ProofDetail from "@/pages/proof-detail";
import DeliveryCapture from "@/pages/delivery";
import MaintenanceCapture from "@/pages/maintenance";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/capture" component={Capture} />
        <Route path="/delivery" component={DeliveryCapture} />
        <Route path="/maintenance" component={MaintenanceCapture} />
        <Route path="/verify" component={Verify} />
        <Route path="/proofs/:id" component={ProofDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
