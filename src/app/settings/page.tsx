// src/app/settings/page.tsx
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Ajustes
        </h1>
        <p className="max-w-xl text-sm text-neutral-600 dark:text-neutral-300">
          Configura cómo quieres trabajar con AforoLab: tema claro/oscuri
          y idioma de la interfaz. El resto del comportamiento es local: no
          se envían tus preferencias a ningún servidor.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold md:text-base">
            Tema de la interfaz
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Cambia entre tema claro, oscuro o automático según el sistema.
          </p>
          <div className="mt-3">
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold md:text-base">
            Idioma de la interfaz
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Por ahora la lógica de datos se mantiene en español, pero puedes
            alternar textos básicos si lo necesitas.
          </p>
          <div className="mt-3">
            <LangToggle />
          </div>
        </div>
      </section>
    </div>
  );
}
