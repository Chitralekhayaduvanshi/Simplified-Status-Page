import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import AddApplication from './components/AddApplication';
import { Button } from './components/ui/button';
import UserNav from './components/UserNav';
import ServiceManagement from './components/ServiceManagement';
import IncidentManagement from './components/IncidentManagement';
import { WebSocketProvider } from './contexts/WebSocketContext';
import PublicStatusPage from './components/PublicStatusPage';

const queryClient = new QueryClient();

// Get this from your Clerk Dashboard
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey!}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <Router>
            <Routes>
              <Route path="/status" element={<PublicStatusPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-background">
                      <nav className="border-b">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                          <div className="flex h-16 items-center justify-between">
                            <div className="flex gap-4">
                              <Link to="/">
                                <Button variant="ghost">Dashboard</Button>
                              </Link>
                              <Link to="/services">
                                <Button variant="ghost">Services</Button>
                              </Link>
                              <Link to="/incidents">
                                <Button variant="ghost">Incidents</Button>
                              </Link>
                              <Link to="/add">
                                <Button variant="ghost">Add Application</Button>
                              </Link>
                            </div>
                            <UserNav />
                          </div>
                        </div>
                      </nav>
                      <Dashboard />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
              <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
              <Route
                path="/services"
                element={
                  <ProtectedRoute>
                    <ServiceManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <IncidentManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add"
                element={
                  <ProtectedRoute>
                    <AddApplication />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </WebSocketProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App; 
