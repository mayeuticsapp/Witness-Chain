import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, 
  Clock, 
  FileCheck, 
  Database, 
  Search,
  ArrowRight,
  TrendingUp,
  Activity,
  Euro,
  Zap,
  Loader2
} from "lucide-react";
import { useProofs } from "@/lib/hooks";
import { Manifest } from "@/lib/mock-data";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: proofs = [], isLoading, error } = useProofs();

  const filteredProofs = proofs.filter(p => 
    p.context.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.context.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proof_id.includes(searchTerm)
  );

  const stats = [
    { label: "Prove Certificate", value: proofs.length, icon: ShieldCheck, color: "text-green-500" },
    { label: "Contenziosi Prevenuti", value: "85%", icon: TrendingUp, color: "text-blue-500" },
    { label: "Storage WORM", value: "1.2 GB", icon: Database, color: "text-purple-500" },
    { label: "Audit Score Medio", value: "99.2%", icon: Activity, color: "text-primary" },
  ];

  const chartData = [
    { name: 'Lun', proofs: 4 },
    { name: 'Mar', proofs: 7 },
    { name: 'Mer', proofs: 5 },
    { name: 'Gio', proofs: 12 },
    { name: 'Ven', proofs: 9 },
    { name: 'Sab', proofs: 3 },
    { name: 'Dom', proofs: 2 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Forense</h1>
          <p className="text-muted-foreground mt-1">
            "Scatola nera" digitale: monitoraggio in tempo reale delle prove con valore legale.
          </p>
        </div>
        <Link href="/capture">
          <Button className="shadow-lg shadow-primary/20 h-12 px-6 text-lg">
            <Zap className="mr-2 h-5 w-5 fill-current" />
            Nuova Acquisizione Rapida
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-panel border-l-4 border-l-primary/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="text-2xl font-bold mt-1">{stat.value}</div>
              </div>
              <stat.icon className={`h-8 w-8 opacity-80 ${stat.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Business Model & Value Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-panel bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Euro className="mr-2 h-5 w-5 text-primary" />
              Valore Generato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€ 12.450</div>
            <p className="text-xs text-muted-foreground mt-1">Risparmio stimato su liti evitate questo mese</p>
            <div className="mt-4 text-xs font-mono bg-primary/10 p-2 rounded text-primary border border-primary/20">
              ROI: 15x rispetto al costo licenza
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
               <ShieldCheck className="mr-2 h-5 w-5 text-green-600" />
               Stato Conformità
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm">Timestamp eIDAS</span>
               <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Attivo</Badge>
             </div>
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm">WORM Storage</span>
               <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Attivo</Badge>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-sm">Blockchain Anchor</span>
               <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Ethereum L2</Badge>
             </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
               <Activity className="mr-2 h-5 w-5 text-blue-500" />
               Licenze Attive
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold">12 / 15</div>
             <p className="text-xs text-muted-foreground mt-1">Dispositivi attivi sul campo</p>
             <div className="w-full bg-secondary h-2 rounded-full mt-4 overflow-hidden">
               <div className="bg-primary h-full w-[80%] rounded-full" />
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 md:grid-cols-7">
        
        {/* Recent Activity List */}
        <Card className="md:col-span-4 lg:col-span-5 glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Registro Prove Immutabile</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cerca per ID, Cliente, Sito..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              Ogni riga rappresenta un evento legalmente opponibile certificato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-muted-foreground">
                Errore nel caricamento delle prove. Riprova più tardi.
              </div>
            ) : filteredProofs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? "Nessuna prova trovata." : "Nessuna prova ancora. Crea la prima acquisizione!"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProofs.map((proof) => (
                <div 
                  key={proof.proof_id} 
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-accent/50 transition-all cursor-pointer"
                >
                  <Link href={`/proofs/${proof.proof_id}`} className="flex-1 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                      {proof.capture.file_type.includes("image") ? (
                        <img src={proof.capture.preview_url} className="h-full w-full object-cover" alt="preview" />
                      ) : (
                        <FileCheck className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{proof.context.site}</h3>
                        <StatusBadge status={proof.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground font-mono">
                          ID: {proof.proof_id.substring(0, 8)}...
                        </p>
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> eIDAS
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <div className="hidden md:flex flex-col items-end gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(proof.capture.timestamp_local), "dd MMM HH:mm", { locale: it })}
                    </div>
                    {proof.blockchain_anchor && (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-mono">
                        <Database className="h-3 w-3" />
                        ANCHORED
                      </div>
                    )}
                  </div>
                  <Link href={`/proofs/${proof.proof_id}`}>
                    <Button variant="ghost" size="icon" className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Chart */}
        <Card className="md:col-span-3 lg:col-span-2 glass-panel flex flex-col">
          <CardHeader>
            <CardTitle>Volume Acquisizioni</CardTitle>
            <CardDescription>Trend settimanale</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px]">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProofs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="proofs" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorProofs)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-500">+12.5%</span>
                <span className="text-muted-foreground">rispetto alla settimana scorsa</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Manifest['status'] }) {
  const styles = {
    captured: "bg-slate-100 text-slate-700 border-slate-200",
    processing: "bg-amber-100 text-amber-700 border-amber-200",
    certified: "bg-blue-100 text-blue-700 border-blue-200",
    anchored: "bg-green-100 text-green-700 border-green-200",
  };

  const labels = {
    captured: "ACQUISITO",
    processing: "IN CODA",
    certified: "CERTIFICATO",
    anchored: "ANCORATO",
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}