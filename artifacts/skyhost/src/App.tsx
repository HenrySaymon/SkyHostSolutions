import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

// Public Pages
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import ServiceDetail from "@/pages/ServiceDetail";
import Pricing from "@/pages/Pricing";
import Testimonials from "@/pages/Testimonials";
import About from "@/pages/About";
import Contact from "@/pages/Contact";

// Auth Pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import AdminLogin from "@/pages/auth/AdminLogin";

// Client Portal
import ClientDashboard from "@/pages/dashboard/ClientDashboard";
import ClientOrders from "@/pages/dashboard/ClientOrders";
import ClientInvoices from "@/pages/dashboard/ClientInvoices";
import ClientInvoiceDetail from "@/pages/dashboard/ClientInvoiceDetail";
import ClientTickets from "@/pages/dashboard/ClientTickets";
import NewTicket from "@/pages/dashboard/NewTicket";
import ClientTicketDetail from "@/pages/dashboard/ClientTicketDetail";
import ClientSettings from "@/pages/dashboard/ClientSettings";

// Admin Portal
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminClients from "@/pages/admin/AdminClients";
import AdminClientProfile from "@/pages/admin/AdminClientProfile";
import AdminServices from "@/pages/admin/AdminServices";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminTickets from "@/pages/admin/AdminTickets";
import AdminTicketDetail from "@/pages/admin/AdminTicketDetail";
import AdminAdminUsers from "@/pages/admin/AdminAdminUsers";
import AdminAppearance from "@/pages/admin/AdminAppearance";
import AdminPayments from "@/pages/admin/AdminPayments";

const queryClient = new QueryClient();

function PublicLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Pages */}
      <Route path="/">
        <PublicLayout><Home /></PublicLayout>
      </Route>
      <Route path="/services">
        <PublicLayout><Services /></PublicLayout>
      </Route>
      <Route path="/services/:id">
        <PublicLayout><ServiceDetail /></PublicLayout>
      </Route>
      <Route path="/pricing">
        <PublicLayout><Pricing /></PublicLayout>
      </Route>
      <Route path="/testimonials">
        <PublicLayout><Testimonials /></PublicLayout>
      </Route>
      <Route path="/about">
        <PublicLayout><About /></PublicLayout>
      </Route>
      <Route path="/contact">
        <PublicLayout><Contact /></PublicLayout>
      </Route>
      
      {/* Auth Pages */}
      <Route path="/login">
        <PublicLayout><Login /></PublicLayout>
      </Route>
      <Route path="/register">
        <PublicLayout><Register /></PublicLayout>
      </Route>
      <Route path="/admin/login">
        <PublicLayout><AdminLogin /></PublicLayout>
      </Route>

      {/* Client Portal */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientDashboard />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/orders">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientOrders />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/invoices">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientInvoices />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/invoices/:id">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientInvoiceDetail />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/tickets">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientTickets />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/tickets/new">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <NewTicket />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/tickets/:id">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientTicketDetail />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/settings">
        <ProtectedRoute>
          <PublicLayout>
            <DashboardLayout>
              <ClientSettings />
            </DashboardLayout>
          </PublicLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Portal */}
      <Route path="/admin">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/clients">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminClients />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/services">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminServices />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/orders">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminOrders />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/invoices">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminInvoices />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/tickets">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminTickets />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/tickets/:id">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminTicketDetail />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/clients/:id">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminClientProfile />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/users">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminAdminUsers />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/appearance">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminAppearance />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>
      <Route path="/admin/payments">
        <AdminRoute>
          <PublicLayout showFooter={false}>
            <AdminLayout>
              <AdminPayments />
            </AdminLayout>
          </PublicLayout>
        </AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppearanceProvider>
              <CurrencyProvider>
                <Router />
              </CurrencyProvider>
            </AppearanceProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
