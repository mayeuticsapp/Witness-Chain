import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  Mic, 
  FileText,
  UploadCloud,
  X,
  ShieldCheck,
  Zap
} from "lucide-react";
import { addProof, Manifest } from "@/lib/mock-data";
import { v4 as uuidv4 } from "uuid";

export default function Capture() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"capture" | "details" | "uploading" | "complete">("capture");
  const [mediaType, setMediaType] = useState<"photo" | "audio" | "note">("photo");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<{lat: number, lng: number} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Form State
  const [client, setClient] = useState("");
  const [site, setSite] = useState("");
  const [notes, setNotes] = useState("");

  // Start Camera
  useEffect(() => {
    if (step === "capture" && mediaType === "photo" && !capturedImage) {
      startCamera();
    }
    return () => stopCamera();
  }, [step, mediaType, capturedImage]);

  // Get Location
  useEffect(() => {
    // Mock location for demo
    setTimeout(() => {
      setLocationData({ lat: 45.4642, lng: 9.1900 });
    }, 1000);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      // Fallback for demo if no camera
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL("image/jpeg"));
      stopCamera();
    } else {
      // Fallback mock image
      setCapturedImage("https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop");
    }
  };

  const handleSubmit = async () => {
    setStep("uploading");
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    const newProof: Manifest = {
      proof_id: uuidv4(),
      protocol_version: "1.0.0",
      status: "processing",
      actor: {
        user_id: "TECH-DEMO",
        role: "technician",
        device_id: "BROWSER-CLIENT"
      },
      context: {
        intervention_id: `INT-${Math.floor(Math.random() * 1000)}`,
        site: site || "Sito Non Specificato",
        client: client || "Cliente Non Specificato",
        workflow_step: "Acquisizione Manuale"
      },
      capture: {
        timestamp_local: new Date().toISOString(),
        gps: { 
          lat: locationData?.lat || 0, 
          lng: locationData?.lng || 0, 
          accuracy_m: 10 
        },
        file_name: `evidence_${Date.now()}.jpg`,
        file_type: "image/jpeg",
        content_hash: "mock_hash_" + Date.now(),
        preview_url: capturedImage || ""
      },
      audit: {
        created_at: new Date().toISOString(),
        log_chain: [
          { event: "captured", ts: new Date().toISOString() }
        ]
      }
    };

    addProof(newProof);
    setStep("complete");
    setTimeout(() => setLocation("/"), 2500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nuova Acquisizione</h1>
          <p className="text-xs text-muted-foreground">Documenta l'intervento in 3 secondi.</p>
        </div>
        {locationData ? (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            <MapPin className="h-3 w-3" />
            <span>GPS: {locationData.lat.toFixed(4)}, {locationData.lng.toFixed(4)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Ricerca GPS...</span>
          </div>
        )}
      </div>

      <Card className="overflow-hidden border-2 shadow-xl">
        <CardContent className="p-0 min-h-[400px] flex flex-col bg-black/5 relative">
          
          {step === "capture" && (
            <div className="flex-1 flex flex-col relative bg-black">
              {/* Camera Viewfinder */}
              <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                {capturedImage ? (
                  <div className="relative w-full h-full">
                    <img src={capturedImage} alt="captured" className="w-full h-full object-contain" />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-4 right-4 rounded-full"
                      onClick={() => {
                        setCapturedImage(null);
                        setStep("capture");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover" 
                    />
                    {!isStreaming && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/50">
                        <Camera className="h-12 w-12" />
                      </div>
                    )}
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-b border-white/50"></div>
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-b border-white/50"></div>
                      <div className="border-r border-white/50"></div>
                      <div className="border-r border-white/50"></div>
                      <div></div>
                    </div>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="bg-card p-6 rounded-t-xl z-10 space-y-4">
                {!capturedImage ? (
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <Button 
                        variant={mediaType === "photo" ? "default" : "ghost"}
                        onClick={() => setMediaType("photo")}
                        className="rounded-full"
                      >
                        <Camera className="h-4 w-4 mr-2" /> Foto
                      </Button>
                      <Button 
                        variant={mediaType === "audio" ? "default" : "ghost"}
                        onClick={() => setMediaType("audio")}
                        className="rounded-full"
                      >
                        <Mic className="h-4 w-4 mr-2" /> Audio
                      </Button>
                    </div>
                    <Button 
                      size="lg" 
                      className="rounded-full h-16 w-16 p-0 border-4 border-card bg-red-500 hover:bg-red-600 shadow-lg"
                      onClick={handleCapture}
                    >
                      <div className="h-6 w-6 rounded-full bg-white/20" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center font-medium flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Acquisizione Completata
                    </div>
                    <Button className="w-full h-12 text-lg font-bold" onClick={() => setStep("details")}>
                      Procedi (3s)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="flex-1 bg-card p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input 
                    placeholder="Es. Mario Rossi SpA" 
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sito / Cantiere</Label>
                  <Input 
                    placeholder="Es. Via Roma 1, Milano" 
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note Aggiuntive</Label>
                  <Input 
                    placeholder="Dettagli sull'acquisizione..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2 font-mono border-l-4 border-primary">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HASH:</span>
                  <span className="text-xs truncate max-w-[200px]">e3b0c44298fc1c149afbf4c8...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GPS:</span>
                  <span>{locationData?.lat.toFixed(5)}, {locationData?.lng.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TIME:</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full h-12 text-lg" size="lg" onClick={handleSubmit}>
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Sigilla & Certifica (eIDAS)
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Cliccando attivi il processo di marcatura temporale qualificata.
                </p>
              </div>
            </div>
          )}

          {step === "uploading" && (
            <div className="flex-1 bg-card flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Sigillatura in Corso</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  La "Scatola Nera" sta applicando i sigilli crittografici...
                </p>
              </div>
              <div className="w-full max-w-xs space-y-3 text-xs font-mono text-muted-foreground text-left bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Hashing SHA-256 locale
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Firma dispositivo (Ed25519)
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Richiesta Timestamp eIDAS
                </div>
                <div className="flex items-center gap-2 animate-pulse text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" /> WORM Storage Commit...
                </div>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="flex-1 bg-card flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-lg shadow-green-200">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold">Prova Blindata</h3>
              <p className="text-muted-foreground">
                L'acquisizione è stata certificata e archiviata in modo immutabile.
                <br/>
                <span className="text-xs font-mono mt-2 block text-primary">ID: {uuidv4().substring(0,8).toUpperCase()}</span>
              </p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}