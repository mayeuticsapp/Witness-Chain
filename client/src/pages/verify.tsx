import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";

export default function Verify() {
  const [, setLocation] = useLocation();
  const [searchId, setSearchId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const proof = await api.getProofById(searchId.trim());
      setIsVerifying(false);
      
      if (proof) {
        setLocation(`/proofs/${proof.proof_id}`);
      } else {
        setError("Nessuna prova trovata con questo ID. Verifica che il codice sia corretto.");
      }
    } catch (err) {
      setIsVerifying(false);
      setError("Errore durante la verifica. Riprova più tardi.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Portale di Verifica Pubblica</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Verifica l'integrità, l'origine e la marcatura temporale di qualsiasi evidenza digitale acquisita tramite il protocollo WitnessChain.
        </p>
      </div>

      <Card className="glass-panel border-2 border-primary/10 shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle>Verifica tramite ID o Hash</CardTitle>
          <CardDescription>Inserisci il Proof ID o l'hash SHA-256 del documento.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  className="pl-10 h-12 text-lg" 
                  placeholder="Inserisci Proof ID (es. 550e8400...)" 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                />
              </div>
              <Button size="lg" className="h-12 px-8" type="submit" disabled={isVerifying || !searchId}>
                {isVerifying ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="h-5 w-5 mr-2" />
                )}
                Verifica
              </Button>
            </div>

            {error && (
              <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="h-5 w-5" />
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-green-100 p-2 rounded-full text-green-600 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Integrità Dati</h4>
                  <p className="text-xs text-muted-foreground mt-1">Verifica crittografica dell'hash del contenuto originale.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Timestamp Qualificato</h4>
                  <p className="text-xs text-muted-foreground mt-1">Conferma della marca temporale eIDAS-compliant.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-purple-100 p-2 rounded-full text-purple-600 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Blockchain Anchor</h4>
                  <p className="text-xs text-muted-foreground mt-1">Prova di esistenza immutabile su registro distribuito.</p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Il sistema verifica la conformità tecnica secondo gli standard ISO/IEC 27037:2012</p>
      </div>
    </div>
  );
}