import { useState, useRef, useEffect, useCallback } from "react";
import { Building2, Upload, X, Loader2, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

const BRAND_COLORS = [
  { name: "Teal", value: "#0d9488", hsl: "175 84% 32%" },
  { name: "Blue", value: "#3b82f6", hsl: "217 91% 60%" },
  { name: "Indigo", value: "#6366f1", hsl: "239 84% 67%" },
  { name: "Purple", value: "#9333ea", hsl: "271 81% 56%" },
  { name: "Pink", value: "#ec4899", hsl: "330 81% 60%" },
  { name: "Red", value: "#ef4444", hsl: "0 84% 60%" },
  { name: "Orange", value: "#f97316", hsl: "24 95% 53%" },
  { name: "Amber", value: "#f59e0b", hsl: "38 92% 50%" },
];

function applyBrandColor(hsl: string) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--accent', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
  root.style.setProperty('--chart-1', hsl);
  localStorage.setItem('app-theme-color', hsl);
}

export function BrandingSettings() {
  const { organization, isLoading, updateOrganization, uploadLogo, removeLogo, isSaving } = useOrganization();
  const [isUploading, setIsUploading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (organization?.name) {
      setOrgName(organization.name);
    }
  }, [organization?.name]);

  // Apply saved brand color on mount
  useEffect(() => {
    if (organization?.primary_color) {
      const match = BRAND_COLORS.find(c => c.value === organization.primary_color);
      if (match) {
        applyBrandColor(match.hsl);
      }
    }
  }, [organization?.primary_color]);

  // Auto-save org name with debounce
  const autoSaveName = useCallback((name: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (name.trim() && name.trim() !== organization?.name) {
        try {
          await updateOrganization.mutateAsync({ name: name.trim() });
        } catch {
          // error toast handled by hook
        }
      }
    }, 1200);
  }, [organization?.name, updateOrganization]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    autoSaveName(val);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo no debe superar 2MB");
      return;
    }

    setIsUploading(true);
    try {
      await uploadLogo(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleColorChange = async (color: typeof BRAND_COLORS[number]) => {
    // Apply CSS immediately
    applyBrandColor(color.hsl);
    // Persist to DB
    try {
      await updateOrganization.mutateAsync({ primary_color: color.value });
    } catch {
      // error toast handled by hook
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Cargando organización...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Identidad de Marca
        </CardTitle>
        <CardDescription>Personaliza la marca de tu organización para reportes y la aplicación.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Logo de la Organización</Label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 rounded-xl">
                {organization?.logo_url ? (
                  <AvatarImage src={organization.logo_url} alt="Logo de la organización" />
                ) : (
                  <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xl">
                    {organization?.name?.charAt(0).toUpperCase() || 'O'}
                  </AvatarFallback>
                )}
              </Avatar>
              {organization?.logo_url && (
                <button
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={isUploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Subir Logo
              </button>
              <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máx 2MB.</p>
            </div>
          </div>
        </div>

        {/* Organization Name - auto-save */}
        <div className="space-y-2">
          <Label htmlFor="org-name">Nombre de la Organización</Label>
          <div className="relative">
            <Input
              id="org-name"
              value={orgName}
              onChange={handleNameChange}
              placeholder="Ingresa el nombre de la organización"
            />
            {isSaving && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Se guarda automáticamente.</p>
        </div>

        {/* Brand Color */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Color de Marca
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {BRAND_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color)}
                disabled={isSaving}
                className={cn(
                  "relative h-10 w-full rounded-lg transition-all duration-200",
                  "ring-2 ring-offset-2 ring-offset-background",
                  organization?.primary_color === color.value
                    ? "ring-foreground scale-105"
                    : "ring-transparent hover:ring-muted-foreground/50 hover:scale-102",
                  isSaving && "opacity-50 cursor-not-allowed",
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {organization?.primary_color === color.value && (
                  <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Se aplica en toda la app al instante.</p>
        </div>
      </CardContent>
    </Card>
  );
}
