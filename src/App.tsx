import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NewInvoices from "./pages/NewInvoices";
import NewInvoiceEditor from "./pages/NewInvoiceEditor";
import Companies from "./pages/Companies";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Salaries from "./pages/Salaries";
import Contracts from "./pages/Contracts";
import NotFound from "./pages/NotFound";
import { InvoiceLayout } from "./components/InvoiceLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<InvoiceLayout><Dashboard /></InvoiceLayout>} />
          <Route path="/budgeteer" element={<InvoiceLayout><Index /></InvoiceLayout>} />
          <Route path="/invoices" element={<InvoiceLayout><NewInvoices /></InvoiceLayout>} />
          <Route path="/invoices/new" element={<InvoiceLayout><NewInvoiceEditor /></InvoiceLayout>} />
          <Route path="/invoices/:id" element={<InvoiceLayout><NewInvoiceEditor /></InvoiceLayout>} />
          <Route path="/salaries" element={<InvoiceLayout><Salaries /></InvoiceLayout>} />
          <Route path="/contracts" element={<InvoiceLayout><Contracts /></InvoiceLayout>} />
          <Route path="/companies" element={<InvoiceLayout><Companies /></InvoiceLayout>} />
          <Route path="/clients" element={<InvoiceLayout><Clients /></InvoiceLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
