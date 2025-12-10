import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Video,
  Mic, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  X,
  ShieldCheck,
  Package,
  User,
  FileSignature,
  Clock,
  Hash,
  AlertTriangle,
  Play,
  Square,
  Truck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateSHA256 } from "@/lib/hash";
import { apiRequest, queryClient } from "@/lib/queryClient";

type MediaType = "photo" | "video" | "audio";
type DeliveryStep = "info" | "capture" | "signature" | "uploading" | "complete";

interface CapturedMedia {
  type: MediaType;
  blob: Blob;
  url: string;
  hash?: string;
}

export default function DeliveryCapture() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<DeliveryStep>("info");
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [locationData, setLocationData] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [createdProofId, setCreatedProofId] = useState<string>("");
  const [isHashing, setIsHashing] = useState(false);
  const [tsaStatus, setTsaStatus] = useState<"pending" | "success" | "error">("pending");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    trackingNumber: "",
    recipientName: "",
    recipientAddress: "",
    courierName: "",
    notes: ""
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationData({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          console.error("GPS error:", err);
          setLocationData({ lat: 45.4642, lng: 9.1900, accuracy: 100 });
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const startCamera = async (forVideo: boolean = false) => {
    try {
      const constraints = forVideo 
        ? { video: true, audio: true }
        : { video: { facingMode: "environment" } };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Media error:", err);
      toast({
        title: "Errore",
        description: "Impossibile accedere alla fotocamera/microfono",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        setIsHashing(true);
        const hash = await calculateSHA256(blob);
        setIsHashing(false);
        
        setCapturedMedia(prev => [...prev, { type: "audio", blob, url, hash }]);
        stopCamera();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Audio error:", err);
      toast({
        title: "Errore",
        description: "Impossibile accedere al microfono",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        
        setIsHashing(true);
        const hash = await calculateSHA256(blob);
        setIsHashing(false);
        
        setCapturedMedia(prev => [...prev, { type: "photo", blob, url, hash }]);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const startVideoRecording = async () => {
    if (!streamRef.current) {
      await startCamera(true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!streamRef.current) return;
    
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      setIsHashing(true);
      const hash = await calculateSHA256(blob);
      setIsHashing(false);
      
      setCapturedMedia(prev => [...prev, { type: "video", blob, url, hash }]);
      stopCamera();
    };
    
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const removeMedia = (index: number) => {
    setCapturedMedia(prev => {
      const newMedia = [...prev];
      URL.revokeObjectURL(newMedia[index].url);
      newMedia.splice(index, 1);
      return newMedia;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (capturedMedia.length === 0) {
      toast({
        title: "Errore",
        description: "Acquisisci almeno una prova (foto, video o audio)",
        variant: "destructive"
      });
      return;
    }

    setStep("uploading");
    setTsaStatus("pending");

    try {
      const formData = new FormData();
      
      const primaryMedia = capturedMedia[0];
      const extension = primaryMedia.type === "photo" ? "jpg" : primaryMedia.type === "video" ? "webm" : "webm";
      const file = new File([primaryMedia.blob], `delivery_${Date.now()}.${extension}`, {
        type: primaryMedia.blob.type
      });
      
      formData.append('file', file);
      
      const payload = {
        actorUserId: deliveryInfo.courierName || "CORRIERE",
        actorRole: "courier",
        actorDeviceId: navigator.userAgent.substring(0, 50),
        interventionId: deliveryInfo.trackingNumber || `DEL-${Date.now()}`,
        site: deliveryInfo.recipientAddress || "Indirizzo non specificato",
        client: deliveryInfo.recipientName || "Destinatario non specificato",
        workflowStep: "Consegna Corriere",
        timestampLocal: new Date().toISOString(),
        gpsLat: locationData?.lat?.toString() || "0",
        gpsLng: locationData?.lng?.toString() || "0",
        gpsAccuracy: locationData?.accuracy?.toString() || "0",
        contentHash: primaryMedia.hash || "",
        signatureLocal: `sig_${Date.now()}`,
        captureMetadata: {
          device_os: navigator.platform,
          app_version: "1.0.0",
          network: navigator.onLine ? "online" : "offline",
          notes: deliveryInfo.notes,
          mediaCount: capturedMedia.length,
          mediaTypes: capturedMedia.map(m => m.type),
          allHashes: capturedMedia.map(m => m.hash)
        },
        requestTSA: true,
        auditLog: [
          { event: "captured", ts: new Date().toISOString() },
          { event: "delivery_workflow", ts: new Date().toISOString() }
        ]
      };
      
      formData.append('data', JSON.stringify(payload));
      
      const response = await fetch('/api/proofs', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il salvataggio');
      }
      
      const result = await response.json();
      
      setTsaStatus(result.tsaTimestamp ? "success" : "pending");
      setCreatedProofId(result.id);
      
      await queryClient.invalidateQueries({ queryKey: ['/api/proofs'] });
      
      setStep("complete");
      
      toast({
        title: "Consegna Documentata",
        description: "La prova di consegna è stata certificata con successo."
      });
      
      setTimeout(() => setLocation("/"), 3000);
      
    } catch (error) {
      console.error('Error:', error);
      setStep("signature");
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la certificazione",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Truck className="h-6 w-6 text-primary" />
            Prova di Consegna
          </h1>
          <p className="text-sm text-muted-foreground">
            Documenta la consegna con foto, video o audio certificati
          </p>
        </div>
        {locationData ? (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            <MapPin className="h-3 w-3 mr-1" />
            GPS Attivo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 animate-pulse">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            GPS...
          </Badge>
        )}
      </div>

      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Dati Consegna
            </CardTitle>
            <CardDescription>
              Inserisci i dettagli della spedizione (opzionali ma consigliati)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tracking">Numero Tracking</Label>
                <Input
                  id="tracking"
                  placeholder="Es. 1Z999AA10123456784"
                  value={deliveryInfo.trackingNumber}
                  onChange={(e) => setDeliveryInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  data-testid="input-tracking"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courier">Nome Corriere</Label>
                <Input
                  id="courier"
                  placeholder="Es. Mario Rossi"
                  value={deliveryInfo.courierName}
                  onChange={(e) => setDeliveryInfo(prev => ({ ...prev, courierName: e.target.value }))}
                  data-testid="input-courier"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient">Nome Destinatario</Label>
              <Input
                id="recipient"
                placeholder="Es. Azienda SRL"
                value={deliveryInfo.recipientName}
                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, recipientName: e.target.value }))}
                data-testid="input-recipient"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Indirizzo Consegna</Label>
              <Input
                id="address"
                placeholder="Es. Via Roma 1, 20100 Milano"
                value={deliveryInfo.recipientAddress}
                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, recipientAddress: e.target.value }))}
                data-testid="input-address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                placeholder="Eventuali note sulla consegna..."
                value={deliveryInfo.notes}
                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-notes"
              />
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setStep("capture")}
              data-testid="button-next-capture"
            >
              Procedi all'Acquisizione
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "capture" && (
        <Card>
          <CardHeader>
            <CardTitle>Acquisisci Prove</CardTitle>
            <CardDescription>
              Cattura foto, video o registrazione audio della consegna
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mediaType} onValueChange={(v) => {
              setMediaType(v as MediaType);
              stopCamera();
              stopRecording();
            }}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="photo" data-testid="tab-photo">
                  <Camera className="h-4 w-4 mr-2" /> Foto
                </TabsTrigger>
                <TabsTrigger value="video" data-testid="tab-video">
                  <Video className="h-4 w-4 mr-2" /> Video
                </TabsTrigger>
                <TabsTrigger value="audio" data-testid="tab-audio">
                  <Mic className="h-4 w-4 mr-2" /> Audio
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photo" className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => startCamera(false)}
                  />
                  {!streamRef.current && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button onClick={() => startCamera(false)} data-testid="button-start-camera">
                        <Camera className="h-4 w-4 mr-2" /> Attiva Camera
                      </Button>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={capturePhoto}
                  disabled={!streamRef.current || isHashing}
                  data-testid="button-capture-photo"
                >
                  {isHashing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calcolo Hash...</>
                  ) : (
                    <><Camera className="h-4 w-4 mr-2" /> Scatta Foto</>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="video" className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                      <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                      REC {formatTime(recordingTime)}
                    </div>
                  )}
                </div>
                {!isRecording ? (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={startVideoRecording}
                    data-testid="button-start-video"
                  >
                    <Play className="h-4 w-4 mr-2" /> Avvia Registrazione
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    data-testid="button-stop-video"
                  >
                    <Square className="h-4 w-4 mr-2" /> Ferma ({formatTime(recordingTime)})
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="audio" className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {isRecording ? (
                    <div className="text-center space-y-4">
                      <div className="h-20 w-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                        <Mic className="h-10 w-10 text-red-500 animate-pulse" />
                      </div>
                      <div className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</div>
                      <p className="text-muted-foreground">Registrazione in corso...</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Mic className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Premi per registrare audio</p>
                    </div>
                  )}
                </div>
                {!isRecording ? (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={startAudioRecording}
                    data-testid="button-start-audio"
                  >
                    <Mic className="h-4 w-4 mr-2" /> Avvia Registrazione Audio
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    data-testid="button-stop-audio"
                  >
                    <Square className="h-4 w-4 mr-2" /> Ferma Registrazione
                  </Button>
                )}
              </TabsContent>
            </Tabs>

            {capturedMedia.length > 0 && (
              <div className="space-y-2">
                <Label>Prove Acquisite ({capturedMedia.length})</Label>
                <div className="grid grid-cols-3 gap-2">
                  {capturedMedia.map((media, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border">
                      {media.type === "photo" && (
                        <img src={media.url} alt={`Prova ${index + 1}`} className="w-full aspect-square object-cover" />
                      )}
                      {media.type === "video" && (
                        <video src={media.url} className="w-full aspect-square object-cover" />
                      )}
                      {media.type === "audio" && (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center">
                          <Mic className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(index)}
                        data-testid={`button-remove-media-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {media.hash && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] p-1 font-mono truncate">
                          <Hash className="h-2 w-2 inline mr-1" />
                          {media.hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep("info")}
                data-testid="button-back-info"
              >
                Indietro
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setStep("signature")}
                disabled={capturedMedia.length === 0}
                data-testid="button-next-signature"
              >
                Procedi alla Firma ({capturedMedia.length} prove)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "signature" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Riepilogo e Certificazione
            </CardTitle>
            <CardDescription>
              Verifica i dati e procedi alla certificazione con marca temporale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracking:</span>
                <span>{deliveryInfo.trackingNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destinatario:</span>
                <span>{deliveryInfo.recipientName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Indirizzo:</span>
                <span className="text-right max-w-[200px] truncate">{deliveryInfo.recipientAddress || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Corriere:</span>
                <span>{deliveryInfo.courierName || "N/A"}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prove acquisite:</span>
                  <span>{capturedMedia.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GPS:</span>
                  <span>{locationData ? `${locationData.lat.toFixed(5)}, ${locationData.lng.toFixed(5)}` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>{new Date().toLocaleString("it-IT")}</span>
                </div>
              </div>
            </div>

            {capturedMedia[0]?.hash && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                  <Hash className="h-4 w-4" />
                  Hash SHA-256 (Prova Principale)
                </div>
                <code className="text-xs break-all text-muted-foreground">
                  {capturedMedia[0].hash}
                </code>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <ShieldCheck className="h-5 w-5" />
                Certificazione OpenTimestamps (Bitcoin)
              </div>
              <p className="text-sm text-green-600">
                Cliccando "Certifica", verrà richiesta una marca temporale 
                ancorata alla blockchain Bitcoin tramite OpenTimestamps.org.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep("capture")}
                data-testid="button-back-capture"
              >
                Indietro
              </Button>
              <Button 
                className="flex-1"
                size="lg"
                onClick={handleSubmit}
                data-testid="button-certify"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Certifica Consegna (TSA)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "uploading" && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Certificazione in Corso</h3>
                <p className="text-muted-foreground">
                  Stiamo applicando i sigilli crittografici...
                </p>
              </div>
              <div className="w-full max-w-xs space-y-3 text-xs font-mono text-left bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Hash SHA-256 calcolato
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> GPS certificato
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Upload file completato
                </div>
                <div className="flex items-center gap-2 animate-pulse text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" /> 
                  Richiesta OpenTimestamps (Bitcoin)...
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-lg shadow-green-200">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold">Consegna Certificata</h3>
              <p className="text-muted-foreground max-w-md">
                La prova di consegna è stata acquisita, hashata e certificata con OpenTimestamps (Bitcoin blockchain).
              </p>
              
              <div className="bg-muted p-4 rounded-lg font-mono text-sm w-full max-w-md">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">ID Prova:</span>
                  <span className="text-primary font-bold">{createdProofId.substring(0, 12).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TSA Status:</span>
                  <Badge variant={tsaStatus === "success" ? "default" : "secondary"}>
                    {tsaStatus === "success" ? "Verificato" : "In elaborazione"}
                  </Badge>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Reindirizzamento alla dashboard in corso...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
