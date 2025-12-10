import { useRoute, useLocation } from "wouter";
import { useProofById } from "@/lib/hooks";
import { Manifest } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  FileCheck, 
  Database, 
  Hash, 
  User, 
  Download,
  Share2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Copy,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";

export default function ProofDetail() {
  const [match, params] = useRoute("/proofs/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!match || !params) return null;

  const { data: proof, isLoading, error } = useProofById(params.id);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WitnessChain - Prova Certificata',
          text: `Visualizza la prova certificata: ${params.id}`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl);
        }
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Link copiato",
        description: "Il link è stato copiato negli appunti",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!proof) return;
    
    setDownloading(true);
    
    try {
      const reportContent = generateReportHTML(proof);
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `WitnessChain_Report_${proof.proof_id.substring(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report scaricato",
        description: "Il report è stato scaricato con successo",
      });
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile generare il report",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Caricamento prova...</p>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">Prova non trovata</h1>
        <Button onClick={() => setLocation("/")}>Torna alla Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dettaglio Prova</h1>
          <p className="text-muted-foreground font-mono text-xs">{proof.proof_id}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
            {copied ? "Copiato!" : "Condividi"}
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} disabled={downloading} data-testid="button-download">
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Scarica Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Evidence Card */}
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden glass-panel">
            <div className="bg-black/5 flex items-center justify-center overflow-hidden relative">
              {proof.capture.file_type.startsWith('audio/') ? (
                <div className="w-full p-8 flex flex-col items-center gap-4">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileCheck className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{proof.capture.file_name}</p>
                  <audio 
                    controls 
                    className="w-full max-w-md"
                    data-testid="audio-player"
                  >
                    <source src={proof.capture.preview_url} type={proof.capture.file_type} />
                    Il tuo browser non supporta l'elemento audio.
                  </audio>
                </div>
              ) : proof.capture.file_type.startsWith('video/') ? (
                <video 
                  controls 
                  className="w-full aspect-video"
                  data-testid="video-player"
                >
                  <source src={proof.capture.preview_url} type={proof.capture.file_type} />
                  Il tuo browser non supporta l'elemento video.
                </video>
              ) : proof.capture.file_type.startsWith('image/') && proof.capture.preview_url ? (
                <div className="aspect-video w-full relative group">
                  <img 
                    src={proof.capture.preview_url} 
                    alt="Evidence" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary">Visualizza Originale</Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full flex flex-col items-center justify-center gap-2">
                  <FileCheck className="h-24 w-24 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">{proof.capture.file_name}</p>
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{proof.context.site}</CardTitle>
                  <CardDescription>{proof.context.client} • {proof.context.workflow_step}</CardDescription>
                </div>
                <StatusBadge status={proof.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Timeline Eventi
                </h3>
                <div className="relative border-l-2 border-muted ml-2 space-y-6 pl-6 py-2">
                  {proof.audit.log_chain.map((log, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium uppercase tracking-wide">{log.event.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(log.ts), "dd MMM yyyy HH:mm:ss", { locale: it })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Hash className="h-3 w-3" /> Impronta Digitale (SHA-256)
                  </h4>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {proof.capture.content_hash}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Geolocalizzazione
                  </h4>
                  <div className="text-sm bg-muted p-2 rounded flex justify-between items-center">
                    <span>{proof.capture.gps.lat.toFixed(6)}, {proof.capture.gps.lng.toFixed(6)}</span>
                    <Badge variant="outline" className="text-[10px]">±{proof.capture.gps.accuracy_m}m</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Validation Status */}
          <Card className="glass-panel border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Validazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Integrità File</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Firma Dispositivo</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              {proof.tsa && (
                <div className="flex items-center justify-between text-sm">
                  <span>Marca Temporale (eIDAS)</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              )}
              {proof.blockchain_anchor && (
                <div className="flex items-center justify-between text-sm">
                  <span>Blockchain Anchor</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              )}
              {proof.integrity_checks && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>AI Integrity Score</span>
                    <span className={proof.integrity_checks.score > 0.9 ? "text-green-600" : "text-amber-600"}>
                      {(proof.integrity_checks.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${proof.integrity_checks.score * 100}%` }} 
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actor Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Operatore
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">ID Utente:</span>
                <span className="font-mono text-right">{proof.actor.user_id}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Ruolo:</span>
                <span className="text-right capitalize">{proof.actor.role}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Device ID:</span>
                <span className="font-mono text-right truncate pl-4" title={proof.actor.device_id}>
                  {proof.actor.device_id}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Info */}
          {proof.blockchain_anchor && (
            <Card className="bg-slate-950 text-slate-50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  On-Chain Anchor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Network</span>
                  <div className="font-medium">{proof.blockchain_anchor.chain}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Transaction ID</span>
                  <div className="font-mono text-xs break-all text-slate-300">
                    {proof.blockchain_anchor.txid}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Merkle Root</span>
                  <div className="font-mono text-xs break-all text-slate-300">
                    {proof.blockchain_anchor.merkle_root}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Visualizza su Explorer
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function generateReportHTML(proof: Manifest): string {
  const timestamp = proof.capture.timestamp_local 
    ? format(new Date(proof.capture.timestamp_local), "dd MMMM yyyy HH:mm:ss", { locale: it })
    : "N/A";
  
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Prova - WitnessChain</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0066cc; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .subtitle { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
    h1 { font-size: 20px; margin: 30px 0 10px; color: #333; }
    .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
    .row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 500; font-family: monospace; word-break: break-all; max-width: 60%; text-align: right; }
    .hash { background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; word-break: break-all; margin-top: 10px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .status.certified { background: #dbeafe; color: #1d4ed8; }
    .status.anchored { background: #dcfce7; color: #16a34a; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #666; font-size: 12px; }
    .valid { color: #16a34a; }
    @media print { body { padding: 20px; } .section { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">WitnessChain</div>
    <div class="subtitle">Certificato di Prova Digitale</div>
  </div>
  
  <div class="section">
    <div class="row">
      <span class="label">ID Prova</span>
      <span class="value">${proof.proof_id}</span>
    </div>
    <div class="row">
      <span class="label">Stato</span>
      <span class="status ${proof.status}">${proof.status.toUpperCase()}</span>
    </div>
    <div class="row">
      <span class="label">Data Acquisizione</span>
      <span class="value">${timestamp}</span>
    </div>
  </div>

  <h1>Contesto</h1>
  <div class="section">
    <div class="row">
      <span class="label">Sito</span>
      <span class="value">${proof.context.site}</span>
    </div>
    <div class="row">
      <span class="label">Cliente</span>
      <span class="value">${proof.context.client}</span>
    </div>
    <div class="row">
      <span class="label">Workflow</span>
      <span class="value">${proof.context.workflow_step || '-'}</span>
    </div>
  </div>

  <h1>Operatore</h1>
  <div class="section">
    <div class="row">
      <span class="label">ID Utente</span>
      <span class="value">${proof.actor.user_id}</span>
    </div>
    <div class="row">
      <span class="label">Ruolo</span>
      <span class="value">${proof.actor.role}</span>
    </div>
    <div class="row">
      <span class="label">Device ID</span>
      <span class="value">${proof.actor.device_id}</span>
    </div>
  </div>

  <h1>Integrità Digitale</h1>
  <div class="section">
    <div class="row">
      <span class="label">Nome File</span>
      <span class="value">${proof.capture.file_name}</span>
    </div>
    <div class="row">
      <span class="label">Tipo File</span>
      <span class="value">${proof.capture.file_type}</span>
    </div>
    <div class="row">
      <span class="label">Geolocalizzazione</span>
      <span class="value">${proof.capture.gps.lat.toFixed(6)}, ${proof.capture.gps.lng.toFixed(6)} (±${proof.capture.gps.accuracy_m}m)</span>
    </div>
    <div>
      <span class="label">Hash SHA-256</span>
      <div class="hash">${proof.capture.content_hash}</div>
    </div>
  </div>

  ${proof.tsa ? `
  <h1>Marca Temporale</h1>
  <div class="section">
    <div class="row">
      <span class="label">Provider</span>
      <span class="value">${proof.tsa.provider}</span>
    </div>
    <div class="row">
      <span class="label">Timestamp TSA</span>
      <span class="value">${proof.tsa.tsa_timestamp ? format(new Date(proof.tsa.tsa_timestamp), "dd/MM/yyyy HH:mm:ss") : '-'}</span>
    </div>
    <div class="row">
      <span class="label">Stato</span>
      <span class="value valid">Verificato</span>
    </div>
  </div>
  ` : ''}

  ${proof.blockchain_anchor ? `
  <h1>Ancoraggio Blockchain</h1>
  <div class="section">
    <div class="row">
      <span class="label">Network</span>
      <span class="value">${proof.blockchain_anchor.chain}</span>
    </div>
    <div class="row">
      <span class="label">Transaction ID</span>
      <span class="value" style="font-size: 10px;">${proof.blockchain_anchor.txid}</span>
    </div>
    <div>
      <span class="label">Merkle Root</span>
      <div class="hash">${proof.blockchain_anchor.merkle_root}</div>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Documento generato automaticamente da WitnessChain</p>
    <p>Questo report costituisce prova digitale con valore legale ai sensi del Regolamento eIDAS</p>
    <p>Generato il: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</p>
  </div>
</body>
</html>`;
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
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}