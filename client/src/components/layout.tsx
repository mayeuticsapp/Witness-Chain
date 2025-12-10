import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  ShieldCheck, 
  Camera, 
  FileText, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  Search,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoIcon from "@assets/generated_images/witnesschain_logo_icon.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Nuova Acquisizione", href: "/capture", icon: Camera },
    { name: "Consegna Corriere", href: "/delivery", icon: Truck },
    { name: "Verifica Pubblica", href: "/verify", icon: Search },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="WitnessChain" className="h-8 w-8" />
          <span className="font-bold text-lg text-primary">WitnessChain</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 border-r border-sidebar-border flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
          <img src={logoIcon} alt="WitnessChain" className="h-8 w-8 rounded-sm" />
          <div>
            <h1 className="font-bold text-lg tracking-tight">WitnessChain</h1>
            <p className="text-[10px] text-sidebar-foreground/60 font-mono uppercase tracking-wider">The Digital Witness</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="bg-sidebar-accent/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-sidebar-foreground/70">eIDAS GATEWAY</span>
            </div>
            <div className="text-xs text-sidebar-foreground/50 font-mono break-all">
              Status: Connected<br/>
              Node: eu-milan-01
            </div>
          </div>
          
          <Link href="/login">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="mr-2 h-4 w-4" />
              Disconnetti
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-secondary/20">
        <div className="container mx-auto max-w-7xl p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}