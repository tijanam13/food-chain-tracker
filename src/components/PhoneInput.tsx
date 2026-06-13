import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const countries = [
  { code: "+381", flag: "🇷🇸", name: "Serbia" },
  { code: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "+387", flag: "🇧🇦", name: "Bosnia" },
  { code: "+382", flag: "🇲🇪", name: "Montenegro" },
  { code: "+389", flag: "🇲🇰", name: "N. Macedonia" },
  { code: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  className?: string;
  required?: boolean;
}

function parsePhone(full: string): { prefix: string; local: string } {
  for (const c of [...countries].sort((a, b) => b.code.length - a.code.length)) {
    if (full.startsWith(c.code)) {
      return { prefix: c.code, local: full.slice(c.code.length).trim() };
    }
  }
  return { prefix: "+381", local: full.replace(/^\+?\d{1,3}\s?/, "") };
}

const PhoneInput = ({ value, onChange, className, required }: PhoneInputProps) => {
  const parsed = parsePhone(value);
  const [prefix, setPrefix] = useState(parsed.prefix);
  const [local, setLocal] = useState(parsed.local);

  // Sync internal state when value prop changes (e.g. after async fetchProfile)
  const prevValue = useState(value)[0];
  useEffect(() => {
    if (value && value !== `${prefix}${local}`) {
      const p = parsePhone(value);
      setPrefix(p.prefix);
      setLocal(p.local);
    }
  }, [value]);

  const handlePrefixChange = (newPrefix: string) => {
    setPrefix(newPrefix);
    onChange(local ? `${newPrefix}${local}` : "");
  };

  const handleLocalChange = (newLocal: string) => {
    const cleaned = newLocal.replace(/[^0-9]/g, "");
    setLocal(cleaned);
    onChange(cleaned ? `${prefix}${cleaned}` : "");
  };

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Select value={prefix} onValueChange={handlePrefixChange}>
        <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {countries.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-1.5 text-sm">
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.code}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        placeholder="612345678"
        value={local}
        onChange={(e) => handleLocalChange(e.target.value)}
        className="bg-secondary/50 border-border/50 flex-1"
        required={required}
      />
    </div>
  );
};

export default PhoneInput;
