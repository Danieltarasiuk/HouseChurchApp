'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    'auth.signIn': 'Sign In',
    'auth.signingIn': 'Signing in...',
    'auth.createAccount': 'Create Account',
    'auth.creatingAccount': 'Creating account...',
    'auth.signInToAccount': 'Sign in to your account',
    'auth.joinApp': 'Join HouseChurchApp',
    'auth.fullName': 'Full Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.noAccount': "Don't have an account?",
    'auth.registerHere': 'Register here',
    'auth.hasAccount': 'Already have an account?',
    'auth.signInHere': 'Sign in here',
    'auth.invalidCredentials': 'Invalid email or password.',
    'auth.loginFailed': 'Login failed. Please try again.',
    'auth.passwordMismatch': 'Passwords do not match',
    'auth.passwordTooShort': 'Password must be at least 8 characters',
    'auth.registrationFailed': 'Registration failed. Please try again.',
    'auth.or': 'or',
    'auth.googleSignIn': 'Sign in with Google',
    'auth.googleSignUp': 'Sign up with Google',
    'dashboard.welcome': 'Welcome to HouseChurchApp',
    'dashboard.activeChurches': 'Active House Churches',
    'dashboard.totalMembers': 'Total Members',
    'dashboard.activePrayers': 'Active Prayer Requests',
    'dashboard.sub': 'Manage your house church network',
    'dashboard.recentPrayers': 'Recent Prayer Requests',
    'dashboard.loading': 'Loading...',
    'dashboard.error': 'Failed to load data. Please refresh.',
    'dashboard.anonymous': 'Anonymous',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.noResults': 'No results found',
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
    'inc.title': 'Pastor Incubator',
    'inc.sub': 'House Church Pastor training — character, doctrine & convictions',
    'inc.week': 'Week',
    'inc.day': 'Day',
    'inc.module': 'Module',
    'inc.keyVerse': 'Key Verse',
    'inc.keyVerses': 'Key Verses',
    'inc.selfEval': 'Self-Evaluation',
    'inc.yourAnswer': 'Write your reflection...',
    'inc.section': 'Section',
    'inc.character': 'CHARACTER',
    'inc.doctrine': 'DOCTRINE',
    'inc.convictions': 'CONVICTIONS',
    'hc.title': 'House Churches',
    'hc.sub': 'Manage house church locations and groups',
    'hc.pastor': 'Pastor',
    'hc.members': 'Members',
    'hc.back': 'Back to House Churches',
    'hc.location': 'Location',
    'hc.meetingTime': 'Meeting Time',
    'hc.phone': 'Phone',
    'hc.role': 'Role',
    'common.name': 'Name',
    'role.admin': 'Admin',
    'role.house_church_pastor': 'House Church Pastor',
    'role.member': 'Member',
    'mem.title': 'Members',
    'mem.sub': 'Manage network members and contacts',
    'mem.search': 'Search by name or email...',
    'mem.addMember': 'Add Member',
    'mem.phone': 'Phone',
    'mem.houseChurch': 'House Church',
    'mem.role': 'Role',
    'pray.title': 'Prayer Requests',
    'pray.sub': 'Share and support each other in prayer',
    'pray.active': 'Active',
    'pray.answered': 'Answered',
    'pray.newRequest': 'New Request',
    'pray.markAnswered': 'Mark Answered',
    'pray.private': 'Private',
    'pray.submit': 'Submit',
    'pray.requestTitle': 'Title',
    'pray.requestDesc': 'Description',
    'pray.noRequests': 'No prayer requests yet',
    'att.title': 'Attendance',
    'att.sub': 'Track attendance for services and house churches',
    'att.eventType': 'Event Type',
    'att.sundayService': 'Sunday Service',
    'att.houseChurch': 'House Church',
    'att.date': 'Date',
    'att.present': 'Present',
    'att.save': 'Save Attendance',
    'att.saved': 'Attendance saved for {present} / {total} members.',
    'att.members': 'Members',
    'nav.settings': 'Settings',
    'settings.title': 'Settings',
    'settings.sub': 'Manage user roles and permissions',
    'settings.manageRoles': 'User Roles',
    'settings.currentRole': 'Current Role',
    'settings.changeRole': 'Change Role',
    'settings.roleUpdated': 'Role updated successfully.',
    'settings.loadError': 'Failed to load users.',
    'settings.updateError': 'Failed to update role.',
    'settings.noPermission': 'Access Denied',
    'settings.adminOnly': 'Only Admins can manage user roles and permissions.',
    'settings.you': 'You',
    'settings.pcoTitle': 'Planning Center',
    'settings.pcoDesc': 'Import members from your Planning Center account.',
    'settings.pcoConnect': 'Connect Planning Center',
    'settings.pcoStatusConnected': 'Connected',
    'settings.pcoImport': 'Import Members',
    'settings.pcoImporting': 'Importing...',
    'settings.pcoConnected': 'Planning Center connected successfully.',
    'settings.pcoError': 'Failed to connect Planning Center.',
    'settings.pcoImportSuccess': 'Imported {imported} members ({skipped} skipped without email, {total} total).',
    'settings.pcoImportError': 'Failed to import members from Planning Center.',
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
    'auth.signIn': 'Iniciar Sesión',
    'auth.signingIn': 'Iniciando sesión...',
    'auth.createAccount': 'Crear Cuenta',
    'auth.creatingAccount': 'Creando cuenta...',
    'auth.signInToAccount': 'Inicia sesión en tu cuenta',
    'auth.joinApp': 'Únete a HouseChurchApp',
    'auth.fullName': 'Nombre Completo',
    'auth.confirmPassword': 'Confirmar Contraseña',
    'auth.noAccount': '¿No tienes una cuenta?',
    'auth.registerHere': 'Regístrate aquí',
    'auth.hasAccount': '¿Ya tienes una cuenta?',
    'auth.signInHere': 'Inicia sesión aquí',
    'auth.invalidCredentials': 'Correo o contraseña inválidos.',
    'auth.loginFailed': 'Error al iniciar sesión. Inténtalo de nuevo.',
    'auth.passwordMismatch': 'Las contraseñas no coinciden',
    'auth.passwordTooShort': 'La contraseña debe tener al menos 8 caracteres',
    'auth.registrationFailed': 'Error al registrarse. Inténtalo de nuevo.',
    'auth.or': 'o',
    'auth.googleSignIn': 'Iniciar sesión con Google',
    'auth.googleSignUp': 'Registrarse con Google',
    'dashboard.welcome': 'Bienvenido a HouseChurchApp',
    'dashboard.activeChurches': 'Iglesias en Casa Activas',
    'dashboard.totalMembers': 'Miembros Totales',
    'dashboard.activePrayers': 'Peticiones de Oración Activas',
    'dashboard.sub': 'Administra tu red de iglesias en casa',
    'dashboard.recentPrayers': 'Peticiones de Oración Recientes',
    'dashboard.loading': 'Cargando...',
    'dashboard.error': 'Error al cargar datos. Por favor actualiza.',
    'dashboard.anonymous': 'Anónimo',
    'common.close': 'Cerrar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Añadir',
    'common.noResults': 'No se encontraron resultados',
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
    'inc.title': 'Incubadora de Pastores',
    'inc.sub': 'Formación de Pastores de Iglesia en Casa — carácter, doctrina y convicciones',
    'inc.week': 'Semana',
    'inc.day': 'Día',
    'inc.module': 'Módulo',
    'inc.keyVerse': 'Versículo Clave',
    'inc.keyVerses': 'Versículos Clave',
    'inc.selfEval': 'Autoevaluación',
    'inc.yourAnswer': 'Escribe tu reflexión...',
    'inc.section': 'Sección',
    'inc.character': 'CARÁCTER',
    'inc.doctrine': 'DOCTRINA',
    'inc.convictions': 'CONVICCIONES',
    'hc.title': 'Iglesias en Casa',
    'hc.sub': 'Administra ubicaciones y grupos de iglesias en casa',
    'hc.pastor': 'Pastor',
    'hc.members': 'Miembros',
    'hc.back': 'Volver a Iglesias en Casa',
    'hc.location': 'Ubicación',
    'hc.meetingTime': 'Horario de Reunión',
    'hc.phone': 'Teléfono',
    'hc.role': 'Rol',
    'common.name': 'Nombre',
    'role.admin': 'Administrador',
    'role.house_church_pastor': 'Pastor de Iglesia en Casa',
    'role.member': 'Miembro',
    'mem.title': 'Miembros',
    'mem.sub': 'Administra miembros y contactos de la red',
    'mem.search': 'Buscar por nombre o correo...',
    'mem.addMember': 'Añadir Miembro',
    'mem.phone': 'Teléfono',
    'mem.houseChurch': 'Iglesia en Casa',
    'mem.role': 'Rol',
    'pray.title': 'Peticiones de Oración',
    'pray.sub': 'Comparte y apóyense mutuamente en oración',
    'pray.active': 'Activas',
    'pray.answered': 'Contestadas',
    'pray.newRequest': 'Nueva Petición',
    'pray.markAnswered': 'Marcar Contestada',
    'pray.private': 'Privada',
    'pray.submit': 'Enviar',
    'pray.requestTitle': 'Título',
    'pray.requestDesc': 'Descripción',
    'pray.noRequests': 'No hay peticiones de oración aún',
    'att.title': 'Asistencia',
    'att.sub': 'Registra la asistencia de servicios e iglesias en casa',
    'att.eventType': 'Tipo de Evento',
    'att.sundayService': 'Servicio Dominical',
    'att.houseChurch': 'Iglesia en Casa',
    'att.date': 'Fecha',
    'att.present': 'Presentes',
    'att.save': 'Guardar Asistencia',
    'att.saved': 'Asistencia guardada para {present} / {total} miembros.',
    'att.members': 'Miembros',
    'nav.settings': 'Configuración',
    'settings.title': 'Configuración',
    'settings.sub': 'Administra roles y permisos de usuarios',
    'settings.manageRoles': 'Roles de Usuarios',
    'settings.currentRole': 'Rol Actual',
    'settings.changeRole': 'Cambiar Rol',
    'settings.roleUpdated': 'Rol actualizado exitosamente.',
    'settings.loadError': 'Error al cargar usuarios.',
    'settings.updateError': 'Error al actualizar rol.',
    'settings.noPermission': 'Acceso Denegado',
    'settings.adminOnly': 'Solo los Administradores pueden administrar roles y permisos.',
    'settings.you': 'Tú',
    'settings.pcoTitle': 'Planning Center',
    'settings.pcoDesc': 'Importa miembros desde tu cuenta de Planning Center.',
    'settings.pcoConnect': 'Conectar Planning Center',
    'settings.pcoStatusConnected': 'Conectado',
    'settings.pcoImport': 'Importar Miembros',
    'settings.pcoImporting': 'Importando...',
    'settings.pcoConnected': 'Planning Center conectado exitosamente.',
    'settings.pcoError': 'Error al conectar Planning Center.',
    'settings.pcoImportSuccess': '{imported} miembros importados ({skipped} omitidos sin correo, {total} total).',
    'settings.pcoImportError': 'Error al importar miembros desde Planning Center.',
  },
};

interface LangContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('housechurch-lang');
    if (saved === 'en' || saved === 'es') return saved;
  }
  return 'en';
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLanguageState(getInitialLanguage());
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('housechurch-lang', lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const t = useCallback((key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  }, [language]);

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
