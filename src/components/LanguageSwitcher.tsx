import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Lang = "en" | "ru" | "kz";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "kz", label: "KZ" },
];

const STORAGE_KEY = "app.lang";

const LanguageSwitcher = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (stored && LANGS.some((l) => l.code === stored)) setLang(stored);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (code: Lang) => {
    setLang(code);
    localStorage.setItem(STORAGE_KEY, code);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1 font-medium uppercase"
      >
        {lang}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[80px] overflow-hidden rounded-md border bg-popover p-1 shadow-md">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={cn(
                "flex w-full items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium uppercase transition-colors hover:bg-accent hover:text-accent-foreground",
                lang === l.code && "bg-accent text-accent-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
