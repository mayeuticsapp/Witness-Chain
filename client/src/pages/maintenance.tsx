import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  Video,
  Mic, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  X,
  ShieldCheck,
  Wrench,
  User,
  FileSignature,
  Clock,
  Hash,
  Play,
  Square,
  Settings,
  Package,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateSHA256 } from "@/lib/hash";
import { queryClient } from "@/lib/queryClient";

type MediaType = "photo" | "video" | "audio";
type MaintenanceStep = "info" | "before" | "materials" | "after" | "signature" | "uploading" | "complete";

interface CapturedMedia {
  type: MediaType;
  blob: Blob;
  url: string;
  hash?: string;
  label: string;
}

interface Material {
  name: string;
  quantity: string;
  unit: string;
}

export default function MaintenanceCapture() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<MaintenanceStep>("info");
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [beforeMedia, setBeforeMedia] = useState<CapturedMedia[]>([]);
  const [afterMedia, setAfterMedia] = useState<CapturedMedia[]>([]);
  const [locationData, setLocationData] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [createdProofId, setCreatedProofId] = useState<string>("");
  const [isHashing, setIsHashing] = useState(false);
  const [tsaStatus, setTsaStatus] = useState<"pending" | "success" | "error">("pending");
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [signatureData, setSignatureData] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    plantId: "",
    plantName: "",
    plantLocation: "",
    interventionType: "",
    technicianName: "",
    clientName: "",
    notes: ""
  });

  const [materials, setMaterials] = useState<Material[]>([
    { name: "", quantity: "", unit: "pz" }
  ]);

  const interventionTypes = [
    "Manutenzione Ordinaria",
    "Manutenzione Straordinaria",
    "Riparazione",
    "Ispezione",
    "Installazione",
    "Sostituzione Componenti",
    "Taratura",
    "Collaudo"
  ];

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

  useEffect(() => {
    if (step === "signature") {
      setTimeout(() => {
        initSignatureCanvas();
      }, 100);
    }
  }, [step]);

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsAudioRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const startAudioRecording = async (isAfter: boolean = false) => {
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
        
        const media: CapturedMedia = { 
          type: "audio", 
          blob, 
          url, 
          hash,
          label: isAfter ? "Audio Finale" : "Audio Iniziale"
        };
        
        if (isAfter) {
          setAfterMedia(prev => [...prev, media]);
        } else {
          setBeforeMedia(prev => [...prev, media]);
        }
        stopCamera();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsAudioRecording(true);
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

  const initSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  };

  const handleSignatureStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSignatureMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleSignatureEnd = () => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    setSignatureData("");
    initSignatureCanvas();
  };

  const capturePhoto = async (isAfter: boolean = false) => {
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
        
        const media: CapturedMedia = { 
          type: "photo", 
          blob, 
          url, 
          hash,
          label: isAfter ? "Stato Finale" : "Stato Iniziale"
        };
        
        if (isAfter) {
          setAfterMedia(prev => [...prev, media]);
        } else {
          setBeforeMedia(prev => [...prev, media]);
        }
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const startVideoRecording = async (isAfter: boolean = false) => {
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
      
      const media: CapturedMedia = { 
        type: "video", 
        blob, 
        url, 
        hash,
        label: isAfter ? "Video Finale" : "Video Iniziale"
      };
      
      if (isAfter) {
        setAfterMedia(prev => [...prev, media]);
      } else {
        setBeforeMedia(prev => [...prev, media]);
      }
      stopCamera();
    };
    
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const removeMedia = (isAfter: boolean, index: number) => {
    if (isAfter) {
      setAfterMedia(prev => {
        const newMedia = [...prev];
        URL.revokeObjectURL(newMedia[index].url);
        newMedia.splice(index, 1);
        return newMedia;
      });
    } else {
      setBeforeMedia(prev => {
        const newMedia = [...prev];
        URL.revokeObjectURL(newMedia[index].url);
        newMedia.splice(index, 1);
        return newMedia;
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addMaterial = () => {
    setMaterials(prev => [...prev, { name: "", quantity: "", unit: "pz" }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof Material, value: string) => {
    setMaterials(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleSubmit = async () => {
    if (beforeMedia.length === 0 || afterMedia.length === 0) {
      toast({
        title: "Errore",
        description: "Servono foto/video dello stato iniziale e finale",
        variant: "destructive"
      });
      return;
    }

    setStep("uploading");
    setTsaStatus("pending");

    try {
      const formData = new FormData();
      
      const primaryMedia = beforeMedia[0];
      const extension = primaryMedia.type === "photo" ? "jpg" : "webm";
      const file = new File([primaryMedia.blob], `maintenance_${Date.now()}.${extension}`, {
        type: primaryMedia.blob.type
      });
      
      formData.append('file', file);
      
      const allMedia = [...beforeMedia, ...afterMedia];
      const validMaterials = materials.filter(m => m.name.trim() !== "");
      
      const payload = {
        actorUserId: maintenanceInfo.technicianName || "TECNICO",
        actorRole: "technician",
        actorDeviceId: navigator.userAgent.substring(0, 50),
        interventionId: maintenanceInfo.plantId || `MNT-${Date.now()}`,
        site: maintenanceInfo.plantLocation || "Ubicazione non specificata",
        client: maintenanceInfo.clientName || "Cliente non specificato",
        workflowStep: "Manutenzione Impianto",
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
          notes: maintenanceInfo.notes,
          plantName: maintenanceInfo.plantName,
          interventionType: maintenanceInfo.interventionType,
          materials: validMaterials,
          beforeMediaCount: beforeMedia.length,
          afterMediaCount: afterMedia.length,
          beforeHashes: beforeMedia.map(m => m.hash),
          afterHashes: afterMedia.map(m => m.hash),
          allHashes: allMedia.map(m => m.hash),
          clientSignature: signatureData ? true : false
        },
        requestTSA: true,
        auditLog: [
          { event: "captured", ts: new Date().toISOString() },
          { event: "maintenance_workflow", ts: new Date().toISOString() }
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
        title: "Intervento Documentato",
        description: "La prova di manutenzione è stata certificata con successo."
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

  const renderMediaCapture = (isAfter: boolean) => {
    const currentMedia = isAfter ? afterMedia : beforeMedia;
    const label = isAfter ? "Stato Finale" : "Stato Iniziale";
    
    return (
      <div className="space-y-4">
        {!isAudioRecording && (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isRecording && !isAudioRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                REC {formatTime(recordingTime)}
              </div>
            )}
            {!streamRef.current && !isRecording && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button onClick={() => startCamera(false)} data-testid={`button-start-camera-${isAfter ? 'after' : 'before'}`}>
                  <Camera className="h-4 w-4 mr-2" /> Attiva Camera
                </Button>
              </div>
            )}
          </div>
        )}
        
        {isAudioRecording && (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Mic className="h-10 w-10 text-red-500 animate-pulse" />
              </div>
              <div className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</div>
              <p className="text-muted-foreground">Registrazione audio in corso...</p>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          {!isRecording ? (
            <>
              <Button 
                className="flex-1" 
                onClick={() => capturePhoto(isAfter)}
                disabled={!streamRef.current || isHashing}
                data-testid={`button-capture-photo-${isAfter ? 'after' : 'before'}`}
              >
                {isHashing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Hash...</>
                ) : (
                  <><Camera className="h-4 w-4 mr-2" /> Foto</>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => startVideoRecording(isAfter)}
                data-testid={`button-start-video-${isAfter ? 'after' : 'before'}`}
              >
                <Video className="h-4 w-4 mr-2" /> Video
              </Button>
              <Button 
                variant="outline"
                onClick={() => startAudioRecording(isAfter)}
                data-testid={`button-start-audio-${isAfter ? 'after' : 'before'}`}
              >
                <Mic className="h-4 w-4 mr-2" /> Audio
              </Button>
            </>
          ) : (
            <Button 
              className="w-full" 
              variant="destructive"
              onClick={stopRecording}
              data-testid={`button-stop-recording-${isAfter ? 'after' : 'before'}`}
            >
              <Square className="h-4 w-4 mr-2" /> Ferma ({formatTime(recordingTime)})
            </Button>
          )}
        </div>

        {currentMedia.length > 0 && (
          <div className="space-y-2">
            <Label>{label} ({currentMedia.length} file)</Label>
            <div className="grid grid-cols-3 gap-2">
              {currentMedia.map((media, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border">
                  {media.type === "photo" && (
                    <img src={media.url} alt={`${label} ${index + 1}`} className="w-full aspect-square object-cover" />
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
                    onClick={() => removeMedia(isAfter, index)}
                    data-testid={`button-remove-media-${isAfter ? 'after' : 'before'}-${index}`}
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
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Wrench className="h-6 w-6 text-primary" />
            Intervento Manutenzione
          </h1>
          <p className="text-sm text-muted-foreground">
            Documenta l'intervento con prove certificate prima/dopo
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

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {["info", "before", "materials", "after", "signature"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? "bg-primary text-primary-foreground" :
              ["info", "before", "materials", "after", "signature"].indexOf(step) > i 
                ? "bg-green-500 text-white" 
                : "bg-muted text-muted-foreground"
            }`}>
              {["info", "before", "materials", "after", "signature"].indexOf(step) > i ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : i + 1}
            </div>
            {i < 4 && <div className="w-8 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Dati Impianto
            </CardTitle>
            <CardDescription>
              Inserisci i dettagli dell'impianto e dell'intervento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plantId">ID Impianto</Label>
                <Input
                  id="plantId"
                  placeholder="Es. IMP-2024-001"
                  value={maintenanceInfo.plantId}
                  onChange={(e) => setMaintenanceInfo(prev => ({ ...prev, plantId: e.target.value }))}
                  data-testid="input-plant-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plantName">Nome Impianto</Label>
                <Input
                  id="plantName"
                  placeholder="Es. Caldaia Centrale"
                  value={maintenanceInfo.plantName}
                  onChange={(e) => setMaintenanceInfo(prev => ({ ...prev, plantName: e.target.value }))}
                  data-testid="input-plant-name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plantLocation">Ubicazione</Label>
              <Input
                id="plantLocation"
                placeholder="Es. Via Roma 1, Piano -1, Locale Tecnico"
                value={maintenanceInfo.plantLocation}
                onChange={(e) => setMaintenanceInfo(prev => ({ ...prev, plantLocation: e.target.value }))}
                data-testid="input-plant-location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interventionType">Tipo Intervento</Label>
              <Select 
                value={maintenanceInfo.interventionType} 
                onValueChange={(v) => setMaintenanceInfo(prev => ({ ...prev, interventionType: v }))}
              >
                <SelectTrigger data-testid="select-intervention-type">
                  <SelectValue placeholder="Seleziona tipo intervento" />
                </SelectTrigger>
                <SelectContent>
                  {interventionTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technician">Tecnico</Label>
                <Input
                  id="technician"
                  placeholder="Es. Mario Rossi"
                  value={maintenanceInfo.technicianName}
                  onChange={(e) => setMaintenanceInfo(prev => ({ ...prev, technicianName: e.target.value }))}
                  data-testid="input-technician"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Input
                  id="client"
                  placeholder="Es. Azienda SRL"
                  value={maintenanceInfo.clientName}
                  onChange={(e) => setMaintenanceInfo(prev => ({ ...prev, clientName: e.target.value }))}
                  data-testid="input-client"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Note Intervento</Label>
              <Textarea
                id="notes"
                placeholder="Descrizione dell'intervento da eseguire..."
                value={maintenanceInfo.notes}
                onChange={(e) => setMaintenanceInfo(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-notes"
              />
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                setStep("before");
                startCamera(false);
              }}
              data-testid="button-next-before"
            >
              Procedi a Foto Stato Iniziale
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "before" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Stato Iniziale
            </CardTitle>
            <CardDescription>
              Documenta lo stato dell'impianto PRIMA dell'intervento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderMediaCapture(false)}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  stopCamera();
                  setStep("info");
                }}
                data-testid="button-back-info"
              >
                Indietro
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  stopCamera();
                  setStep("materials");
                }}
                disabled={beforeMedia.length === 0}
                data-testid="button-next-materials"
              >
                Procedi a Materiali
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "materials" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materiali Utilizzati
            </CardTitle>
            <CardDescription>
              Registra i materiali e ricambi impiegati
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {materials.map((material, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label>Materiale</Label>
                  <Input
                    placeholder="Es. Filtro aria"
                    value={material.name}
                    onChange={(e) => updateMaterial(index, "name", e.target.value)}
                    data-testid={`input-material-name-${index}`}
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label>Qtà</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, "quantity", e.target.value)}
                    data-testid={`input-material-qty-${index}`}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Label>Unità</Label>
                  <Select 
                    value={material.unit} 
                    onValueChange={(v) => updateMaterial(index, "unit", v)}
                  >
                    <SelectTrigger data-testid={`select-material-unit-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pz">pz</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lt">lt</SelectItem>
                      <SelectItem value="mt">mt</SelectItem>
                      <SelectItem value="set">set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {materials.length > 1 && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => removeMaterial(index)}
                    data-testid={`button-remove-material-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={addMaterial}
              data-testid="button-add-material"
            >
              + Aggiungi Materiale
            </Button>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep("before")}
                data-testid="button-back-before"
              >
                Indietro
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  setStep("after");
                  startCamera(false);
                }}
                data-testid="button-next-after"
              >
                Procedi a Foto Stato Finale
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "after" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Stato Finale
            </CardTitle>
            <CardDescription>
              Documenta lo stato dell'impianto DOPO l'intervento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderMediaCapture(true)}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  stopCamera();
                  setStep("materials");
                }}
                data-testid="button-back-materials"
              >
                Indietro
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  stopCamera();
                  setStep("signature");
                }}
                disabled={afterMedia.length === 0}
                data-testid="button-next-signature"
              >
                Procedi a Riepilogo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "signature" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Riepilogo e Firma
            </CardTitle>
            <CardDescription>
              Verifica i dati, raccogli la firma del cliente e conferma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impianto:</span>
                <span className="font-medium">{maintenanceInfo.plantName || maintenanceInfo.plantId || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo Intervento:</span>
                <span>{maintenanceInfo.interventionType || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tecnico:</span>
                <span>{maintenanceInfo.technicianName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span>{maintenanceInfo.clientName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prove Prima:</span>
                <span>{beforeMedia.length} file</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prove Dopo:</span>
                <span>{afterMedia.length} file</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materiali:</span>
                <span>{materials.filter(m => m.name.trim()).length} voci</span>
              </div>
              {locationData && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Posizione:</span>
                  <Badge variant="outline" className="text-green-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    {locationData.lat.toFixed(4)}, {locationData.lng.toFixed(4)}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Firma Cliente
              </Label>
              <div className="border rounded-lg p-2 bg-white">
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={150}
                  className="w-full touch-none cursor-crosshair border rounded"
                  onMouseDown={handleSignatureStart}
                  onMouseMove={handleSignatureMove}
                  onMouseUp={handleSignatureEnd}
                  onMouseLeave={handleSignatureEnd}
                  onTouchStart={handleSignatureStart}
                  onTouchMove={handleSignatureMove}
                  onTouchEnd={handleSignatureEnd}
                  data-testid="canvas-signature"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearSignature}
                  data-testid="button-clear-signature"
                >
                  <X className="h-3 w-3 mr-1" /> Cancella Firma
                </Button>
              </div>
              {signatureData && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Firma acquisita
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep("after")}
                data-testid="button-back-after"
              >
                Indietro
              </Button>
              <Button 
                className="flex-1"
                size="lg"
                onClick={handleSubmit}
                disabled={!signatureData}
                data-testid="button-submit"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Certifica Intervento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "uploading" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Certificazione in corso...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Calcolo hash, timestamp e salvataggio WORM
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>Richiesta timestamp OpenTimestamps...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Intervento Certificato</h3>
                <p className="text-sm text-green-600 mt-1">
                  La documentazione è stata salvata con valore legale
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-2 border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ID Prova:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{createdProofId.substring(0, 8)}...</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <Badge variant={tsaStatus === "success" ? "default" : "secondary"}>
                    {tsaStatus === "success" ? "Confermato" : "In attesa"}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Reindirizzamento alla dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
