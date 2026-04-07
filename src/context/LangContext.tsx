'use client';

import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'es';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    'app.title': 'HouseChurchApp',
    'app.subtitle': 'Network Management',
    'nav.dashboard': 'Dashboard',
    'nav.discipleship': '7&7 Discipleship',
    'nav.incubator': 'Pastor Incubator',
    'nav.churches': 'House Churches',
    'nav.members': 'Members',
    'nav.attendance': 'Attendance',
    'nav.prayer': 'Prayer Requests',
    'sidebar.user': 'User',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'dashboard.welcome': 'Welcome to HouseChurchApp',
    'dashboard.activeChurches': 'Active House Churches',
    'dashboard.totalMembers': 'Total Members',
    'dashboard.activeDiscipleships': 'Active Discipleships',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'coming.soon': 'Coming soon',
    'disc.title': '7&7 Discipleship',
    'disc.sub': '7 to Know, 7 to Grow — your journey through the foundations of faith',
    'disc.week': 'Week',
    'disc.day': 'Day',
    'disc.know': 'KNOW',
    'disc.grow': 'GROW',
    'disc.centralConcept': 'Central Concept',
    'disc.memoryVerses': 'Memory Verses',
    'disc.actionStep': 'Action Step',
    'disc.reflect': 'Reflect',
    'disc.apply': 'Apply',
    'disc.yourAnswer': 'Write your answer...',
    'disc.loading': 'Loading verse...',
    'disc.verseNote': 'Scripture text loaded from ESV Bible.',
    'disc.close': 'Close',
  },
  es: {
    'app.title': 'HouseChurchApp',
    'app.subtitle': 'Gestión de Red',
    'nav.dashboard': 'Panel de Control',
    'nav.discipleship': 'Discipulado 7&7',
    'nav.incubator': 'Incubadora de Pastores',
    'nav.churches': 'Iglesias en Casa',
    'nav.members': 'Miembros',
    'nav.attendance': 'Asistencia',
    'nav.prayer': 'Peticiones de Oración',
    'sidebar.user': 'Usuario',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.logout': 'Cerrar Sesión',
    'dashboard.welcome': 'Bienvenido a HouseChurchApp',
    'dashboard.activeChurches': 'Iglesias en Casa Activas',
    'dashboard.totalMembers': 'Miembros Totales',
    'dashboard.activeDiscipleships': 'Discipulados Activos',
    'common.close': 'Cerrar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Añadir',
    'coming.soon': 'Próximamente',
    'disc.title': '7&7 Discipulado',
    'disc.sub': '7 para Conocer, 7 para Crecer — tu camino por los fundamentos de la fe',
    'disc.week': 'Semana',
    'disc.day': 'Día',
    'disc.know': 'CONOCER',
    'disc.grow': 'CRECER',
    'disc.centralConcept': 'Concepto Central',
    'disc.memoryVerses': 'Versículos para Memorizar',
    'disc.actionStep': 'Acción a Seguir',
    'disc.reflect': 'Reflexiona',
    'disc.apply': 'Aplica',
    'disc.yourAnswer': 'Escribe tu respuesta...',
    'disc.loading': 'Cargando versículo...',
    'disc.verseNote': 'Texto bíblico cargado de la Biblia NBLA.',
    'disc.close': 'Cerrar',
  },
};

interface LangContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LangContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be used within LangProvider');
  }
  return context;
}
