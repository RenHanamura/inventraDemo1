import { MapPin, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations } from "@/hooks/useLocations";
import { useLocationContext } from "@/contexts/LocationContext";

export function LocationSwitcher() {
  const { data: locations = [] } = useLocations();
  const { selectedLocationId, setSelectedLocationId } = useLocationContext();

  const activeLocations = locations.filter((l) => l.status === "active");

  return (
    <Select
      value={selectedLocationId || "all"}
      onValueChange={(value) => setSelectedLocationId(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          {selectedLocationId ? <MapPin className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          <SelectValue placeholder="Select location" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <span>All Locations (Global)</span>
          </div>
        </SelectItem>
        {activeLocations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <div className="flex items-center gap-2">
              <span>{location.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
